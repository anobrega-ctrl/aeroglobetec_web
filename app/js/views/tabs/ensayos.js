import { esc, name, avatar, icon, options, field, openForm, confirmAction, toast, errorMessage, fmtDate, timeAgo, fileSize, emptyState } from '../../ui.js?v=202610180031';

export const RESULT = { exitoso: 'Exitoso', parcial: 'Parcial', fallido: 'Fallido' };
export const SEVERITY = { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' };
export const ISSUE_STATUS = { abierta: 'Abierta', en_proceso: 'En proceso', resuelta: 'Resuelta' };

export async function renderEnsayos(el, ctx) {
  const { api, project, members, areas, staff, me } = ctx;
  const [tests, issues] = await Promise.all([api.tests(project.id), api.issues(project.id)]);
  const open = issues.filter(i => i.status !== 'resuelta');
  const ok = tests.filter(t => t.result === 'exitoso').length;
  const sevOrder = { critica: 0, alta: 1, media: 2, baja: 3 };

  el.innerHTML = `<div class="tab-root">
    <div class="stats">
      <div class="stat"><b>${tests.length}</b><span>Ensayos registrados</span></div>
      <div class="stat"><b>${tests.length ? Math.round(100 * ok / tests.length) : 0}%</b><span>Ensayos exitosos</span></div>
      <div class="stat ${open.length ? 'warn' : ''}"><b>${open.length}</b><span>Fallas sin resolver</span></div>
      <div class="stat"><b>${issues.length - open.length}</b><span>Fallas resueltas</span></div>
    </div>
    <div class="toolbar">
      <span class="grow"></span>
      <button class="btn" id="new-issue">${icon('alert')} Reportar falla</button>
      <button class="btn primary" id="new-test">${icon('plus')} Registrar ensayo</button>
    </div>

    <div class="two-col">
      <section class="panel">
        <div class="panel-head">
          <h2>Fallas</h2>
          <select id="f-issues" aria-label="Filtrar fallas">${options([{ value: 'open', label: 'Sin resolver' }, { value: 'mine', label: 'Asignadas a mí' }, { value: 'all', label: 'Todas' }], 'open')}</select>
        </div>
        <div id="issue-list"></div>
      </section>
      <section class="panel">
        <h2>Ensayos</h2>
        ${tests.length ? `<ul class="tests">${tests.map(testCard).join('')}</ul>` : emptyState('Todavía no hay ensayos', 'Registrá la primera prueba con el botón de arriba.')}
      </section>
    </div>
  </div>`;

  function testCard(t) {
    const a = ctx.area(t.area_id);
    const linked = issues.filter(i => i.test_id === t.id);
    const mine = t.author_id === me.id;
    return `
      <li class="test ${t.result}">
        <div class="test-head">
          <span class="result-badge ${t.result}">${RESULT[t.result]}</span>
          <small class="muted">${fmtDate(t.test_date)}${a ? ` · <span class="chip" style="--c:${esc(a.color)}">${esc(a.name)}</span>` : ''}</small>
        </div>
        <strong>${esc(t.title)}</strong>
        ${t.objective ? `<p class="small"><b>Objetivo:</b> ${esc(t.objective)}</p>` : ''}
        ${t.notes ? `<p class="small body">${esc(t.notes)}</p>` : ''}
        ${t.attachments?.length ? `<ul class="attachments">${t.attachments.map((f, i) => `<li><button class="file-link" data-tfile="${t.id}:${i}">${icon('clip')}${esc(f.name)}</button> <small class="muted">${fileSize(f.size)}</small></li>`).join('')}</ul>` : ''}
        <div class="test-foot">
          <span class="who">${avatar(ctx.member(t.author_id), 'xs')}${esc(name(ctx.member(t.author_id)))}</span>
          ${linked.length ? `<span class="small muted">${linked.length} falla${linked.length === 1 ? '' : 's'}</span>` : ''}
          <span class="grow"></span>
          <button class="link-btn" data-issue-from="${t.id}">+ Falla</button>
          ${staff || mine ? `<button class="link-btn" data-tedit="${t.id}">Editar</button><button class="link-btn danger-text" data-tdel="${t.id}">Borrar</button>` : ''}
        </div>
      </li>`;
  }

  function issueCard(i) {
    const canEdit = staff || i.created_by === me.id || i.assignee_id === me.id;
    const test = tests.find(t => t.id === i.test_id);
    return `
      <li class="issue sev-${i.severity} ${i.status}">
        <div class="test-head">
          <span class="sev-badge ${i.severity}">${SEVERITY[i.severity]}</span>
          ${canEdit
            ? `<select class="pill-select issue-${i.status}" data-istatus="${i.id}" aria-label="Estado de la falla">${options(Object.entries(ISSUE_STATUS).map(([value, label]) => ({ value, label })), i.status)}</select>`
            : `<span class="pill-select issue-${i.status}">${ISSUE_STATUS[i.status]}</span>`}
        </div>
        <button class="task-title" data-iopen="${i.id}">${esc(i.title)}</button>
        ${test ? `<small class="muted">Del ensayo: ${esc(test.title)}</small>` : ''}
        ${i.status === 'resuelta' && i.resolution ? `<p class="small resolution">${icon('check')}<span>${esc(i.resolution)}</span></p>` : ''}
        <div class="test-foot">
          ${i.assignee_id ? `<span class="who">${avatar(ctx.member(i.assignee_id), 'xs')}${esc(name(ctx.member(i.assignee_id)).split(' ')[0])}</span>` : '<span class="small muted">Sin asignar</span>'}
          <span class="grow"></span>
          <small class="muted">${timeAgo(i.created_at)}</small>
        </div>
      </li>`;
  }

  const list = el.querySelector('#issue-list');
  const filter = el.querySelector('#f-issues');
  function drawIssues() {
    const f = filter.value;
    const rows = issues
      .filter(i => f === 'all' || (f === 'open' ? i.status !== 'resuelta' : i.assignee_id === me.id))
      .sort((a, b) => (a.status === 'resuelta') - (b.status === 'resuelta') || sevOrder[a.severity] - sevOrder[b.severity]);
    list.innerHTML = rows.length ? `<ul class="issues">${rows.map(issueCard).join('')}</ul>` : emptyState(f === 'open' ? 'No hay fallas sin resolver' : 'No hay fallas');
  }
  drawIssues();
  filter.addEventListener('change', drawIssues);

  async function editTest(t) {
    const data = await openForm({
      title: t ? 'Editar ensayo' : 'Registrar ensayo',
      wide: true,
      body: `
        ${field('¿Qué se probó?', `<input name="title" required maxlength="120" value="${esc(t?.title)}" placeholder="Ej: Prueba de tracción en rampa"/>`)}
        <div class="grid-2">
          ${field('Fecha', `<input type="date" name="test_date" required value="${esc(t?.test_date || new Date().toISOString().slice(0, 10))}"/>`)}
          ${field('Resultado', `<select name="result" required>${options(Object.entries(RESULT).map(([value, label]) => ({ value, label })), t?.result || 'exitoso')}</select>`)}
          ${field('Área', `<select name="area_id">${options(areas.map(a => ({ value: a.id, label: a.name })), t?.area_id, { empty: 'Sin área' })}</select>`)}
        </div>
        ${field('Objetivo', `<input name="objective" maxlength="300" value="${esc(t?.objective)}" placeholder="Qué se quería comprobar"/>`)}
        ${field('Qué pasó', `<textarea name="notes" rows="4" maxlength="4000" placeholder="Mediciones, observaciones, qué salió bien y qué no">${esc(t?.notes)}</textarea>`)}
        ${t?.attachments?.length ? `<div class="field"><span>Archivos actuales</span>${t.attachments.map((f, i) => `<label class="check"><input type="checkbox" name="keep" value="${i}" data-multi checked/> ${esc(f.name)}</label>`).join('')}</div>` : ''}
        ${field('Fotos, videos o mediciones', '<input type="file" name="files" multiple/>', 'Hasta 50 MB por archivo.')}`,
    });
    if (!data) return;
    try {
      const keep = (data.keep || []).map(i => t.attachments[Number(i)]);
      const savedId = await api.saveTest({ ...(t ? { id: t.id } : {}), project_id: project.id, title: data.title, test_date: data.test_date, result: data.result, area_id: data.area_id || null, objective: data.objective, notes: data.notes }, data.files || [], keep);
      toast(t ? 'Ensayo actualizado' : 'Ensayo registrado');
      if (!t && data.result !== 'exitoso' && await confirmAction('¿Reportar una falla?', 'El ensayo no fue exitoso. ¿Querés anotar la falla que encontraron?', 'Reportar falla')) {
        // Recargar la lista para que el ensayo recién creado aparezca en el formulario de la falla
        tests.splice(0, tests.length, ...(await api.tests(project.id)));
        return editIssue(null, savedId);
      }
      ctx.refresh();
    } catch (e) { toast(errorMessage(e), 'error'); }
  }

  async function editIssue(i, testId = null) {
    const canEdit = !i || staff || i.created_by === me.id || i.assignee_id === me.id;
    const dis = canEdit ? '' : 'disabled';
    const data = await openForm({
      title: i ? (canEdit ? 'Falla' : 'Falla (solo lectura)') : 'Reportar falla',
      submit: canEdit ? 'Guardar' : '',
      body: `
        ${field('Qué falló', `<input name="title" required maxlength="120" value="${esc(i?.title)}" ${dis}/>`)}
        ${field('Detalle', `<textarea name="description" rows="3" maxlength="3000" ${dis}>${esc(i?.description)}</textarea>`)}
        <div class="grid-2">
          ${field('Gravedad', `<select name="severity" ${dis}>${options(Object.entries(SEVERITY).map(([value, label]) => ({ value, label })), i?.severity || 'media')}</select>`)}
          ${field('Estado', `<select name="status" ${dis}>${options(Object.entries(ISSUE_STATUS).map(([value, label]) => ({ value, label })), i?.status || 'abierta')}</select>`)}
          ${field('Responsable', `<select name="assignee_id" ${dis}>${options(members.map(m => ({ value: m.id, label: name(m) })), i?.assignee_id, { empty: 'Sin asignar' })}</select>`)}
          ${field('Área', `<select name="area_id" ${dis}>${options(areas.map(a => ({ value: a.id, label: a.name })), i?.area_id, { empty: 'Sin área' })}</select>`)}
        </div>
        ${field('Ensayo relacionado', `<select name="test_id" ${dis}>${options(tests.map(t => ({ value: t.id, label: `${fmtDate(t.test_date)} · ${t.title}` })), i?.test_id ?? testId, { empty: 'Ninguno' })}</select>`)}
        ${field('Cómo se resolvió', `<textarea name="resolution" rows="2" maxlength="2000" ${dis} placeholder="Completalo al cerrarla">${esc(i?.resolution)}</textarea>`)}
        ${i && (staff || i.created_by === me.id) ? '<button type="button" class="link-btn danger-text" data-del>Borrar falla</button>' : ''}`,
      onOpen: (dlg) => dlg.querySelector('[data-del]')?.addEventListener('click', async () => {
        dlg.close();
        if (await confirmAction('Borrar falla', `Se borra "${i.title}".`)) {
          try { await api.deleteIssue(i.id); toast('Falla borrada'); ctx.refresh(); } catch (e) { toast(errorMessage(e), 'error'); }
        }
      }),
    });
    if (!data) { if (testId) ctx.refresh(); return; }
    try {
      await api.saveIssue({
        ...(i ? { id: i.id } : { project_id: project.id }),
        title: data.title, description: data.description, severity: data.severity, status: data.status,
        assignee_id: data.assignee_id || null, area_id: data.area_id || null, test_id: data.test_id || null, resolution: data.resolution,
      });
      toast(i ? 'Falla actualizada' : 'Falla reportada');
      ctx.refresh();
    } catch (e) { toast(errorMessage(e), 'error'); }
  }

  const root = el.querySelector('.tab-root');
  el.querySelector('#new-test').addEventListener('click', () => editTest(null));
  el.querySelector('#new-issue').addEventListener('click', () => editIssue(null));
  root.addEventListener('change', async (ev) => {
    const id = ev.target.dataset.istatus;
    if (!id) return;
    const i = issues.find(x => x.id === id);
    let resolution = i.resolution;
    if (ev.target.value === 'resuelta' && !resolution) {
      const d = await openForm({ title: 'Cerrar falla', body: field('¿Cómo se resolvió?', '<textarea name="resolution" rows="3" required maxlength="2000"></textarea>'), submit: 'Marcar resuelta' });
      if (!d) { ev.target.value = i.status; return; }
      resolution = d.resolution;
    }
    try { await api.saveIssue({ id, status: ev.target.value, resolution }); toast('Falla actualizada'); ctx.refresh(); }
    catch (e) { toast(errorMessage(e), 'error'); ev.target.value = i.status; }
  });
  root.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    try {
      if (d.iopen) await editIssue(issues.find(x => x.id === d.iopen));
      else if (d.issueFrom) await editIssue(null, d.issueFrom);
      else if (d.tedit) await editTest(tests.find(x => x.id === d.tedit));
      else if (d.tdel) {
        const t = tests.find(x => x.id === d.tdel);
        if (await confirmAction('Borrar ensayo', `Se borra "${t.title}" con sus archivos. Las fallas quedan sin ensayo.`)) {
          await api.deleteTest(t); toast('Ensayo borrado'); ctx.refresh();
        }
      } else if (d.tfile) {
        const [id, idx] = d.tfile.split(':');
        const f = tests.find(x => x.id === id).attachments[Number(idx)];
        const a = document.createElement('a');
        a.href = await api.fileUrl(f.path); a.target = '_blank'; a.rel = 'noopener'; a.download = f.name;
        a.click();
      }
    } catch (e) { toast(errorMessage(e), 'error'); }
  });
}
