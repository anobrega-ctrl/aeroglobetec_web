import { esc, name, icon, fmtDate, emptyState, parseDate } from '../../ui.js?v=202610171852';

const KINDS = {
  tarea: ['check', 'Tareas'], avance: ['upload', 'Avances'], revision: ['edit', 'Revisiones'], hito: ['flag', 'Hitos'],
  equipo: ['users', 'Equipo'], archivo: ['folder', 'Archivos'], inventario: ['box', 'Inventario'], area: ['layers', 'Áreas'],
  ensayo: ['flask', 'Ensayos'], falla: ['alert', 'Fallas'],
};

export async function renderActivity(el, ctx) {
  const { api, project } = ctx;
  const all = await api.activity(project.id);

  el.innerHTML = `<div class="tab-root">
    <div class="toolbar">
      <select id="f-kind" aria-label="Filtrar">${'<option value="">Todo</option>' + Object.entries(KINDS).map(([k, [, l]]) => `<option value="${k}">${l}</option>`).join('')}</select>
      <p class="muted grow">Se completa sola con cada cambio del proyecto.</p>
    </div>
    <div id="feed"></div>
  </div>`;

  const feed = el.querySelector('#feed');
  const sel = el.querySelector('#f-kind');
  function draw() {
    const rows = all.filter(a => !sel.value || a.kind === sel.value);
    if (!rows.length) { feed.innerHTML = emptyState('No hay movimientos'); return; }
    const byDay = new Map();
    for (const a of rows) {
      const key = parseDate(a.created_at).toDateString();
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(a);
    }
    feed.innerHTML = [...byDay.values()].map(list => `
      <section class="day">
        <h3>${fmtDate(list[0].created_at)}</h3>
        <ul class="timeline-list">${list.map(a => `
          <li><span class="kind">${icon(KINDS[a.kind]?.[0] || 'clock')}</span>
            <span class="grow"><b>${esc(a.actor_id && ctx.member(a.actor_id) ? name(ctx.member(a.actor_id)) : 'Alguien')}</b> ${esc(a.message.charAt(0).toLowerCase() + a.message.slice(1))}</span>
            <small class="muted">${parseDate(a.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}</small></li>`).join('')}</ul>
      </section>`).join('');
  }
  sel.addEventListener('change', draw);
  draw();
}
