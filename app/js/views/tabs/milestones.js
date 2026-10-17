import { esc, field, openForm, confirmAction, toast, errorMessage, fmtDate, daysUntil, emptyState } from '../../ui.js?v=202610172052';

export async function renderMilestones(el, ctx) {
  const { api, project, staff } = ctx;
  const [milestones, tasks] = await Promise.all([api.milestones(project.id), api.tasks(project.id)]);

  el.innerHTML = `<div class="tab-root">
    <div class="toolbar"><span class="grow"></span>
      ${staff ? '<button class="btn primary" id="new-ms">Nuevo hito</button>' : ''}</div>
    ${milestones.length ? `<ol class="milestones">${milestones.map(m => {
      const n = daysUntil(m.due_date);
      const ts = tasks.filter(t => t.milestone_id === m.id);
      const done = ts.filter(t => t.status === 'hecha').length;
      const pct = ts.length ? Math.round(100 * done / ts.length) : 0;
      const state = m.done ? 'done' : n < 0 ? 'late' : n <= 7 ? 'soon' : '';
      return `
        <li class="milestone ${state}">
          <div class="ms-count">${m.done ? '<b>✓</b><small>cumplido</small>' : `<b>${Math.abs(n)}</b><small>${n < 0 ? 'días tarde' : n === 1 ? 'día' : 'días'}</small>`}</div>
          <div class="grow">
            <strong>${esc(m.title)}</strong>
            <small class="muted">${fmtDate(m.due_date)} · ${done}/${ts.length} tareas</small>
            <div class="bar"><i style="width:${pct}%"></i></div>
          </div>
          ${staff ? `<div class="row-actions">
            <button class="btn small ${m.done ? 'ghost' : ''}" data-toggle="${m.id}">${m.done ? 'Reabrir' : 'Marcar cumplido'}</button>
            <button class="link-btn" data-edit="${m.id}">Editar</button>
            <button class="link-btn danger-text" data-del="${m.id}">Borrar</button>
          </div>` : ''}
        </li>`;
    }).join('')}</ol>` : emptyState('Todavía no hay hitos', staff ? 'Por ejemplo: "Prototipo funcionando" o "CATE 2027".' : '')}</div>`;

  async function edit(m) {
    const data = await openForm({
      title: m ? 'Editar hito' : 'Nuevo hito',
      body: `${field('Nombre', `<input name="title" required maxlength="120" value="${esc(m?.title)}"/>`)}
             ${field('Fecha', `<input type="date" name="due_date" required value="${esc(m?.due_date || '')}"/>`)}`,
    });
    if (!data) return;
    try {
      await api.saveMilestone({ ...(m ? { id: m.id } : { project_id: project.id }), title: data.title, due_date: data.due_date });
      toast('Hito guardado');
      ctx.refresh();
    } catch (e) { toast(errorMessage(e), 'error'); }
  }

  el.querySelector('#new-ms')?.addEventListener('click', () => edit(null));
  el.querySelector('.tab-root').addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    const m = milestones.find(x => x.id === (b.dataset.toggle || b.dataset.edit || b.dataset.del));
    if (!m) return;
    try {
      if (b.dataset.toggle) { await api.saveMilestone({ id: m.id, done: !m.done }); ctx.refresh(); }
      else if (b.dataset.edit) await edit(m);
      else if (b.dataset.del && await confirmAction('Borrar hito', `Se borra "${m.title}". Las tareas quedan sin hito.`)) {
        await api.deleteMilestone(m.id); toast('Hito borrado'); ctx.refresh();
      }
    } catch (e) { toast(errorMessage(e), 'error'); }
  });
}
