import { esc, name, isStaff, dueLabel, daysUntil, fmtDate, openForm, field, colorPicker, toast, errorMessage, emptyState, COLORS } from '../ui.js';

export async function renderDashboard(el, { api, me }) {
  const staff = isStaff(me);
  const [projects, myTasks, milestones, queue] = await Promise.all([
    api.projects(), api.myTasks(me.id), api.upcomingMilestones(), staff ? api.reviewQueue() : null,
  ]);
  const active = projects.filter(p => !p.archived);
  const archived = projects.filter(p => p.archived);
  const firstName = (me.full_name || '').split(' ')[0] || name(me);

  el.innerHTML = `
    <div class="page">
      <section class="hello">
        <div>
          <p class="eyebrow">Inicio</p>
          <h1>Hola, ${esc(firstName)}</h1>
        </div>
        ${staff ? '<button class="btn primary" id="new-project">+ Nuevo proyecto</button>' : ''}
      </section>

      <div class="dash-grid">
        <section class="panel">
          <h2>Mis tareas</h2>
          ${myTasks.length ? `<ul class="list">${myTasks.map(t => `
            <li><a href="#/proyecto/${t.project_id}/tareas" class="row-link">
              <span class="dot-c" style="--c:${esc(t.projects?.color)}"></span>
              <span class="grow"><strong>${esc(t.title)}</strong><small>${esc(t.projects?.name)}</small></span>
              ${dueLabel(t.due_date)}
            </a></li>`).join('')}</ul>` : emptyState('No tenés tareas pendientes')}
        </section>

        ${staff ? `
        <section class="panel">
          <h2>Para revisar</h2>
          ${queue.tasks.length + queue.updates.length ? `<ul class="list">
            ${queue.updates.map(u => `<li><a class="row-link" href="#/proyecto/${u.project_id}/avances"><span class="badge amber">Avance</span><span class="grow"><strong>${esc(u.title)}</strong><small>${esc(u.projects?.name)}</small></span></a></li>`).join('')}
            ${queue.tasks.map(t => `<li><a class="row-link" href="#/proyecto/${t.project_id}/tareas"><span class="badge blue">Tarea</span><span class="grow"><strong>${esc(t.title)}</strong><small>${esc(t.projects?.name)}</small></span></a></li>`).join('')}
          </ul>` : emptyState('Nada pendiente de revisión')}
        </section>` : ''}

        <section class="panel">
          <h2>Próximos hitos</h2>
          ${milestones.length ? `<ul class="list">${milestones.map(m => {
            const n = daysUntil(m.due_date);
            return `<li><a class="row-link" href="#/proyecto/${m.project_id}/hitos">
              <span class="countdown ${n < 0 ? 'late' : n <= 7 ? 'soon' : ''}"><b>${Math.abs(n)}</b><small>${n < 0 ? 'días tarde' : n === 1 ? 'día' : 'días'}</small></span>
              <span class="grow"><strong>${esc(m.title)}</strong><small>${esc(m.projects?.name)} · ${fmtDate(m.due_date)}</small></span>
            </a></li>`;
          }).join('')}</ul>` : emptyState('No hay hitos próximos')}
        </section>
      </div>

      <section>
        <h2 class="section-title">Proyectos</h2>
        ${active.length ? `<div class="project-grid">${active.map(card).join('')}</div>`
          : emptyState('Todavía no estás en ningún proyecto', staff ? 'Creá el primero con el botón de arriba.' : 'Un docente o líder te tiene que sumar a uno.')}
        ${archived.length ? `<details class="archived"><summary>Archivados (${archived.length})</summary><div class="project-grid">${archived.map(card).join('')}</div></details>` : ''}
      </section>
    </div>`;

  el.querySelector('#new-project')?.addEventListener('click', async () => {
    const data = await openForm({
      title: 'Nuevo proyecto',
      body: `
        ${field('Nombre', '<input name="name" required maxlength="80" placeholder="Ej: Dron Rover CATE 2027"/>')}
        ${field('Descripción', '<textarea name="description" rows="3" maxlength="500"></textarea>')}
        <div class="field"><span>Color</span>${colorPicker('color', COLORS[0])}</div>`,
      submit: 'Crear proyecto',
    });
    if (!data) return;
    try {
      const p = await api.createProject({ name: data.name, description: data.description, color: data.color || COLORS[0] });
      toast('Proyecto creado');
      location.hash = `#/proyecto/${p.id}/equipo`;
    } catch (e) { toast(errorMessage(e), 'error'); }
  });
}

function card(p) {
  const count = p.project_members?.length || 0;
  return `
    <a class="project-card" href="#/proyecto/${p.id}" style="--c:${esc(p.color)}">
      <span class="stripe"></span>
      <strong>${esc(p.name)}</strong>
      <p>${esc(p.description || 'Sin descripción')}</p>
      <small>${count} integrante${count === 1 ? '' : 's'}</small>
    </a>`;
}
