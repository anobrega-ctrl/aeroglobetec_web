import { esc, name, daysUntil, fmtDate, timeAgo, emptyState } from '../../ui.js?v=202610172024';

export async function renderSummary(el, ctx) {
  const { api, project, members } = ctx;
  const [tasks, updates, milestones, areaPerf, activity] = await Promise.all([
    api.tasks(project.id), api.updates(project.id), api.milestones(project.id),
    api.areaPerformance(project.id), api.activity(project.id),
  ]);

  const done = tasks.filter(t => t.status === 'hecha').length;
  const progress = tasks.length ? Math.round(100 * done / tasks.length) : 0;
  const overdue = tasks.filter(t => t.status !== 'hecha' && daysUntil(t.due_date) < 0).length;
  const pending = updates.filter(u => u.status === 'pendiente').length;
  const next = milestones.find(m => !m.done);
  const nDays = next ? daysUntil(next.due_date) : null;

  el.innerHTML = `
    <div class="stats">
      <div class="stat"><b>${progress}%</b><span>Avance general</span><div class="bar"><i style="width:${progress}%"></i></div></div>
      <div class="stat"><b>${done}/${tasks.length}</b><span>Tareas hechas</span></div>
      <div class="stat ${overdue ? 'warn' : ''}"><b>${overdue}</b><span>Tareas vencidas</span></div>
      <div class="stat"><b>${pending}</b><span>Avances por revisar</span></div>
      <div class="stat"><b>${members.length}</b><span>Integrantes</span></div>
    </div>

    <div class="two-col">
      <section class="panel">
        <h2>Próximo hito</h2>
        ${next ? `
          <div class="big-countdown ${nDays < 0 ? 'late' : nDays <= 7 ? 'soon' : ''}">
            <b>${Math.abs(nDays)}</b>
            <span>${nDays < 0 ? 'días de atraso' : nDays === 0 ? 'es hoy' : nDays === 1 ? 'día' : 'días'}</span>
          </div>
          <p class="center"><strong>${esc(next.title)}</strong><br/><span class="muted">${fmtDate(next.due_date)}</span></p>`
          : emptyState('Sin hitos pendientes', 'Agregalos en la pestaña Hitos.')}
      </section>

      <section class="panel">
        <h2>Avance por área</h2>
        ${areaPerf.length ? `<ul class="area-bars">${areaPerf.map(a => `
          <li>
            <div class="area-row"><span><i class="dot-c" style="--c:${esc(a.color)}"></i>${esc(a.area_name)}</span><b>${a.progress}%</b></div>
            <div class="bar"><i style="width:${a.progress}%;background:${esc(a.color)}"></i></div>
            <small class="muted">${a.tasks_done}/${a.tasks_total} tareas · ${a.updates_approved} avances aprobados${a.tasks_overdue ? ` · <span class="late-text">${a.tasks_overdue} vencidas</span>` : ''}</small>
          </li>`).join('')}</ul>` : emptyState('Sin áreas', 'Crealas en Equipo y áreas.')}
      </section>
    </div>

    <section class="panel">
      <h2>Últimos movimientos</h2>
      ${activity.length ? `<ul class="feed">${activity.slice(0, 8).map(a => `
        <li><strong>${esc(name(ctx.member(a.actor_id)) === 'Sin asignar' ? 'Alguien' : name(ctx.member(a.actor_id)))}</strong> ${esc(lower(a.message))}<small>${timeAgo(a.created_at)}</small></li>`).join('')}</ul>
        <a class="link" href="#/proyecto/${project.id}/bitacora">Ver toda la bitácora →</a>`
        : emptyState('Todavía no hay movimientos')}
    </section>`;
}

function lower(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
