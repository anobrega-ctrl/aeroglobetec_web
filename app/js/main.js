// Punto de entrada: elige la API (Supabase o demo), controla la sesión y el ruteo por hash.
import { DEMO_MODE } from './config.js?v=202610180031';
import { esc, avatar, name, icon, ROLE_LABEL, roleChip, isStaff, canManageRoles, hasAccess, timeAgo, toast, errorMessage, openForm, field } from './ui.js?v=202610180031';
import { renderLogin } from './views/login.js?v=202610180031';
import { renderDashboard } from './views/dashboard.js?v=202610180031';
import { renderProject } from './views/project.js?v=202610180031';
import { renderUsers } from './views/users.js?v=202610180031';
import { renderReport } from './views/report.js?v=202610180031';
import { renderTurnos } from './views/turnos.js?v=202610180031';
import { renderSitio } from './views/sitio.js?v=202610180031';
import { renderEventos } from './views/eventos.js?v=202610180031';
import { renderMarca } from './views/marca.js?v=202610180031';
import { renderEvento } from './views/evento.js?v=202610180031';

const { api } = DEMO_MODE ? await import('./demo-api.js?v=202610180031') : await import('./api.js?v=202610180031');
const app = document.getElementById('app');
let me = null;

const routes = [
  [/^#?\/?$/, () => renderDashboard],
  [/^#\/proyecto\/([\w-]+)\/informe$/, () => renderReport],
  [/^#\/proyecto\/([\w-]+)(?:\/(\w+))?$/, () => renderProject],
  [/^#\/usuarios$/, () => renderUsers],
  [/^#\/turnos$/, () => renderTurnos],
  [/^#\/eventos$/, () => renderEventos],
  [/^#\/evento\/([\w-]+)(?:\/(\w+))?$/, () => renderEvento],
  [/^#\/sitio(?:\/(\w+))?$/, () => renderSitio],
  [/^#\/marca$/, () => renderMarca],
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
      notice = 'Tu cuenta no está habilitada. Entrá con tu mail @etec.um.edu.ar o @alumno.etec.um.edu.ar, o pedile a un docente que invite tu mail.';
    }
    await renderLogin(app, { api, notice });
    return;
  }
  if (!hasAccess(me)) { renderWaiting(); return; }
  document.body.classList.add('signed-in');
  renderShell();
  await route();
}

// Cuenta todavía no aprobada (o rechazada): no entra hasta que un docente o un admin la habilite
function renderWaiting() {
  document.body.classList.remove('signed-in');
  const rejected = me.access === 'rechazado';
  app.innerHTML = `
    ${api.demo ? demoBar() : ''}
    <main class="center-page space">
      <div class="login-card waiting">
        <div class="login-logo"><img src="icons/icon-192.png" alt="" width="36" height="36"/>AeroGlobETec</div>
        <span class="waiting-icon ${rejected ? 'no' : ''}">${icon(rejected ? 'alert' : 'clock')}</span>
        <h1>${rejected ? 'No tenés acceso a la plataforma' : 'Tu cuenta está esperando aprobación'}</h1>
        <p class="muted">${rejected
          ? 'Un docente no habilitó esta cuenta. Si creés que es un error, hablá con un docente del taller.'
          : 'Para entrar, un docente o un admin del taller tiene que aprobar tu cuenta. Ya les avisamos; cuando te habiliten, volvé a entrar.'}</p>
        <p class="waiting-who">${avatar(me, 'xs')}<span><b>${esc(name(me))}</b><small>${esc(me.email)}</small></span></p>
        ${rejected ? '' : `<button class="btn primary" id="recheck">Ya me aprobaron, entrar</button>`}
        <button class="btn ghost" id="logout-wait">Salir y usar otra cuenta</button>
        <a class="muted back" href="../">Ir a la web del taller</a>
      </div>
    </main>`;
  app.querySelector('#recheck')?.addEventListener('click', async (ev) => {
    ev.target.disabled = true;
    await start();
    if (!hasAccess(me)) { ev.target.disabled = false; toast('Todavía no te aprobaron'); }
  });
  app.querySelector('#logout-wait').addEventListener('click', async () => { await api.signOut(); location.hash = ''; start(); });
  if (api.demo) bindDemoBar();
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
    <div class="shell-layout">
      <aside class="sidebar" aria-label="Menú">
        <a class="brand" href="#/">
          <img src="icons/icon-192.png" alt="" width="30" height="30"/>
          <span>AeroGlobETec</span>
        </a>
        <nav class="side-nav" aria-label="Principal">
          <a href="#/" data-nav="home">${icon('home')}<span>Inicio</span></a>
          <a href="#/eventos" data-nav="eventos">${icon('trophy')}<span>Charlas y competencias</span></a>
          <a href="#/marca" data-nav="marca">${icon('image')}<span>Imagen de marca</span></a>
          <a href="#/turnos" data-nav="turnos">${icon('calendar')}<span>Turnos</span></a>
          ${staff ? `<a href="#/usuarios" data-nav="users">${icon('users')}<span>Usuarios</span><span class="nav-count" id="pending-count" hidden></span></a>` : ''}
          ${canManageRoles(me) ? `<a href="#/sitio" data-nav="sitio">${icon('globe')}<span>Sitio web</span></a>` : ''}
        </nav>
        <div class="side-projects">
          <p class="side-label">Proyectos</p>
          <div id="side-projects"></div>
        </div>
        <div class="side-foot">
          <div class="dropdown" id="notif">
            <button class="side-btn bell" aria-label="Notificaciones" aria-haspopup="true">${icon('bell')}<span>Notificaciones</span><span class="dot" hidden></span></button>
            <div class="menu notif-menu up" hidden></div>
          </div>
          <div class="dropdown" id="usermenu">
            <button class="side-btn user-btn" aria-haspopup="true">${avatar(me, 'xs')}<span class="user-name">${esc(name(me))}</span></button>
            <div class="menu up" hidden>
              <div class="menu-head"><strong>${esc(name(me))}</strong><small>${esc(me.email)}</small>${roleChip(me)}</div>
              <button data-act="tour">${icon('play')} Recorrido por la plataforma</button>
              <button data-act="install" hidden>${icon('phone')} Instalar app</button>
              <button data-act="edit-name">${icon('edit')} Cambiar mi nombre</button>
              <button data-act="logout">${icon('logout')} Cerrar sesión</button>
            </div>
          </div>
        </div>
      </aside>
      <main id="view" tabindex="-1"></main>
    </div>`;
  loadSideProjects();

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

  app.querySelector('[data-act="tour"]').addEventListener('click', () => { location.href = 'tutorial.html'; });
  app.querySelector('[data-act="install"]').addEventListener('click', async () => {
    if (!installPrompt) return installHelp();
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') installPrompt = window.__installPrompt = null;
    showInstall();
  });
  showInstall();

  if (api.demo) bindDemoBar();
  refreshBell();
}

// Accesos directos a los proyectos en la barra lateral
async function loadSideProjects() {
  const box = document.getElementById('side-projects');
  if (!box) return;
  try {
    const list = (await api.projects()).filter(p => !p.archived);
    box.innerHTML = list.length
      ? list.map(p => `<a href="#/proyecto/${p.id}" data-proj="${p.id}"><i style="--c:${esc(p.color)}"></i><span>${esc(p.name)}</span></a>`).join('')
      : '<p class="side-empty">Todavía no estás en ningún proyecto.</p>';
    markActive();
  } catch { box.innerHTML = ''; }
}

function markActive() {
  const hash = location.hash || '#/';
  const proj = hash.match(/^#\/proyecto\/([\w-]+)/)?.[1];
  app.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active',
    (a.dataset.nav === 'home' && hash === '#/') || (a.dataset.nav === 'users' && hash === '#/usuarios') ||
    (a.dataset.nav === 'turnos' && hash === '#/turnos') || (a.dataset.nav === 'marca' && hash === '#/marca') || (a.dataset.nav === 'eventos' && (hash === '#/eventos' || hash.startsWith('#/evento/'))) || (a.dataset.nav === 'sitio' && hash.startsWith('#/sitio'))));
  app.querySelectorAll('[data-proj]').forEach(a => a.classList.toggle('active', a.dataset.proj === proj));
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
  refreshPending();
  try {
    const list = await api.notifications();
    const unread = list.filter(n => !n.read).length;
    const dot = app.querySelector('.bell .dot');
    if (dot) { dot.hidden = !unread; dot.textContent = unread > 9 ? '9+' : unread; }
  } catch { /* la campanita no es crítica */ }
}

// Pedidos de acceso sin responder (solo lo ven quienes pueden aprobar)
async function refreshPending() {
  const badge = document.getElementById('pending-count');
  if (!badge || !canManageRoles(me)) return;
  try {
    const n = await api.pendingCount();
    badge.hidden = !n;
    badge.textContent = n > 9 ? '9+' : n;
    badge.title = `${n} pedido${n === 1 ? '' : 's'} de acceso`;
  } catch { /* no es crítico */ }
}
window.addEventListener('access-changed', refreshPending);

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
  markActive();
  loadSideProjects();
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

// "Instalar app": index.html guarda el aviso del navegador apenas llega (window.__installPrompt).
// El botón se muestra siempre, salvo que ya se esté usando la app instalada; si el navegador
// no ofrece instalar en ese momento, explica cómo hacerlo a mano.
let installPrompt = window.__installPrompt || null;
const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function showInstall() {
  const b = app.querySelector('[data-act="install"]');
  if (b) b.hidden = isInstalled();
}
window.addEventListener('install-ready', () => { installPrompt = window.__installPrompt; });
window.addEventListener('appinstalled', () => { installPrompt = window.__installPrompt = null; showInstall(); toast('App instalada'); });

function installHelp() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const edge = /Edg\//.test(ua);
  const chrome = /Chrome\//.test(ua) && !edge;
  const secure = window.isSecureContext;
  let steps;
  if (!secure) {
    steps = '<p>Para instalarla, la plataforma tiene que estar publicada con <b>https</b> (por ejemplo en GitHub Pages).</p>';
  } else if (ios) {
    steps = '<ol><li>Abrila en <b>Safari</b>.</li><li>Tocá el botón <b>Compartir</b> (el cuadrado con la flecha).</li><li>Elegí <b>Agregar a inicio</b>.</li></ol>';
  } else if (android) {
    steps = '<ol><li>Abrila en <b>Chrome</b>.</li><li>Tocá el menú <b>⋮</b> arriba a la derecha.</li><li>Elegí <b>Instalar aplicación</b> o <b>Agregar a la pantalla principal</b>.</li></ol>';
  } else if (edge) {
    steps = '<ol><li>Tocá el menú <b>…</b> arriba a la derecha.</li><li>Andá a <b>Aplicaciones</b>.</li><li>Elegí <b>Instalar este sitio como una aplicación</b>.</li></ol>';
  } else if (chrome) {
    steps = '<ol><li>Tocá el ícono de instalar a la derecha de la barra de direcciones, si aparece.</li><li>Si no, abrí el menú <b>⋮</b> → <b>Transmitir, guardar y compartir</b> → <b>Instalar página como app…</b></li></ol>';
  } else {
    steps = '<p>Este navegador no permite instalar páginas como app. Abrila en <b>Chrome</b> o <b>Edge</b> (en la compu o en Android) o en <b>Safari</b> (en iPhone).</p>';
  }
  openForm({
    title: 'Instalar la app',
    submit: '',
    body: `${steps}<p class="hint">Chrome a veces ofrece instalarla recién después de usar la página un ratito (un clic y unos 30 segundos). Si recién entraste, esperá un poco y volvé a tocar <b>Instalar app</b>.</p>`,
  });
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
