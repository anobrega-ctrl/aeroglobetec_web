// Modo demo: imita la API de Supabase con datos de ejemplo guardados en localStorage.
// Sirve para probar la interfaz sin login. Repite las reglas principales de permisos
// de supabase/schema.sql, pero la seguridad real está solo en la base de datos.

const KEY = 'age-demo-v2';
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const ago = (h) => new Date(Date.now() - h * 3600000).toISOString();

function seed() {
  const people = [
    { id: uid(), email: 'mnobrega@etec.um.edu.ar', full_name: 'Prof. Andrea Nóbrega', role: 'docente' },
    { id: uid(), email: 'lucia.perez@alumno.etec.um.edu.ar', full_name: 'Lucía Pérez', role: 'lider' },
    { id: uid(), email: 'tomas.diaz@alumno.etec.um.edu.ar', full_name: 'Tomás Díaz', role: 'estudiante' },
    { id: uid(), email: 'sofia.ruiz@alumno.etec.um.edu.ar', full_name: 'Sofía Ruiz', role: 'estudiante' },
    { id: uid(), email: 'mateo.gomez@alumno.etec.um.edu.ar', full_name: 'Mateo Gómez', role: 'estudiante' },
    { id: uid(), email: 'valen.sosa@alumno.etec.um.edu.ar', full_name: 'Valentina Sosa', role: 'estudiante' },
    { id: uid(), email: 'mal.gimenez@alumno.etec.um.edu.ar', full_name: 'Mal Giménez', role: 'estudiante', is_admin: true },
  ].map(p => ({ is_admin: false, ...p, avatar_url: null, created_at: ago(500) }));
  const [doc, lider, tomas, sofia, mateo, valen] = people.map(p => p.id);
  const P = uid();
  const areas = [
    { id: uid(), project_id: P, name: 'Mecánica', description: 'Chasis, ruedas y mecanismo de despliegue', color: '#3774bc', member_ids: [tomas, mateo] },
    { id: uid(), project_id: P, name: 'Electrónica', description: 'Motores, drivers y batería', color: '#ffb454', member_ids: [sofia] },
    { id: uid(), project_id: P, name: 'Software', description: 'Firmware y estación de tierra', color: '#4fbf8b', member_ids: [lider, valen] },
  ];
  const [mec, ele, sw] = areas.map(a => a.id);
  const M1 = uid(), M2 = uid(), M3 = uid();
  const t = (title, area, assignee, status, due, priority = 2, milestone = null, extra = {}) => ({
    id: uid(), project_id: P, area_id: area, milestone_id: milestone, title, description: '', status, priority,
    assignee_id: assignee, due_date: due, created_by: doc, created_at: ago(200),
    completed_at: status === 'hecha' ? ago(30) : null, ...extra,
  });
  const tasks = [
    t('Diseño CAD del chasis', mec, tomas, 'hecha', day(-6), 1, M1),
    t('Mecanismo de ruedas desplegables', mec, mateo, 'en_curso', day(5), 1, M2),
    t('Imprimir soportes de motores', mec, tomas, 'pendiente', day(12), 2, M2),
    t('Elegir motores y drivers', ele, sofia, 'hecha', day(-10), 1, M1),
    t('Esquema de alimentación', ele, sofia, 'en_revision', day(2), 1, M2),
    t('Medir consumo de motores', ele, sofia, 'pendiente', day(-2), 2),
    t('Firmware de tracción (ESP32)', sw, valen, 'en_curso', day(8), 1, M2),
    t('Interfaz de la estación de tierra', sw, lider, 'pendiente', day(20), 2, M3),
    t('Leer el reglamento del CATE', null, null, 'hecha', day(-14), 3, M1),
  ];
  const u = (title, body, area, author, status, score, feedback, h, task = null) => ({
    id: uid(), project_id: P, area_id: area, task_id: task, author_id: author, title, body, attachments: [],
    status, score, feedback, reviewed_by: status === 'pendiente' ? null : doc, reviewed_at: status === 'pendiente' ? null : ago(h - 5), created_at: ago(h),
  });
  const updates = [
    u('Primera versión del chasis', 'Terminé el CAD del chasis en Fusion. Dejo capturas y el archivo STEP.', mec, tomas, 'aprobado', 9, 'Muy prolijo. Revisá el espesor de las paredes.', 120, tasks[0].id),
    u('Comparación de motores', 'Comparé N20 vs TT. Recomiendo N20 de 300 rpm por tamaño y consumo.', ele, sofia, 'aprobado', 8, 'Bien justificado.', 150, tasks[3].id),
    u('Bisagras de las ruedas', 'Probé dos diseños de bisagra. El segundo traba mejor.', mec, mateo, 'cambios', null, 'Falta una foto de la prueba y medir el ángulo.', 40, tasks[1].id),
    u('Esquema de alimentación v1', 'Subo el esquema con regulador buck de 5 V.', ele, sofia, 'pendiente', null, '', 6, tasks[4].id),
    u('Tracción básica funcionando', 'El ESP32 ya mueve los 4 motores con PWM.', sw, valen, 'aprobado', 7, 'Bien. Falta el control de giro.', 70, tasks[6].id),
  ];
  const project = { id: P, name: 'Dron Rover CATE 2027', description: 'Dron tipo autito que se despliega en la zona de misión y explora como rover.', color: '#3774bc', archived: false, created_by: doc, created_at: ago(400) };
  const P2 = uid();
  const project2 = { id: P2, name: 'Globo sonda', description: 'Medición de variables atmosféricas.', color: '#9b7bf0', archived: false, created_by: doc, created_at: ago(900) };
  return {
    me: lider,
    profiles: people,
    projects: [project, project2],
    members: [[P, doc], [P, lider], [P, tomas], [P, sofia], [P, mateo], [P, valen], [P2, doc], [P2, valen]].map(([project_id, user_id]) => ({ project_id, user_id })),
    areas,
    milestones: [
      { id: M1, project_id: P, title: 'Requisitos y concepto cerrados', due_date: day(-5), done: true, created_at: ago(400) },
      { id: M2, project_id: P, title: 'Prototipo funcionando', due_date: day(25), done: false, created_at: ago(400) },
      { id: M3, project_id: P, title: 'CATE 2027', due_date: '2027-04-15', done: false, created_at: ago(400) },
    ],
    tasks,
    updates,
    comments: [{ id: uid(), update_id: updates[0].id, author_id: lider, body: '¡Quedó genial!', created_at: ago(100) }],
    files: [],
    inventory: [
      { id: uid(), project_id: P, name: 'Motor N20 300 rpm', quantity: 4, unit_cost: 4500, status: 'recibido', responsible_id: sofia, link: '', notes: '', created_at: ago(100) },
      { id: uid(), project_id: P, name: 'ESP32 DevKit', quantity: 2, unit_cost: 9000, status: 'en_uso', responsible_id: valen, link: '', notes: '', created_at: ago(100) },
      { id: uid(), project_id: P, name: 'Batería LiPo 2S 1500 mAh', quantity: 1, unit_cost: 18000, status: 'pedido', responsible_id: sofia, link: '', notes: 'Pedida por ML', created_at: ago(50) },
      { id: uid(), project_id: P, name: 'Filamento PETG', quantity: 1, unit_cost: 22000, status: 'necesario', responsible_id: tomas, link: '', notes: '', created_at: ago(20) },
    ],
    activity: [
      { id: 1, project_id: P, actor_id: doc, kind: 'tarea', message: 'Creó la tarea "Diseño CAD del chasis"', created_at: ago(200) },
      { id: 2, project_id: P, actor_id: tomas, kind: 'avance', message: 'Subió el avance "Primera versión del chasis"', created_at: ago(120) },
      { id: 3, project_id: P, actor_id: doc, kind: 'revision', message: 'Aprobó el avance "Primera versión del chasis" de Tomás Díaz', created_at: ago(115) },
      { id: 4, project_id: P, actor_id: sofia, kind: 'avance', message: 'Subió el avance "Esquema de alimentación v1"', created_at: ago(6) },
    ],
    notifications: [
      { id: 1, user_id: lider, project_id: P, message: '"Esquema de alimentación" está lista para revisar', link: `#/proyecto/${P}/tareas`, read: false, created_at: ago(5) },
      { id: 2, user_id: lider, project_id: P, message: 'Te asignaron la tarea "Interfaz de la estación de tierra"', link: `#/proyecto/${P}/tareas`, read: true, created_at: ago(60) },
    ],
    seq: 100,
  };
}

let db = load();
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s?.profiles) return s; } catch { /* sin datos guardados */ }
  return seed();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* almacenamiento bloqueado */ } }
const clone = (x) => JSON.parse(JSON.stringify(x));
const meP = () => db.profiles.find(p => p.id === db.me);
const staff = () => !!meP()?.is_admin || ['docente', 'lider'].includes(meP()?.role);
const deny = () => { throw new Error('No tenés permiso para hacer eso.'); };
const isMember = (pid, u = db.me) => db.members.some(m => m.project_id === pid && m.user_id === u);
const canView = (pid) => staff() || isMember(pid);
const nm = (id) => { const p = db.profiles.find(x => x.id === id); return p ? (p.full_name || p.email) : ''; };
const projName = (pid) => db.projects.find(p => p.id === pid)?.name;

function log(project_id, kind, message) {
  db.activity.push({ id: ++db.seq, project_id, actor_id: db.me, kind, message, created_at: now() });
}
function notify(user_id, project_id, message, link) {
  if (!user_id || user_id === db.me) return;
  db.notifications.push({ id: ++db.seq, user_id, project_id, message, link, read: false, created_at: now() });
}
const withProject = (row) => ({ ...row, projects: (({ name, color }) => ({ name, color }))(db.projects.find(p => p.id === row.project_id) || {}) });

export const api = {
  demo: true,

  // ---------- Sesión (en demo se elige el usuario) ----------
  async session() { return db.me ? { user: { id: db.me } } : null; },
  async authError() { return null; },
  async providers() { return { google: false, email: false }; },
  async verifyCode() { throw new Error('En modo demo elegí un usuario de la lista.'); },
  onAuthChange() {},
  async signInWithGoogle() { db.me = db.profiles[0].id; save(); location.reload(); },
  async signInWithEmail() { throw new Error('En modo demo elegí un usuario de la lista.'); },
  async signOut() { db.me = null; save(); },
  demoUsers() { return clone(db.profiles); },
  demoLogin(id) { db.me = id; save(); },
  demoReset() { db = seed(); save(); },

  // ---------- Perfiles ----------
  async me() { return clone(meP() || null); },
  async profiles() { return clone(db.profiles).sort((a, b) => a.full_name.localeCompare(b.full_name)); },
  async setRole(userId, role) {
    const admin = meP().is_admin;
    if (!admin && meP().role !== 'docente') deny();
    const p = db.profiles.find(x => x.id === userId);
    if (!admin && (p.role === 'docente' || role === 'docente')) throw new Error('El rol docente lo da el dominio del email');
    p.role = role; save();
  },
  async updateMyName(userId, full_name) { db.profiles.find(p => p.id === userId).full_name = full_name; save(); },

  // ---------- Proyectos ----------
  async projects() {
    return clone(db.projects.filter(p => canView(p.id)).map(p => ({ ...p, project_members: db.members.filter(m => m.project_id === p.id).map(m => ({ user_id: m.user_id })) })))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async project(id) { return canView(id) ? clone(db.projects.find(p => p.id === id) || null) : null; },
  async createProject(p) {
    if (!staff()) deny();
    const row = { id: uid(), description: '', color: '#3774bc', archived: false, ...p, created_by: db.me, created_at: now() };
    db.projects.push(row);
    db.members.push({ project_id: row.id, user_id: db.me });
    save(); return clone(row);
  },
  async updateProject(id, patch) { if (!staff()) deny(); Object.assign(db.projects.find(p => p.id === id), patch); save(); },
  async deleteProject(id) {
    if (!staff()) deny();
    const areaIds = db.areas.filter(a => a.project_id === id).map(a => a.id);
    for (const k of ['members', 'areas', 'milestones', 'tasks', 'updates', 'files', 'inventory', 'activity', 'notifications']) {
      db[k] = db[k].filter(r => r.project_id !== id);
    }
    db.areas = db.areas.filter(a => !areaIds.includes(a.id));
    db.projects = db.projects.filter(p => p.id !== id); save();
  },

  // ---------- Equipo ----------
  async members(pid) {
    return clone(db.members.filter(m => m.project_id === pid).map(m => db.profiles.find(p => p.id === m.user_id)))
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  },
  async addMembers(pid, ids) {
    if (!staff()) deny();
    for (const user_id of ids) {
      if (isMember(pid, user_id)) continue;
      db.members.push({ project_id: pid, user_id });
      log(pid, 'equipo', `Sumó a ${nm(user_id)} al proyecto`);
      notify(user_id, pid, `Te sumaron al proyecto "${projName(pid)}"`, `#/proyecto/${pid}`);
    }
    save();
  },
  async removeMember(pid, userId) {
    if (!staff()) deny();
    db.members = db.members.filter(m => !(m.project_id === pid && m.user_id === userId));
    db.areas.filter(a => a.project_id === pid).forEach(a => { a.member_ids = a.member_ids.filter(x => x !== userId); });
    log(pid, 'equipo', `Sacó a ${nm(userId)} del proyecto`); save();
  },

  // ---------- Áreas ----------
  async areas(pid) { return clone(db.areas.filter(a => a.project_id === pid)).sort((a, b) => a.name.localeCompare(b.name)); },
  async saveArea(area, memberIds) {
    if (!staff()) deny();
    let row = db.areas.find(a => a.id === area.id);
    if (row) Object.assign(row, area);
    else { row = { id: uid(), description: '', color: '#7caef3', ...area }; db.areas.push(row); log(row.project_id, 'area', `Creó el área "${row.name}"`); }
    row.member_ids = memberIds.filter(id => isMember(row.project_id, id));
    save(); return clone(row);
  },
  async deleteArea(id) {
    if (!staff()) deny();
    db.areas = db.areas.filter(a => a.id !== id);
    db.tasks.forEach(t => { if (t.area_id === id) t.area_id = null; });
    db.updates.forEach(u => { if (u.area_id === id) u.area_id = null; });
    save();
  },

  // ---------- Hitos ----------
  async milestones(pid) { return clone(db.milestones.filter(m => m.project_id === pid)).sort((a, b) => a.due_date.localeCompare(b.due_date)); },
  async upcomingMilestones() {
    return clone(db.milestones.filter(m => !m.done && canView(m.project_id)).map(withProject)).sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 6);
  },
  async saveMilestone(m) {
    if (!staff()) deny();
    const row = db.milestones.find(x => x.id === m.id);
    if (row) { if (m.done && !row.done) log(row.project_id, 'hito', `Cumplió el hito "${row.title}"`); Object.assign(row, m); }
    else { db.milestones.push({ id: uid(), done: false, created_at: now(), ...m }); log(m.project_id, 'hito', `Agregó el hito "${m.title}"`); }
    save();
  },
  async deleteMilestone(id) { if (!staff()) deny(); db.milestones = db.milestones.filter(m => m.id !== id); save(); },

  // ---------- Tareas ----------
  async tasks(pid) { return clone(db.tasks.filter(t => t.project_id === pid)); },
  async myTasks(userId) { return clone(db.tasks.filter(t => t.assignee_id === userId && t.status !== 'hecha').map(withProject)); },
  async reviewQueue() {
    return {
      tasks: clone(db.tasks.filter(t => t.status === 'en_revision' && canView(t.project_id)).map(withProject)),
      updates: clone(db.updates.filter(u => u.status === 'pendiente' && canView(u.project_id)).map(withProject)),
    };
  },
  async saveTask(t) {
    if (!staff()) deny();
    if (t.assignee_id && !isMember(t.project_id, t.assignee_id)) throw new Error('La persona asignada no es miembro del proyecto');
    const row = db.tasks.find(x => x.id === t.id);
    const link = `#/proyecto/${t.project_id}/tareas`;
    if (row) {
      if (t.assignee_id && t.assignee_id !== row.assignee_id) notify(t.assignee_id, row.project_id, `Te asignaron la tarea "${t.title}"`, link);
      Object.assign(row, t);
    } else {
      db.tasks.push({ id: uid(), status: 'pendiente', priority: 2, description: '', created_by: db.me, created_at: now(), completed_at: null, ...t });
      log(t.project_id, 'tarea', `Creó la tarea "${t.title}"`);
      notify(t.assignee_id, t.project_id, `Te asignaron la tarea "${t.title}"`, link);
    }
    save();
  },
  async setTaskStatus(id, status) {
    const t = db.tasks.find(x => x.id === id);
    if (!staff()) {
      if (t.assignee_id !== db.me) deny();
      if (status === 'hecha') throw new Error('Mandala a revisión: un docente o líder la marca como hecha');
      if (t.status === 'hecha') throw new Error('Esta tarea ya está hecha: solo un docente o líder la puede reabrir');
    }
    if (t.status === status) return;
    t.status = status;
    t.completed_at = status === 'hecha' ? now() : null;
    log(t.project_id, 'tarea', `Movió "${t.title}" a ${status.replace('_', ' ')}`);
    const link = `#/proyecto/${t.project_id}/tareas`;
    if (status === 'en_revision') notify(t.created_by, t.project_id, `"${t.title}" está lista para revisar`, link);
    if (status === 'hecha') notify(t.assignee_id, t.project_id, `Tu tarea "${t.title}" quedó como hecha`, link);
    save();
  },
  async deleteTask(id) { if (!staff()) deny(); db.tasks = db.tasks.filter(t => t.id !== id); save(); },

  // ---------- Avances ----------
  async updates(pid) {
    return clone(db.updates.filter(u => u.project_id === pid).map(u => ({ ...u, comments: [{ count: db.comments.filter(c => c.update_id === u.id).length }] })))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async uploadFiles(pid, folder, files) {
    return Promise.all(files.map(f => new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve({ path: r.result, name: f.name, size: f.size });
      r.readAsDataURL(f.size < 400000 ? f : new Blob(['Archivo demasiado grande para el modo demo']));
    })));
  },
  async createUpdate(u, files = []) {
    if (!canView(u.project_id)) deny();
    const attachments = await this.uploadFiles(u.project_id, 'avances', files);
    db.updates.push({ id: uid(), area_id: null, task_id: null, body: '', ...u, author_id: db.me, attachments, status: 'pendiente', score: null, feedback: '', reviewed_by: null, reviewed_at: null, created_at: now() });
    log(u.project_id, 'avance', `Subió el avance "${u.title}"`); save();
  },
  async editUpdate(id, patch, pid, newFiles = [], keep = []) {
    const u = db.updates.find(x => x.id === id);
    if (!staff() && u.author_id !== db.me) deny();
    if (!staff() && u.status === 'aprobado') throw new Error('Este avance ya fue aprobado y no se puede editar');
    Object.assign(u, patch, { attachments: [...keep, ...(await this.uploadFiles(pid, 'avances', newFiles))] });
    if (!staff()) u.status = 'pendiente';
    save();
  },
  async reviewUpdate(id, { status, score, feedback }) {
    if (!staff()) throw new Error('Solo un docente o líder puede revisar avances');
    const u = db.updates.find(x => x.id === id);
    Object.assign(u, { status, score: score ? Number(score) : null, feedback, reviewed_by: db.me, reviewed_at: now() });
    if (status !== 'pendiente') {
      log(u.project_id, 'revision', `${status === 'aprobado' ? 'Aprobó' : 'Pidió cambios en'} el avance "${u.title}" de ${nm(u.author_id)}`);
      notify(u.author_id, u.project_id, `${status === 'aprobado' ? 'Aprobaron tu avance' : 'Pidieron cambios en tu avance'} "${u.title}"`, `#/proyecto/${u.project_id}/avances`);
    }
    save();
  },
  async deleteUpdate(u) {
    if (!staff() && (u.author_id !== db.me || u.status === 'aprobado')) deny();
    db.updates = db.updates.filter(x => x.id !== u.id); save();
  },
  async fileUrl(path) { return path; },

  // ---------- Comentarios ----------
  async comments(updateId) { return clone(db.comments.filter(c => c.update_id === updateId)).sort((a, b) => a.created_at.localeCompare(b.created_at)); },
  async addComment(updateId, body) {
    const u = db.updates.find(x => x.id === updateId);
    db.comments.push({ id: uid(), update_id: updateId, author_id: db.me, body, created_at: now() });
    notify(u.author_id, u.project_id, `Nuevo comentario en tu avance "${u.title}"`, `#/proyecto/${u.project_id}/avances`);
    save();
  },

  // ---------- Archivos ----------
  async files(pid) { return clone(db.files.filter(f => f.project_id === pid)); },
  async uploadProjectFiles(pid, folder, files) {
    const up = await this.uploadFiles(pid, 'archivos', files);
    for (const f of up) {
      db.files.push({ id: uid(), project_id: pid, folder: folder || 'General', uploaded_by: db.me, created_at: now(), ...f });
      log(pid, 'archivo', `Subió el archivo "${f.name}"`);
    }
    save();
  },
  async deleteFile(file) {
    if (!staff() && file.uploaded_by !== db.me) deny();
    db.files = db.files.filter(f => f.id !== file.id); save();
  },

  // ---------- Inventario ----------
  async inventory(pid) { return clone(db.inventory.filter(i => i.project_id === pid)); },
  async saveItem(item) {
    const row = db.inventory.find(x => x.id === item.id);
    if (row) {
      if (item.status && item.status !== row.status) log(row.project_id, 'inventario', `"${row.name}" pasó a ${item.status.replace('_', ' ')}`);
      Object.assign(row, item);
    } else {
      db.inventory.push({ id: uid(), quantity: 1, unit_cost: 0, status: 'necesario', link: '', notes: '', created_at: now(), ...item });
      log(item.project_id, 'inventario', `Agregó "${item.name}" al inventario`);
    }
    save();
  },
  async deleteItem(id) { if (!staff()) deny(); db.inventory = db.inventory.filter(i => i.id !== id); save(); },

  // ---------- Bitácora y notificaciones ----------
  async activity(pid) { return clone(db.activity.filter(a => a.project_id === pid)).sort((a, b) => b.created_at.localeCompare(a.created_at)); },
  async notifications() { return clone(db.notifications.filter(n => n.user_id === db.me)).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 30); },
  async markRead(ids) { db.notifications.forEach(n => { if (ids.includes(n.id)) n.read = true; }); save(); },

  // ---------- Rendimiento (misma fórmula que la base de datos) ----------
  async studentPerformance(pid) {
    if (!canView(pid)) return [];
    const rows = db.members.filter(m => m.project_id === pid).map(m => {
      const p = db.profiles.find(x => x.id === m.user_id);
      const ts = db.tasks.filter(t => t.project_id === pid && t.assignee_id === p.id);
      const done = ts.filter(t => t.status === 'hecha');
      const onTime = done.filter(t => !t.due_date || t.completed_at.slice(0, 10) <= t.due_date);
      const today = new Date().toISOString().slice(0, 10);
      const ups = db.updates.filter(u => u.project_id === pid && u.author_id === p.id);
      const approved = ups.filter(u => u.status === 'aprobado');
      const scored = approved.filter(u => u.score);
      const avg = scored.length ? Math.round(scored.reduce((s, u) => s + u.score, 0) / scored.length * 10) / 10 : null;
      let score = null;
      if (ts.length || avg !== null) {
        const raw = (ts.length ? 50 * done.length / ts.length : 0) + (avg !== null ? 3 * avg : 0) + (done.length ? 20 * onTime.length / done.length : 0);
        score = Math.round(raw * 100 / ((ts.length ? 70 : 0) + (avg !== null ? 30 : 0)));
      }
      return {
        user_id: p.id, full_name: p.full_name, email: p.email,
        tasks_assigned: ts.length, tasks_done: done.length, tasks_on_time: onTime.length,
        tasks_overdue: ts.filter(t => t.status !== 'hecha' && t.due_date && t.due_date < today).length,
        updates_total: ups.length, updates_approved: approved.length, avg_score: avg, score,
      };
    });
    return clone(staff() ? rows : rows.filter(r => r.user_id === db.me)).sort((a, b) => a.full_name.localeCompare(b.full_name));
  },
  async areaPerformance(pid) {
    const today = new Date().toISOString().slice(0, 10);
    return db.areas.filter(a => a.project_id === pid).map(a => {
      const ts = db.tasks.filter(t => t.area_id === a.id);
      const ups = db.updates.filter(u => u.area_id === a.id);
      const approved = ups.filter(u => u.status === 'aprobado');
      const scored = approved.filter(u => u.score);
      return {
        area_id: a.id, area_name: a.name, color: a.color, members: a.member_ids.length,
        tasks_total: ts.length, tasks_done: ts.filter(t => t.status === 'hecha').length,
        tasks_overdue: ts.filter(t => t.status !== 'hecha' && t.due_date && t.due_date < today).length,
        updates_total: ups.length, updates_approved: approved.length,
        avg_score: scored.length ? Math.round(scored.reduce((s, u) => s + u.score, 0) / scored.length * 10) / 10 : null,
        progress: ts.length ? Math.round(100 * ts.filter(t => t.status === 'hecha').length / ts.length) : 0,
      };
    }).sort((a, b) => a.area_name.localeCompare(b.area_name));
  },
};
