import { esc, name, ITEM_STATUS, options, field, openForm, confirmAction, toast, errorMessage, money, emptyState } from '../../ui.js?v=202610172357';

export async function renderInventory(el, ctx) {
  const { api, project, members, staff } = ctx;
  const items = await api.inventory(project.id);
  const total = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
  const spent = items.filter(i => i.status !== 'necesario').reduce((s, i) => s + i.quantity * i.unit_cost, 0);

  el.innerHTML = `<div class="tab-root">
    <div class="stats">
      <div class="stat"><b>${items.length}</b><span>Ítems</span></div>
      <div class="stat"><b>${money(total)}</b><span>Presupuesto total</span></div>
      <div class="stat"><b>${money(spent)}</b><span>Ya pedido o comprado</span></div>
      <div class="stat"><b>${money(total - spent)}</b><span>Falta comprar</span></div>
    </div>
    <div class="toolbar"><span class="grow"></span><button class="btn primary" id="new-item">+ Agregar ítem</button></div>
    ${items.length ? `<div class="table-wrap"><table class="table">
      <thead><tr><th>Componente</th><th>Cant.</th><th>Precio unit.</th><th>Subtotal</th><th>Estado</th><th>Responsable</th><th></th></tr></thead>
      <tbody>${items.map(i => `
        <tr>
          <td><strong>${esc(i.name)}</strong>${i.link ? ` <a href="${esc(safeUrl(i.link))}" target="_blank" rel="noopener noreferrer" class="small">link ↗</a>` : ''}${i.notes ? `<br/><small class="muted">${esc(i.notes)}</small>` : ''}</td>
          <td>${i.quantity}</td>
          <td>${money(i.unit_cost)}</td>
          <td>${money(i.quantity * i.unit_cost)}</td>
          <td><select data-status="${i.id}" class="pill-select ${i.status}" aria-label="Estado">${options(Object.entries(ITEM_STATUS).map(([value, label]) => ({ value, label })), i.status)}</select></td>
          <td>${esc(i.responsible_id ? name(ctx.member(i.responsible_id)) : '—')}</td>
          <td class="nowrap"><button class="link-btn" data-edit="${i.id}">Editar</button>${staff ? ` <button class="link-btn danger-text" data-del="${i.id}">Borrar</button>` : ''}</td>
        </tr>`).join('')}</tbody>
    </table></div>` : emptyState('El inventario está vacío', 'Anotá acá los componentes que necesitan, los pedidos y quién tiene cada cosa.')}
  </div>`;

  async function edit(i) {
    const data = await openForm({
      title: i ? 'Editar ítem' : 'Agregar ítem',
      body: `
        ${field('Componente', `<input name="name" required maxlength="120" value="${esc(i?.name)}" placeholder="Ej: Motor N20 300 rpm"/>`)}
        <div class="grid-2">
          ${field('Cantidad', `<input type="number" name="quantity" min="0" value="${esc(i?.quantity ?? 1)}"/>`)}
          ${field('Precio unitario ($)', `<input type="number" name="unit_cost" min="0" step="0.01" value="${esc(i?.unit_cost ?? 0)}"/>`)}
          ${field('Estado', `<select name="status">${options(Object.entries(ITEM_STATUS).map(([value, label]) => ({ value, label })), i?.status || 'necesario')}</select>`)}
          ${field('Responsable', `<select name="responsible_id">${options(members.map(m => ({ value: m.id, label: name(m) })), i?.responsible_id, { empty: 'Nadie' })}</select>`)}
        </div>
        ${field('Link de compra', `<input type="url" name="link" value="${esc(i?.link)}" placeholder="https://"/>`)}
        ${field('Notas', `<input name="notes" maxlength="300" value="${esc(i?.notes)}"/>`)}`,
    });
    if (!data) return;
    try {
      await api.saveItem({
        ...(i ? { id: i.id } : { project_id: project.id }),
        name: data.name, quantity: Math.max(0, parseInt(data.quantity, 10) || 0), unit_cost: Math.max(0, Number(data.unit_cost) || 0),
        status: data.status, responsible_id: data.responsible_id || null, link: data.link, notes: data.notes,
      });
      toast('Inventario actualizado');
      ctx.refresh();
    } catch (e) { toast(errorMessage(e), 'error'); }
  }

  const root = el.querySelector('.tab-root');
  el.querySelector('#new-item').addEventListener('click', () => edit(null));
  root.addEventListener('change', async (ev) => {
    if (!ev.target.dataset.status) return;
    try { await api.saveItem({ id: ev.target.dataset.status, status: ev.target.value }); toast('Estado actualizado'); ctx.refresh(); }
    catch (e) { toast(errorMessage(e), 'error'); }
  });
  root.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    const i = items.find(x => x.id === (b?.dataset.edit || b?.dataset.del));
    if (!i) return;
    if (b.dataset.edit) return edit(i);
    if (await confirmAction('Borrar ítem', `Se borra "${i.name}" del inventario.`)) {
      try { await api.deleteItem(i.id); toast('Ítem borrado'); ctx.refresh(); } catch (e) { toast(errorMessage(e), 'error'); }
    }
  });
}

function safeUrl(u) {
  return /^https?:\/\//i.test(u) ? u : '#';
}
