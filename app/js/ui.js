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
const timeFmt = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

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
          <button type="button" class="btn ghost" data-close>${submit ? 'Cancelar' : 'Cerrar'}</button>
          ${submit ? `<button type="submit" class="btn ${danger ? 'danger' : 'primary'}">${esc(submit)}</button>` : ''}
        </footer>
      </form>`;
    document.body.appendChild(dlg);
    const form = dlg.querySelector('form');
    // Se resuelve directo al guardar o cancelar; el evento "close" queda solo de respaldo
    // (tecla Esc), porque algunos navegadores no siempre lo disparan.
    const nativeClose = dlg.close.bind(dlg);
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      if (dlg.open) nativeClose();
      dlg.remove();
      resolve(result);
    };
    dlg.close = () => finish(null);
    dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => finish(null)));
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const missing = [...form.querySelectorAll('[required]')].find(el => !String(el.value).trim());
      if (missing) { missing.focus(); missing.classList.add('invalid'); return; }
      finish(formData(form));
    });
    dlg.addEventListener('close', () => finish(null));
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
    else if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; }
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

// ---------- Menciones con @ ----------
// Conecta un <input> con un autocompletado de personas. Devuelve una función que,
// dado el texto final, entrega los ids de las personas mencionadas.
export function mentionInput(input, people) {
  const picked = new Map();   // nombre mostrado -> id
  const box = document.createElement('div');
  box.className = 'mention-box';
  box.hidden = true;
  input.parentElement.style.position = 'relative';
  input.after(box);
  let matches = [], active = 0;

  const query = () => {
    const upto = input.value.slice(0, input.selectionStart);
    const m = upto.match(/(?:^|\s)@([^\s@]{0,30})$/);
    return m ? m[1].toLowerCase() : null;
  };
  const close = () => { box.hidden = true; matches = []; };
  const draw = () => {
    box.innerHTML = matches.map((p, i) => `<button type="button" class="${i === active ? 'on' : ''}" data-i="${i}">${avatar(p, 'xs')} ${esc(name(p))}</button>`).join('');
    box.hidden = !matches.length;
  };
  const pick = (p) => {
    const pos = input.selectionStart;
    const before = input.value.slice(0, pos).replace(/@([^\s@]*)$/, `@${name(p)} `);
    input.value = before + input.value.slice(pos);
    input.setSelectionRange(before.length, before.length);
    picked.set(name(p), p.id);
    close();
    input.focus();
  };

  input.addEventListener('input', () => {
    const q = query();
    if (q === null) return close();
    const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    matches = people.filter(p => norm(name(p)).split(/\s+/).some(w => w.startsWith(norm(q))) || norm(p.email).startsWith(norm(q))).slice(0, 6);
    active = 0;
    draw();
  });
  input.addEventListener('keydown', (ev) => {
    if (box.hidden) return;
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      active = (active + (ev.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length;
      draw();
    } else if (ev.key === 'Enter' || ev.key === 'Tab') {
      ev.preventDefault();
      pick(matches[active]);
    } else if (ev.key === 'Escape') close();
  });
  box.addEventListener('mousedown', (ev) => {
    const b = ev.target.closest('[data-i]');
    if (b) { ev.preventDefault(); pick(matches[Number(b.dataset.i)]); }
  });
  input.addEventListener('blur', () => setTimeout(close, 150));

  return (text) => [...picked].filter(([n]) => text.includes('@' + n)).map(([, id]) => id);
}

// Muestra un texto resaltando las menciones a las personas indicadas
export function withMentions(text, ids, people) {
  let html = esc(text);
  for (const id of ids || []) {
    const p = people.find(x => x.id === id);
    if (!p) continue;
    const tag = esc('@' + name(p));
    html = html.split(tag).join(`<span class="mention">${tag}</span>`);
  }
  return html;
}

// ---------- Íconos ----------
// Trazos simples de 24x24 (estilo línea) para no depender de emojis.
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  folder: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  clip: '<path d="m20 11.5-8.4 8.4a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4L14.5 7.4"/>',
  message: '<path d="M4 5h16v11H9l-5 4z"/>',
  file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="1"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  cube: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
  code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
  flask: '<path d="M9 3h6M10 3v6L4.5 19a1.3 1.3 0 0 0 1.2 2h12.6a1.3 1.3 0 0 0 1.2-2L14 9V3"/><path d="M7 15h10"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
  box: '<path d="M3 7h18v13H3zM3 7l2-3h14l2 3M10 11h4"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  logout: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 21h8"/>',
  play: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  presentation: '<path d="M3 4h18M5 4v10h14V4M12 14v4M8 21l4-3 4 3"/>',
};
export function icon(nameOf, cls = '') {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[nameOf] || ''}</svg>`;
}

// ---------- Texto con formato simple (presentaciones) ----------
// Admite: # Título, ## Subtítulo, ### Apartado, listas con "- " o "1. ", > cita, ---,
// **negrita**, *cursiva*, `código` y [texto](https://...). Todo se escapa antes: no acepta HTML.
export function markdown(src) {
  const inline = (t) => esc(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  const out = [];
  let list = null, para = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${para.map(inline).join('<br/>')}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map(i => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`); list = null; } };
  for (const raw of String(src || '').replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) { flushPara(); flushList(); continue; }
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) { flushPara(); flushList(); const h = m[1].length + 1; out.push(`<h${h}>${inline(m[2])}</h${h}>`); continue; }
    if (/^-{3,}$/.test(line.trim())) { flushPara(); flushList(); out.push('<hr/>'); continue; }
    if ((m = line.match(/^>\s?(.*)$/))) { flushPara(); flushList(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); continue; }
    if ((m = line.match(/^\s*[-*]\s+(.*)$/)) || (m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      flushPara();
      const tag = /^\s*\d/.test(line) ? 'ol' : 'ul';
      if (!list || list.tag !== tag) { flushList(); list = { tag, items: [] }; }
      list.items.push(m[1]);
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushPara(); flushList();
  return out.join('\n');
}

// ---------- Contenido embebible ----------
// Convierte links de Canva, Google (Slides/Docs/Drive) y YouTube en su versión para mostrar adentro de la página.
export function embedUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.replace(/^www\./, '');
  if (host === 'canva.com' && /^\/design\//.test(u.pathname)) {
    const base = u.pathname.replace(/\/(edit|view|watch)$/, '');
    return `https://www.canva.com${base}/view?embed`;
  }
  if (host === 'docs.google.com') {
    const m = u.pathname.match(/^\/(presentation|document|spreadsheets)\/d\/([\w-]+)/);
    if (m) return m[1] === 'presentation'
      ? `https://docs.google.com/presentation/d/${m[2]}/embed?start=false&loop=false`
      : `https://docs.google.com/${m[1]}/d/${m[2]}/preview`;
  }
  if (host === 'drive.google.com') {
    const m = u.pathname.match(/\/file\/d\/([\w-]+)/);
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
    const id = host === 'youtu.be' ? u.pathname.slice(1) : (u.searchParams.get('v') || u.pathname.match(/\/(?:embed|shorts)\/([\w-]+)/)?.[1]);
    if (id && /^[\w-]{6,20}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
  }
  return null;
}
