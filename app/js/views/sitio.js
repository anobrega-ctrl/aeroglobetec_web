// Sitio web: contenido de la web pública (editor) y docentes.
// El editor (sitio/editor.html) usa la misma sesión; la base solo deja guardar y publicar
// a docentes y admins. Docentes y trayectoria se guardan en sus propias tablas y se ven en la web al instante.
import { esc, icon, canManageRoles, field, options, openForm, confirmAction, toast, errorMessage, emptyState, fmtDate } from '../ui.js?v=202610180028';

export async function renderSitio(el, ctx) {
  const { api, me, params } = ctx;
  if (!canManageRoles(me)) { location.hash = '#/'; return; }
  const tab = ['docentes', 'trayectoria'].includes(params[0]) ? params[0] : 'contenido';

  el.innerHTML = `
    <div class="site-editor">
      <div class="site-bar">
        <nav class="site-tabs" aria-label="Sitio web">
          <a href="#/sitio" class="${tab === 'contenido' ? 'active' : ''}">Contenido</a>
          <a href="#/sitio/docentes" class="${tab === 'docentes' ? 'active' : ''}">Docentes</a>
          <a href="#/sitio/trayectoria" class="${tab === 'trayectoria' ? 'active' : ''}">Trayectoria</a>
        </nav>
        <span class="grow muted">${tab === 'contenido'
          ? 'Los cambios se ven en la web recién al tocar <b>Publicar en la web</b>.'
          : 'Los cambios se ven en la web al instante.'}</span>
        <a class="btn small ghost" href="../${tab === 'contenido' ? '' : tab === 'docentes' ? '#profes' : '#trayectoria'}" target="_blank" rel="noopener">Ver la web ${icon('external')}</a>
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
  await (tab === 'docentes' ? renderTeachers : renderTrayectoria)(body, ctx);
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

// ---------- Trayectoria: dónde estuvimos, qué hicimos y qué ganamos ----------
const TKIND = { competencia: 'Competencia', charla: 'Charla', feria: 'Feria o exposición', visita: 'Visita', otro: 'Otro' };

const slugify = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'entrada';
const httpsOnly = (u) => /^https:\/\//.test(u || '');

async function renderTrayectoria(el, ctx) {
  const { api } = ctx;
  const [list, events] = await Promise.all([api.trayectoria(), api.events().catch(() => [])]);
  const used = new Set(list.map(t => t.event_id).filter(Boolean));
  const fromEvents = events.filter(e => !used.has(e.id) && e.status !== 'cancelado');

  el.innerHTML = `
    <div class="page narrow">
      <section class="hello">
        <div><h1>Trayectoria</h1><p>Dónde estuvimos, qué hicimos y qué ganamos. Cada entrada tiene su propia página en la web, dentro de <b>Trayectoria</b>.</p></div>
        <button class="btn primary" id="add-tr">${icon('plus')} Agregar</button>
      </section>
      ${fromEvents.length ? `
      <div class="toolbar">
        <select id="from-event" aria-label="Crear a partir de una charla o competencia">${options(fromEvents.map(e => ({ value: e.id, label: `${e.title} · ${fmtDate(e.starts_on)}` })), '', { empty: 'Crear a partir de una charla o competencia…' })}</select>
      </div>` : ''}
      ${list.length ? `<ul class="teacher-list tr-list">${list.map(t => `
        <li class="${t.visible ? '' : 'hidden-teacher'}">
          ${httpsOnly(t.cover_url) ? `<img class="tr-thumb" src="${esc(t.cover_url)}" alt=""/>` : `<span class="tr-thumb">${icon(t.kind === 'charla' ? 'mic' : 'trophy')}</span>`}
          <div class="grow">
            <strong>${esc(t.title)}</strong> ${t.visible ? '' : '<span class="badge gray">Oculta</span>'}
            ${t.achievement ? `<span class="badge">${icon('trophy')} ${esc(t.achievement)}</span>` : ''}
            <small class="muted">${TKIND[t.kind] || ''} · ${esc(fmtDate(t.starts_on))}${t.place ? ` · ${esc(t.place)}` : ''} · ${t.photos?.length || 0} foto${t.photos?.length === 1 ? '' : 's'}</small>
          </div>
          <div class="row-actions">
            <a class="link-btn" href="../#trayectoria-${esc(t.slug)}" target="_blank" rel="noopener">Ver</a>
            <button class="link-btn" data-edit="${t.id}">Editar</button>
            <button class="link-btn danger-text" data-del="${t.id}">Quitar</button>
          </div>
        </li>`).join('')}</ul>` : emptyState('Todavía no hay nada cargado', 'Agregá la primera competencia, feria o visita, con fotos y lo que lograron.')}
    </div>`;

  async function edit(t, prefill = {}) {
    const v = { ...prefill, ...(t || {}) };
    const photos = v.photos || [];
    const data = await openForm({
      title: t ? 'Editar entrada' : 'Agregar a la trayectoria',
      wide: true,
      body: `
        <div class="grid-2">
          ${field('Tipo', `<select name="kind">${options(Object.entries(TKIND).map(([value, label]) => ({ value, label })), v.kind || 'competencia')}</select>`)}
          ${field('Lugar', `<input name="place" maxlength="120" value="${esc(v.place)}" placeholder="Ej: Córdoba"/>`)}
        </div>
        ${field('Nombre', `<input name="title" required maxlength="120" value="${esc(v.title)}" placeholder="Ej: CATE 2027"/>`)}
        <div class="grid-2">
          ${field('Fecha', `<input type="date" name="starts_on" required value="${esc(v.starts_on || '')}"/>`)}
          ${field('Hasta', `<input type="date" name="ends_on" value="${esc(v.ends_on || '')}"/>`, 'Solo si duró más de un día.')}
        </div>
        ${field('Logro o premio', `<input name="achievement" maxlength="160" value="${esc(v.achievement)}" placeholder="Ej: 1.er puesto categoría Rover"/>`, 'Opcional. Se destaca en la tarjeta.')}
        ${field('Resumen', `<textarea name="summary" rows="2" maxlength="400">${esc(v.summary)}</textarea>`, 'Una o dos oraciones para la tarjeta.')}
        ${field('Qué hicimos', `<textarea name="body" rows="7" maxlength="8000">${esc(v.body)}</textarea>`, 'Se muestra en la página de la entrada. Dejá una línea en blanco entre párrafos; las líneas que empiezan con «- » se ven como lista.')}
        <div class="grid-2">
          ${field('Foto de portada', '<input type="file" name="cover" accept="image/jpeg,image/png,image/webp"/>', v.cover_url ? 'Dejalo vacío para mantener la actual.' : 'Si no elegís, se usa la primera foto de la galería.')}
          ${field('O link de la portada', `<input type="url" name="cover_url" value="${esc(v.cover_url)}" placeholder="https://…"/>`)}
        </div>
        ${field('Agregar fotos a la galería', '<input type="file" name="new_photos" multiple accept="image/jpeg,image/png,image/webp"/>', 'Podés elegir varias a la vez (hasta 30 en total, 5 MB cada una).')}
        ${field('O links de fotos', '<textarea name="photo_links" rows="2" placeholder="Un link https por línea"></textarea>')}
        ${photos.length ? `<div class="field"><span>Fotos cargadas (tildá las que quieras sacar)</span><div class="tr-photos">${photos.map(u => `
          <label><img src="${esc(u)}" alt=""/><span><input type="checkbox" name="remove" value="${esc(u)}" data-multi/>Sacar</span></label>`).join('')}</div></div>` : ''}
        <div class="grid-2">
          ${field('Video (YouTube)', `<input type="url" name="video_url" value="${esc(v.video_url)}" placeholder="https://youtube.com/…"/>`)}
          ${field('Enlace (nota, resultados…)', `<input type="url" name="link_url" value="${esc(v.link_url)}" placeholder="https://…"/>`)}
        </div>
        <details class="tr-en"><summary>Versión en inglés (opcional)</summary>
          ${field('Name', `<input name="title_en" maxlength="120" value="${esc(v.title_en)}"/>`)}
          ${field('Achievement', `<input name="achievement_en" maxlength="160" value="${esc(v.achievement_en)}"/>`)}
          ${field('Summary', `<textarea name="summary_en" rows="2" maxlength="400">${esc(v.summary_en)}</textarea>`)}
          ${field('What we did', `<textarea name="body_en" rows="5" maxlength="8000">${esc(v.body_en)}</textarea>`)}
          <p class="hint">Lo que dejes vacío se muestra en castellano.</p>
        </details>
        <label class="check"><input type="checkbox" name="visible" ${v.visible === false ? '' : 'checked'}/> Mostrar en la web</label>`,
    });
    if (!data) return;
    if (data.ends_on && data.ends_on < data.starts_on) { toast('La fecha de fin no puede ser anterior al inicio', 'error'); return; }
    for (const k of ['cover_url', 'video_url', 'link_url']) {
      if (data[k] && !httpsOnly(data[k])) { toast('Los links tienen que empezar con https://', 'error'); return; }
    }
    const links = data.photo_links.split(/\s+/).filter(Boolean);
    if (links.some(u => !httpsOnly(u))) { toast('Los links de fotos tienen que empezar con https://', 'error'); return; }
    const remove = new Set(data.remove || []);
    const kept = photos.filter(u => !remove.has(u));
    if (kept.length + links.length + data.new_photos.length > 30) { toast('Son más de 30 fotos. Sacá algunas.', 'error'); return; }
    try {
      let cover = data.cover_url;
      if (data.cover.length) { toast('Subiendo portada…'); cover = await api.uploadSitePhoto(data.cover[0], 'trayectoria'); }
      const uploaded = [];
      for (const [i, f] of data.new_photos.entries()) {
        toast(`Subiendo fotos… ${i + 1} de ${data.new_photos.length}`);
        uploaded.push(await api.uploadSitePhoto(f, 'trayectoria'));
      }
      const allPhotos = [...kept, ...links, ...uploaded];
      // La dirección de la página (#trayectoria-…) se arma una vez y no cambia, para no romper enlaces compartidos
      let slug = t?.slug;
      if (!slug) {
        const base = `${slugify(data.title)}-${data.starts_on.slice(0, 4)}`;
        slug = base;
        for (let n = 2; list.some(x => x.slug === slug); n++) slug = `${base}-${n}`;
      }
      await api.saveTrayectoria({
        ...(t ? { id: t.id } : { slug, event_id: prefill.event_id || null }),
        kind: data.kind, title: data.title, place: data.place, starts_on: data.starts_on, ends_on: data.ends_on || null,
        achievement: data.achievement, summary: data.summary, body: data.body,
        title_en: data.title_en, achievement_en: data.achievement_en, summary_en: data.summary_en, body_en: data.body_en,
        cover_url: (cover && !remove.has(cover) ? cover : allPhotos[0]) || '', photos: allPhotos,
        video_url: data.video_url, link_url: data.link_url, visible: !!data.visible,
      });
      toast(t ? 'Entrada actualizada' : 'Agregada a la trayectoria');
      renderTrayectoria(el, ctx);
    } catch (e) { toast(errorMessage(e), 'error'); }
  }

  el.querySelector('#add-tr').addEventListener('click', () => edit(null));
  el.querySelector('#from-event')?.addEventListener('change', (ev) => {
    const e = fromEvents.find(x => x.id === ev.target.value);
    ev.target.value = '';
    if (!e) return;
    edit(null, {
      event_id: e.id, kind: e.kind, title: e.title, place: e.location, starts_on: e.starts_on, ends_on: e.ends_on,
      summary: (e.description || '').slice(0, 400), link_url: httpsOnly(e.website) ? e.website : '',
    });
  });
  el.querySelector('.page').addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    const t = list.find(x => x.id === (b.dataset.edit || b.dataset.del));
    if (b.dataset.edit) return edit(t);
    if (b.dataset.del) {
      if (!await confirmAction('Quitar de la trayectoria', `«${t.title}» deja de aparecer en la web. Si solo querés ocultarla un tiempo, editala y destildá "Mostrar en la web".`, 'Quitar')) return;
      try { await api.deleteTrayectoria(t.id); toast('Entrada quitada'); renderTrayectoria(el, ctx); }
      catch (e) { toast(errorMessage(e), 'error'); }
    }
  });
}
