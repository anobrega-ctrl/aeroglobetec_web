// Imagen de marca: logos, favicons, folletos, tarjetas, imágenes y plantillas del taller.
// Todos los integrantes los ven y descargan; docentes y líderes los suben y ordenan.
import { esc, icon, isStaff, field, options, openForm, confirmAction, toast, errorMessage, emptyState, fileSize } from '../ui.js?v=202610172357';

export const BRAND_CATS = {
  logos: 'Logos', iconos: 'Íconos y favicons', folletos: 'Folletos', tarjetas: 'Tarjetas',
  imagenes: 'Imágenes', plantillas: 'Plantillas', otros: 'Otros',
};
// Colores y tipografías de la web pública
const PALETTE = [
  ['Azul noche', '#050b1b', 'Fondo principal'], ['Azul profundo', '#0a1630', 'Fondos secundarios'],
  ['Azul taller', '#3774bc', 'Botones y enlaces'], ['Celeste', '#7caef3', 'Destacados'],
  ['Hielo', '#bed9ff', 'Detalles sobre oscuro'], ['Papel', '#f5f7fc', 'Fondo claro'],
];
const isImage = (a) => /^image\//.test(a.mime) || /\.(png|jpe?g|webp|gif|svg|avif)(\?|$)/i.test(a.url);
const ext = (a) => ((a.file_name || a.url).split('?')[0].split('.').pop() || '').toUpperCase().slice(0, 5);

let filter = '';

export async function renderMarca(el, ctx) {
  const { api, me } = ctx;
  const staff = isStaff(me);
  const list = await api.brandAssets();
  if (!document.getElementById('font-space-grotesk')) {
    document.head.insertAdjacentHTML('beforeend', '<link id="font-space-grotesk" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap"/>');
  }

  el.innerHTML = `
    <div class="page">
      <section class="hello">
        <div><h1>Imagen de marca</h1><p>Logos, íconos, folletos, tarjetas e imágenes del taller, listos para descargar. Usá siempre estos archivos para que todo se vea igual.</p></div>
        ${staff ? `<div class="hello-actions">
          <button class="btn" id="add-link">${icon('link')} Agregar link</button>
          <button class="btn primary" id="add-files">${icon('upload')} Subir archivos</button>
        </div>` : ''}
      </section>

      <section class="brand-guide">
        <div class="panel">
          <div class="panel-head"><h2>Colores</h2><small class="muted">Tocá un color para copiarlo</small></div>
          <div class="brand-colors">${PALETTE.map(([n, hex, use]) => `
            <button class="brand-color" data-copy="${hex}" title="Copiar ${hex}">
              <span style="background:${hex}"></span><b>${n}</b><code>${hex}</code><small>${use}</small>
            </button>`).join('')}</div>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Tipografías</h2></div>
          <div class="brand-fonts">
            <div><p class="brand-font-sample" style="font-family:'Space Grotesk',sans-serif">AeroGlobETec</p><b>Space Grotesk</b><small class="muted">Títulos · <a href="https://fonts.google.com/specimen/Space+Grotesk" target="_blank" rel="noopener">Descargar ${icon('external')}</a></small></div>
            <div><p class="brand-font-sample" style="font-family:'DM Sans',sans-serif;font-weight:500">Taller de la ETec</p><b>DM Sans</b><small class="muted">Textos · <a href="https://fonts.google.com/specimen/DM+Sans" target="_blank" rel="noopener">Descargar ${icon('external')}</a></small></div>
          </div>
          <ul class="brand-rules">
            <li>No estires ni deformes el logo: cambiale el tamaño desde una esquina.</li>
            <li>Dejale aire alrededor, sin textos ni imágenes pegadas.</li>
            <li>Sobre fondos claros usá el <b>logo para fondo claro</b>.</li>
          </ul>
        </div>
      </section>

      <div class="brand-chips" id="brand-filter"></div>
      <div id="brand-list"></div>
    </div>`;

  const listEl = el.querySelector('#brand-list');
  const filterEl = el.querySelector('#brand-filter');

  function draw() {
    const cats = Object.keys(BRAND_CATS).filter(c => list.some(a => a.category === c));
    if (filter && !cats.includes(filter)) filter = '';
    filterEl.innerHTML = list.length ? [['', 'Todo', list.length], ...cats.map(c => [c, BRAND_CATS[c], list.filter(a => a.category === c).length])]
      .map(([c, label, n]) => `<button class="brand-chip ${filter === c ? 'active' : ''}" data-cat="${c}">${esc(label)} <small>${n}</small></button>`).join('') : '';
    listEl.innerHTML = list.length
      ? (filter ? [filter] : cats).map(c => `
        <h2 class="section-title">${esc(BRAND_CATS[c])}</h2>
        <div class="brand-grid">${list.filter(a => a.category === c).map(card).join('')}</div>`).join('')
      : emptyState('Todavía no hay archivos', staff ? 'Subí los logos, folletos y demás con «Subir archivos».' : 'Cuando un docente o líder los suba, aparecen acá.');
    // Medidas reales de cada imagen
    listEl.querySelectorAll('img[data-dim]').forEach(img => {
      const put = () => { if (img.naturalWidth) img.closest('.brand-card').querySelector('.dim').textContent = `${img.naturalWidth} × ${img.naturalHeight} px`; };
      img.complete ? put() : img.addEventListener('load', put, { once: true });
    });
  }

  function card(a) {
    const external = !a.path && new URL(a.url, location.href).origin !== location.origin;
    const download = a.path ? `${a.url}?download=${encodeURIComponent(a.file_name || 'archivo')}` : a.url;
    const preview = isImage(a)
      ? `<img src="${esc(a.url)}" alt="" loading="lazy" data-dim/>`
      : `<span class="brand-file">${icon(external ? 'link' : 'file')}<b>${esc(external ? new URL(a.url).hostname.replace(/^www\./, '') : ext(a) || 'Archivo')}</b></span>`;
    const meta = [ext(a) && !external ? ext(a) : '', a.size ? fileSize(a.size) : ''].filter(Boolean).join(' · ');
    return `
      <article class="brand-card">
        <a class="brand-preview ${isImage(a) ? 'checker' : ''}" href="${esc(a.url)}" target="_blank" rel="noopener" title="Ver en grande">${preview}</a>
        <div class="brand-body">
          <strong>${esc(a.title)}</strong>
          ${a.description ? `<p class="muted">${esc(a.description)}</p>` : ''}
          <small class="muted">${esc(meta)}${meta ? ' ' : ''}<span class="dim"></span></small>
        </div>
        <div class="brand-actions">
          ${external
            ? `<a class="btn small" href="${esc(a.url)}" target="_blank" rel="noopener">${icon('external')} Abrir</a>`
            : `<a class="btn small" href="${esc(download)}" download="${esc(a.file_name || '')}">${icon('download')} Descargar</a>`}
          <button class="btn small ghost" data-copy="${esc(new URL(a.url, location.href).href)}" title="Copiar el link">${icon('link')}</button>
          ${staff ? `<span class="grow"></span>
            <button class="link-btn" data-edit="${a.id}">Editar</button>
            <button class="link-btn danger-text" data-del="${a.id}">Borrar</button>` : ''}
        </div>
      </article>`;
  }

  const catOptions = (sel) => options(Object.entries(BRAND_CATS).map(([value, label]) => ({ value, label })), sel);
  const reload = async () => { list.splice(0, list.length, ...await api.brandAssets()); draw(); };

  el.querySelector('#add-files')?.addEventListener('click', async () => {
    const data = await openForm({
      title: 'Subir archivos',
      body: `
        ${field('Sección', `<select name="category">${catOptions(filter || 'logos')}</select>`)}
        ${field('Archivos', '<input type="file" name="files" multiple required/>', 'Podés elegir varios a la vez. Hasta 25 MB cada uno (PNG, SVG, PDF, AI, etc.).')}
        ${field('Nombre', '<input name="title" maxlength="120" placeholder="Si lo dejás vacío se usa el nombre del archivo"/>')}
        ${field('Descripción', '<input name="description" maxlength="400" placeholder="Ej: para fondos oscuros, versión horizontal…"/>')}`,
    });
    if (!data) return;
    if (!data.files.length) { toast('Elegí al menos un archivo', 'error'); return; }
    const big = data.files.find(f => f.size > 25 * 1048576);
    if (big) { toast(`«${big.name}» pesa más de 25 MB`, 'error'); return; }
    try {
      const pos = list.filter(a => a.category === data.category).length;
      for (const [i, f] of data.files.entries()) {
        toast(`Subiendo ${i + 1} de ${data.files.length}…`);
        const title = data.title ? (data.files.length > 1 ? `${data.title} ${i + 1}` : data.title) : f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
        await api.addBrandAsset({ category: data.category, title: title.slice(0, 120), description: data.description, position: pos + i + 1 }, f);
      }
      toast(data.files.length > 1 ? 'Archivos subidos' : 'Archivo subido');
      filter = data.category;
      reload();
    } catch (e) { toast(errorMessage(e), 'error'); }
  });

  el.querySelector('#add-link')?.addEventListener('click', async () => {
    const data = await openForm({
      title: 'Agregar link',
      body: `
        ${field('Sección', `<select name="category">${catOptions(filter || 'plantillas')}</select>`)}
        ${field('Nombre', '<input name="title" required maxlength="120" placeholder="Ej: Folleto para la Expo (Canva)"/>')}
        ${field('Link', '<input type="url" name="url" required placeholder="https://www.canva.com/…"/>', 'Un diseño de Canva, una carpeta de Drive, etc.')}
        ${field('Descripción', '<input name="description" maxlength="400"/>')}`,
    });
    if (!data) return;
    if (!/^https:\/\//.test(data.url)) { toast('El link tiene que empezar con https://', 'error'); return; }
    try {
      await api.addBrandAsset({ category: data.category, title: data.title, url: data.url, description: data.description, position: list.filter(a => a.category === data.category).length + 1 });
      toast('Link agregado');
      filter = data.category;
      reload();
    } catch (e) { toast(errorMessage(e), 'error'); }
  });

  el.querySelector('.page').addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.cat !== undefined) { filter = b.dataset.cat; draw(); return; }
    if (b.dataset.copy) {
      try { await navigator.clipboard.writeText(b.dataset.copy); toast('Copiado'); }
      catch { toast(b.dataset.copy); }
      return;
    }
    const a = list.find(x => x.id === (b.dataset.edit || b.dataset.del));
    if (!a) return;
    if (b.dataset.edit) {
      const data = await openForm({
        title: 'Editar',
        body: `
          ${field('Sección', `<select name="category">${catOptions(a.category)}</select>`)}
          ${field('Nombre', `<input name="title" required maxlength="120" value="${esc(a.title)}"/>`)}
          ${field('Descripción', `<input name="description" maxlength="400" value="${esc(a.description)}"/>`)}
          ${field('Orden', `<input type="number" name="position" min="0" max="999" value="${esc(a.position)}"/>`, 'Los números más chicos van primero.')}`,
      });
      if (!data) return;
      try {
        await api.updateBrandAsset(a.id, { category: data.category, title: data.title, description: data.description, position: Number(data.position) || 0 });
        toast('Guardado');
        reload();
      } catch (e) { toast(errorMessage(e), 'error'); }
    }
    if (b.dataset.del) {
      if (!await confirmAction('Borrar archivo', `«${a.title}» deja de estar disponible para todos.`)) return;
      try { await api.deleteBrandAsset(a); toast('Borrado'); reload(); }
      catch (e) { toast(errorMessage(e), 'error'); }
    }
  });

  draw();
}
