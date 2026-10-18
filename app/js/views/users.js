import { esc, name, avatar, icon, ROLE_LABEL, roleChip, isStaff, canManageRoles, hasAccess, options, field, openForm, confirmAction, toast, errorMessage, fmtDate, timeAgo } from '../ui.js?v=202610180031';

export async function renderUsers(el, ctx) {
  const { api, me } = ctx;
  if (!isStaff(me)) { location.hash = '#/'; return; }
  const canEdit = canManageRoles(me);
  const [all, invites] = await Promise.all([api.profiles(), canEdit ? api.invites().catch(() => []) : []]);
  const registered = new Set(all.map(p => p.email));
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

      ${canEdit ? `
      <section class="panel invites">
        <div class="panel-head"><h2>Mails de afuera</h2><button class="btn small" id="invite">${icon('plus')} Invitar un mail</button></div>
        <p class="hint">Para alguien que no tiene mail de la ETec (un mentor, un ex alumno, alguien de otra escuela). Cuando entre con ese mail queda aprobado directamente. Tiene que entrar con el <b>link por mail</b> o con Google si es una cuenta de Google.</p>
        ${invites.length ? `<ul class="access-list">${invites.map(i => `
          <li>
            <span class="who"><span class="avatar sm">${icon('link')}</span><span><b>${esc(i.email)}</b><small class="muted">${ROLE_LABEL[i.role]}${i.note ? ` · ${esc(i.note)}` : ''} · ${registered.has(i.email) ? 'ya entró' : 'todavía no entró'}</small></span></span>
            <button class="link-btn danger-text" data-uninvite="${esc(i.email)}">Quitar invitación</button>
          </li>`).join('')}</ul>` : '<p class="muted small">No hay mails de afuera invitados.</p>'}
      </section>` : ''}

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
  el.querySelector('#invite')?.addEventListener('click', async () => {
    const roles = me.is_admin ? ['estudiante', 'lider', 'docente'] : ['estudiante', 'lider'];
    const data = await openForm({
      title: 'Invitar un mail de afuera',
      body: `
        ${field('Mail', '<input type="email" name="email" required placeholder="nombre@gmail.com" autocomplete="off"/>')}
        ${field('Rol', `<select name="role">${options(roles.map(r => ({ value: r, label: ROLE_LABEL[r] })), 'estudiante')}</select>`, me.is_admin ? '' : 'Solo un admin puede invitar como docente.')}
        ${field('Quién es', '<input name="note" maxlength="120" placeholder="Ej: mentor de robótica, ex alumno…"/>')}`,
      submit: 'Invitar',
    });
    if (!data) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) { toast('Revisá el mail', 'error'); return; }
    if (/@(alumno\.)?etec\.um\.edu\.ar$/i.test(data.email)) { toast('Los mails de la ETec no hace falta invitarlos: entran y se aprueban en Pedidos de acceso.', 'error'); return; }
    try {
      await api.addInvite({ email: data.email, role: data.role, note: data.note });
      toast('Listo. Ya puede entrar con ese mail.');
      renderUsers(el, ctx);
    } catch (e) { toast(/duplicate|ya está/i.test(errorMessage(e)) ? 'Ese mail ya está invitado.' : errorMessage(e), 'error'); }
  });

  el.querySelector('.page').addEventListener('click', async (ev) => {
    const un = ev.target.closest('[data-uninvite]');
    if (un) {
      const email = un.dataset.uninvite;
      if (!await confirmAction('Quitar invitación', registered.has(email)
        ? `${email} ya entró: quitar la invitación no le saca el acceso. Para eso usá «Quitar acceso» en la lista de usuarios.`
        : `${email} ya no va a poder crear su cuenta.`, 'Quitar')) return;
      try { await api.deleteInvite(email); toast('Invitación quitada'); renderUsers(el, ctx); }
      catch (e) { toast(errorMessage(e), 'error'); }
      return;
    }
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
