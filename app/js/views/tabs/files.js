import { esc, name, icon, field, openForm, confirmAction, toast, errorMessage, fileSize, fmtDate, emptyState } from '../../ui.js?v=202610180028';

export async function renderFiles(el, ctx) {
  const { api, project, staff, me } = ctx;
  const files = await api.files(project.id);
  const folders = [...new Set(files.map(f => f.folder))].sort();

  el.innerHTML = `<div class="tab-root">
    <div class="toolbar"><span class="grow"></span>
      <button class="btn primary" id="upload">${icon('upload')} Subir archivos</button></div>
    ${files.length ? folders.map(folder => `
      <section class="panel">
        <h2>${icon('folder')}${esc(folder)}</h2>
        <ul class="files">${files.filter(f => f.folder === folder).map(f => `
          <li>
            <button class="file-link grow" data-open="${f.id}">${icon(fileIcon(f.name))}${esc(f.name)}</button>
            <small class="muted">${fileSize(f.size)} · ${esc(name(ctx.member(f.uploaded_by)))} · ${fmtDate(f.created_at)}</small>
            ${staff || f.uploaded_by === me.id ? `<button class="icon-btn" data-del="${f.id}" aria-label="Borrar archivo" title="Borrar">✕</button>` : ''}
          </li>`).join('')}</ul>
      </section>`).join('') : emptyState('Todavía no hay archivos')}
  </div>`;

  el.querySelector('#upload').addEventListener('click', async () => {
    const data = await openForm({
      title: 'Subir archivos',
      body: `
        ${field('Carpeta', `<input name="folder" list="folders" placeholder="General" maxlength="40"/><datalist id="folders">${['General', 'CAD', 'Código', 'Fotos', 'Documentación', ...folders].filter((v, i, a) => a.indexOf(v) === i).map(f => `<option value="${esc(f)}">`).join('')}</datalist>`)}
        ${field('Archivos', '<input type="file" name="files" multiple required/>', 'Hasta 50 MB por archivo.')}`,
      submit: 'Subir',
    });
    if (!data?.files?.length) return;
    try {
      toast('Subiendo…');
      await api.uploadProjectFiles(project.id, data.folder || 'General', data.files);
      toast('Archivos subidos');
      ctx.refresh();
    } catch (e) { toast(errorMessage(e), 'error'); }
  });

  el.querySelector('.tab-root').addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    const f = files.find(x => x.id === (b?.dataset.open || b?.dataset.del));
    if (!f) return;
    try {
      if (b.dataset.open) {
        const a = document.createElement('a');
        a.href = await api.fileUrl(f.path); a.target = '_blank'; a.rel = 'noopener'; a.download = f.name;
        a.click();
      } else if (await confirmAction('Borrar archivo', `Se borra "${f.name}".`)) {
        await api.deleteFile(f); toast('Archivo borrado'); ctx.refresh();
      }
    } catch (e) { toast(errorMessage(e), 'error'); }
  });
}

function fileIcon(n) {
  const ext = n.split('.').pop().toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (['step', 'stp', 'stl', 'f3d', 'dxf', 'obj', '3mf'].includes(ext)) return 'cube';
  if (['ino', 'py', 'js', 'c', 'cpp', 'h', 'zip'].includes(ext)) return 'code';
  return 'file';
}
