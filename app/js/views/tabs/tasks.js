import { esc, name, avatar, TASK_STATUS, PRIORITY, dueLabel, options, field, openForm, confirmAction, toast, errorMessage } from '../../ui.js?v=202610180031';

export async function renderTasks(el, ctx) {
  const { api, project, members, areas, staff, me } = ctx;
  const [tasks, milestones] = await Promise.all([api.tasks(project.id), api.milestones(project.id)]);

  const saved = sessionFilters();
  el.innerHTML = `
    <div class="toolbar">
      <select id="f-area" aria-label="Filtrar por área">${options(areas.map(a => ({ value: a.id, label: a.name })), saved.area, { empty: 'Todas las áreas' })}</select>
      <select id="f-person" aria-label="Filtrar por persona">${options([{ value: 'me', label: 'Mis tareas' }, ...members.map(m => ({ value: m.id, label: name(m) }))], saved.person, { empty: 'Todas las personas' })}</select>
      <span class="grow"></span>
      ${staff ? '<button class="btn primary" id="new-task">Nueva tarea</button>' : ''}
    </div>
    ${!staff ? '<p class="hint">Cuando termines una tarea, pasala a <b>En revisión</b>.</p>' : ''}
    <div class="kanban" id="board"></div>`;

  const board = el.querySelector('#board');
  const fArea = el.querySelector('#f-area');
  const fPerson = el.querySelector('#f-person');

  function draw() {
    const area = fArea.value, person = fPerson.value;
    sessionFilters({ area, person });
    const visible = tasks.filter(t => (!area || t.area_id === area) && (!person || t.assignee_id === (person === 'me' ? me.id : person)));
    board.innerHTML = TASK_STATUS.map(s => {
      const col = visible.filter(t => t.status === s.id);
      return `
        <section class="column" data-status="${s.id}">
          <header><h3>${s.label}</h3><span class="count">${col.length}</span></header>
          <div class="cards">${col.map(card).join('') || '<p class="col-empty">—</p>'}</div>
        </section>`;
    }).join('');
  }

  function card(t) {
    const a = ctx.area(t.area_id);
    const canMove = staff || (t.assignee_id === me.id && t.status !== 'hecha');
    const allowed = TASK_STATUS.filter(s => staff || s.id !== 'hecha');
    return `
      <article class="task-card prio-${t.priority}" draggable="${canMove}" data-id="${t.id}">
        <div class="task-top">
          ${a ? `<span class="chip" style="--c:${esc(a.color)}">${esc(a.name)}</span>` : ''}
          <span class="prio" title="Prioridad ${PRIORITY[t.priority]}">${PRIORITY[t.priority]}</span>
        </div>
        <button class="task-title" data-open="${t.id}">${esc(t.title)}</button>
        <div class="task-meta">
          ${t.assignee_id ? `<span class="who">${avatar(ctx.member(t.assignee_id), 'xs')}${esc(name(ctx.member(t.assignee_id)).split(' ')[0])}</span>` : '<span class="muted small">Sin asignar</span>'}
          ${dueLabel(t.due_date, t.status === 'hecha')}
        </div>
        ${canMove ? `<select class="move" data-move="${t.id}" aria-label="Cambiar estado">${options(allowed.map(s => ({ value: s.id, label: s.label })), t.status)}</select>` : ''}
      </article>`;
  }

  async function move(id, status) {
    const t = tasks.find(x => x.id === id);
    if (!t || t.status === status) return;
    try {
      await api.setTaskStatus(id, status);
      t.status = status;
      toast(`Movida a ${TASK_STATUS.find(s => s.id === status).label}`);
      ctx.refreshBell();
    } catch (e) { toast(errorMessage(e), 'error'); }
    draw();
  }

  async function edit(task) {
    const t = task || { project_id: project.id, priority: 2, status: 'pendiente' };
    const readOnly = !staff;
    const dis = readOnly ? 'disabled' : '';
    const data = await openForm({
      title: task ? (readOnly ? 'Tarea' : 'Editar tarea') : 'Nueva tarea',
      submit: readOnly ? '' : 'Guardar',
      body: `
        ${field('Título', `<input name="title" required maxlength="120" value="${esc(t.title)}" ${dis}/>`)}
        ${field('Descripción', `<textarea name="description" rows="3" ${dis}>${esc(t.description)}</textarea>`)}
        <div class="grid-2">
          ${field('Área', `<select name="area_id" ${dis}>${options(areas.map(a => ({ value: a.id, label: a.name })), t.area_id, { empty: 'Sin área' })}</select>`)}
          ${field('Responsable', `<select name="assignee_id" ${dis}>${options(members.map(m => ({ value: m.id, label: name(m) })), t.assignee_id, { empty: 'Sin asignar' })}</select>`)}
          ${field('Vence', `<input type="date" name="due_date" value="${esc(t.due_date || '')}" ${dis}/>`)}
          ${field('Prioridad', `<select name="priority" ${dis}>${options([1, 2, 3].map(p => ({ value: p, label: PRIORITY[p] })), t.priority)}</select>`)}
          ${field('Hito', `<select name="milestone_id" ${dis}>${options(milestones.map(m => ({ value: m.id, label: m.title })), t.milestone_id, { empty: 'Ninguno' })}</select>`)}
          ${field('Estado', `<select name="status" ${dis}>${options(TASK_STATUS.map(s => ({ value: s.id, label: s.label })), t.status)}</select>`)}
        </div>
        ${task && staff ? '<button type="button" class="link-btn danger-text" data-del>Borrar tarea</button>' : ''}`,
      onOpen: (dlg) => dlg.querySelector('[data-del]')?.addEventListener('click', async () => {
        dlg.close();
        if (await confirmAction('Borrar tarea', `Se borra "${t.title}".`)) {
          try { await api.deleteTask(t.id); toast('Tarea borrada'); ctx.refresh(); } catch (e) { toast(errorMessage(e), 'error'); }
        }
      }),
    });
    if (!data) return;
    try {
      await api.saveTask({
        ...(task ? { id: task.id } : {}),
        project_id: project.id,
        title: data.title,
        description: data.description,
        area_id: data.area_id || null,
        assignee_id: data.assignee_id || null,
        due_date: data.due_date || null,
        priority: Number(data.priority),
        milestone_id: data.milestone_id || null,
        status: data.status,
      });
      toast(task ? 'Tarea actualizada' : 'Tarea creada');
      ctx.refresh();
    } catch (e) { toast(errorMessage(e), 'error'); }
  }

  draw();
  fArea.addEventListener('change', draw);
  fPerson.addEventListener('change', draw);
  el.querySelector('#new-task')?.addEventListener('click', () => edit(null));

  board.addEventListener('click', (ev) => {
    const open = ev.target.closest('[data-open]');
    if (open) edit(tasks.find(t => t.id === open.dataset.open));
  });
  board.addEventListener('change', (ev) => {
    if (ev.target.matches('[data-move]')) move(ev.target.dataset.move, ev.target.value);
  });

  // Arrastrar y soltar entre columnas
  let dragId = null;
  board.addEventListener('dragstart', (ev) => {
    const c = ev.target.closest('.task-card');
    if (!c) return;
    dragId = c.dataset.id;
    c.classList.add('dragging');
    ev.dataTransfer.effectAllowed = 'move';
  });
  board.addEventListener('dragend', (ev) => ev.target.closest('.task-card')?.classList.remove('dragging'));
  board.addEventListener('dragover', (ev) => {
    const col = ev.target.closest('.column');
    if (!col || !dragId) return;
    ev.preventDefault();
    board.querySelectorAll('.column').forEach(c => c.classList.toggle('over', c === col));
  });
  board.addEventListener('drop', (ev) => {
    const col = ev.target.closest('.column');
    board.querySelectorAll('.column').forEach(c => c.classList.remove('over'));
    if (col && dragId) { ev.preventDefault(); move(dragId, col.dataset.status); }
    dragId = null;
  });
}

function sessionFilters(set) {
  try {
    if (set) { sessionStorage.setItem('task-filters', JSON.stringify(set)); return set; }
    return JSON.parse(sessionStorage.getItem('task-filters')) || {};
  } catch { return {}; }
}
