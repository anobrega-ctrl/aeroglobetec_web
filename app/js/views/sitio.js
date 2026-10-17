// Sitio web: contenido de la web pública (editor) y docentes.
// El editor (sitio/editor.html) usa la misma sesión; la base solo deja guardar y publicar
// a docentes y admins. Los docentes se guardan en su propia tabla y se ven en la web al instante.
import { esc, icon, canManageRoles, field, openForm, confirmAction, toast, errorMessage, emptyState } from '../ui.js?v=202610171852';

export async function renderSitio(el, ctx) {
  const { api, me, params } = ctx;
  if (!canManageRoles(me)) { location.hash = '#/'; return; }
  const tab = params[0] === 'docentes' ? 'docentes' : 'contenido';

  el.innerHTML = `
    <div class="site-editor">
      <div class="site-bar">
        <nav class="site-tabs" aria-label="Sitio web">
          <a href="#/sitio" class="${tab === 'contenido' ? 'active' : ''}">Contenido</a>
          <a href="#/sitio/docentes" class="${tab === 'docentes' ? 'active' : ''}">Docentes</a>
        </nav>
        <span class="grow muted">${tab === 'contenido'
          ? 'Los cambios se ven en la web recién al tocar <b>Publicar en la web</b>.'
          : 'Los cambios en docentes se ven en la web al instante.'}</span>
        <a class="btn small ghost" href="../${tab === 'docentes' ? '#profes' : ''}" target="_blank" rel="noopener">Ver la web ${icon('external')}</a>
      </div>
      <div id="site-body" class="site-body"></div>
    </div>`;

  const body = el.querySelector('#site-body');
  if (tab === 'contenido') {
    body.innerHTML = api.demo
      ? `<div class="page"><div class="empty"><strong>El editor del sitio no funciona en modo demo</strong><p>Edita la web pública real, así que necesita entrar con tu cuenta.</p></div></div>`
      : '<iframe src="sitio/editor.html" title="Editor del sitio web"></iframe>';
    return;
  }
  body.classList.add('scroll');
  await renderTeachers(body, ctx);
}

async function renderTeachers(el, ctx) {
  const { api } = ctx;
  const list = await api.teachers();

  el.innerHTML = `
    <div class="page narrow">
      <section class="hello">
        <div><h1>Docentes</h1><p>Aparecen en la sección Profes de la web, en este orden.</p></div>
        <button class="btn primary" id="add-teacher">${icon('plus')} Agregar docente</button>
      </section>
      ${list.length ? `<ul class="teacher-list">${list.map((t, i) => `
        <li class="${t.visible ? '' : 'hidden-teacher'}">
          ${t.photo_url ? `<img class="avatar" src="${esc(t.photo_url)}" alt=""/>` : `<span class="avatar">${esc(initialsOf(t.full_name))}</span>`}
          <div class="grow">
            <strong>${esc(t.full_name)}</strong> ${t.visible ? '' : '<span class="badge gray">Oculto</span>'}
            <small class="muted">${esc(t.role_es)}${t.email ? ` · ${esc(t.email)}` : ''}${t.phone ? ` · ${esc(t.phone)}` : ''}</small>
          </div>
          <div class="row-actions">
            <button class="icon-btn" data-up="${t.id}" ${i === 0 ? 'disabled' : ''} aria-label="Subir" title="Subir">↑</button>
            <button class="icon-btn" data-down="${t.id}" ${i === list.length - 1 ? 'disabled' : ''} aria-label="Bajar" title="Bajar">↓</button>
            <button class="link-btn" data-edit="${t.id}">Editar</button>
            <button class="link-btn danger-text" data-del="${t.id}">Quitar</button>
          </div>
        </li>`).join('')}</ul>` : emptyState('No hay docentes cargados', 'Agregá el primero con el botón de arriba.')}
    </div>`;

  async function edit(t) {
    const data = await openForm({
      title: t ? 'Editar docente' : 'Agregar docente',
      body: `
        ${field('Nombre y apellido', `<input name="full_name" required maxlength="80" value="${esc(t?.full_name)}"/>`)}
        <div class="grid-2">
          ${field('Cargo', `<input name="role_es" maxlength="60" value="${esc(t?.role_es ?? 'Docente del taller')}"/>`)}
          ${field('Cargo en inglés', `<input name="role_en" maxlength="60" value="${esc(t?.role_en ?? 'Workshop teacher')}"/>`)}
          ${field('Mail', `<input type="email" name="email" maxlength="120" value="${esc(t?.email)}" placeholder="nombre@etec.um.edu.ar"/>`)}
          ${field('Teléfono', `<input type="tel" name="phone" maxlength="40" value="${esc(t?.phone)}" placeholder="+54 9 261 …"/>`)}
        </div>
        ${field('Foto', '<input type="file" name="photo" accept="image/jpeg,image/png,image/webp"/>', t?.photo_url ? 'Dejalo vacío para mantener la foto actual.' : 'Opcional. Si no hay foto se muestran las iniciales.')}
        ${field('O link de la foto', `<input type="url" name="photo_url" value="${esc(t?.photo_url)}" placeholder="https://…"/>`)}
        <label class="check"><input type="checkbox" name="visible" ${t?.visible === false ? '' : 'checked'}/> Mostrar en la web</label>`,
    });
    if (!data) return;
    if (data.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) { toast('Revisá el mail', 'error'); return; }
    if (data.photo_url && !/^https:\/\//.test(data.photo_url)) { toast('El link de la foto tiene que empezar con https://', 'error'); return; }
    try {
      let photo = data.photo_url;
      if (data.photo?.length) { toast('Subiendo foto…'); photo = await api.uploadTeacherPhoto(data.photo[0]); }
      await api.saveTeacher({
        ...(t ? { id: t.id } : { position: (list.at(-1)?.position || 0) + 1 }),
        full_name: data.full_name, role_es: data.role_es || 'Docente del taller', role_en: data.role_en || 'Workshop teacher',
        email: data.email, phone: data.phone, photo_url: photo || '', visible: !!data.visible,
      });
      toast(t ? 'Docente actualizado' : 'Docente agregado');
      renderTeachers(el, ctx);
    } catch (e) { toast(errorMessage(e), 'error'); }
  }

  async function move(id, dir) {
    const i = list.findIndex(t => t.id === id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    try {
      await Promise.all(list.map((t, k) => t.position === k + 1 ? null : api.saveTeacher({ id: t.id, position: k + 1 })));
      renderTeachers(el, ctx);
    } catch (e) { toast(errorMessage(e), 'error'); }
  }

  el.querySelector('#add-teacher').addEventListener('click', () => edit(null));
  el.querySelector('.page').addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (!b || b.disabled) return;
    const find = (id) => list.find(t => t.id === id);
    if (b.dataset.edit) return edit(find(b.dataset.edit));
    if (b.dataset.up) return move(b.dataset.up, -1);
    if (b.dataset.down) return move(b.dataset.down, 1);
    if (b.dataset.del) {
      const t = find(b.dataset.del);
      if (!await confirmAction('Quitar docente', `${t.full_name} deja de aparecer en la web. Si solo querés ocultarlo un tiempo, editalo y destildá "Mostrar en la web".`, 'Quitar')) return;
      try { await api.deleteTeacher(t.id); toast('Docente quitado'); renderTeachers(el, ctx); }
      catch (e) { toast(errorMessage(e), 'error'); }
    }
  });
}

function initialsOf(n) {
  const parts = String(n || '').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts.at(-1)?.[0] || '')).toUpperCase();
}
