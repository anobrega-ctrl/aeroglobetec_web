import { esc, name, avatar, ROLE_LABEL, roleChip, field, openForm, confirmAction, colorPicker, toast, errorMessage, emptyState, COLORS, hasAccess } from '../../ui.js?v=202610180028';

export async function renderTeam(el, ctx) {
  const { api, project, members, areas, staff, me } = ctx;

  el.innerHTML = `<div class="tab-root two-col">
    <section class="panel">
      <div class="panel-head"><h2>Integrantes (${members.length})</h2>${staff ? '<button class="btn small primary" id="add-members">+ Sumar</button>' : ''}</div>
      <ul class="people">${members.map(m => `
        <li>${avatar(m)}<span class="grow"><strong>${esc(name(m))}${m.id === me.id ? ' <small class="muted">(vos)</small>' : ''}</strong><small class="muted">${esc(m.email)}</small></span>
          ${roleChip(m)}
          ${staff && m.id !== project.created_by ? `<button class="icon-btn" data-remove="${m.id}" aria-label="Sacar del proyecto" title="Sacar del proyecto">✕</button>` : ''}
        </li>`).join('')}</ul>
    </section>

    <section class="panel">
      <div class="panel-head"><h2>Áreas (${areas.length})</h2>${staff ? '<button class="btn small primary" id="add-area">+ Nueva área</button>' : ''}</div>
      ${areas.length ? `<ul class="areas">${areas.map(a => `
        <li style="--c:${esc(a.color)}">
          <div class="area-head"><strong>${esc(a.name)}</strong>${staff ? `<button class="link-btn" data-area="${a.id}">Editar</button>` : ''}</div>
          ${a.description ? `<p class="muted small">${esc(a.description)}</p>` : ''}
          <div class="avatars">${a.member_ids.map(id => ctx.member(id)).filter(Boolean).map(p => `<span class="who">${avatar(p, 'xs')}${esc(name(p).split(' ')[0])}</span>`).join('') || '<small class="muted">Sin integrantes</small>'}</div>
        </li>`).join('')}</ul>`
        : emptyState('Sin áreas', staff ? 'Creá áreas como Mecánica, Electrónica o Software y asigná a cada estudiante.' : '')}
    </section>
  </div>`;

  async function editArea(a) {
    const data = await openForm({
      title: a ? 'Editar área' : 'Nueva área',
      body: `
        ${field('Nombre', `<input name="name" required maxlength="60" value="${esc(a?.name)}" placeholder="Ej: Mecánica"/>`)}
        ${field('Descripción', `<input name="description" maxlength="200" value="${esc(a?.description)}"/>`)}
        <div class="field"><span>Color</span>${colorPicker('color', a?.color || COLORS[areas.length % COLORS.length])}</div>
        <div class="field"><span>Integrantes</span><div class="check-list">${members.map(m => `
          <label class="check"><input type="checkbox" name="members" value="${m.id}" data-multi ${a?.member_ids.includes(m.id) ? 'checked' : ''}/> ${esc(name(m))}</label>`).join('')}</div></div>
        ${a ? '<button type="button" class="link-btn danger-text" data-del>Borrar área</button>' : ''}`,
      onOpen: (dlg) => dlg.querySelector('[data-del]')?.addEventListener('click', async () => {
        dlg.close();
        if (await confirmAction('Borrar área', `Se borra "${a.name}". Sus tareas y avances quedan sin área.`)) {
          try { await api.deleteArea(a.id); toast('Área borrada'); ctx.reload(); } catch (e) { toast(errorMessage(e), 'error'); }
        }
      }),
    });
    if (!data) return;
    try {
      await api.saveArea({ ...(a ? { id: a.id } : { project_id: project.id }), name: data.name, description: data.description, color: data.color || COLORS[0] }, data.members || []);
      toast('Área guardada');
      ctx.reload();
    } catch (e) { toast(errorMessage(e), 'error'); }
  }

  async function addMembers() {
    const all = await api.profiles();
    const inProject = new Set(members.map(m => m.id));
    const candidates = all.filter(p => !inProject.has(p.id) && hasAccess(p));
    const data = await openForm({
      title: 'Sumar integrantes',
      wide: true,
      body: candidates.length ? `
        <input type="search" class="search" placeholder="Buscar por nombre o mail…" aria-label="Buscar"/>
        <div class="check-list tall">${candidates.map(p => `
          <label class="check person" data-q="${esc((name(p) + ' ' + p.email).toLowerCase())}">
            <input type="checkbox" name="ids" value="${p.id}" data-multi/> ${avatar(p, 'xs')} <span><b>${esc(name(p))}</b> <small class="muted">${esc(p.email)} · ${ROLE_LABEL[p.role]}</small></span>
          </label>`).join('')}</div>
        <p class="hint">Solo aparecen personas que ya entraron al menos una vez a la plataforma.</p>`
        : '<p class="muted">Todas las personas registradas ya están en el proyecto. Los demás tienen que entrar una vez a la plataforma para aparecer acá.</p>',
      submit: candidates.length ? 'Sumar' : '',
      onOpen: (dlg) => dlg.querySelector('.search')?.addEventListener('input', (ev) => {
        const q = ev.target.value.toLowerCase();
        dlg.querySelectorAll('.person').forEach(l => { l.hidden = !l.dataset.q.includes(q); });
      }),
    });
    if (!data?.ids?.length) return;
    try {
      await api.addMembers(project.id, data.ids);
      toast(`${data.ids.length} integrante${data.ids.length === 1 ? '' : 's'} sumado${data.ids.length === 1 ? '' : 's'}`);
      ctx.reload();
    } catch (e) { toast(errorMessage(e), 'error'); }
  }

  el.querySelector('#add-members')?.addEventListener('click', addMembers);
  el.querySelector('#add-area')?.addEventListener('click', () => editArea(null));
  el.querySelector('.tab-root').addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (b?.dataset.area) editArea(areas.find(a => a.id === b.dataset.area));
    if (b?.dataset.remove) {
      const m = ctx.member(b.dataset.remove);
      if (!await confirmAction('Sacar del proyecto', `${name(m)} deja de ver este proyecto. Sus avances quedan guardados.`, 'Sacar')) return;
      try { await api.removeMember(project.id, m.id); toast('Integrante quitado'); ctx.reload(); }
      catch (e) { toast(errorMessage(e), 'error'); }
    }
  });
}
