// Turnos de equipos: agenda semanal para reservar impresora 3D, soldadora, etc. sin superponerse.
import { esc, isStaff, options, field, openForm, confirmAction, toast, errorMessage, colorPicker, emptyState, COLORS } from '../ui.js?v=202610172024';

const DAY_START = 8;   // la grilla va de 8 a 22 h
const DAY_END = 22;
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const dayFmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

let weekOffset = 0;

export async function renderTurnos(el, ctx) {
  const { api, me } = ctx;
  const staff = isStaff(me);
  const monday = startOfWeek(weekOffset);
  const sunday = addDays(monday, 7);
  const [equipment, agenda, projects] = await Promise.all([api.equipment(), api.agenda(monday, sunday), api.projects()]);
  const active = equipment.filter(e => e.active);
  const myProjects = projects.filter(p => !p.archived && (staff || p.project_members?.some(m => m.user_id === me.id)));
  const today = new Date(); today.setHours(0, 0, 0, 0);

  el.innerHTML = `
    <div class="page">
      <section class="hello">
        <div><h1>Turnos de equipos</h1><p>Impresora, soldadora, osciloscopio y demás equipos del taller.</p></div>
        <div class="head-actions">
          ${staff ? '<button class="btn ghost" id="manage">Equipos</button>' : ''}
          <button class="btn primary" id="new-res" ${active.length && myProjects.length ? '' : 'disabled'}>Reservar</button>
        </div>
      </section>
      <p class="hint">Tocá un horario libre para reservarlo.</p>
      <div class="week-nav">
        <button class="btn small ghost" data-week="-1" aria-label="Semana anterior">←</button>
        <strong>${dayFmt.format(monday)} – ${dayFmt.format(addDays(monday, 6))}</strong>
        <button class="btn small ghost" data-week="1" aria-label="Semana siguiente">→</button>
        ${weekOffset ? '<button class="link-btn" data-week="0">Esta semana</button>' : ''}
      </div>
      ${active.length ? `
      <div class="legend">${active.map(e => `<span class="chip" style="--c:${esc(e.color)}">${esc(e.name)}</span>`).join('')}</div>
      <div class="agenda">${[...Array(7).keys()].map(i => {
        const d = addDays(monday, i);
        const isToday = d.getTime() === today.getTime();
        const dayRes = agenda.filter(r => sameDay(new Date(r.starts_at), d));
        if (i === 6 && !dayRes.length) return '';   // el domingo solo aparece si hay turnos
        return `
          <section class="day-col ${isToday ? 'today' : ''} ${d < today ? 'past' : ''}">
            <h3>${DAYS[i]} <small>${dayFmt.format(d)}</small>${isToday ? ' <span class="badge blue">Hoy</span>' : ''}</h3>
            <div class="hours" aria-hidden="true">${hourMarks()}</div>
            ${active.map(e => `
              <div class="lane" data-eq="${e.id}" data-day="${d.toISOString()}" title="Tocá para reservar ${esc(e.name)}">
                <span class="lane-name">${esc(e.name)}</span>
                <div class="track">${dayRes.filter(r => r.equipment_id === e.id).map(r => block(r, e)).join('')}</div>
              </div>`).join('')}
          </section>`;
      }).join('')}</div>` : emptyState('Todavía no hay equipos cargados', staff ? 'Cargalos con el botón "Equipos".' : 'Un docente o líder tiene que cargarlos.')}
      ${!myProjects.length ? '<p class="hint">Para reservar tenés que ser miembro de algún proyecto.</p>' : ''}
    </div>`;

  function block(r, e) {
    const s = new Date(r.starts_at), en = new Date(r.ends_at);
    const left = pct(hoursOf(s)), right = pct(hoursOf(en) || 24);
    const mine = r.user_id === me.id;
    return `<button class="res ${mine ? 'mine' : ''}" data-res="${r.id}" style="left:${left}%;width:${Math.max(right - left, 4)}%;--c:${esc(r.project_color || e.color)}"
      title="${esc(`${timeFmt.format(s)}–${timeFmt.format(en)} · ${r.project_name}${r.area_name ? ' / ' + r.area_name : ''} · ${r.user_name}${r.purpose ? ' · ' + r.purpose : ''}`)}">
      <b>${timeFmt.format(s)}</b> ${esc(r.project_name)}${r.area_name ? ` · ${esc(r.area_name)}` : ''}</button>`;
  }

  async function edit(r, preset = {}) {
    const editing = !!r;
    const canEdit = !r || staff || r.user_id === me.id;
    const start = preset.start || (r ? new Date(r.starts_at) : null);
    const end = preset.end || (r ? new Date(r.ends_at) : preset.start ? new Date(preset.start.getTime() + 2 * 3600000) : null);
    const pid = preset.project_id || r?.project_id || myProjects[0]?.id;
    const dis = canEdit ? '' : 'disabled';
    // Si el turno es de un proyecto que no está en mi lista, igual lo muestro
    const projectOptions = myProjects.some(p => p.id === pid) || !r ? myProjects : [...myProjects, { id: r.project_id, name: r.project_name }];
    const data = await openForm({
      title: !r ? 'Reservar equipo' : canEdit ? 'Editar turno' : 'Turno',
      submit: canEdit ? (editing ? 'Guardar' : 'Reservar') : '',
      body: `
        ${!canEdit ? `<p class="muted">Reservado por <b>${esc(r.user_name)}</b>.</p>` : ''}
        ${field('Equipo', `<select name="equipment_id" required ${dis}>${options(active.map(e => ({ value: e.id, label: e.name })), preset.equipment_id || r?.equipment_id)}</select>`)}
        <div class="grid-2">
          ${field('Proyecto', `<select name="project_id" required ${dis}>${options(projectOptions.map(p => ({ value: p.id, label: p.name })), pid)}</select>`)}
          ${field('Área (equipo de trabajo)', `<select name="area_id" ${dis}><option value="">Sin área</option></select>`)}
          ${field('Día', `<input type="date" name="day" required value="${start ? isoDay(start) : isoDay(new Date())}" ${dis}/>`)}
          <div class="grid-2 tight">
            ${field('Desde', `<input type="time" name="from" required step="900" value="${start ? hhmm(start) : '14:00'}" ${dis}/>`)}
            ${field('Hasta', `<input type="time" name="to" required step="900" value="${end ? hhmm(end) : '16:00'}" ${dis}/>`)}
          </div>
        </div>
        ${field('Para qué', `<input name="purpose" maxlength="200" value="${esc(preset.purpose ?? r?.purpose)}" placeholder="Ej: imprimir soportes de motores" ${dis}/>`)}
        ${r && canEdit ? '<button type="button" class="link-btn danger-text" data-del>Cancelar turno</button>' : ''}`,
      onOpen: async (dlg) => {
        const projSel = dlg.querySelector('[name=project_id]');
        const areaSel = dlg.querySelector('[name=area_id]');
        const loadAreas = async () => {
          const areas = projSel.value ? await api.areas(projSel.value).catch(() => []) : [];
          const keep = preset.area_id || (r?.area_id && projSel.value === r.project_id ? r.area_id : '');
          areaSel.innerHTML = options(areas.map(a => ({ value: a.id, label: a.name })), keep, { empty: r?.area_name && !areas.length ? r.area_name : 'Sin área' });
        };
        projSel.addEventListener('change', loadAreas);
        loadAreas();
        dlg.querySelector('[data-del]')?.addEventListener('click', async () => {
          dlg.close();
          if (await confirmAction('Cancelar turno', 'El equipo queda libre en ese horario.', 'Cancelar turno')) {
            try { await api.deleteReservation(r.id); toast('Turno cancelado'); ctx.reload(); } catch (e) { toast(errorMessage(e), 'error'); }
          }
        });
      },
    });
    if (!data) return;
    const startsAt = new Date(`${data.day}T${data.from}`);
    const endsAt = new Date(`${data.day}T${data.to}`);
    // Si algo falla, el formulario vuelve a abrirse con lo que la persona ya cargó
    const again = { equipment_id: data.equipment_id, project_id: data.project_id, area_id: data.area_id, start: startsAt, end: endsAt, purpose: data.purpose };
    if (endsAt <= startsAt) { toast('El turno tiene que terminar después de empezar', 'error'); return edit(r, again); }
    try {
      await api.saveReservation({
        ...(r ? { id: r.id } : {}),
        equipment_id: data.equipment_id, project_id: data.project_id, area_id: data.area_id || null,
        starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), purpose: data.purpose,
      });
      toast(r ? 'Turno actualizado' : 'Equipo reservado');
      ctx.reload();
    } catch (e) { toast(errorMessage(e), 'error'); return edit(r, again); }
  }

  async function manage() {
    const data = await openForm({
      title: 'Equipos del taller',
      wide: true,
      submit: 'Agregar equipo',
      body: `
        <ul class="eq-list">${equipment.map(e => `
          <li style="--c:${esc(e.color)}"><span class="dot-c"></span><span class="grow"><b>${esc(e.name)}</b>${e.description ? `<small class="muted"> · ${esc(e.description)}</small>` : ''}</span>
            <label class="check small"><input type="checkbox" data-active="${e.id}" ${e.active ? 'checked' : ''}/> Disponible</label></li>`).join('') || '<li class="muted">Todavía no hay equipos.</li>'}</ul>
        <h3 class="sub">Agregar uno nuevo</h3>
        ${field('Nombre', '<input name="name" maxlength="60" placeholder="Ej: Cortadora láser"/>')}
        ${field('Descripción', '<input name="description" maxlength="200"/>')}
        <div class="field"><span>Color</span>${colorPicker('color', COLORS[equipment.length % COLORS.length])}</div>`,
      onOpen: (dlg) => dlg.querySelectorAll('[data-active]').forEach(cb => cb.addEventListener('change', async () => {
        try { await api.saveEquipment({ id: cb.dataset.active, active: cb.checked }); toast(cb.checked ? 'Equipo disponible' : 'Equipo desactivado'); }
        catch (e) { toast(errorMessage(e), 'error'); cb.checked = !cb.checked; }
      })),
    });
    if (data?.name) {
      try { await api.saveEquipment({ name: data.name, description: data.description, color: data.color || COLORS[0] }); toast('Equipo agregado'); }
      catch (e) { toast(errorMessage(e), 'error'); }
    }
    ctx.reload();
  }

  el.querySelector('#new-res')?.addEventListener('click', () => edit(null));
  el.querySelector('#manage')?.addEventListener('click', manage);
  el.querySelector('.page').addEventListener('click', (ev) => {
    const wk = ev.target.closest('[data-week]');
    if (wk) { weekOffset = wk.dataset.week === '0' ? 0 : weekOffset + Number(wk.dataset.week); ctx.reload(); return; }
    const res = ev.target.closest('[data-res]');
    if (res) { edit(agenda.find(r => r.id === res.dataset.res)); return; }
    const lane = ev.target.closest('.lane');
    if (lane && myProjects.length) {
      const track = lane.querySelector('.track').getBoundingClientRect();
      const x = Math.min(Math.max((ev.clientX - track.left) / track.width, 0), 1);
      const hour = Math.min(DAY_END - 1, Math.floor(DAY_START + x * (DAY_END - DAY_START)));
      const start = new Date(lane.dataset.day); start.setHours(hour, 0, 0, 0);
      edit(null, { equipment_id: lane.dataset.eq, start });
    }
  });
}

function startOfWeek(offset) {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7;   // lunes = 0
  d.setDate(d.getDate() - dow + offset * 7);
  return d;
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function hoursOf(d) { return d.getHours() + d.getMinutes() / 60; }
function pct(h) { return Math.min(100, Math.max(0, (h - DAY_START) / (DAY_END - DAY_START) * 100)); }
function isoDay(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function hhmm(d) { return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
function hourMarks() {
  let out = '';
  for (let h = DAY_START; h <= DAY_END; h += 2) out += `<span style="left:${pct(h)}%">${h}</span>`;
  return out;
}
