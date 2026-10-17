import { esc, name, avatar, ROLE_LABEL, roleChip, isStaff, canManageRoles, options, toast, errorMessage, fmtDate } from '../ui.js?v=202610172024';

export async function renderUsers(el, { api, me }) {
  if (!isStaff(me)) { location.hash = '#/'; return; }
  const users = await api.profiles();
  const canEdit = canManageRoles(me);
  const count = (r) => users.filter(u => !u.is_admin && u.role === r).length;

  // Un admin puede dar cualquier rol; un docente solo alterna entre estudiante y líder
  const roleOptions = me.is_admin ? ['estudiante', 'lider', 'docente'] : ['estudiante', 'lider'];
  const editable = (u) => canEdit && !u.is_admin && u.id !== me.id && (me.is_admin || u.role !== 'docente');

  el.innerHTML = `
    <div class="page">
      <section class="hello"><div><h1>Usuarios</h1></div></section>
      <div class="stats">
        <div class="stat"><b>${count('docente')}</b><span>Docentes</span></div>
        <div class="stat"><b>${count('lider')}</b><span>Estudiantes líderes</span></div>
        <div class="stat"><b>${count('estudiante')}</b><span>Estudiantes</span></div>
      </div>
      <p class="hint">${me.is_admin
        ? 'Como admin podés dar cualquier rol, incluso docente.'
        : canEdit
          ? 'Un estudiante líder tiene los mismos permisos que un docente dentro de los proyectos.'
          : 'Solo un docente o un admin puede cambiar roles.'}
        Cada persona aparece acá después de entrar por primera vez.</p>
      <div class="toolbar"><input type="search" id="q" class="search" placeholder="Buscar…" aria-label="Buscar usuario"/></div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Persona</th><th>Mail</th><th>Rol</th><th>Alta</th></tr></thead>
        <tbody>${users.map(u => `
          <tr data-q="${esc((name(u) + ' ' + u.email).toLowerCase())}">
            <td><span class="who">${avatar(u, 'xs')}${esc(name(u))}${u.id === me.id ? ' <small class="muted">(vos)</small>' : ''}</span></td>
            <td class="muted">${esc(u.email)}</td>
            <td>${editable(u)
              ? `<select data-role="${u.id}" aria-label="Rol de ${esc(name(u))}">${options(roleOptions.map(r => ({ value: r, label: ROLE_LABEL[r] })), u.role)}</select>`
              : roleChip(u)}</td>
            <td class="muted">${fmtDate(u.created_at)}</td>
          </tr>`).join('')}</tbody>
      </table></div>
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
}
