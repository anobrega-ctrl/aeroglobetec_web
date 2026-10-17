// Utilidades de interfaz: escape de HTML, fechas, modales y avisos.

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export const ROLE_LABEL = { docente: 'Docente', lider: 'Estudiante líder', estudiante: 'Estudiante' };
export const TASK_STATUS = [
  { id: 'pendiente', label: 'Pendiente' },
  { id: 'en_curso', label: 'En curso' },
  { id: 'en_revision', label: 'En revisión' },
  { id: 'hecha', label: 'Hecha' },
];
export const UPDATE_STATUS = { pendiente: 'Pendiente de revisión', aprobado: 'Aprobado', cambios: 'Pidieron cambios' };
export const ITEM_STATUS = { necesario: 'Necesario', pedido: 'Pedido', recibido: 'Recibido', en_uso: 'En uso' };
export const PRIORITY = { 1: 'Alta', 2: 'Media', 3: 'Baja' };
export const COLORS = ['#3774bc', '#7caef3', '#ffb454', '#4fbf8b', '#e0607e', '#9b7bf0', '#3fb8c9', '#8a9bb5'];

export const isStaff = (profile) => !!profile && (profile.is_admin || profile.role === 'docente' || profile.role === 'lider');
export const canManageRoles = (profile) => !!profile && (profile.is_admin || profile.role === 'docente');

// Etiqueta de rol para mostrar (el admin se marca aparte del rol que le da el dominio)
export function roleChip(p) {
  if (p?.is_admin) return '<span class="role-chip admin">Admin</span>';
  return `<span class="role-chip ${esc(p?.role)}">${esc(ROLE_LABEL[p?.role] || '')}</span>`;
}

export function name(p) {
  if (!p) return 'Sin asignar';
  return p.full_name || p.email;
}

export function initials(p) {
  const n = name(p).trim();
  const parts = n.split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

export function avatar(p, size = '') {
  if (p?.avatar_url) return `<img class="avatar ${size}" src="${esc(p.avatar_url)}" alt="" referrerpolicy="no-referrer"/>`;
  return `<span class="avatar ${size}" aria-hidden="true">${esc(initials(p))}</span>`;
}

const dateFmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });
const dateFmtYear = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' });

export function parseDate(d) {
  if (!d) return null;
  // Las fechas "YYYY-MM-DD" se interpretan como día local
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + 'T00:00:00') : new Date(d);
}

export function fmtDate(d) {
  const x = parseDate(d);
  if (!x) return '';
  return (x.getFullYear() === new Date().getFullYear() ? dateFmt : dateFmtYear).format(x);
}

export function fmtDateTime(d) {
  const x = parseDate(d);
  return x ? `${fmtDate(d)} · ${timeFmt.format(x)}` : '';
}

export function daysUntil(d) {
  const x = parseDate(d);
  if (!x) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((x - today) / 86400000);
}

export function dueLabel(d, done = false) {
  if (!d) return '';
  const n = daysUntil(d);
  let cls = '';
  let txt = fmtDate(d);
  if (!done) {
    if (n < 0) { cls = 'late'; txt = `Venció ${fmtDate(d)}`; }
    else if (n === 0) { cls = 'soon'; txt = 'Vence hoy'; }
    else if (n <= 3) { cls = 'soon'; txt = `En ${n} día${n === 1 ? '' : 's'}`; }
  }
  return `<span class="due ${cls}">${esc(txt)}</span>`;
}

export function timeAgo(d) {
  const x = parseDate(d);
  if (!x) return '';
  const s = Math.round((Date.now() - x) / 1000);
  if (s < 60) return 'recién';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 86400 * 7) return `hace ${Math.floor(s / 86400)} d`;
  return fmtDate(d);
}

export function money(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
}

export function fileSize(b) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export function options(list, selected, { empty } = {}) {
  const head = empty !== undefined ? `<option value="">${esc(empty)}</option>` : '';
  return head + list.map(o => `<option value="${esc(o.value)}" ${String(o.value) === String(selected ?? '') ? 'selected' : ''}>${esc(o.label)}</option>`).join('');
}

// ---------- Avisos ----------
export function toast(message, kind = 'ok') {
  let box = document.getElementById('toasts');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toasts';
    box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
  }
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.textContent = message;
  box.appendChild(t);
  setTimeout(() => t.classList.add('out'), 3200);
  setTimeout(() => t.remove(), 3600);
}

export function errorMessage(e) {
  const msg = e?.message || String(e);
  if (msg.includes('row-level security')) return 'No tenés permiso para hacer eso.';
  return msg;
}

// ---------- Modales ----------
// openForm muestra un formulario en un <dialog> y resuelve con los datos o null si se cancela.
export function openForm({ title, body, submit = 'Guardar', danger = false, wide = false, onOpen }) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'modal' + (wide ? ' wide' : '');
    dlg.innerHTML = `
      <form method="dialog" novalidate>
        <header><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Cerrar">✕</button></header>
        <div class="modal-body">${body}</div>
        <footer>
          <button type="button" class="btn ghost" data-close>Cancelar</button>
          ${submit ? `<button type="submit" class="btn ${danger ? 'danger' : 'primary'}">${esc(submit)}</button>` : ''}
        </footer>
      </form>`;
    document.body.appendChild(dlg);
    const form = dlg.querySelector('form');
    let result = null;
    dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => dlg.close()));
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const missing = [...form.querySelectorAll('[required]')].find(el => !String(el.value).trim());
      if (missing) { missing.focus(); missing.classList.add('invalid'); return; }
      result = formData(form);
      dlg.close();
    });
    dlg.addEventListener('close', () => { dlg.remove(); resolve(result); });
    dlg.showModal();
    onOpen?.(dlg);
    dlg.querySelector('input:not([type=hidden]),textarea,select')?.focus();
  });
}

export async function confirmAction(title, message, submit = 'Borrar') {
  const r = await openForm({ title, body: `<p class="muted">${esc(message)}</p>`, submit, danger: true });
  return r !== null;
}

export function formData(form) {
  const data = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'file') data[el.name] = [...el.files];
    else if (el.type === 'checkbox') {
      if (el.dataset.multi !== undefined) { (data[el.name] ||= []); if (el.checked) data[el.name].push(el.value); }
      else data[el.name] = el.checked;
    }
    else data[el.name] = el.value.trim();
  }
  return data;
}

export function field(label, control, hint = '') {
  return `<label class="field"><span>${esc(label)}</span>${control}${hint ? `<small>${esc(hint)}</small>` : ''}</label>`;
}

export function colorPicker(nameAttr, selected) {
  return `<div class="colors">${COLORS.map(c => `
    <label class="swatch" style="--c:${c}"><input type="radio" name="${nameAttr}" value="${c}" ${c === selected ? 'checked' : ''}/><span></span></label>`).join('')}</div>`;
}

export function emptyState(title, text = '', action = '') {
  return `<div class="empty"><strong>${esc(title)}</strong>${text ? `<p>${esc(text)}</p>` : ''}${action}</div>`;
}
