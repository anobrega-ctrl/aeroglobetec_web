import { esc, markdown, openForm, toast, errorMessage, emptyState } from '../../ui.js?v=202610180031';

// Ficha del proyecto: qué es, misión, cómo se organiza. La escriben docentes y líderes.
export async function renderPresentation(el, ctx) {
  const { api, project, staff } = ctx;
  const text = project.presentation || '';

  el.innerHTML = `<div class="tab-root">
    ${staff ? `<div class="toolbar"><span class="grow"></span><button class="btn" id="edit-pres">${text ? 'Editar presentación' : 'Escribir presentación'}</button></div>` : ''}
    ${text
      ? `<article class="panel presentation">${markdown(text)}</article>`
      : emptyState('Este proyecto todavía no tiene presentación', staff ? 'Contá de qué se trata, cuál es la misión y cómo se organiza el equipo.' : '')}
  </div>`;

  el.querySelector('#edit-pres')?.addEventListener('click', async () => {
    const data = await openForm({
      title: 'Presentación del proyecto',
      wide: true,
      body: `
        <label class="field"><span>Texto</span>
          <textarea name="presentation" rows="18" maxlength="20000" class="mono">${esc(text)}</textarea>
          <small># Título · ## Subtítulo · - lista · 1. pasos · **negrita** · *cursiva* · [texto](https://…)</small>
        </label>`,
    });
    if (!data) return;
    try {
      await api.updateProject(project.id, { presentation: data.presentation });
      project.presentation = data.presentation;
      toast('Presentación guardada');
      ctx.refresh();
    } catch (e) { toast(errorMessage(e), 'error'); }
  });
}
