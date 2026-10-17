// Detalle de una charla o competencia: resumen, materiales, preparación y equipo.
import {
  esc, icon, name, avatar, isStaff, field, options, openForm, confirmAction, toast, errorMessage,
  fmtDate, daysUntil, dueLabel, fileSize, emptyState, embedUrl,
} from '../ui.js?v=202610172024';
import { KIND, EVENT_STATUS, editEvent } from './eventos.js?v=202610172024';

const MATERIAL = {
  presentacion: ['Presentaciones', 'presentation'],
  infografia: ['Infografías', 'image'],
  video: ['Videos', 'play'],
  documento: ['Documentos', 'file'],
  enlace: ['Enlaces', 'link'],
};
const SINGULAR = { presentacion: 'Presentación', infografia: 'Infografía', video: 'Video', documento: 'Documento', enlace: 'Enlace' };
const isImage = (u) => /\.(png|jpe?g|webp|gif|svg)(\?|#|$)/i.test(u || '');
const TABS = [['resumen', 'Resumen'], ['materiales', 'Materiales'], ['preparacion', 'Preparación'], ['equipo', 'Equipo y proyectos']];

export async function renderEvento(el, ctx) {
  const { api, me, params } = ctx;
  const [id, tabParam] = params;
  const tab = TABS.find(t => t[0] === tabParam)?.[0] || 'resumen';
  const staff = isStaff(me);
  const [ev, members, projects, materials, tasks] = await Promise.all([
    api.event(id), api.eventMembers(id), api.eventProjects(id), api.eventMaterials(id), api.eventTasks(id),
  ]);
  if (!ev) {
    el.innerHTML = '<div class="page"><div class="empty"><strong>No encontramos este evento</strong><p>Puede que no estés en su equipo. <a href="#/eventos">Volver</a></p></div></div>';
    return;
  }
  const member = (uid) => members.find(m => m.id === uid);
  const when = ev.ends_on && ev.ends_on !== ev.starts_on ? `${fmtDate(ev.starts_on)} al ${fmtDate(ev.ends_on)}` : fmtDate(ev.starts_on);
  const reload = () => ctx.reload();

  el.innerHTML = `
    <div class="page">
      <header class="project-head" style="--c:${esc(ev.color)}">
        <div>
          <a class="crumb" href="#/eventos">← Charlas y competencias</a>
          <h1>${esc(ev.title)}</h1>
          <p class="muted">${KIND[ev.kind]} · ${esc(when)}${ev.location ? ` · ${esc(ev.location)}` : ''}${ev.organizer ? ` · Organiza ${esc(ev.organizer)}` : ''}</p>
        </div>
        <div class="head-actions">
          <span class="status-pill ${ev.status}">${EVENT_STATUS[ev.status]}</span>
          ${ev.website ? `<a class="btn ghost" href="${esc(ev.website)}" target="_blank" rel="noopener noreferrer">Página del evento ${icon('external')}</a>` : ''}
          ${staff ? '<button class="btn ghost" id="edit-ev">Editar</button><button class="btn ghost danger-text" id="del-ev">Borrar</button>' : ''}
        </div>
      </header>
      <nav class="tabs">${TABS.map(([k, l]) => `<a href="#/evento/${id}/${k}" class="${k === tab ? 'active' : ''}">${l}</a>`).join('')}</nav>
      <div id="ev-tab"></div>
    </div>`;

  el.querySelector('#edit-ev')?.addEventListener('click', async () => { if (await editEvent(api, ev)) reload(); });
  el.querySelector('#del-ev')?.addEventListener('click', async () => {
    if (!await confirmAction('Borrar evento', `Se borra "${ev.title}" con sus materiales y su lista de preparación. No se puede deshacer.`)) return;
    try { await api.deleteEvent(id); toast('Evento borrado'); location.hash = '#/eventos'; } catch (e) { toast(errorMessage(e), 'error'); }
  });

  const body = el.querySelector('#ev-tab');

  // ---------- Resumen ----------
  function resumen() {
    const n = daysUntil(ev.starts_on);
    const done = tasks.filter(t => t.done).length;
    body.innerHTML = `
      <div class="stats">
        <div class="stat"><b>${ev.status === 'realizado' ? '✓' : n < 0 ? '—' : n}</b><span>${ev.status === 'realizado' ? 'Realizado' : n < 0 ? 'Ya pasó' : n === 1 ? 'día' : 'días'}</span></div>
        <div class="stat"><b>${done}/${tasks.length}</b><span>Preparación</span><div class="bar"><i style="width:${tasks.length ? Math.round(100 * done / tasks.length) : 0}%"></i></div></div>
        <div class="stat"><b>${materials.length}</b><span>Materiales</span></div>
        <div class="stat"><b>${members.length}</b><span>En el equipo</span></div>
      </div>
      <div class="two-col">
        <section class="panel">
          <h2>De qué se trata</h2>
          ${ev.description ? `<p class="pre">${esc(ev.description)}</p>` : '<p class="muted">Sin descripción.</p>'}
          <h2 class="sub-title">Proyectos que se presentan</h2>
          ${projects.length ? `<ul class="list">${projects.map(projectRow).join('')}</ul>` : '<p class="muted">Todavía no hay proyectos asignados.</p>'}
        </section>
        <section class="panel">
          <h2>Próximas tareas</h2>
          ${tasks.filter(t => !t.done).slice(0, 5).map(t => `
            <div class="row-link"><span class="grow"><strong>${esc(t.title)}</strong><small>${esc(t.assignee_id ? name(member(t.assignee_id)) : 'Sin responsable')}</small></span>${dueLabel(t.due_date)}</div>`).join('')
            || '<p class="muted">No hay tareas pendientes.</p>'}
          <h2 class="sub-title">Último material</h2>
          ${materials.slice(0, 4).map(m => `<div class="row-link">${icon(MATERIAL[m.kind][1])}<span class="grow"><strong>${esc(m.title)}</strong><small>${MATERIAL[m.kind][0]} · ${esc(name(member(m.author_id)))}</small></span></div>`).join('')
            || '<p class="muted">Todavía no se subió material.</p>'}
        </section>
      </div>`;
  }

  function projectRow(p) {
    const label = p.project_id ? (p.projects?.name || 'Proyecto') : p.name;
    const link = p.project_id ? `<a href="#/proyecto/${p.project_id}">${esc(label)}</a>` : `${esc(label)} <span class="badge gray">Fuera del panel</span>`;
    return `<li class="row-link"><span class="dot-c" style="--c:${esc(p.projects?.color || '#8b95a4')}"></span><span class="grow"><strong>${link}</strong>${p.note ? `<small>${esc(p.note)}</small>` : ''}</span>
      ${staff && tab === 'equipo' ? `<button class="icon-btn" data-delproj="${p.id}" aria-label="Quitar proyecto" title="Quitar">✕</button>` : ''}</li>`;
  }

  // ---------- Materiales ----------
  function materiales() {
    body.innerHTML = `
      <div class="toolbar"><p class="muted grow">Presentaciones de Canva o Google Slides, infografías, videos y documentos. Los links de Canva, Google y YouTube se pueden ver acá mismo.</p>
        <button class="btn primary" id="add-mat">${icon('plus')} Agregar material</button></div>
      ${materials.length ? Object.entries(MATERIAL).map(([k, [label, ic]]) => {
        const list = materials.filter(m => m.kind === k);
        if (!list.length) return '';
        return `<section class="panel"><h2>${icon(ic)}${label}</h2>
          ${k === 'infografia' ? `<div class="infografias">${list.map(m => `
            <figure data-mat="${m.id}"><div class="thumb" data-thumb="${m.id}">${m.url ? (isImage(m.url) ? `<img src="${esc(m.url)}" alt="" loading="lazy" referrerpolicy="no-referrer"/>` : icon('link')) : ''}</div>
              <figcaption><span>${esc(m.title)}</span>${canDel(m) ? `<button class="icon-btn" data-delmat="${m.id}" aria-label="Borrar">✕</button>` : ''}</figcaption></figure>`).join('')}</div>`
          : `<ul class="files">${list.map(m => `
            <li><span class="grow"><strong>${esc(m.title)}</strong><small class="muted">${esc(name(member(m.author_id)))} · ${fmtDate(m.created_at)}${m.size ? ` · ${fileSize(m.size)}` : ''}</small></span>
              ${(m.url && embedUrl(m.url)) || (m.path && /\.pdf$/i.test(m.path)) ? `<button class="btn small" data-view="${m.id}">Ver acá</button>` : ''}
              <button class="btn small ghost" data-open="${m.id}">Abrir ${icon('external')}</button>
              ${canDel(m) ? `<button class="icon-btn" data-delmat="${m.id}" aria-label="Borrar" title="Borrar">✕</button>` : ''}</li>`).join('')}</ul>`}
        </section>`;
      }).join('') : emptyState('Todavía no hay material', 'Subí la presentación, la infografía o el link de Canva.')}`;

    // Miniaturas de infografías subidas como archivo
    materials.filter(m => m.kind === 'infografia' && m.path).forEach(async (m) => {
      try {
        const url = await api.fileUrl(m.path);
        const box = body.querySelector(`[data-thumb="${m.id}"]`);
        if (box) box.innerHTML = `<img src="${esc(url)}" alt="" loading="lazy"/>`;
      } catch { /* sin miniatura */ }
    });

    body.querySelector('#add-mat').addEventListener('click', addMaterial);
  }
  const canDel = (m) => staff || m.author_id === me.id;

  async function addMaterial() {
    const data = await openForm({
      title: 'Agregar material',
      body: `
        ${field('Tipo', `<select name="kind">${options(Object.entries(SINGULAR).map(([value, label]) => ({ value, label })), 'presentacion')}</select>`)}
        ${field('Título', '<input name="title" required maxlength="120" placeholder="Ej: Presentación final"/>')}
        ${field('Link', '<input type="url" name="url" placeholder="https://www.canva.com/design/…"/>', 'Canva: Compartir → "Copiar enlace de vista". Google Slides: el link de compartir.')}
        ${field('O subir un archivo', '<input type="file" name="file" accept=".pdf,.pptx,.ppt,.key,.odp,.png,.jpg,.jpeg,.webp,.docx,.mp4"/>', 'Hasta 50 MB.')}`,
    });
    if (!data) return;
    const file = data.file?.[0];
    if (!file && !data.url) { toast('Poné un link o subí un archivo', 'error'); return; }
    if (data.url && !/^https?:\/\//.test(data.url)) { toast('El link tiene que empezar con https://', 'error'); return; }
    try {
      if (file) toast('Subiendo…');
      await api.addEventMaterial({ event_id: id, kind: data.kind, title: data.title, url: file ? '' : data.url }, file);
      toast('Material agregado');
      reload();
    } catch (e) { toast(errorMessage(e), 'error'); }
  }

  // ---------- Preparación ----------
  function preparacion() {
    body.innerHTML = `
      <div class="toolbar"><span class="grow"></span><button class="btn primary" id="add-task">${icon('plus')} Agregar tarea</button></div>
      ${tasks.length ? `<ul class="checklist">${tasks.map(t => `
        <li class="${t.done ? 'done' : ''}">
          <label class="check"><input type="checkbox" data-done="${t.id}" ${t.done ? 'checked' : ''}/> <span>${esc(t.title)}</span></label>
          <span class="grow"></span>
          ${t.assignee_id ? `<span class="who">${avatar(member(t.assignee_id), 'xs')}${esc(name(member(t.assignee_id)).split(' ')[0])}</span>` : '<small class="muted">Sin responsable</small>'}
          ${dueLabel(t.due_date, t.done)}
          <button class="link-btn" data-edittask="${t.id}">Editar</button>
          ${staff ? `<button class="icon-btn" data-deltask="${t.id}" aria-label="Borrar" title="Borrar">✕</button>` : ''}
        </li>`).join('')}</ul>` : emptyState('No hay tareas de preparación', 'Por ejemplo: leer el reglamento, armar la infografía, ensayar la charla.')}`;
    body.querySelector('#add-task').addEventListener('click', () => editTask(null));
  }

  async function editTask(t) {
    const data = await openForm({
      title: t ? 'Editar tarea' : 'Agregar tarea',
      body: `
        ${field('Qué hay que hacer', `<input name="title" required maxlength="160" value="${esc(t?.title)}"/>`)}
        <div class="grid-2">
          ${field('Responsable', `<select name="assignee_id">${options(members.map(m => ({ value: m.id, label: name(m) })), t?.assignee_id, { empty: 'Sin responsable' })}</select>`)}
          ${field('Para cuándo', `<input type="date" name="due_date" value="${esc(t?.due_date || '')}"/>`)}
        </div>`,
    });
    if (!data) return;
    try {
      await api.saveEventTask({ ...(t ? { id: t.id } : { event_id: id }), title: data.title, assignee_id: data.assignee_id || null, due_date: data.due_date || null });
      toast('Tarea guardada');
      reload();
    } catch (e) { toast(errorMessage(e), 'error'); }
  }

  // ---------- Equipo y proyectos ----------
  function equipo() {
    body.innerHTML = `<div class="two-col">
      <section class="panel">
        <div class="panel-head"><h2>Equipo (${members.length})</h2>${staff ? '<button class="btn small primary" id="add-mem">Sumar</button>' : ''}</div>
        <ul class="people">${members.map(m => `
          <li>${avatar(m)}<span class="grow"><strong>${esc(name(m))}</strong><small class="muted">${esc(m.event_role || 'Sin rol')}</small></span>
            ${staff ? `<button class="link-btn" data-role="${m.id}">Rol</button><button class="icon-btn" data-delmem="${m.id}" aria-label="Sacar" title="Sacar del equipo">✕</button>` : ''}</li>`).join('')}</ul>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Proyectos (${projects.length})</h2>${staff ? '<button class="btn small primary" id="add-proj">Agregar</button>' : ''}</div>
        ${projects.length ? `<ul class="list">${projects.map(projectRow).join('')}</ul>` : '<p class="muted">Todavía no hay proyectos. Pueden ser del panel o de afuera.</p>'}
      </section>
    </div>`;
    body.querySelector('#add-mem')?.addEventListener('click', addMembers);
    body.querySelector('#add-proj')?.addEventListener('click', addProject);
  }

  async function addMembers() {
    const all = await api.profiles();
    const inEvent = new Set(members.map(m => m.id));
    const candidates = all.filter(p => !inEvent.has(p.id));
    const data = await openForm({
      title: 'Sumar al equipo',
      wide: true,
      body: candidates.length ? `
        ${field('Rol en el evento', '<input name="role" maxlength="60" placeholder="Ej: Expositor/a, Equipo técnico, Diseño"/>')}
        <input type="search" class="search" placeholder="Buscar…" aria-label="Buscar"/>
        <div class="check-list tall">${candidates.map(p => `
          <label class="check person" data-q="${esc((name(p) + ' ' + p.email).toLowerCase())}"><input type="checkbox" name="ids" value="${p.id}" data-multi/> ${avatar(p, 'xs')} ${esc(name(p))} <small class="muted">${esc(p.email)}</small></label>`).join('')}</div>`
        : '<p class="muted">Todas las personas registradas ya están en el equipo.</p>',
      submit: candidates.length ? 'Sumar' : '',
      onOpen: (dlg) => dlg.querySelector('.search')?.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        dlg.querySelectorAll('.person').forEach(l => { l.hidden = !l.dataset.q.includes(q); });
      }),
    });
    if (!data?.ids?.length) return;
    try { await api.addEventMembers(id, data.ids, data.role); toast('Equipo actualizado'); reload(); }
    catch (e) { toast(errorMessage(e), 'error'); }
  }

  async function addProject() {
    const mine = (await api.projects()).filter(p => !projects.some(x => x.project_id === p.id));
    const data = await openForm({
      title: 'Agregar proyecto',
      body: `
        ${field('Proyecto del panel', `<select name="project_id">${options(mine.map(p => ({ value: p.id, label: p.name })), '', { empty: 'Ninguno (es de afuera)' })}</select>`)}
        ${field('O nombre del proyecto', '<input name="name" maxlength="120" placeholder="Si no está en el panel"/>')}
        ${field('Nota', '<input name="note" maxlength="200" placeholder="Ej: categoría, stand, quién presenta"/>')}`,
    });
    if (!data) return;
    if (!data.project_id && !data.name) { toast('Elegí un proyecto o escribí su nombre', 'error'); return; }
    try {
      await api.addEventProject({ event_id: id, project_id: data.project_id || null, name: data.project_id ? '' : data.name, note: data.note });
      toast('Proyecto agregado');
      reload();
    } catch (e) { toast(errorMessage(e), 'error'); }
  }

  // ---------- Acciones comunes ----------
  body.addEventListener('change', async (e) => {
    const tid = e.target.dataset.done;
    if (!tid) return;
    try { await api.saveEventTask({ id: tid, done: e.target.checked }); reload(); }
    catch (err) { toast(errorMessage(err), 'error'); e.target.checked = !e.target.checked; }
  });
  body.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    const mat = materials.find(m => m.id === (d.view || d.open || d.delmat));
    try {
      if (d.view) await viewMaterial(mat);
      else if (d.open) window.open(mat.url || await api.fileUrl(mat.path), '_blank', 'noopener');
      else if (d.delmat && await confirmAction('Borrar material', `Se borra "${mat.title}".`)) { await api.deleteEventMaterial(mat); toast('Material borrado'); reload(); }
      else if (d.edittask) await editTask(tasks.find(t => t.id === d.edittask));
      else if (d.deltask && await confirmAction('Borrar tarea', 'Se borra de la lista de preparación.')) { await api.deleteEventTask(d.deltask); reload(); }
      else if (d.delmem) {
        const m = member(d.delmem);
        if (await confirmAction('Sacar del equipo', `${name(m)} deja de ver este evento.`, 'Sacar')) { await api.removeEventMember(id, m.id); reload(); }
      } else if (d.role) {
        const m = member(d.role);
        const r = await openForm({ title: `Rol de ${name(m)}`, body: field('Rol', `<input name="role" maxlength="60" value="${esc(m.event_role)}"/>`) });
        if (r) { await api.setEventRole(id, m.id, r.role); reload(); }
      } else if (d.delproj && await confirmAction('Quitar proyecto', 'Deja de figurar en este evento.', 'Quitar')) { await api.deleteEventProject(d.delproj); reload(); }
    } catch (err) { toast(errorMessage(err), 'error'); }
  });
  body.addEventListener('click', async (e) => {
    const fig = e.target.closest('figure[data-mat]');
    if (!fig || e.target.closest('button')) return;
    const m = materials.find(x => x.id === fig.dataset.mat);
    try { window.open(m.url || await api.fileUrl(m.path), '_blank', 'noopener'); } catch (err) { toast(errorMessage(err), 'error'); }
  });

  // Se arma la pestaña al final, cuando ya están definidas todas las funciones y variables
  ({ resumen, materiales, preparacion, equipo })[tab]();

  async function viewMaterial(m) {
    const src = m.url ? embedUrl(m.url) : await api.fileUrl(m.path);
    if (!src) return;
    await openForm({
      title: m.title,
      wide: true,
      submit: '',
      body: `<div class="embed"><iframe src="${esc(src)}" title="${esc(m.title)}" allow="fullscreen; autoplay; encrypted-media" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`,
    });
  }
}
