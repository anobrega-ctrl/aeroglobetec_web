// Punto de entrada: elige la API (Supabase o demo), controla la sesión y el ruteo por hash.
import { DEMO_MODE } from './config.js';
import { esc, avatar, name, ROLE_LABEL, roleChip, isStaff, timeAgo, toast, errorMessage, openForm, field } from './ui.js';
import { renderLogin } from './views/login.js';
import { renderDashboard } from './views/dashboard.js';
import { renderProject } from './views/project.js';
import { renderUsers } from './views/users.js';
import { renderReport } from './views/report.js';

const { api } = DEMO_MODE ? await import('./demo-api.js') : await import('./api.js');
const app = document.getElementById('app');
let me = null;

const routes = [
  [/^#?\/?$/, () => renderDashboard],
  [/^#\/proyecto\/([\w-]+)\/informe$/, () => renderReport],
  [/^#\/proyecto\/([\w-]+)(?:\/(\w+))?$/, () => renderProject],
  [/^#\/usuarios$/, () => renderUsers],
];

async function boot() {
  try {
    me = await api.me();
  } catch (e) {
    me = null;
    showFatal(e);
    return;
  }
  if (!me) {
    document.body.classList.remove('signed-in');
    // Hay sesión pero no perfil: la cuenta no es de un dominio de la ETec (o se creó antes del esquema)
    let notice = '';
    if (await api.session().catch(() => null)) {
      await api.signOut().catch(() => {});
      notice = 'Tu cuenta no está habilitada. Entrá con tu mail @etec.um.edu.ar o @alumno.etec.um.edu.ar.';
    }
    await renderLogin(app, { api, notice });
    return;
  }
  document.body.classList.add('signed-in');
  renderShell();
  await route();
}

function showFatal(e) {
  const msg = errorMessage(e);
  const missingSchema = /schema cache|does not exist|PGRST205/.test(msg);
  app.innerHTML = `
    <main class="center-page">
      <div class="login-card">
        <h1>No se pudo conectar</h1>
        <p class="muted">${missingSchema
          ? 'La base de datos todavía no tiene las tablas. Hay que correr <code>supabase/schema.sql</code> en el SQL Editor de Supabase.'
          : esc(msg)}</p>
        <button class="btn primary" onclick="location.reload()">Reintentar</button>
        <a class="btn ghost" href="?demo">Probar el modo demo</a>
      </div>
    </main>`;
}

function renderShell() {
  const staff = isStaff(me);
  app.innerHTML = `
    ${api.demo ? demoBar() : ''}
    <header class="topbar">
      <div class="topbar-inner">
        <a class="brand" href="#/">
          <span class="brand-name">Aero<b>Glob</b>ETec</span>
          <span class="brand-caption">Plataforma de proyectos</span>
        </a>
        <nav class="topnav" aria-label="Principal">
          <a href="#/" data-nav="home">Proyectos</a>
          ${staff ? '<a href="#/usuarios" data-nav="users">Usuarios</a>' : ''}
        </nav>
        <div class="top-actions">
          <div class="dropdown" id="notif">
            <button class="icon-btn bell" aria-label="Notificaciones" aria-haspopup="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              <span class="dot" hidden></span>
            </button>
            <div class="menu notif-menu" hidden></div>
          </div>
          <div class="dropdown" id="usermenu">
            <button class="user-btn" aria-haspopup="true">${avatar(me, 'sm')}<span class="user-name">${esc(name(me))}</span></button>
            <div class="menu" hidden>
              <div class="menu-head"><strong>${esc(name(me))}</strong><small>${esc(me.email)}</small>${roleChip(me)}</div>
              <button data-act="edit-name">Cambiar mi nombre</button>
              <button data-act="logout">Cerrar sesión</button>
            </div>
          </div>
        </div>
      </div>
    </header>
    <main id="view" tabindex="-1"></main>`;

  // Menús desplegables
  app.querySelectorAll('.dropdown').forEach(dd => {
    const btn = dd.querySelector('button');
    const menu = dd.querySelector('.menu');
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const open = menu.hidden;
      app.querySelectorAll('.dropdown .menu').forEach(m => { m.hidden = true; });
      menu.hidden = !open;
      if (open && dd.id === 'notif') openNotifications(menu);
    });
  });

  app.querySelector('[data-act="logout"]').addEventListener('click', async () => {
    await api.signOut();
    location.hash = '';
    start();
  });
  app.querySelector('[data-act="edit-name"]').addEventListener('click', async () => {
    const data = await openForm({
      title: 'Cambiar mi nombre',
      body: field('Nombre y apellido', `<input name="full_name" required maxlength="80" value="${esc(me.full_name)}"/>`),
    });
    if (!data) return;
    try {
      await api.updateMyName(me.id, data.full_name);
      toast('Nombre actualizado');
      start();
    } catch (e) { toast(errorMessage(e), 'error'); }
  });

  if (api.demo) bindDemoBar();
  refreshBell();
}

function demoBar() {
  const users = api.demoUsers();
  return `
    <div class="demo-bar">
      <span><b>Modo demo</b> · los datos se guardan solo en este navegador.</span>
      <label>Ver como
        <select id="demo-user">${users.map(u => `<option value="${u.id}" ${u.id === me.id ? 'selected' : ''}>${esc(u.full_name)} (${u.is_admin ? 'Admin' : ROLE_LABEL[u.role]})</option>`).join('')}</select>
      </label>
      <button id="demo-reset" class="link-btn">Reiniciar datos</button>
    </div>`;
}

function bindDemoBar() {
  document.getElementById('demo-user').addEventListener('change', (e) => { api.demoLogin(e.target.value); start(); });
  document.getElementById('demo-reset').addEventListener('click', () => { api.demoReset(); location.hash = ''; start(); });
}

async function refreshBell() {
  try {
    const list = await api.notifications();
    const unread = list.filter(n => !n.read).length;
    const dot = app.querySelector('.bell .dot');
    if (dot) { dot.hidden = !unread; dot.textContent = unread > 9 ? '9+' : unread; }
  } catch { /* la campanita no es crítica */ }
}

async function openNotifications(menu) {
  menu.innerHTML = '<p class="muted pad">Cargando…</p>';
  const list = await api.notifications();
  menu.innerHTML = list.length
    ? `<div class="menu-title">Notificaciones</div>` + list.map(n => `
        <a class="notif ${n.read ? '' : 'unread'}" href="${esc(n.link || '#/')}">
          <span>${esc(n.message)}</span><small>${timeAgo(n.created_at)}</small>
        </a>`).join('')
    : '<p class="muted pad">No tenés notificaciones.</p>';
  const unread = list.filter(n => !n.read).map(n => n.id);
  if (unread.length) { await api.markRead(unread); refreshBell(); }
}

async function route() {
  if (!me) return;
  const hash = location.hash || '#/';
  const view = document.getElementById('view');
  app.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active',
    (a.dataset.nav === 'home' && (hash === '#/' || hash.startsWith('#/proyecto'))) || (a.dataset.nav === 'users' && hash === '#/usuarios')));
  for (const [re, get] of routes) {
    const m = hash.match(re);
    if (!m) continue;
    view.innerHTML = '<div class="loading">Cargando…</div>';
    try {
      await get()(view, { api, me, params: m.slice(1), refreshBell, reload: route });
    } catch (e) {
      console.error(e);
      view.innerHTML = `<div class="page"><div class="empty"><strong>Algo salió mal</strong><p>${esc(errorMessage(e))}</p></div></div>`;
    }
    return;
  }
  view.innerHTML = '<div class="page"><div class="empty"><strong>Página no encontrada</strong><p><a href="#/">Volver al inicio</a></p></div></div>';
}

document.addEventListener('click', (ev) => {
  if (!ev.target.closest('.dropdown')) app.querySelectorAll('.dropdown .menu').forEach(m => { m.hidden = true; });
});
window.addEventListener('hashchange', () => { route(); refreshBell(); });

// Evita arranques superpuestos (el cambio de sesión llega mientras boot() todavía corre)
let booting = null;
function start() {
  if (!booting) booting = boot().finally(() => { booting = null; });
  return booting;
}
api.onAuthChange(async (session) => {
  await booting;
  if (!!session !== !!me) start();
});
start();
