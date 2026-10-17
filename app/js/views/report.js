// Informe del proyecto para imprimir o guardar como PDF (usa la impresión del navegador).
import { esc, name, isStaff, TASK_STATUS, UPDATE_STATUS, ITEM_STATUS, fmtDate, money } from '../ui.js?v=202610172052';
import { RESULT, SEVERITY, ISSUE_STATUS } from './tabs/ensayos.js?v=202610172052';

export async function renderReport(el, { api, me, params }) {
  const [id] = params;
  const staff = isStaff(me);
  const [project, members, areas, tasks, updates, milestones, items, perf, areaPerf, tests, issues] = await Promise.all([
    api.project(id), api.members(id), api.areas(id), api.tasks(id), api.updates(id),
    api.milestones(id), api.inventory(id), api.studentPerformance(id), api.areaPerformance(id),
    api.tests(id), api.issues(id),
  ]);
  if (!project) { location.hash = '#/'; return; }
  const who = (uid) => name(members.find(m => m.id === uid));
  const done = tasks.filter(t => t.status === 'hecha').length;
  const approved = updates.filter(u => u.status === 'aprobado');
  const total = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);

  el.innerHTML = `
    <div class="report-actions no-print">
      <a class="btn ghost" href="#/proyecto/${id}">← Volver al proyecto</a>
      <button class="btn primary" id="print">Imprimir / Guardar PDF</button>
    </div>
    <article class="report">
      <header>
        <p class="eyebrow">AeroGlobETec · ETec UM</p>
        <h1>${esc(project.name)}</h1>
        <p>${esc(project.description)}</p>
        <p class="muted">Informe generado el ${fmtDate(new Date().toISOString())} por ${esc(name(me))}</p>
      </header>

      <h2>Resumen</h2>
      <ul class="report-kpis">
        <li><b>${tasks.length ? Math.round(100 * done / tasks.length) : 0}%</b> avance general</li>
        <li><b>${done}/${tasks.length}</b> tareas hechas</li>
        <li><b>${approved.length}</b> avances aprobados</li>
        <li><b>${members.length}</b> integrantes</li>
      </ul>

      <h2>Equipo y áreas</h2>
      <table><thead><tr><th>Área</th><th>Integrantes</th><th>Avance</th></tr></thead><tbody>
        ${areas.map(a => {
          const p = areaPerf.find(x => x.area_id === a.id);
          return `<tr><td>${esc(a.name)}</td><td>${a.member_ids.map(m => esc(who(m))).join(', ') || '—'}</td><td>${p?.progress ?? 0}% (${p?.tasks_done ?? 0}/${p?.tasks_total ?? 0})</td></tr>`;
        }).join('') || '<tr><td colspan="3">Sin áreas</td></tr>'}
      </tbody></table>

      <h2>Hitos</h2>
      <table><thead><tr><th>Hito</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>
        ${milestones.map(m => `<tr><td>${esc(m.title)}</td><td>${fmtDate(m.due_date)}</td><td>${m.done ? 'Cumplido' : 'Pendiente'}</td></tr>`).join('') || '<tr><td colspan="3">Sin hitos</td></tr>'}
      </tbody></table>

      <h2>Tareas</h2>
      <table><thead><tr><th>Tarea</th><th>Área</th><th>Responsable</th><th>Vence</th><th>Estado</th></tr></thead><tbody>
        ${tasks.map(t => `<tr><td>${esc(t.title)}</td><td>${esc(areas.find(a => a.id === t.area_id)?.name || '—')}</td><td>${esc(t.assignee_id ? who(t.assignee_id) : '—')}</td><td>${fmtDate(t.due_date) || '—'}</td><td>${TASK_STATUS.find(s => s.id === t.status).label}</td></tr>`).join('') || '<tr><td colspan="5">Sin tareas</td></tr>'}
      </tbody></table>

      <h2>Avances</h2>
      ${updates.map(u => `
        <section class="report-update">
          <h3>${esc(u.title)} <small>· ${esc(who(u.author_id))} · ${fmtDate(u.created_at)} · ${UPDATE_STATUS[u.status]}${u.score ? ` (${u.score}/10)` : ''}</small></h3>
          ${u.body ? `<p>${esc(u.body)}</p>` : ''}
          ${u.feedback ? `<p class="fb"><b>Devolución:</b> ${esc(u.feedback)}</p>` : ''}
        </section>`).join('') || '<p>Sin avances.</p>'}

      <h2>Ensayos</h2>
      <table><thead><tr><th>Fecha</th><th>Ensayo</th><th>Resultado</th><th>Qué pasó</th></tr></thead><tbody>
        ${tests.map(t => `<tr><td>${fmtDate(t.test_date)}</td><td>${esc(t.title)}</td><td>${RESULT[t.result]}</td><td>${esc(t.notes)}</td></tr>`).join('') || '<tr><td colspan="4">Sin ensayos</td></tr>'}
      </tbody></table>

      <h2>Fallas</h2>
      <table><thead><tr><th>Falla</th><th>Gravedad</th><th>Estado</th><th>Resolución</th></tr></thead><tbody>
        ${issues.map(i => `<tr><td>${esc(i.title)}</td><td>${SEVERITY[i.severity]}</td><td>${ISSUE_STATUS[i.status]}</td><td>${esc(i.resolution) || '—'}</td></tr>`).join('') || '<tr><td colspan="4">Sin fallas</td></tr>'}
      </tbody></table>

      <h2>Inventario y presupuesto</h2>
      <table><thead><tr><th>Componente</th><th>Cant.</th><th>Subtotal</th><th>Estado</th></tr></thead><tbody>
        ${items.map(i => `<tr><td>${esc(i.name)}</td><td>${i.quantity}</td><td>${money(i.quantity * i.unit_cost)}</td><td>${ITEM_STATUS[i.status]}</td></tr>`).join('') || '<tr><td colspan="4">Sin ítems</td></tr>'}
        ${items.length ? `<tr class="total"><td colspan="2">Total</td><td>${money(total)}</td><td></td></tr>` : ''}
      </tbody></table>

      ${staff ? `
      <h2>Rendimiento por estudiante <small>(uso interno)</small></h2>
      <table><thead><tr><th>Estudiante</th><th>Tareas</th><th>Avances aprob.</th><th>Nota prom.</th><th>Puntaje</th></tr></thead><tbody>
        ${perf.map(s => `<tr><td>${esc(s.full_name || s.email)}</td><td>${s.tasks_done}/${s.tasks_assigned}</td><td>${s.updates_approved}</td><td>${s.avg_score ?? '—'}</td><td>${s.score ?? '—'}</td></tr>`).join('')}
      </tbody></table>` : ''}
    </article>`;

  el.querySelector('#print').addEventListener('click', () => window.print());
}
