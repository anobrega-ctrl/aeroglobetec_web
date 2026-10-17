// Charlas y competencias: lista y alta de eventos.
import { esc, icon, isStaff, field, options, openForm, colorPicker, toast, errorMessage, fmtDate, daysUntil, emptyState, COLORS } from '../ui.js';

export const KIND = { charla: 'Charla', competencia: 'Competencia' };
export const EVENT_STATUS = { preparacion: 'En preparación', confirmado: 'Confirmado', realizado: 'Realizado', cancelado: 'Cancelado' };

export async function renderEventos(el, ctx) {
  const { api, me } = ctx;
  const staff = isStaff(me);
  const events = await api.events();
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter(e => (e.ends_on || e.starts_on) >= today && e.status !== 'cancelado');
  const past = events.filter(e => !upcoming.includes(e)).reverse();

  el.innerHTML = `
    <div class="page">
      <section class="hello">
        <div><h1>Charlas y competencias</h1><p>Lo que viene, quién va, qué proyectos se presentan y el material de cada una.</p></div>
        ${staff ? `<button class="btn primary" id="new-event">${icon('plus')} Nueva charla o competencia</button>` : ''}
      </section>
      <div class="toolbar">
        <select id="f-kind" aria-label="Filtrar por tipo">${options([{ value: 'charla', label: 'Charlas' }, { value: 'competencia', label: 'Competencias' }], '', { empty: 'Todo' })}</select>
      </div>
      <div id="event-lists"></div>
    </div>`;

  const lists = el.querySelector('#event-lists');
  const fKind = el.querySelector('#f-kind');
  function draw() {
    const k = fKind.value;
    const up = upcoming.filter(e => !k || e.kind === k);
    const pa = past.filter(e => !k || e.kind === k);
    lists.innerHTML = `
      <h2 class="section-title">Próximas</h2>
      ${up.length ? `<div class="event-list">${up.map(row).join('')}</div>` : emptyState('No hay nada próximo', staff ? 'Cargá la próxima charla o competencia.' : 'Cuando te sumen a una, aparece acá.')}
      ${pa.length ? `<h2 class="section-title">Anteriores</h2><div class="event-list past">${pa.map(row).join('')}</div>` : ''}`;
  }
  function row(e) {
    const n = daysUntil(e.starts_on);
    const when = e.ends_on && e.ends_on !== e.starts_on ? `${fmtDate(e.starts_on)} al ${fmtDate(e.ends_on)}` : fmtDate(e.starts_on);
    const count = e.event_members?.length || 0;
    return `
      <a class="event-row" href="#/evento/${e.id}" style="--c:${esc(e.color)}">
        <span class="event-date"><b>${new Date(e.starts_on + 'T00:00:00').getDate()}</b><small>${esc(new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(new Date(e.starts_on + 'T00:00:00')))}</small></span>
        <span class="grow">
          <span class="event-title">${icon(e.kind === 'charla' ? 'mic' : 'trophy')}<strong>${esc(e.title)}</strong></span>
          <small class="muted">${KIND[e.kind]} · ${esc(when)}${e.location ? ` · ${esc(e.location)}` : ''} · ${count} en el equipo</small>
        </span>
        <span class="status-pill ${e.status}">${EVENT_STATUS[e.status]}</span>
        ${n >= 0 && e.status !== 'realizado' ? `<span class="due ${n <= 7 ? 'soon' : ''}">${n === 0 ? 'Hoy' : `En ${n} día${n === 1 ? '' : 's'}`}</span>` : ''}
      </a>`;
  }
  draw();
  fKind.addEventListener('change', draw);

  el.querySelector('#new-event')?.addEventListener('click', async () => {
    const id = await editEvent(api, null);
    if (id) location.hash = `#/evento/${id}/equipo`;
  });
}

// Formulario de alta/edición (lo usa también la vista del evento)
export async function editEvent(api, e) {
  const data = await openForm({
    title: e ? 'Editar evento' : 'Nueva charla o competencia',
    wide: true,
    body: `
      <div class="grid-2">
        ${field('Tipo', `<select name="kind">${options(Object.entries(KIND).map(([value, label]) => ({ value, label })), e?.kind || 'competencia')}</select>`)}
        ${field('Estado', `<select name="status">${options(Object.entries(EVENT_STATUS).map(([value, label]) => ({ value, label })), e?.status || 'preparacion')}</select>`)}
      </div>
      ${field('Nombre', `<input name="title" required maxlength="120" value="${esc(e?.title)}" placeholder="Ej: CATE 2027 o Charla en la Expo ETec"/>`)}
      <div class="grid-2">
        ${field('Fecha', `<input type="date" name="starts_on" required value="${esc(e?.starts_on || '')}"/>`)}
        ${field('Termina', `<input type="date" name="ends_on" value="${esc(e?.ends_on || '')}"/>`, 'Solo si dura más de un día.')}
        ${field('Lugar', `<input name="location" maxlength="120" value="${esc(e?.location)}"/>`)}
        ${field('Organiza', `<input name="organizer" maxlength="120" value="${esc(e?.organizer)}"/>`)}
      </div>
      ${field('Página del evento', `<input type="url" name="website" value="${esc(e?.website)}" placeholder="https://…"/>`)}
      ${field('Descripción', `<textarea name="description" rows="3" maxlength="3000">${esc(e?.description)}</textarea>`)}
      <div class="field"><span>Color</span>${colorPicker('color', e?.color || COLORS[0])}</div>`,
  });
  if (!data) return null;
  if (data.ends_on && data.ends_on < data.starts_on) { toast('La fecha de fin no puede ser anterior al inicio', 'error'); return null; }
  if (data.website && !/^https?:\/\//.test(data.website)) { toast('La página tiene que empezar con https://', 'error'); return null; }
  try {
    const id = await api.saveEvent({
      ...(e ? { id: e.id } : {}),
      kind: data.kind, status: data.status, title: data.title, starts_on: data.starts_on, ends_on: data.ends_on || null,
      location: data.location, organizer: data.organizer, website: data.website, description: data.description, color: data.color || COLORS[0],
    });
    toast(e ? 'Evento actualizado' : 'Evento creado');
    return id;
  } catch (err) { toast(errorMessage(err), 'error'); return null; }
}
