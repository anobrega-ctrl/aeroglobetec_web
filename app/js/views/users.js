import { esc, name, avatar, icon, ROLE_LABEL, roleChip, isStaff, canManageRoles, hasAccess, options, confirmAction, toast, errorMessage, fmtDate, timeAgo } from '../ui.js?v=202610180028';

export async function renderUsers(el, ctx) {
  const { api, me } = ctx;
  if (!isStaff(me)) { location.hash = '#/'; return; }
  const all = await api.profiles();
  const canEdit = canManageRoles(me);
  const pending = all.filter(u => u.access === 'pendiente' && !u.is_admin);
  const rejected = all.filter(u => u.access === 'rechazado' && !u.is_admin);
  const users = all.filter(hasAccess);
  const count = (r) => users.filter(u => !u.is_admin && u.role === r).length;

  // Un admin puede dar cualquier rol; un docente solo alterna entre estudiante y líder
  const roleOptions = me.is_admin ? ['estudiante', 'lider', 'docente'] : ['estudiante', 'lider'];
  const editable = (u) => canEdit && !u.is_admin && u.id !== me.id && (me.is_admin || u.role !== 'docente');
  const domainRole = (u) => u.role === 'docente' ? 'Docente' : 'Estudiante';

  el.innerHTML = `
    <div class="page">
      <section class="hello"><div><h1>Usuarios</h1></div></section>

      ${pending.length ? `
      <section class="panel access-panel">
        <div class="panel-head"><h2>${icon('clock')} Pedidos de acceso <span class="badge">${pending.length}</span></h2></div>
        <p class="hint">Entraron con su mail de la ETec y esperan que un docente o un admin los habilite. Revisá que sean del taller antes de aprobar.</p>
        <ul class="access-list">${pending.map(u => `
          <li>
            <span class="who">${avatar(u, 'sm')}<span><b>${esc(name(u))}</b><small class="muted">${esc(u.email)} · ${domainRole(u)} · pidió ${timeAgo(u.created_at)}</small></span></span>
            ${canEdit ? `<span class="row-actions">
              <button class="btn small ghost danger-text" data-access="rechazado" data-id="${u.id}">Rechazar</button>
              <button class="btn small primary" data-access="aprobado" data-id="${u.id}">${icon('check')} Aprobar</button>
            </span>` : '<small class="muted">Lo aprueba un docente</small>'}
          </li>`).join('')}</ul>
      </section>` : ''}

      <div class="stats">
        <div class="stat"><b>${count('docente')}</b><span>Docentes</span></div>
        <div class="stat"><b>${count('lider')}</b><span>Estudiantes líderes</span></div>
        <div class="stat"><b>${count('estudiante')}</b><span>Estudiantes</span></div>
      </div>
      <p class="hint">${me.is_admin
        ? 'Como admin podés dar cualquier rol, incluso docente.'
        : canEdit
          ? 'Un estudiante líder tiene los mismos permisos que un docente dentro de los proyectos.'
          : 'Solo un docente o un admin puede cambiar roles y aprobar cuentas.'}
        Cada persona aparece acá después de entrar por primera vez, y necesita que la aprueben.</p>
      <div class="toolbar"><input type="search" id="q" class="search" placeholder="Buscar…" aria-label="Buscar usuario"/></div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Persona</th><th>Mail</th><th>Rol</th><th>Alta</th>${canEdit ? '<th></th>' : ''}</tr></thead>
        <tbody>${users.map(u => `
          <tr data-q="${esc((name(u) + ' ' + u.email).toLowerCase())}">
            <td><span class="who">${avatar(u, 'xs')}${esc(name(u))}${u.id === me.id ? ' <small class="muted">(vos)</small>' : ''}</span></td>
            <td class="muted">${esc(u.email)}</td>
            <td>${editable(u)
              ? `<select data-role="${u.id}" aria-label="Rol de ${esc(name(u))}">${options(roleOptions.map(r => ({ value: r, label: ROLE_LABEL[r] })), u.role)}</select>`
              : roleChip(u)}</td>
            <td class="muted">${fmtDate(u.created_at)}</td>
            ${canEdit ? `<td class="right">${!u.is_admin && u.id !== me.id ? `<button class="link-btn danger-text" data-access="rechazado" data-id="${u.id}" data-revoke>Quitar acceso</button>` : ''}</td>` : ''}
          </tr>`).join('')}</tbody>
      </table></div>

      ${rejected.length ? `
      <details class="rejected">
        <summary>Sin acceso (${rejected.length})</summary>
        <ul class="access-list">${rejected.map(u => `
          <li>
            <span class="who">${avatar(u, 'xs')}<span><b>${esc(name(u))}</b><small class="muted">${esc(u.email)}</small></span></span>
            ${canEdit ? `<button class="btn small" data-access="aprobado" data-id="${u.id}">Darle acceso</button>` : ''}
          </li>`).join('')}</ul>
      </details>` : ''}
    </div>`;

  el.querySelector('#q').addEventListener('input', (ev) => {
    const q = ev.target.value.toLowerCase();
    el.querySelectorAll('tbody tr').forEach(tr => { tr.hidden = !tr.dataset.q.includes(q); });
  });
  el.querySelector('tbody').addEventListener('change', async (ev) => {
    const id = ev.target.dataset.role;
    if (!id) return;
    try {
      await api.setRole(id, ev.target.value);
      toast(`Ahora es ${ROLE_LABEL[ev.target.value].toLowerCase()}`);
    } catch (e) { toast(errorMessage(e), 'error'); }
  });
  el.querySelector('.page').addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-access]');
    if (!b) return;
    const u = all.find(x => x.id === b.dataset.id);
    const access = b.dataset.access;
    if (b.dataset.revoke && !await confirmAction('Quitar acceso', `${name(u)} no va a poder entrar más a la plataforma hasta que alguien le vuelva a dar acceso. No se borra nada de lo que hizo.`, 'Quitar acceso')) return;
    if (access === 'rechazado' && !b.dataset.revoke && !await confirmAction('Rechazar pedido', `${name(u)} (${u.email}) no va a poder entrar. Si te equivocás, lo podés habilitar después desde «Sin acceso».`, 'Rechazar')) return;
    b.disabled = true;
    try {
      await api.setAccess(u.id, access);
      toast(access === 'aprobado' ? `${name(u)} ya puede entrar` : `${name(u)} quedó sin acceso`);
      window.dispatchEvent(new Event('access-changed'));
      renderUsers(el, ctx);
    } catch (e) { b.disabled = false; toast(errorMessage(e), 'error'); }
  });
}
