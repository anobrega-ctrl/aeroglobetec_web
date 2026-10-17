import { esc, avatar, emptyState } from '../../ui.js?v=202610172052';

export async function renderPerformance(el, ctx) {
  const { api, project, staff, me } = ctx;
  const [students, areas] = await Promise.all([api.studentPerformance(project.id), api.areaPerformance(project.id)]);
  const mine = students.find(s => s.user_id === me.id);
  const ranked = [...students].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  el.innerHTML = `
    <details class="explain">
      <summary>¿Cómo se calcula el puntaje?</summary>
      <p>Es un puntaje <b>orientativo</b> de 0 a 100, no una nota. Se arma con tres partes:</p>
      <ul>
        <li><b>50 % cumplimiento:</b> tareas hechas sobre tareas asignadas.</li>
        <li><b>30 % calidad:</b> nota promedio de los avances aprobados.</li>
        <li><b>20 % puntualidad:</b> tareas terminadas antes de su vencimiento.</li>
      </ul>
      <p>Si una parte todavía no tiene datos, no cuenta. Cada estudiante ve solo su propio puntaje; los docentes y líderes ven el de todos.</p>
    </details>

    ${!staff ? (mine ? myCard(mine) : emptyState('Todavía no hay datos tuyos en este proyecto')) : ''}

    ${staff ? `
    <section class="panel">
      <h2>Por estudiante</h2>
      ${ranked.length ? `
      <div class="score-bars">${ranked.map(s => `
        <div class="score-row">
          <span class="who">${avatar(ctx.member(s.user_id), 'xs')}${esc(s.full_name || s.email)}</span>
          <div class="bar big"><i class="${level(s.score)}" style="width:${s.score ?? 0}%"></i></div>
          <b class="score-num">${s.score ?? '—'}</b>
        </div>`).join('')}</div>
      <div class="table-wrap"><table class="table compact">
        <thead><tr><th>Estudiante</th><th>Tareas hechas</th><th>A tiempo</th><th>Vencidas</th><th>Avances</th><th>Aprobados</th><th>Nota prom.</th><th>Puntaje</th></tr></thead>
        <tbody>${ranked.map(s => `
          <tr>
            <td>${esc(s.full_name || s.email)}</td>
            <td>${s.tasks_done}/${s.tasks_assigned}</td>
            <td>${s.tasks_on_time}</td>
            <td class="${s.tasks_overdue ? 'late-text' : ''}">${s.tasks_overdue}</td>
            <td>${s.updates_total}</td>
            <td>${s.updates_approved}</td>
            <td>${s.avg_score ?? '—'}</td>
            <td><b class="${level(s.score)}-text">${s.score ?? '—'}</b></td>
          </tr>`).join('')}</tbody>
      </table></div>` : emptyState('Sin integrantes')}
    </section>` : ''}

    <section class="panel">
      <h2>Por equipo (área)</h2>
      ${areas.length ? `<div class="area-cards">${areas.map(a => `
        <article class="area-card" style="--c:${esc(a.color)}">
          <header><strong>${esc(a.area_name)}</strong><small class="muted">${a.members} integrante${a.members === 1 ? '' : 's'}</small></header>
          <div class="ring" style="--p:${a.progress}"><span>${a.progress}%</span></div>
          <dl>
            <div><dt>Tareas</dt><dd>${a.tasks_done}/${a.tasks_total}</dd></div>
            <div><dt>Vencidas</dt><dd class="${a.tasks_overdue ? 'late-text' : ''}">${a.tasks_overdue}</dd></div>
            <div><dt>Avances aprob.</dt><dd>${a.updates_approved}/${a.updates_total}</dd></div>
            <div><dt>Nota prom.</dt><dd>${a.avg_score ?? '—'}</dd></div>
          </dl>
        </article>`).join('')}</div>` : emptyState('Sin áreas todavía')}
    </section>`;
}

function myCard(s) {
  return `
    <section class="panel my-score">
      <div class="ring big" style="--p:${s.score ?? 0}"><span>${s.score ?? '—'}</span></div>
      <div class="grow">
        <h2>Tu rendimiento</h2>
        <dl class="kv">
          <div><dt>Tareas hechas</dt><dd>${s.tasks_done} de ${s.tasks_assigned}</dd></div>
          <div><dt>Terminadas a tiempo</dt><dd>${s.tasks_on_time}</dd></div>
          <div><dt>Vencidas sin terminar</dt><dd class="${s.tasks_overdue ? 'late-text' : ''}">${s.tasks_overdue}</dd></div>
          <div><dt>Avances aprobados</dt><dd>${s.updates_approved} de ${s.updates_total}</dd></div>
          <div><dt>Nota promedio</dt><dd>${s.avg_score ?? '—'}</dd></div>
        </dl>
      </div>
    </section>`;
}

function level(score) {
  if (score == null) return 'none';
  if (score >= 75) return 'good';
  if (score >= 50) return 'mid';
  return 'low';
}
