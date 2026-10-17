// Capa de datos con Supabase. Todas las vistas hablan con la base a través de este módulo.
// Los permisos reales los aplica la base de datos (ver supabase/schema.sql).
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_KEY, ALLOWED_DOMAINS } from './config.js';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' },
});

const BUCKET = 'proyectos';

// Al volver del link del mail, Supabase canjea el código de la URL por una sesión.
// Esperamos ese canje, guardamos el error si lo hubo y limpiamos la URL.
let initError = null;
const ready = sb.auth.initialize().then(async ({ error }) => {
  const url = new URL(location.href);
  initError = error?.message || url.searchParams.get('error_description') || null;
  // Volvió con un código pero no hay sesión: casi siempre es un link abierto en otro navegador
  if (!initError && url.searchParams.has('code') && !(await sb.auth.getSession()).data.session) {
    initError = 'code verifier';
  }
  if (['code', 'error', 'error_code', 'error_description'].some(k => url.searchParams.has(k))) {
    history.replaceState(null, '', url.pathname + url.hash);
  }
});

function check({ data, error }) {
  if (error) throw error;
  return data;
}

function redirectUrl() {
  return location.origin + location.pathname;
}

function safeName(name) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_').slice(-80);
}

export const api = {
  demo: false,

  // ---------- Sesión ----------
  async session() {
    await ready;
    return check(await sb.auth.getSession()).session;
  },
  // Error al volver del link del mail o de Google (por ejemplo, link vencido u otro navegador)
  async authError() {
    await ready;
    return initError;
  },
  onAuthChange(cb) {
    // Supabase avisa mientras tiene tomada la sesión: si el aviso vuelve a pedir la sesión
    // en el mismo momento, se traba. Por eso se responde en el próximo ciclo.
    sb.auth.onAuthStateChange((_event, session) => { setTimeout(() => cb(session), 0); });
  },
  async providers() {
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } });
      const s = await r.json();
      return { google: !!s.external?.google, email: !!s.external?.email };
    } catch {
      return { google: false, email: true };
    }
  },
  async verifyCode(email, token) {
    check(await sb.auth.verifyOtp({ email, token, type: 'email' }));
  },
  async signInWithGoogle() {
    check(await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl(), queryParams: { prompt: 'select_account' } },
    }));
  },
  async signInWithEmail(email) {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!ALLOWED_DOMAINS.includes(domain)) throw new Error('Usá tu mail @etec.um.edu.ar o @alumno.etec.um.edu.ar');
    check(await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectUrl() } }));
  },
  async signOut() {
    check(await sb.auth.signOut());
  },

  // ---------- Perfiles ----------
  async me() {
    const session = await this.session();
    if (!session) return null;
    const profile = check(await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle());
    if (profile) profile.is_admin = check(await sb.rpc('is_admin'));
    return profile;
  },
  async profiles() {
    const [rows, admins] = await Promise.all([
      sb.from('profiles').select('*').order('full_name').then(check),
      sb.from('admins').select('email').then(check),
    ]);
    const set = new Set(admins.map(a => a.email));
    return rows.map(p => ({ ...p, is_admin: set.has(p.email) }));
  },
  async setRole(userId, role) {
    check(await sb.from('profiles').update({ role }).eq('id', userId));
  },
  async updateMyName(userId, full_name) {
    check(await sb.from('profiles').update({ full_name }).eq('id', userId));
  },

  // ---------- Proyectos ----------
  async projects() {
    return check(await sb.from('projects').select('*, project_members(user_id)').order('created_at', { ascending: false }));
  },
  async project(id) {
    return check(await sb.from('projects').select('*').eq('id', id).maybeSingle());
  },
  async createProject(p) {
    return check(await sb.from('projects').insert(p).select().single());
  },
  async updateProject(id, patch) {
    check(await sb.from('projects').update(patch).eq('id', id));
  },
  async deleteProject(id) {
    // Borrar también los archivos guardados del proyecto
    for (const folder of ['avances', 'archivos']) {
      const list = check(await sb.storage.from(BUCKET).list(`${id}/${folder}`, { limit: 1000 }));
      if (list?.length) await sb.storage.from(BUCKET).remove(list.map(f => `${id}/${folder}/${f.name}`));
    }
    check(await sb.from('projects').delete().eq('id', id));
  },

  // ---------- Equipo ----------
  async members(projectId) {
    const [rows, admins] = await Promise.all([
      sb.from('project_members').select('user_id, profiles(*)').eq('project_id', projectId).then(check),
      sb.from('admins').select('email').then(check),
    ]);
    const set = new Set(admins.map(a => a.email));
    return rows.map(r => r.profiles).filter(Boolean).map(p => ({ ...p, is_admin: set.has(p.email) })).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  },
  async addMembers(projectId, userIds) {
    if (!userIds.length) return;
    check(await sb.from('project_members').insert(userIds.map(user_id => ({ project_id: projectId, user_id }))));
  },
  async removeMember(projectId, userId) {
    const areas = check(await sb.from('areas').select('id').eq('project_id', projectId));
    if (areas.length) check(await sb.from('area_members').delete().eq('user_id', userId).in('area_id', areas.map(a => a.id)));
    check(await sb.from('project_members').delete().eq('project_id', projectId).eq('user_id', userId));
  },

  // ---------- Áreas ----------
  async areas(projectId) {
    const rows = check(await sb.from('areas').select('*, area_members(user_id)').eq('project_id', projectId).order('name'));
    return rows.map(a => ({ ...a, member_ids: a.area_members.map(m => m.user_id) }));
  },
  async saveArea(area, memberIds) {
    const { id, ...fields } = area;
    const saved = id
      ? check(await sb.from('areas').update(fields).eq('id', id).select().single())
      : check(await sb.from('areas').insert(fields).select().single());
    check(await sb.from('area_members').delete().eq('area_id', saved.id));
    if (memberIds.length) check(await sb.from('area_members').insert(memberIds.map(user_id => ({ area_id: saved.id, user_id }))));
    return saved;
  },
  async deleteArea(id) {
    check(await sb.from('areas').delete().eq('id', id));
  },

  // ---------- Hitos ----------
  async milestones(projectId) {
    return check(await sb.from('milestones').select('*').eq('project_id', projectId).order('due_date'));
  },
  async upcomingMilestones() {
    return check(await sb.from('milestones').select('*, projects(name, color)').eq('done', false).order('due_date').limit(6));
  },
  async saveMilestone(m) {
    const { id, ...fields } = m;
    if (id) check(await sb.from('milestones').update(fields).eq('id', id));
    else check(await sb.from('milestones').insert(fields));
  },
  async deleteMilestone(id) {
    check(await sb.from('milestones').delete().eq('id', id));
  },

  // ---------- Tareas ----------
  async tasks(projectId) {
    return check(await sb.from('tasks').select('*').eq('project_id', projectId).order('priority').order('due_date', { nullsFirst: false }));
  },
  async myTasks(userId) {
    return check(await sb.from('tasks').select('*, projects(name, color)').eq('assignee_id', userId).neq('status', 'hecha').order('due_date', { nullsFirst: false }));
  },
  async reviewQueue() {
    const tasks = check(await sb.from('tasks').select('id, title, project_id, projects(name)').eq('status', 'en_revision'));
    const updates = check(await sb.from('updates').select('id, title, project_id, author_id, projects(name)').eq('status', 'pendiente'));
    return { tasks, updates };
  },
  async saveTask(t) {
    const { id, ...fields } = t;
    if (id) check(await sb.from('tasks').update(fields).eq('id', id));
    else check(await sb.from('tasks').insert(fields));
  },
  async setTaskStatus(id, status) {
    const r = check(await sb.from('tasks').update({ status }).eq('id', id).select('id'));
    if (!r.length) throw new Error('No tenés permiso para mover esta tarea.');
  },
  async deleteTask(id) {
    check(await sb.from('tasks').delete().eq('id', id));
  },

  // ---------- Avances ----------
  async updates(projectId) {
    return check(await sb.from('updates').select('*, comments(count)').eq('project_id', projectId).order('created_at', { ascending: false }));
  },
  async uploadFiles(projectId, folder, files) {
    const out = [];
    for (const f of files) {
      const path = `${projectId}/${folder}/${Date.now()}_${safeName(f.name)}`;
      check(await sb.storage.from(BUCKET).upload(path, f, { contentType: f.type || undefined }));
      out.push({ path, name: f.name, size: f.size });
    }
    return out;
  },
  async createUpdate(u, files = []) {
    const attachments = await this.uploadFiles(u.project_id, 'avances', files);
    check(await sb.from('updates').insert({ ...u, attachments }));
  },
  async editUpdate(id, patch, projectId, newFiles = [], keep = []) {
    const attachments = [...keep, ...(await this.uploadFiles(projectId, 'avances', newFiles))];
    check(await sb.from('updates').update({ ...patch, attachments }).eq('id', id));
  },
  async reviewUpdate(id, { status, score, feedback }) {
    check(await sb.from('updates').update({ status, score: score || null, feedback }).eq('id', id));
  },
  async deleteUpdate(u) {
    if (u.attachments?.length) await sb.storage.from(BUCKET).remove(u.attachments.map(a => a.path));
    check(await sb.from('updates').delete().eq('id', u.id));
  },
  async fileUrl(path) {
    return check(await sb.storage.from(BUCKET).createSignedUrl(path, 3600)).signedUrl;
  },

  // ---------- Comentarios ----------
  async comments(updateId) {
    return check(await sb.from('comments').select('*').eq('update_id', updateId).order('created_at'));
  },
  async addComment(updateId, body, mentions = []) {
    check(await sb.from('comments').insert({ update_id: updateId, body, mentions }));
  },

  // ---------- Archivos del proyecto ----------
  async files(projectId) {
    return check(await sb.from('project_files').select('*').eq('project_id', projectId).order('folder').order('name'));
  },
  async uploadProjectFiles(projectId, folder, files) {
    const up = await this.uploadFiles(projectId, 'archivos', files);
    check(await sb.from('project_files').insert(up.map(f => ({ ...f, project_id: projectId, folder: folder || 'General' }))));
  },
  async deleteFile(file) {
    await sb.storage.from(BUCKET).remove([file.path]);
    check(await sb.from('project_files').delete().eq('id', file.id));
  },

  // ---------- Inventario ----------
  async inventory(projectId) {
    return check(await sb.from('inventory').select('*').eq('project_id', projectId).order('created_at'));
  },
  async saveItem(item) {
    const { id, ...fields } = item;
    if (id) check(await sb.from('inventory').update(fields).eq('id', id));
    else check(await sb.from('inventory').insert(fields));
  },
  async deleteItem(id) {
    check(await sb.from('inventory').delete().eq('id', id));
  },

  // ---------- Bitácora ----------
  async activity(projectId, limit = 200) {
    return check(await sb.from('activity').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(limit));
  },

  // ---------- Notificaciones ----------
  async notifications() {
    return check(await sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(30));
  },
  async markRead(ids) {
    if (!ids.length) return;
    check(await sb.from('notifications').update({ read: true }).in('id', ids));
  },

  // ---------- Rendimiento ----------
  async studentPerformance(projectId) {
    return check(await sb.rpc('student_performance', { p: projectId }));
  },
  async areaPerformance(projectId) {
    return check(await sb.rpc('area_performance', { p: projectId }));
  },

  // ---------- Ensayos y fallas ----------
  async tests(projectId) {
    return check(await sb.from('tests').select('*').eq('project_id', projectId).order('test_date', { ascending: false }).order('created_at', { ascending: false }));
  },
  async saveTest(t, files = [], keep = []) {
    const { id, ...fields } = t;
    const attachments = [...keep, ...(await this.uploadFiles(t.project_id, 'ensayos', files))];
    if (id) { check(await sb.from('tests').update({ ...fields, attachments }).eq('id', id)); return id; }
    return check(await sb.from('tests').insert({ ...fields, attachments }).select('id').single()).id;
  },
  async deleteTest(t) {
    if (t.attachments?.length) await sb.storage.from(BUCKET).remove(t.attachments.map(a => a.path));
    check(await sb.from('tests').delete().eq('id', t.id));
  },
  async issues(projectId) {
    return check(await sb.from('issues').select('*').eq('project_id', projectId).order('created_at', { ascending: false }));
  },
  async saveIssue(i) {
    const { id, ...fields } = i;
    if (id) {
      const r = check(await sb.from('issues').update(fields).eq('id', id).select('id'));
      if (!r.length) throw new Error('No tenés permiso para modificar esta falla.');
    } else check(await sb.from('issues').insert(fields));
  },
  async deleteIssue(id) {
    check(await sb.from('issues').delete().eq('id', id));
  },

  // ---------- Equipos y turnos ----------
  async equipment() {
    return check(await sb.from('equipment').select('*').order('name'));
  },
  async saveEquipment(e) {
    const { id, ...fields } = e;
    if (id) check(await sb.from('equipment').update(fields).eq('id', id));
    else check(await sb.from('equipment').insert(fields));
  },
  async agenda(from, to) {
    return check(await sb.rpc('reservation_agenda', { desde: from.toISOString(), hasta: to.toISOString() }));
  },
  async saveReservation(r) {
    const { id, ...fields } = r;
    if (id) {
      const res = check(await sb.from('reservations').update(fields).eq('id', id).select('id'));
      if (!res.length) throw new Error('No tenés permiso para modificar este turno.');
    } else check(await sb.from('reservations').insert(fields));
  },
  async deleteReservation(id) {
    const res = check(await sb.from('reservations').delete().eq('id', id).select('id'));
    if (!res.length) throw new Error('No tenés permiso para borrar este turno.');
  },
};
