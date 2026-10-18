import { esc, isStaff, openForm, field, colorPicker, confirmAction, toast, errorMessage } from '../ui.js?v=202610180028';
import { renderSummary } from './tabs/summary.js?v=202610180028';
import { renderPresentation } from './tabs/presentation.js?v=202610180028';
import { renderTasks } from './tabs/tasks.js?v=202610180028';
import { renderUpdates } from './tabs/updates.js?v=202610180028';
import { renderMilestones } from './tabs/milestones.js?v=202610180028';
import { renderEnsayos } from './tabs/ensayos.js?v=202610180028';
import { renderTeam } from './tabs/team.js?v=202610180028';
import { renderFiles } from './tabs/files.js?v=202610180028';
import { renderInventory } from './tabs/inventory.js?v=202610180028';
import { renderPerformance } from './tabs/performance.js?v=202610180028';
import { renderActivity } from './tabs/activity.js?v=202610180028';

const TABS = [
  ['resumen', 'Resumen', renderSummary],
  ['presentacion', 'Presentación', renderPresentation],
  ['tareas', 'Tareas', renderTasks],
  ['avances', 'Avances', renderUpdates],
  ['hitos', 'Hitos', renderMilestones],
  ['ensayos', 'Ensayos y fallas', renderEnsayos],
  ['equipo', 'Equipo y áreas', renderTeam],
  ['archivos', 'Archivos', renderFiles],
  ['inventario', 'Inventario', renderInventory],
  ['rendimiento', 'Rendimiento', renderPerformance],
  ['bitacora', 'Bitácora', renderActivity],
];

export async function renderProject(el, ctx) {
  const { api, me, params } = ctx;
  const [id, tabParam] = params;
  const tab = TABS.find(t => t[0] === tabParam) || TABS[0];
  const staff = isStaff(me);

  const [project, members, areas] = await Promise.all([api.project(id), api.members(id), api.areas(id)]);
  if (!project) {
    el.innerHTML = `<div class="page"><div class="empty"><strong>No encontramos el proyecto</strong><p>Puede que no seas miembro o que lo hayan borrado. <a href="#/">Volver</a></p></div></div>`;
    return;
  }

  el.innerHTML = `
    <div class="page">
      <header class="project-head" style="--c:${esc(project.color)}">
        <div>
          <a class="crumb" href="#/">← Proyectos</a>
          <h1>${esc(project.name)} ${project.archived ? '<span class="badge gray">Archivado</span>' : ''}</h1>
          ${project.description ? `<p class="muted">${esc(project.description)}</p>` : ''}
        </div>
        <div class="head-actions">
          <a class="btn ghost" href="#/proyecto/${id}/informe">Informe PDF</a>
          <button class="btn ghost" id="export-xlsx" title="Descargar tareas, avances, ensayos e inventario${staff ? ' con el rendimiento' : ''}">Excel</button>
          ${staff ? `
          <div class="dropdown">
            <button class="btn ghost" data-more aria-haspopup="true">Opciones ▾</button>
            <div class="menu right" hidden>
              <button data-act="edit">Editar proyecto</button>
              <button data-act="archive">${project.archived ? 'Desarchivar' : 'Archivar'}</button>
              <button data-act="delete" class="danger-text">Borrar proyecto</button>
            </div>
          </div>` : ''}
        </div>
      </header>
      <nav class="tabs" aria-label="Secciones del proyecto">
        ${TABS.map(([key, label]) => `<a href="#/proyecto/${id}/${key}" class="${key === tab[0] ? 'active' : ''}" ${key === tab[0] ? 'aria-current="page"' : ''}>${label}</a>`).join('')}
      </nav>
      <div id="tab"></div>
    </div>`;

  el.querySelector('.tabs a.active')?.scrollIntoView({ block: 'nearest', inline: 'center' });

  el.querySelector('#export-xlsx').addEventListener('click', async (ev) => {
    const btn = ev.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Generando…';
    try {
      const { exportProjectToExcel } = await import('../export.js?v=202610180028');
      await exportProjectToExcel(api, project, { staff });
      toast('Excel descargado');
    } catch (e) { toast(errorMessage(e), 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Excel'; }
  });

  const more = el.querySelector('[data-more]');
  if (more) {
    const menu = more.nextElementSibling;
    more.addEventListener('click', (ev) => { ev.stopPropagation(); menu.hidden = !menu.hidden; });
    document.addEventListener('click', () => { menu.hidden = true; }, { once: true });
    menu.addEventListener('click', async (ev) => {
      const act = ev.target.dataset.act;
      menu.hidden = true;
      try {
        if (act === 'edit') {
          const data = await openForm({
            title: 'Editar proyecto',
            body: `
              ${field('Nombre', `<input name="name" required maxlength="80" value="${esc(project.name)}"/>`)}
              ${field('Descripción', `<textarea name="description" rows="3" maxlength="500">${esc(project.description)}</textarea>`)}
              <div class="field"><span>Color</span>${colorPicker('color', project.color)}</div>`,
          });
          if (!data) return;
          await api.updateProject(id, { name: data.name, description: data.description, color: data.color || project.color });
          toast('Proyecto actualizado');
        } else if (act === 'archive') {
          await api.updateProject(id, { archived: !project.archived });
          toast(project.archived ? 'Proyecto desarchivado' : 'Proyecto archivado');
        } else if (act === 'delete') {
          const ok = await confirmAction('Borrar proyecto', `Se borra "${project.name}" con todas sus tareas, avances y archivos. No se puede deshacer.`);
          if (!ok) return;
          await api.deleteProject(id);
          toast('Proyecto borrado');
          location.hash = '#/';
          return;
        } else return;
        ctx.reload();
      } catch (e) { toast(errorMessage(e), 'error'); }
    });
  }

  const tabEl = el.querySelector('#tab');
  const tabCtx = {
    ...ctx, project, members, areas, staff, el: tabEl,
    member: (uid) => members.find(m => m.id === uid),
    area: (aid) => areas.find(a => a.id === aid),
    refresh: () => tab[2](tabEl, tabCtx),
  };
  await tab[2](tabEl, tabCtx);
}
