import { esc, name, avatar, icon, mentionInput, withMentions, UPDATE_STATUS, options, field, openForm, confirmAction, toast, errorMessage, fmtDateTime, timeAgo, fileSize, emptyState } from '../../ui.js?v=202610180028';

const commentsLabel = (n) => (n ? `${n} comentario${n === 1 ? '' : 's'}` : 'Comentar');

export async function renderUpdates(el, ctx) {
  const { api, project, areas, staff, me } = ctx;
  const [updates, tasks] = await Promise.all([api.updates(project.id), api.tasks(project.id)]);
  const myAreas = areas.filter(a => a.member_ids.includes(me.id));

  el.innerHTML = `
    <div class="toolbar">
      <select id="f-area" aria-label="Filtrar por área">${options(areas.map(a => ({ value: a.id, label: a.name })), '', { empty: 'Todas las áreas' })}</select>
      <select id="f-status" aria-label="Filtrar por estado">${options(Object.entries(UPDATE_STATUS).map(([value, label]) => ({ value, label })), staff ? 'pendiente' : '', { empty: 'Todos los estados' })}</select>
      <label class="check"><input type="checkbox" id="f-mine"/> Solo los míos</label>
      <span class="grow"></span>
      <button class="btn primary" id="new-update">${icon('plus')} Subir avance</button>
    </div>
    <div id="list" class="updates"></div>`;

  const list = el.querySelector('#list');
  const fArea = el.querySelector('#f-area'), fStatus = el.querySelector('#f-status'), fMine = el.querySelector('#f-mine');

  function draw() {
    const visible = updates.filter(u =>
      (!fArea.value || u.area_id === fArea.value) &&
      (!fStatus.value || u.status === fStatus.value) &&
      (!fMine.checked || u.author_id === me.id));
    list.innerHTML = visible.length ? visible.map(card).join('')
      : emptyState('No hay avances con estos filtros', staff ? '' : 'Subí el primero con el botón de arriba.');
  }

  function card(u) {
    const a = ctx.area(u.area_id);
    const t = tasks.find(x => x.id === u.task_id);
    const author = ctx.member(u.author_id);
    const mine = u.author_id === me.id;
    const nComments = u.comments?.[0]?.count ?? 0;
    return `
      <article class="update ${u.status}" data-id="${u.id}">
        <header>
          ${avatar(author, 'sm')}
          <div class="grow">
            <strong>${esc(name(author))}</strong>
            <small class="muted">${fmtDateTime(u.created_at)}${a ? ` · <span class="chip" style="--c:${esc(a.color)}">${esc(a.name)}</span>` : ''}</small>
          </div>
          <span class="status-badge ${u.status}">${UPDATE_STATUS[u.status]}${u.score ? ` · ${u.score}/10` : ''}</span>
        </header>
        <h3>${esc(u.title)}</h3>
        ${t ? `<p class="small muted">Tarea: ${esc(t.title)}</p>` : ''}
        ${u.body ? `<p class="body">${esc(u.body)}</p>` : ''}
        ${u.attachments?.length ? `<ul class="attachments">${u.attachments.map((f, i) => `
          <li><button class="file-link" data-file="${u.id}:${i}">${icon('clip')}${esc(f.name)}</button> <small class="muted">${fileSize(f.size)}</small></li>`).join('')}</ul>` : ''}
        ${u.feedback ? `<div class="feedback"><b>Devolución${u.reviewed_by ? ` de ${esc(name(ctx.member(u.reviewed_by)))}` : ''}:</b> ${esc(u.feedback)}</div>` : ''}
        <footer>
          <button class="link-btn" data-comments="${u.id}">${commentsLabel(nComments)}</button>
          <span class="grow"></span>
          ${staff ? `<button class="btn small" data-review="${u.id}">Revisar</button>` : ''}
          ${mine && u.status !== 'aprobado' ? `<button class="link-btn" data-edit="${u.id}">Editar</button>` : ''}
          ${(staff || (mine && u.status !== 'aprobado')) ? `<button class="link-btn danger-text" data-del="${u.id}">Borrar</button>` : ''}
        </footer>
        <div class="comments" hidden></div>
      </article>`;
  }

  async function form(u) {
    const defArea = u?.area_id ?? (myAreas.length === 1 ? myAreas[0].id : '');
    const myTasks = tasks.filter(t => staff || t.assignee_id === me.id);
    return openForm({
      title: u ? 'Editar avance' : 'Subir avance',
      submit: u ? 'Guardar' : 'Subir',
      body: `
        ${field('Título', `<input name="title" required maxlength="120" value="${esc(u?.title)}" placeholder="Ej: Terminé el CAD del chasis"/>`)}
        <div class="grid-2">
          ${field('Área', `<select name="area_id">${options((staff ? areas : myAreas.length ? myAreas : areas).map(a => ({ value: a.id, label: a.name })), defArea, { empty: 'Sin área' })}</select>`)}
          ${field('Tarea relacionada', `<select name="task_id">${options(myTasks.map(t => ({ value: t.id, label: t.title })), u?.task_id, { empty: 'Ninguna' })}</select>`)}
        </div>
        ${field('¿Qué hiciste?', `<textarea name="body" rows="5" maxlength="4000" placeholder="Contá qué avanzaste, qué problemas tuviste y qué sigue.">${esc(u?.body)}</textarea>`)}
        ${u?.attachments?.length ? `<div class="field"><span>Archivos actuales</span>${u.attachments.map((f, i) => `<label class="check"><input type="checkbox" name="keep" value="${i}" data-multi checked/> ${esc(f.name)}</label>`).join('')}</div>` : ''}
        ${field('Agregar fotos o archivos', '<input type="file" name="files" multiple/>', 'Hasta 50 MB por archivo.')}
        ${u?.status === 'cambios' ? '<p class="hint">Al guardar, el avance vuelve a quedar pendiente de revisión.</p>' : ''}`,
    });
  }

  async function review(u) {
    const data = await openForm({
      title: 'Revisar avance',
      body: `
        <p><strong>${esc(u.title)}</strong> · ${esc(name(ctx.member(u.author_id)))}</p>
        ${field('Resultado', `<select name="status">${options([
          { value: 'aprobado', label: 'Aprobar' }, { value: 'cambios', label: 'Pedir cambios' }, { value: 'pendiente', label: 'Dejar pendiente' },
        ], u.status === 'pendiente' ? 'aprobado' : u.status)}</select>`)}
        ${field('Nota (1 a 10)', `<input type="number" name="score" min="1" max="10" value="${esc(u.score || '')}"/>`, 'Opcional. Cuenta para el rendimiento solo si el avance está aprobado.')}
        ${field('Devolución', `<textarea name="feedback" rows="4" maxlength="2000" placeholder="Qué estuvo bien y qué mejorar">${esc(u.feedback)}</textarea>`)}`,
      submit: 'Guardar revisión',
    });
    if (!data) return;
    const score = data.score ? Math.min(10, Math.max(1, Math.round(Number(data.score)))) : null;
    try {
      await api.reviewUpdate(u.id, { status: data.status, score, feedback: data.feedback });
      toast('Revisión guardada');
      ctx.refresh();
    } catch (e) { toast(errorMessage(e), 'error'); }
  }

  async function toggleComments(u, box) {
    if (!box.hidden) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = '<p class="muted small">Cargando…</p>';
    const comments = await api.comments(u.id);
    box.innerHTML = `
      ${comments.map(c => `<div class="comment">${avatar(ctx.member(c.author_id), 'xs')}<div><b>${esc(name(ctx.member(c.author_id)))}</b> <small class="muted">${timeAgo(c.created_at)}</small><p>${withMentions(c.body, c.mentions, ctx.members)}</p></div></div>`).join('') || '<p class="muted small">Sin comentarios todavía.</p>'}
      <form class="comment-form"><div class="grow mention-wrap"><input name="body" placeholder="Escribí un comentario… usá @ para mencionar" maxlength="1000" required autocomplete="off"/></div><button class="btn small primary">Enviar</button></form>`;
    const getMentions = mentionInput(box.querySelector('[name=body]'), ctx.members.filter(m => m.id !== me.id));
    box.querySelector('form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const body = ev.target.body.value.trim();
      if (!body) return;
      try {
        await api.addComment(u.id, body, getMentions(body));
        u.comments = [{ count: (u.comments?.[0]?.count ?? 0) + 1 }];
        box.hidden = true;
        await toggleComments(u, box);
        const btn = list.querySelector(`[data-comments="${u.id}"]`);
        if (btn) btn.textContent = commentsLabel(u.comments[0].count);
      } catch (e) { toast(errorMessage(e), 'error'); }
    });
  }

  draw();
  [fArea, fStatus, fMine].forEach(f => f.addEventListener('change', draw));

  el.querySelector('#new-update').addEventListener('click', async () => {
    const data = await form(null);
    if (!data) return;
    try {
      toast('Subiendo…');
      await api.createUpdate({ project_id: project.id, title: data.title, body: data.body, area_id: data.area_id || null, task_id: data.task_id || null }, data.files || []);
      toast('Avance subido');
      ctx.refresh();
    } catch (e) { toast(errorMessage(e), 'error'); }
  });

  list.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    const find = (id) => updates.find(u => u.id === id);
    try {
      if (b.dataset.file) {
        const [id, i] = b.dataset.file.split(':');
        const f = find(id).attachments[Number(i)];
        const url = await api.fileUrl(f.path);
        const a = document.createElement('a');
        a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.download = f.name;
        a.click();
      } else if (b.dataset.comments) {
        await toggleComments(find(b.dataset.comments), b.closest('.update').querySelector('.comments'));
      } else if (b.dataset.review) {
        await review(find(b.dataset.review));
      } else if (b.dataset.edit) {
        const u = find(b.dataset.edit);
        const data = await form(u);
        if (!data) return;
        const keep = (data.keep || []).map(i => u.attachments[Number(i)]);
        await api.editUpdate(u.id, { title: data.title, body: data.body, area_id: data.area_id || null, task_id: data.task_id || null }, project.id, data.files || [], keep);
        toast('Avance actualizado');
        ctx.refresh();
      } else if (b.dataset.del) {
        const u = find(b.dataset.del);
        if (await confirmAction('Borrar avance', `Se borra "${u.title}" con sus archivos.`)) {
          await api.deleteUpdate(u);
          toast('Avance borrado');
          ctx.refresh();
        }
      }
    } catch (e) { toast(errorMessage(e), 'error'); }
  });
}
