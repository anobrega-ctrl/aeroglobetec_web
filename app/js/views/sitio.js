// Sitio web: el editor de contenidos de la web pública, dentro de la plataforma.
// El editor (sitio/editor.html) usa la misma sesión; la base solo deja guardar y publicar
// a docentes y admins.
import { canManageRoles } from '../ui.js';

export async function renderSitio(el, { api, me }) {
  if (!canManageRoles(me)) { location.hash = '#/'; return; }
  if (api.demo) {
    el.innerHTML = `<div class="page"><div class="empty"><strong>El editor del sitio no funciona en modo demo</strong>
      <p>Edita la web pública real, así que necesita entrar con tu cuenta.</p></div></div>`;
    return;
  }
  el.innerHTML = `
    <div class="site-editor">
      <div class="site-bar">
        <span><b>Sitio web</b> · los cambios se ven en la web pública recién al tocar <b>Publicar en la web</b>.</span>
        <a class="btn small ghost" href="../" target="_blank" rel="noopener">Ver la web ↗</a>
      </div>
      <iframe src="sitio/editor.html" title="Editor del sitio web"></iframe>
    </div>`;
}
