import { esc, ROLE_LABEL, errorMessage } from '../ui.js?v=202610180028';

export async function renderLogin(el, { api, notice = '' }) {
  // Errores al volver del link del mail o de Google (dominio no permitido, link vencido, etc.)
  const hashParams = new URLSearchParams(location.hash.replace(/^#\/?/, ''));
  const urlError = notice || hashParams.get('error_description') || await api.authError();
  const providers = api.demo ? {} : await api.providers();

  el.innerHTML = `
    <main class="center-page space">
      <div class="login-card">
        <div class="login-logo"><img src="icons/icon-192.png" alt="" width="36" height="36"/>AeroGlobETec</div>
        <h1>Entrar a la plataforma</h1>
        <p class="muted">Usá tu cuenta de la ETec (@etec.um.edu.ar o @alumno.etec.um.edu.ar).</p>
        ${urlError ? `<p class="alert error">${esc(friendly(urlError))}</p>` : ''}
        <div id="login-msg"></div>
        ${api.demo ? demoLogin(api) : `
          ${providers.google ? `
          <button class="btn google" id="google">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z"/></svg>
            Entrar con Google
          </button>
          <div class="divider"><span>o</span></div>` : ''}
          <form id="magic" class="stack">
            <label class="field"><span>Te mandamos un link a tu mail</span>
              <input type="email" name="email" required placeholder="nombre@alumno.etec.um.edu.ar" autocomplete="email"/>
            </label>
            <button class="btn primary" type="submit">Enviarme el link</button>
          </form>
          <form id="code" class="stack" hidden>
            <label class="field"><span>¿Te llegó un código? Escribilo acá</span>
              <input name="token" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" maxlength="10" placeholder="123456"/>
              <small>Sirve si abrís el mail en otro dispositivo, como el celular.</small>
            </label>
            <button class="btn ghost" type="submit">Entrar con el código</button>
          </form>`}
        <a class="muted back" href="tutorial.html">Ver un recorrido por la plataforma</a>
        <a class="muted back" href="../">Ir a la web del taller</a>
      </div>
    </main>`;

  const msg = el.querySelector('#login-msg');
  const show = (text, kind = 'error') => { msg.innerHTML = `<p class="alert ${kind}">${esc(text)}</p>`; };

  if (api.demo) {
    el.querySelectorAll('[data-demo-user]').forEach(b => b.addEventListener('click', () => {
      api.demoLogin(b.dataset.demoUser);
      location.reload();
    }));
    return;
  }

  el.querySelector('#google')?.addEventListener('click', async () => {
    try { await api.signInWithGoogle(); }
    catch (e) { show(friendly(errorMessage(e))); }
  });

  let sentTo = '';
  el.querySelector('#magic').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const email = ev.target.email.value.trim().toLowerCase();
    const btn = ev.target.querySelector('button');
    btn.disabled = true;
    try {
      await api.signInWithEmail(email);
      sentTo = email;
      show(`Listo. Revisá ${email} y abrí el link en este mismo navegador.`, 'ok');
      el.querySelector('#code').hidden = false;
    } catch (e) {
      show(friendly(errorMessage(e)));
    } finally { btn.disabled = false; }
  });

  el.querySelector('#code').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const token = ev.target.token.value.replace(/\D/g, '');
    if (token.length < 6) { show('El código tiene que tener al menos 6 números.'); return; }
    const btn = ev.target.querySelector('button');
    btn.disabled = true;
    try {
      await api.verifyCode(sentTo, token);
      location.reload();
    } catch (e) {
      show(friendly(errorMessage(e)));
      btn.disabled = false;
    }
  });
}

function friendly(msg) {
  if (/Solo se permiten|Database error saving new user/i.test(msg)) return 'Solo se puede entrar con cuentas @etec.um.edu.ar o @alumno.etec.um.edu.ar.';
  if (/provider is not enabled/i.test(msg)) return 'El login con Google todavía no está activado. Usá el link por mail.';
  if (/rate limit/i.test(msg)) return 'Se mandaron demasiados mails seguidos. Esperá unos minutos y probá de nuevo.';
  if (/code verifier|auth code|flow state/i.test(msg)) return 'Abrí el link en el mismo navegador donde lo pediste, o pedí uno nuevo y escribí el código.';
  if (/expired|invalid/i.test(msg)) return 'El link o el código venció o ya se usó. Pedí uno nuevo.';
  return msg;
}

function demoLogin(api) {
  return `
    <p class="small muted">Modo demo: elegí con qué usuario querés entrar.</p>
    <div class="demo-users">
      ${api.demoUsers().map(u => `<button class="demo-user" data-demo-user="${u.id}"><strong>${esc(u.full_name)}</strong><small>${u.is_admin ? 'Admin' : ROLE_LABEL[u.role]}</small></button>`).join('')}
    </div>`;
}
