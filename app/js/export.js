// Exportar un proyecto a Excel (.xlsx). La librería SheetJS se carga recién al exportar.
import { name, TASK_STATUS, UPDATE_STATUS, ITEM_STATUS, PRIORITY } from './ui.js?v=202610180031';
import { RESULT, SEVERITY, ISSUE_STATUS } from './views/tabs/ensayos.js?v=202610180031';

const SHEETJS = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
let loading = null;

function loadSheetJS() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  loading ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SHEETJS;
    s.onload = () => resolve(window.XLSX);
    s.onerror = () => { loading = null; reject(new Error('No se pudo cargar el exportador de Excel. Revisá la conexión.')); };
    document.head.appendChild(s);
  });
  return loading;
}

const d = (v) => (v ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? v + 'T00:00:00' : v) : null);

export async function exportProjectToExcel(api, project, { staff }) {
  const [XLSX, members, areas, tasks, updates, milestones, items, tests, issues, perf, areaPerf] = await Promise.all([
    loadSheetJS(), api.members(project.id), api.areas(project.id), api.tasks(project.id), api.updates(project.id),
    api.milestones(project.id), api.inventory(project.id), api.tests(project.id), api.issues(project.id),
    staff ? api.studentPerformance(project.id) : [], api.areaPerformance(project.id),
  ]);
  const who = (id) => (id ? name(members.find(m => m.id === id)) : '');
  const area = (id) => areas.find(a => a.id === id)?.name || '';
  const wb = XLSX.utils.book_new();

  const add = (title, rows, widths) => {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ '': 'Sin datos' }], { cellDates: true });
    if (widths) ws['!cols'] = widths.map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, title);
  };

  if (staff) {
    add('Rendimiento', perf.map(s => ({
      Estudiante: s.full_name || s.email, Mail: s.email,
      'Tareas asignadas': s.tasks_assigned, 'Tareas hechas': s.tasks_done, 'Hechas a tiempo': s.tasks_on_time, 'Vencidas': s.tasks_overdue,
      'Avances subidos': s.updates_total, 'Avances aprobados': s.updates_approved,
      'Nota promedio': s.avg_score == null ? '' : Number(s.avg_score), 'Puntaje (0-100)': s.score ?? '',
    })), [28, 32, 10, 10, 10, 10, 10, 10, 10, 12]);
  }
  add('Áreas', areaPerf.map(a => ({
    Área: a.area_name, Integrantes: areas.find(x => x.id === a.area_id)?.member_ids.map(who).join(', ') || '',
    'Tareas': a.tasks_total, 'Hechas': a.tasks_done, 'Vencidas': a.tasks_overdue, 'Avance %': a.progress,
    'Avances aprobados': a.updates_approved, 'Nota promedio': a.avg_score == null ? '' : Number(a.avg_score),
  })), [18, 40, 8, 8, 8, 10, 10, 10]);
  add('Tareas', tasks.map(t => ({
    Tarea: t.title, Área: area(t.area_id), Responsable: who(t.assignee_id), Prioridad: PRIORITY[t.priority],
    Estado: TASK_STATUS.find(s => s.id === t.status)?.label, Vence: d(t.due_date), Terminada: d(t.completed_at),
    Hito: milestones.find(m => m.id === t.milestone_id)?.title || '',
  })), [36, 14, 22, 9, 12, 12, 12, 24]);
  add('Avances', updates.map(u => ({
    Fecha: d(u.created_at), Autor: who(u.author_id), Área: area(u.area_id), Título: u.title, Detalle: u.body,
    Estado: UPDATE_STATUS[u.status], Nota: u.score ?? '', Devolución: u.feedback, 'Revisó': who(u.reviewed_by),
  })), [12, 22, 14, 30, 50, 18, 6, 40, 22]);
  add('Ensayos', tests.map(t => ({
    Fecha: d(t.test_date), Ensayo: t.title, Área: area(t.area_id), Resultado: RESULT[t.result],
    Objetivo: t.objective, 'Qué pasó': t.notes, Registró: who(t.author_id),
  })), [12, 30, 14, 10, 30, 50, 22]);
  add('Fallas', issues.map(i => ({
    Falla: i.title, Gravedad: SEVERITY[i.severity], Estado: ISSUE_STATUS[i.status], Área: area(i.area_id),
    Responsable: who(i.assignee_id), Ensayo: tests.find(t => t.id === i.test_id)?.title || '', Detalle: i.description,
    Resolución: i.resolution, Reportada: d(i.created_at), Resuelta: d(i.resolved_at),
  })), [30, 10, 12, 14, 22, 26, 40, 40, 12, 12]);
  add('Hitos', milestones.map(m => ({ Hito: m.title, Fecha: d(m.due_date), Cumplido: m.done ? 'Sí' : 'No' })), [36, 12, 10]);
  add('Inventario', items.map(i => ({
    Componente: i.name, Cantidad: i.quantity, 'Precio unitario': Number(i.unit_cost), Subtotal: i.quantity * Number(i.unit_cost),
    Estado: ITEM_STATUS[i.status], Responsable: who(i.responsible_id), Link: i.link, Notas: i.notes,
  })), [30, 9, 14, 14, 12, 22, 30, 30]);

  const safe = project.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '_');
  XLSX.writeFile(wb, `${safe}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
