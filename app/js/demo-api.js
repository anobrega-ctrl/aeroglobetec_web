// Modo demo: imita la API de Supabase con datos de ejemplo guardados en localStorage.
// Sirve para probar la interfaz sin login. Repite las reglas principales de permisos
// de supabase/schema.sql, pero la seguridad real está solo en la base de datos.

// El recorrido animado (tutorial.html) usa su propia copia, siempre recién creada
const TOUR = new URLSearchParams(location.search).has('tour');
const KEY = TOUR ? 'age-tour' : 'age-demo-v5';

// Presentación de ejemplo (la misma que supabase/presentacion_dron_rover.sql)
const ROVER_MD = `# Dron Rover · CATE 2027

Un dron tipo autito que llega a la zona de misión, se despliega por su cuenta y recorre el terreno como un rover. Es el proyecto del taller AeroGlobETec para el CATE 2027.

## La misión

- **Desplegarse solo:** al llegar a la zona, el dron se acomoda, extiende sus ruedas y su antena y pasa a modo rover sin que nadie lo toque.
- **Reconocer el terreno:** recorre la zona con cámara y sensores, esquiva obstáculos y registra lo que encuentra.
- **Transmitir los datos:** manda video y telemetría en vivo a la estación de tierra y vuelve al punto de recuperación al terminar.

## Fases

1. **Llegada:** el dron llega a la zona de misión plegado, con las ruedas y la antena guardadas.
2. **Despliegue:** ya en el suelo, extiende las ruedas y la antena y pasa a modo rover.
3. **Exploración:** recorre el terreno con cámara y sensores y manda video y datos a la estación de tierra.
4. **Retorno:** termina el recorrido, vuelve al punto de recuperación y la estación guarda todo lo registrado.

## El sistema

### Dron rover
- Chasis compacto con ruedas y antena que se despliegan
- Tracción en las 4 ruedas para terreno irregular
- Cámara frontal y sensores de distancia para evitar choques
- Batería propia y electrónica de control a bordo
- Modo manual (FPV) y modo autónomo

### Estación de tierra
- Enlace de radio con el dron para comandos y telemetría
- Recepción de video en vivo
- Interfaz para seguir el estado de la misión
- Registro de los datos para analizarlos después

## Subsistemas

- **Estructura:** diseño CAD, impresión 3D y el mecanismo que pasa al dron de plegado a modo rover.
- **Movilidad:** motores, drivers y control de velocidad y giro en terreno irregular.
- **Energía:** batería, reguladores y protecciones.
- **Comunicaciones:** comandos, telemetría y video entre el dron y la estación de tierra.
- **Sensores:** cámara, sensores de distancia, IMU y sensores ambientales.
- **Software:** firmware del dron, secuencia de despliegue automática e interfaz de la estación de tierra.

## Paso a paso

1. **Requisitos y concepto:** leer el reglamento del CATE, definir la misión, armar los equipos y fijar qué tiene que cumplir cada subsistema.
2. **Diseño preliminar:** CAD del dron, elección de componentes, presupuesto y revisión con los docentes.
3. **Prototipo:** primer dron funcionando y pruebas del mecanismo de despliegue por separado.
4. **Integración:** unir los subsistemas, despliegue automático y estación de tierra funcionando.
5. **Pruebas de campo:** misiones completas en terreno real, corrección de fallas y documentación.
6. **CATE 2027:** presentación del proyecto y demostración del despliegue en vivo.

## Áreas de trabajo

- **Mecánica:** CAD, impresión 3D, chasis y mecanismo de despliegue.
- **Electrónica:** motores, drivers, batería y placas.
- **Software:** firmware, control autónomo y estación de tierra.
- **Comunicaciones:** radio, antenas, telemetría y video.
- **Documentación:** informes, registro de pruebas y presentación final.
`;
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const ago = (h) => new Date(Date.now() - h * 3600000).toISOString();

function seed() {
  const people = [
    { id: uid(), email: 'mnobrega@etec.um.edu.ar', full_name: 'Prof. Andrea Nóbrega', role: 'docente' },
    { id: uid(), email: 'lucia.perez@alumno.etec.um.edu.ar', full_name: 'Lucía Pérez', role: 'lider' },
    { id: uid(), email: 'tomas.diaz@alumno.etec.um.edu.ar', full_name: 'Tomás Díaz', role: 'estudiante' },
    { id: uid(), email: 'sofia.ruiz@alumno.etec.um.edu.ar', full_name: 'Sofía Ruiz', role: 'estudiante' },
    { id: uid(), email: 'mateo.gomez@alumno.etec.um.edu.ar', full_name: 'Mateo Gómez', role: 'estudiante' },
    { id: uid(), email: 'valen.sosa@alumno.etec.um.edu.ar', full_name: 'Valentina Sosa', role: 'estudiante' },
    { id: uid(), email: 'mal.gimenez@alumno.etec.um.edu.ar', full_name: 'Mal Giménez', role: 'estudiante', is_admin: true },
  ].map(p => ({ is_admin: false, ...p, avatar_url: null, created_at: ago(500) }));
  const [doc, lider, tomas, sofia, mateo, valen] = people.map(p => p.id);
  const P = uid();
  const areas = [
    { id: uid(), project_id: P, name: 'Mecánica', description: 'Chasis, ruedas y mecanismo de despliegue', color: '#3774bc', member_ids: [tomas, mateo] },
    { id: uid(), project_id: P, name: 'Electrónica', description: 'Motores, drivers y batería', color: '#ffb454', member_ids: [sofia] },
    { id: uid(), project_id: P, name: 'Software', description: 'Firmware y estación de tierra', color: '#4fbf8b', member_ids: [lider, valen] },
  ];
  const [mec, ele, sw] = areas.map(a => a.id);
  const M1 = uid(), M2 = uid(), M3 = uid();
  const t = (title, area, assignee, status, due, priority = 2, milestone = null, extra = {}) => ({
    id: uid(), project_id: P, area_id: area, milestone_id: milestone, title, description: '', status, priority,
    assignee_id: assignee, due_date: due, created_by: doc, created_at: ago(200),
    completed_at: status === 'hecha' ? ago(30) : null, ...extra,
  });
  const tasks = [
    t('Diseño CAD del chasis', mec, tomas, 'hecha', day(-6), 1, M1),
    t('Mecanismo de ruedas desplegables', mec, mateo, 'en_curso', day(5), 1, M2),
    t('Imprimir soportes de motores', mec, tomas, 'pendiente', day(12), 2, M2),
    t('Elegir motores y drivers', ele, sofia, 'hecha', day(-10), 1, M1),
    t('Esquema de alimentación', ele, sofia, 'en_revision', day(2), 1, M2),
    t('Medir consumo de motores', ele, sofia, 'pendiente', day(-2), 2),
    t('Firmware de tracción (ESP32)', sw, valen, 'en_curso', day(8), 1, M2),
    t('Interfaz de la estación de tierra', sw, lider, 'pendiente', day(20), 2, M3),
    t('Leer el reglamento del CATE', null, null, 'hecha', day(-14), 3, M1),
  ];
  const u = (title, body, area, author, status, score, feedback, h, task = null) => ({
    id: uid(), project_id: P, area_id: area, task_id: task, author_id: author, title, body, attachments: [],
    status, score, feedback, reviewed_by: status === 'pendiente' ? null : doc, reviewed_at: status === 'pendiente' ? null : ago(h - 5), created_at: ago(h),
  });
  const updates = [
    u('Primera versión del chasis', 'Terminé el CAD del chasis en Fusion. Dejo capturas y el archivo STEP.', mec, tomas, 'aprobado', 9, 'Muy prolijo. Revisá el espesor de las paredes.', 120, tasks[0].id),
    u('Comparación de motores', 'Comparé N20 vs TT. Recomiendo N20 de 300 rpm por tamaño y consumo.', ele, sofia, 'aprobado', 8, 'Bien justificado.', 150, tasks[3].id),
    u('Bisagras de las ruedas', 'Probé dos diseños de bisagra. El segundo traba mejor.', mec, mateo, 'cambios', null, 'Falta una foto de la prueba y medir el ángulo.', 40, tasks[1].id),
    u('Esquema de alimentación v1', 'Subo el esquema con regulador buck de 5 V.', ele, sofia, 'pendiente', null, '', 6, tasks[4].id),
    u('Tracción básica funcionando', 'El ESP32 ya mueve los 4 motores con PWM.', sw, valen, 'aprobado', 7, 'Bien. Falta el control de giro.', 70, tasks[6].id),
  ];
  const project = { id: P, name: 'Dron Rover CATE 2027', description: 'Dron tipo autito que se despliega en la zona de misión y explora como rover.', color: '#3774bc', archived: false, presentation: ROVER_MD, created_by: doc, created_at: ago(400) };
  const P2 = uid();
  const project2 = { id: P2, name: 'Globo sonda', description: 'Medición de variables atmosféricas.', color: '#9b7bf0', archived: false, created_by: doc, created_at: ago(900) };
  return {
    me: lider,
    profiles: people,
    projects: [project, project2],
    members: [[P, doc], [P, lider], [P, tomas], [P, sofia], [P, mateo], [P, valen], [P2, doc], [P2, valen]].map(([project_id, user_id]) => ({ project_id, user_id })),
    areas,
    milestones: [
      { id: M1, project_id: P, title: 'Requisitos y concepto cerrados', due_date: day(-5), done: true, created_at: ago(400) },
      { id: M2, project_id: P, title: 'Prototipo funcionando', due_date: day(25), done: false, created_at: ago(400) },
      { id: M3, project_id: P, title: 'CATE 2027', due_date: '2027-04-15', done: false, created_at: ago(400) },
    ],
    tasks,
    updates,
    comments: [{ id: uid(), update_id: updates[0].id, author_id: lider, body: '¡Quedó genial!', created_at: ago(100) }],
    files: [],
    inventory: [
      { id: uid(), project_id: P, name: 'Motor N20 300 rpm', quantity: 4, unit_cost: 4500, status: 'recibido', responsible_id: sofia, link: '', notes: '', created_at: ago(100) },
      { id: uid(), project_id: P, name: 'ESP32 DevKit', quantity: 2, unit_cost: 9000, status: 'en_uso', responsible_id: valen, link: '', notes: '', created_at: ago(100) },
      { id: uid(), project_id: P, name: 'Batería LiPo 2S 1500 mAh', quantity: 1, unit_cost: 18000, status: 'pedido', responsible_id: sofia, link: '', notes: 'Pedida por ML', created_at: ago(50) },
      { id: uid(), project_id: P, name: 'Filamento PETG', quantity: 1, unit_cost: 22000, status: 'necesario', responsible_id: tomas, link: '', notes: '', created_at: ago(20) },
    ],
    activity: [
      { id: 1, project_id: P, actor_id: doc, kind: 'tarea', message: 'Creó la tarea "Diseño CAD del chasis"', created_at: ago(200) },
      { id: 2, project_id: P, actor_id: tomas, kind: 'avance', message: 'Subió el avance "Primera versión del chasis"', created_at: ago(120) },
      { id: 3, project_id: P, actor_id: doc, kind: 'revision', message: 'Aprobó el avance "Primera versión del chasis" de Tomás Díaz', created_at: ago(115) },
      { id: 4, project_id: P, actor_id: sofia, kind: 'avance', message: 'Subió el avance "Esquema de alimentación v1"', created_at: ago(6) },
    ],
    notifications: [
      { id: 1, user_id: lider, project_id: P, message: '"Esquema de alimentación" está lista para revisar', link: `#/proyecto/${P}/tareas`, read: false, created_at: ago(5) },
      { id: 2, user_id: lider, project_id: P, message: 'Te asignaron la tarea "Interfaz de la estación de tierra"', link: `#/proyecto/${P}/tareas`, read: true, created_at: ago(60) },
    ],
    seq: 100,
    ...demoExtras(P, { mec, ele }, { doc, lider, tomas, sofia, mateo }),
    ...demoEvents(P, { doc, lider, tomas, sofia, valen }),
  };
}

// Docentes de la web y charlas/competencias de ejemplo
function demoEvents(P, { doc, lider, tomas, sofia, valen }) {
  const E1 = uid(), E2 = uid();
  return {
    teachers: [
      { id: uid(), full_name: 'María Gema Pont', role_es: 'Docente del taller', role_en: 'Workshop teacher', email: 'maria.pont@etec.um.edu.ar', phone: '', photo_url: '', position: 1, visible: true },
      { id: uid(), full_name: 'Patricia Furci', role_es: 'Docente del taller', role_en: 'Workshop teacher', email: 'patricia.furci@etec.um.edu.ar', phone: '', photo_url: '', position: 2, visible: true },
      { id: uid(), full_name: 'Mario Papetti Funes', role_es: 'Docente del taller', role_en: 'Workshop teacher', email: 'mario.papetti@etec.um.edu.ar', phone: '+54 9 261 566-4422', photo_url: '', position: 3, visible: true },
    ],
    trayectoria: [
      { id: uid(), slug: 'feria-ciencias-2026', kind: 'feria', title: 'Feria de Ciencias 2026', title_en: 'Science Fair 2026', place: 'Mendoza', starts_on: '2026-09-12', ends_on: null,
        achievement: '1.er puesto en Tecnología', achievement_en: '1st place in Technology', summary: 'Mostramos el globo sonda y explicamos cómo medimos la atmósfera.', summary_en: '', body: 'Llevamos el globo sonda con su carga útil.\n\n- Armamos un stand con la telemetría en vivo.\n- Explicamos el proyecto a más de 200 visitantes.\n\nEl jurado destacó el trabajo en equipo.', body_en: '',
        cover_url: '', photos: [], video_url: '', link_url: '', event_id: null, visible: true },
    ],
    events: [
      { id: E1, kind: 'competencia', title: 'CATE 2027', description: 'Competencia Argentina de Tecnología Espacial. Presentamos el Dron Rover.', starts_on: '2027-04-15', ends_on: '2027-04-17', location: 'Córdoba', organizer: 'CATE', website: 'https://example.org/cate', status: 'preparacion', color: '#3774bc', created_by: lider, created_at: ago(100) },
      { id: E2, kind: 'charla', title: 'Charla en la Expo ETec', description: 'Contamos qué hace el taller y mostramos el prototipo.', starts_on: day(12), ends_on: null, location: 'SUM de la ETec', organizer: 'ETec UM', website: '', status: 'confirmado', color: '#ffb454', created_by: doc, created_at: ago(50) },
    ],
    eventMembers: [
      { event_id: E1, user_id: lider, role: 'Organización' }, { event_id: E1, user_id: tomas, role: 'Expositor' }, { event_id: E1, user_id: sofia, role: 'Equipo técnico' },
      { event_id: E2, user_id: doc, role: 'Organización' }, { event_id: E2, user_id: valen, role: 'Expositora' }, { event_id: E2, user_id: tomas, role: 'Expositor' },
    ],
    eventProjects: [
      { id: uid(), event_id: E1, project_id: P, name: '', note: 'Proyecto principal', created_at: ago(90) },
      { id: uid(), event_id: E2, project_id: P, name: '', note: '', created_at: ago(40) },
      { id: uid(), event_id: E2, project_id: null, name: 'Estación meteorológica (6.º año)', note: 'De otro curso', created_at: ago(40) },
    ],
    eventMaterials: [
      { id: uid(), event_id: E1, kind: 'presentacion', title: 'Presentación del Dron Rover', url: 'https://www.canva.com/design/DAFxxxxxxx/view', path: '', size: 0, author_id: tomas, created_at: ago(30) },
      { id: uid(), event_id: E1, kind: 'enlace', title: 'Reglamento del CATE', url: 'https://example.org/reglamento', path: '', size: 0, author_id: lider, created_at: ago(60) },
      { id: uid(), event_id: E2, kind: 'video', title: 'Video de la prueba de tracción', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', path: '', size: 0, author_id: valen, created_at: ago(10) },
    ],
    eventTasks: [
      { id: uid(), event_id: E1, title: 'Leer el reglamento completo', done: true, assignee_id: lider, due_date: day(-5), created_at: ago(80) },
      { id: uid(), event_id: E1, title: 'Armar la infografía del proyecto', done: false, assignee_id: sofia, due_date: day(20), created_at: ago(40) },
      { id: uid(), event_id: E1, title: 'Ensayar la presentación', done: false, assignee_id: tomas, due_date: day(40), created_at: ago(40) },
      { id: uid(), event_id: E2, title: 'Preparar el stand', done: false, assignee_id: valen, due_date: day(10), created_at: ago(20) },
    ],
  };
}

// Ensayos, fallas, equipos y turnos de ejemplo
function demoExtras(P, { mec, ele }, { doc, lider, tomas, sofia, mateo }) {
  const T1 = uid(), T2 = uid();
  const eq = [
    { id: uid(), name: 'Impresora 3D', description: 'Impresora FDM del taller', color: '#3774bc', active: true },
    { id: uid(), name: 'Estación de soldado', description: 'Soldador y estación de aire caliente', color: '#ffb454', active: true },
    { id: uid(), name: 'Osciloscopio', description: 'Osciloscopio digital de 2 canales', color: '#4fbf8b', active: true },
  ];
  const at = (d, h) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(h, 0, 0, 0); return x.toISOString(); };
  return {
    tests: [
      { id: T1, project_id: P, area_id: mec, title: 'Prueba de tracción en rampa', test_date: day(-3), objective: 'Subir una rampa de 20°', result: 'parcial', notes: 'Sube hasta 15°. En 20° las ruedas patinan.', attachments: [], author_id: tomas, created_at: ago(72) },
      { id: T2, project_id: P, area_id: ele, title: 'Consumo de motores en vacío', test_date: day(-1), objective: 'Medir corriente de los 4 motores', result: 'exitoso', notes: '180 mA por motor en vacío. Dentro de lo esperado.', attachments: [], author_id: sofia, created_at: ago(24) },
    ],
    issues: [
      { id: uid(), project_id: P, test_id: T1, area_id: mec, title: 'Las ruedas patinan en pendientes', description: 'Con más de 15° de inclinación pierde tracción.', severity: 'alta', status: 'en_proceso', assignee_id: mateo, resolution: '', created_by: tomas, resolved_at: null, created_at: ago(70) },
      { id: uid(), project_id: P, test_id: null, area_id: ele, title: 'El regulador calienta', description: 'Después de 10 min el regulador de 5 V levanta mucha temperatura.', severity: 'media', status: 'abierta', assignee_id: sofia, resolution: '', created_by: lider, resolved_at: null, created_at: ago(30) },
      { id: uid(), project_id: P, test_id: null, area_id: null, title: 'Antena floja', description: 'Se movía con las vibraciones.', severity: 'baja', status: 'resuelta', assignee_id: tomas, resolution: 'Se pegó con epoxi.', created_by: doc, resolved_at: ago(48), created_at: ago(90) },
    ],
    equipment: eq,
    reservations: [
      { id: uid(), equipment_id: eq[0].id, project_id: P, area_id: mec, user_id: tomas, starts_at: at(1, 14), ends_at: at(1, 17), purpose: 'Soportes de motores' },
      { id: uid(), equipment_id: eq[1].id, project_id: P, area_id: ele, user_id: sofia, starts_at: at(2, 15), ends_at: at(2, 17), purpose: 'Placa de alimentación' },
      { id: uid(), equipment_id: eq[2].id, project_id: P, area_id: ele, user_id: sofia, starts_at: at(3, 14), ends_at: at(3, 16), purpose: 'Medir PWM' },
    ],
  };
}

let db = load();
function load() {
  if (TOUR) {   // el recorrido muestra todo, así que entra como admin
    const s = seed();
    s.me = s.profiles.find(p => p.is_admin)?.id || s.me;
    return s;
  }
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s?.profiles) return s; } catch { /* sin datos guardados */ }
  return seed();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* almacenamiento bloqueado */ } }
const clone = (x) => JSON.parse(JSON.stringify(x));
const meP = () => db.profiles.find(p => p.id === db.me);
const staff = () => !!meP()?.is_admin || ['docente', 'lider'].includes(meP()?.role);
const deny = () => { throw new Error('No tenés permiso para hacer eso.'); };
const isMember = (pid, u = db.me) => db.members.some(m => m.project_id === pid && m.user_id === u);
const canView = (pid) => staff() || isMember(pid);
const nm = (id) => { const p = db.profiles.find(x => x.id === id); return p ? (p.full_name || p.email) : ''; };
const projName = (pid) => db.projects.find(p => p.id === pid)?.name;

function log(project_id, kind, message) {
  db.activity.push({ id: ++db.seq, project_id, actor_id: db.me, kind, message, created_at: now() });
}
function notify(user_id, project_id, message, link) {
  if (!user_id || user_id === db.me) return;
  db.notifications.push({ id: ++db.seq, user_id, project_id, message, link, read: false, created_at: now() });
}
const withProject = (row) => ({ ...row, projects: (({ name, color }) => ({ name, color }))(db.projects.find(p => p.id === row.project_id) || {}) });

export const api = {
  demo: true,

  // ---------- Sesión (en demo se elige el usuario) ----------
  async session() { return db.me ? { user: { id: db.me } } : null; },
  async authError() { return null; },
  async providers() { return { google: false, email: false }; },
  async verifyCode() { throw new Error('En modo demo elegí un usuario de la lista.'); },
  onAuthChange() {},
  async signInWithGoogle() { db.me = db.profiles[0].id; save(); location.reload(); },
  async signInWithEmail() { throw new Error('En modo demo elegí un usuario de la lista.'); },
  async signOut() { db.me = null; save(); },
  demoUsers() { return clone(db.profiles); },
  demoLogin(id) { db.me = id; save(); },
  demoReset() { db = seed(); save(); },

  // ---------- Perfiles ----------
  async me() { return clone(meP() || null); },
  async profiles() { return clone(db.profiles).sort((a, b) => a.full_name.localeCompare(b.full_name)); },
  async setRole(userId, role) {
    const admin = meP().is_admin;
    if (!admin && meP().role !== 'docente') deny();
    const p = db.profiles.find(x => x.id === userId);
    if (!admin && (p.role === 'docente' || role === 'docente')) throw new Error('El rol docente lo da el dominio del email');
    p.role = role; save();
  },
  async updateMyName(userId, full_name) { db.profiles.find(p => p.id === userId).full_name = full_name; save(); },

  // ---------- Proyectos ----------
  async projects() {
    return clone(db.projects.filter(p => canView(p.id)).map(p => ({ ...p, project_members: db.members.filter(m => m.project_id === p.id).map(m => ({ user_id: m.user_id })) })))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async project(id) { return canView(id) ? clone(db.projects.find(p => p.id === id) || null) : null; },
  async createProject(p) {
    if (!staff()) deny();
    const row = { id: uid(), description: '', color: '#3774bc', archived: false, ...p, created_by: db.me, created_at: now() };
    db.projects.push(row);
    db.members.push({ project_id: row.id, user_id: db.me });
    save(); return clone(row);
  },
  async updateProject(id, patch) { if (!staff()) deny(); Object.assign(db.projects.find(p => p.id === id), patch); save(); },
  async deleteProject(id) {
    if (!staff()) deny();
    const areaIds = db.areas.filter(a => a.project_id === id).map(a => a.id);
    for (const k of ['members', 'areas', 'milestones', 'tasks', 'updates', 'files', 'inventory', 'activity', 'notifications', 'tests', 'issues', 'reservations']) {
      db[k] = db[k].filter(r => r.project_id !== id);
    }
    db.areas = db.areas.filter(a => !areaIds.includes(a.id));
    db.projects = db.projects.filter(p => p.id !== id); save();
  },

  // ---------- Equipo ----------
  async members(pid) {
    return clone(db.members.filter(m => m.project_id === pid).map(m => db.profiles.find(p => p.id === m.user_id)))
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  },
  async addMembers(pid, ids) {
    if (!staff()) deny();
    for (const user_id of ids) {
      if (isMember(pid, user_id)) continue;
      db.members.push({ project_id: pid, user_id });
      log(pid, 'equipo', `Sumó a ${nm(user_id)} al proyecto`);
      notify(user_id, pid, `Te sumaron al proyecto "${projName(pid)}"`, `#/proyecto/${pid}`);
    }
    save();
  },
  async removeMember(pid, userId) {
    if (!staff()) deny();
    db.members = db.members.filter(m => !(m.project_id === pid && m.user_id === userId));
    db.areas.filter(a => a.project_id === pid).forEach(a => { a.member_ids = a.member_ids.filter(x => x !== userId); });
    log(pid, 'equipo', `Sacó a ${nm(userId)} del proyecto`); save();
  },

  // ---------- Áreas ----------
  async areas(pid) { return clone(db.areas.filter(a => a.project_id === pid)).sort((a, b) => a.name.localeCompare(b.name)); },
  async saveArea(area, memberIds) {
    if (!staff()) deny();
    let row = db.areas.find(a => a.id === area.id);
    if (row) Object.assign(row, area);
    else { row = { id: uid(), description: '', color: '#7caef3', ...area }; db.areas.push(row); log(row.project_id, 'area', `Creó el área "${row.name}"`); }
    row.member_ids = memberIds.filter(id => isMember(row.project_id, id));
    save(); return clone(row);
  },
  async deleteArea(id) {
    if (!staff()) deny();
    db.areas = db.areas.filter(a => a.id !== id);
    db.tasks.forEach(t => { if (t.area_id === id) t.area_id = null; });
    db.updates.forEach(u => { if (u.area_id === id) u.area_id = null; });
    save();
  },

  // ---------- Hitos ----------
  async milestones(pid) { return clone(db.milestones.filter(m => m.project_id === pid)).sort((a, b) => a.due_date.localeCompare(b.due_date)); },
  async upcomingMilestones() {
    return clone(db.milestones.filter(m => !m.done && canView(m.project_id)).map(withProject)).sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 6);
  },
  async saveMilestone(m) {
    if (!staff()) deny();
    const row = db.milestones.find(x => x.id === m.id);
    if (row) { if (m.done && !row.done) log(row.project_id, 'hito', `Cumplió el hito "${row.title}"`); Object.assign(row, m); }
    else { db.milestones.push({ id: uid(), done: false, created_at: now(), ...m }); log(m.project_id, 'hito', `Agregó el hito "${m.title}"`); }
    save();
  },
  async deleteMilestone(id) { if (!staff()) deny(); db.milestones = db.milestones.filter(m => m.id !== id); save(); },

  // ---------- Tareas ----------
  async tasks(pid) { return clone(db.tasks.filter(t => t.project_id === pid)); },
  async myTasks(userId) { return clone(db.tasks.filter(t => t.assignee_id === userId && t.status !== 'hecha').map(withProject)); },
  async reviewQueue() {
    return {
      tasks: clone(db.tasks.filter(t => t.status === 'en_revision' && canView(t.project_id)).map(withProject)),
      updates: clone(db.updates.filter(u => u.status === 'pendiente' && canView(u.project_id)).map(withProject)),
    };
  },
  async saveTask(t) {
    if (!staff()) deny();
    if (t.assignee_id && !isMember(t.project_id, t.assignee_id)) throw new Error('La persona asignada no es miembro del proyecto');
    const row = db.tasks.find(x => x.id === t.id);
    const link = `#/proyecto/${t.project_id}/tareas`;
    if (row) {
      if (t.assignee_id && t.assignee_id !== row.assignee_id) notify(t.assignee_id, row.project_id, `Te asignaron la tarea "${t.title}"`, link);
      Object.assign(row, t);
    } else {
      db.tasks.push({ id: uid(), status: 'pendiente', priority: 2, description: '', created_by: db.me, created_at: now(), completed_at: null, ...t });
      log(t.project_id, 'tarea', `Creó la tarea "${t.title}"`);
      notify(t.assignee_id, t.project_id, `Te asignaron la tarea "${t.title}"`, link);
    }
    save();
  },
  async setTaskStatus(id, status) {
    const t = db.tasks.find(x => x.id === id);
    if (!staff()) {
      if (t.assignee_id !== db.me) deny();
      if (status === 'hecha') throw new Error('Mandala a revisión: un docente o líder la marca como hecha');
      if (t.status === 'hecha') throw new Error('Esta tarea ya está hecha: solo un docente o líder la puede reabrir');
    }
    if (t.status === status) return;
    t.status = status;
    t.completed_at = status === 'hecha' ? now() : null;
    log(t.project_id, 'tarea', `Movió "${t.title}" a ${status.replace('_', ' ')}`);
    const link = `#/proyecto/${t.project_id}/tareas`;
    if (status === 'en_revision') notify(t.created_by, t.project_id, `"${t.title}" está lista para revisar`, link);
    if (status === 'hecha') notify(t.assignee_id, t.project_id, `Tu tarea "${t.title}" quedó como hecha`, link);
    save();
  },
  async deleteTask(id) { if (!staff()) deny(); db.tasks = db.tasks.filter(t => t.id !== id); save(); },

  // ---------- Avances ----------
  async updates(pid) {
    return clone(db.updates.filter(u => u.project_id === pid).map(u => ({ ...u, comments: [{ count: db.comments.filter(c => c.update_id === u.id).length }] })))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async uploadFiles(pid, folder, files) {
    return Promise.all(files.map(f => new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve({ path: r.result, name: f.name, size: f.size });
      r.readAsDataURL(f.size < 400000 ? f : new Blob(['Archivo demasiado grande para el modo demo']));
    })));
  },
  async createUpdate(u, files = []) {
    if (!canView(u.project_id)) deny();
    const attachments = await this.uploadFiles(u.project_id, 'avances', files);
    db.updates.push({ id: uid(), area_id: null, task_id: null, body: '', ...u, author_id: db.me, attachments, status: 'pendiente', score: null, feedback: '', reviewed_by: null, reviewed_at: null, created_at: now() });
    log(u.project_id, 'avance', `Subió el avance "${u.title}"`); save();
  },
  async editUpdate(id, patch, pid, newFiles = [], keep = []) {
    const u = db.updates.find(x => x.id === id);
    if (!staff() && u.author_id !== db.me) deny();
    if (!staff() && u.status === 'aprobado') throw new Error('Este avance ya fue aprobado y no se puede editar');
    Object.assign(u, patch, { attachments: [...keep, ...(await this.uploadFiles(pid, 'avances', newFiles))] });
    if (!staff()) u.status = 'pendiente';
    save();
  },
  async reviewUpdate(id, { status, score, feedback }) {
    if (!staff()) throw new Error('Solo un docente o líder puede revisar avances');
    const u = db.updates.find(x => x.id === id);
    Object.assign(u, { status, score: score ? Number(score) : null, feedback, reviewed_by: db.me, reviewed_at: now() });
    if (status !== 'pendiente') {
      log(u.project_id, 'revision', `${status === 'aprobado' ? 'Aprobó' : 'Pidió cambios en'} el avance "${u.title}" de ${nm(u.author_id)}`);
      notify(u.author_id, u.project_id, `${status === 'aprobado' ? 'Aprobaron tu avance' : 'Pidieron cambios en tu avance'} "${u.title}"`, `#/proyecto/${u.project_id}/avances`);
    }
    save();
  },
  async deleteUpdate(u) {
    if (!staff() && (u.author_id !== db.me || u.status === 'aprobado')) deny();
    db.updates = db.updates.filter(x => x.id !== u.id); save();
  },
  async fileUrl(path) { return path; },

  // ---------- Comentarios ----------
  async comments(updateId) { return clone(db.comments.filter(c => c.update_id === updateId)).sort((a, b) => a.created_at.localeCompare(b.created_at)); },
  async addComment(updateId, body, mentions = []) {
    const u = db.updates.find(x => x.id === updateId);
    const lnk = `#/proyecto/${u.project_id}/avances`;
    db.comments.push({ id: uid(), update_id: updateId, author_id: db.me, body, mentions, created_at: now() });
    mentions.filter(m => isMember(u.project_id, m)).forEach(m => notify(m, u.project_id, `${nm(db.me)} te mencionó en "${u.title}"`, lnk));
    if (!mentions.includes(u.author_id)) notify(u.author_id, u.project_id, `Nuevo comentario en tu avance "${u.title}"`, lnk);
    save();
  },

  // ---------- Archivos ----------
  async files(pid) { return clone(db.files.filter(f => f.project_id === pid)); },
  async uploadProjectFiles(pid, folder, files) {
    const up = await this.uploadFiles(pid, 'archivos', files);
    for (const f of up) {
      db.files.push({ id: uid(), project_id: pid, folder: folder || 'General', uploaded_by: db.me, created_at: now(), ...f });
      log(pid, 'archivo', `Subió el archivo "${f.name}"`);
    }
    save();
  },
  async deleteFile(file) {
    if (!staff() && file.uploaded_by !== db.me) deny();
    db.files = db.files.filter(f => f.id !== file.id); save();
  },

  // ---------- Inventario ----------
  async inventory(pid) { return clone(db.inventory.filter(i => i.project_id === pid)); },
  async saveItem(item) {
    const row = db.inventory.find(x => x.id === item.id);
    if (row) {
      if (item.status && item.status !== row.status) log(row.project_id, 'inventario', `"${row.name}" pasó a ${item.status.replace('_', ' ')}`);
      Object.assign(row, item);
    } else {
      db.inventory.push({ id: uid(), quantity: 1, unit_cost: 0, status: 'necesario', link: '', notes: '', created_at: now(), ...item });
      log(item.project_id, 'inventario', `Agregó "${item.name}" al inventario`);
    }
    save();
  },
  async deleteItem(id) { if (!staff()) deny(); db.inventory = db.inventory.filter(i => i.id !== id); save(); },

  // ---------- Bitácora y notificaciones ----------
  async activity(pid) { return clone(db.activity.filter(a => a.project_id === pid)).sort((a, b) => b.created_at.localeCompare(a.created_at)); },
  async notifications() { return clone(db.notifications.filter(n => n.user_id === db.me)).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 30); },
  async markRead(ids) { db.notifications.forEach(n => { if (ids.includes(n.id)) n.read = true; }); save(); },

  // ---------- Rendimiento (misma fórmula que la base de datos) ----------
  async studentPerformance(pid) {
    if (!canView(pid)) return [];
    const rows = db.members.filter(m => m.project_id === pid).map(m => {
      const p = db.profiles.find(x => x.id === m.user_id);
      const ts = db.tasks.filter(t => t.project_id === pid && t.assignee_id === p.id);
      const done = ts.filter(t => t.status === 'hecha');
      const onTime = done.filter(t => !t.due_date || t.completed_at.slice(0, 10) <= t.due_date);
      const today = new Date().toISOString().slice(0, 10);
      const ups = db.updates.filter(u => u.project_id === pid && u.author_id === p.id);
      const approved = ups.filter(u => u.status === 'aprobado');
      const scored = approved.filter(u => u.score);
      const avg = scored.length ? Math.round(scored.reduce((s, u) => s + u.score, 0) / scored.length * 10) / 10 : null;
      let score = null;
      if (ts.length || avg !== null) {
        const raw = (ts.length ? 50 * done.length / ts.length : 0) + (avg !== null ? 3 * avg : 0) + (done.length ? 20 * onTime.length / done.length : 0);
        score = Math.round(raw * 100 / ((ts.length ? 70 : 0) + (avg !== null ? 30 : 0)));
      }
      return {
        user_id: p.id, full_name: p.full_name, email: p.email,
        tasks_assigned: ts.length, tasks_done: done.length, tasks_on_time: onTime.length,
        tasks_overdue: ts.filter(t => t.status !== 'hecha' && t.due_date && t.due_date < today).length,
        updates_total: ups.length, updates_approved: approved.length, avg_score: avg, score,
      };
    });
    return clone(staff() ? rows : rows.filter(r => r.user_id === db.me)).sort((a, b) => a.full_name.localeCompare(b.full_name));
  },
  async areaPerformance(pid) {
    const today = new Date().toISOString().slice(0, 10);
    return db.areas.filter(a => a.project_id === pid).map(a => {
      const ts = db.tasks.filter(t => t.area_id === a.id);
      const ups = db.updates.filter(u => u.area_id === a.id);
      const approved = ups.filter(u => u.status === 'aprobado');
      const scored = approved.filter(u => u.score);
      return {
        area_id: a.id, area_name: a.name, color: a.color, members: a.member_ids.length,
        tasks_total: ts.length, tasks_done: ts.filter(t => t.status === 'hecha').length,
        tasks_overdue: ts.filter(t => t.status !== 'hecha' && t.due_date && t.due_date < today).length,
        updates_total: ups.length, updates_approved: approved.length,
        avg_score: scored.length ? Math.round(scored.reduce((s, u) => s + u.score, 0) / scored.length * 10) / 10 : null,
        progress: ts.length ? Math.round(100 * ts.filter(t => t.status === 'hecha').length / ts.length) : 0,
      };
    }).sort((a, b) => a.area_name.localeCompare(b.area_name));
  },

  // ---------- Ensayos y fallas ----------
  async tests(pid) { return clone(db.tests.filter(t => t.project_id === pid)).sort((a, b) => b.test_date.localeCompare(a.test_date) || b.created_at.localeCompare(a.created_at)); },
  async saveTest(t, files = [], keep = []) {
    if (!canView(t.project_id)) deny();
    const attachments = [...keep, ...(await this.uploadFiles(t.project_id, 'ensayos', files))];
    const row = db.tests.find(x => x.id === t.id);
    if (row) {
      if (!staff() && row.author_id !== db.me) deny();
      Object.assign(row, t, { attachments });
      save();
      return row.id;
    }
    const id = uid();
    db.tests.push({ area_id: null, objective: '', notes: '', created_at: now(), ...t, id, author_id: db.me, attachments });
    log(t.project_id, 'ensayo', `Registró el ensayo "${t.title}" (${t.result})`);
    save();
    return id;
  },
  async deleteTest(t) {
    if (!staff() && t.author_id !== db.me) deny();
    db.tests = db.tests.filter(x => x.id !== t.id);
    db.issues.forEach(i => { if (i.test_id === t.id) i.test_id = null; });
    save();
  },
  async issues(pid) { return clone(db.issues.filter(i => i.project_id === pid)).sort((a, b) => b.created_at.localeCompare(a.created_at)); },
  async saveIssue(i) {
    const row = db.issues.find(x => x.id === i.id);
    const pid = row?.project_id || i.project_id;
    const lnk = `#/proyecto/${pid}/ensayos`;
    if (i.assignee_id && !isMember(pid, i.assignee_id)) throw new Error('La persona asignada no es miembro del proyecto');
    if (row) {
      if (!staff() && row.created_by !== db.me && row.assignee_id !== db.me) deny();
      if (i.assignee_id && i.assignee_id !== row.assignee_id) notify(i.assignee_id, pid, `Te asignaron la falla "${row.title}"`, lnk);
      if (i.status && i.status !== row.status) {
        log(pid, 'falla', `${i.status === 'resuelta' ? 'Resolvió' : i.status === 'abierta' ? 'Reabrió' : 'Empezó a trabajar en'} la falla "${row.title}"`);
        if (i.status === 'resuelta') notify(row.created_by, pid, `Se resolvió la falla "${row.title}"`, lnk);
        row.resolved_at = i.status === 'resuelta' ? now() : null;
      }
      Object.assign(row, i);
    } else {
      if (!canView(pid)) deny();
      db.issues.push({ id: uid(), test_id: null, area_id: null, description: '', severity: 'media', status: 'abierta', assignee_id: null, resolution: '', created_at: now(), resolved_at: null, ...i, created_by: db.me });
      log(pid, 'falla', `Reportó la falla "${i.title}"`);
      notify(i.assignee_id, pid, `Te asignaron la falla "${i.title}"`, lnk);
    }
    save();
  },
  async deleteIssue(id) {
    const row = db.issues.find(x => x.id === id);
    if (!staff() && row.created_by !== db.me) deny();
    db.issues = db.issues.filter(x => x.id !== id);
    save();
  },

  // ---------- Equipos y turnos ----------
  async equipment() { return clone(db.equipment).sort((a, b) => a.name.localeCompare(b.name)); },
  async saveEquipment(e) {
    if (!staff()) deny();
    const row = db.equipment.find(x => x.id === e.id);
    if (row) Object.assign(row, e);
    else db.equipment.push({ id: uid(), description: '', color: '#3774bc', active: true, ...e });
    save();
  },
  async agenda(from, to) {
    return clone(db.reservations.filter(r => new Date(r.starts_at) < to && new Date(r.ends_at) > from).map(r => {
      const p = db.projects.find(x => x.id === r.project_id);
      return { ...r, project_name: p?.name, project_color: p?.color, area_name: db.areas.find(a => a.id === r.area_id)?.name || null, user_name: nm(r.user_id) };
    })).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  },
  async saveReservation(r) {
    const row = db.reservations.find(x => x.id === r.id);
    if (row && !staff() && row.user_id !== db.me) deny();
    const next = { ...(row || {}), ...r };
    if (!canView(next.project_id)) throw new Error('Solo podés reservar para un proyecto del que sos miembro');
    if (new Date(next.ends_at) <= new Date(next.starts_at)) throw new Error('El turno tiene que terminar después de empezar');
    if (new Date(next.ends_at) - new Date(next.starts_at) > 12 * 3600000) throw new Error('Un turno puede durar como máximo 12 horas');
    if (!db.equipment.find(e => e.id === next.equipment_id)?.active) throw new Error('Ese equipo no está disponible para reservar');
    const clash = db.reservations.find(x => x.id !== next.id && x.equipment_id === next.equipment_id && new Date(x.starts_at) < new Date(next.ends_at) && new Date(x.ends_at) > new Date(next.starts_at));
    if (clash) throw new Error(`Ese horario se superpone con un turno de "${db.projects.find(p => p.id === clash.project_id)?.name}"`);
    if (row) Object.assign(row, r);
    else db.reservations.push({ id: uid(), area_id: null, purpose: '', created_at: now(), ...r, user_id: db.me });
    save();
  },
  async deleteReservation(id) {
    const row = db.reservations.find(x => x.id === id);
    if (!staff() && row.user_id !== db.me) deny();
    db.reservations = db.reservations.filter(x => x.id !== id);
    save();
  },

  // ---------- Docentes de la web pública ----------
  async teachers() { return clone(db.teachers).sort((a, b) => a.position - b.position || a.full_name.localeCompare(b.full_name)); },
  async saveTeacher(t) {
    if (!(meP().is_admin || meP().role === 'docente')) deny();
    const row = db.teachers.find(x => x.id === t.id);
    if (row) Object.assign(row, t);
    else db.teachers.push({ id: uid(), role_es: 'Docente del taller', role_en: 'Workshop teacher', email: '', phone: '', photo_url: '', position: db.teachers.length + 1, visible: true, ...t });
    save();
  },
  async deleteTeacher(id) { if (!(meP().is_admin || meP().role === 'docente')) deny(); db.teachers = db.teachers.filter(t => t.id !== id); save(); },
  async uploadTeacherPhoto() { throw new Error('En modo demo pegá un link https de la foto.'); },
  async uploadSitePhoto() { throw new Error('En modo demo no se pueden subir fotos: pegá links https.'); },

  // ---------- Trayectoria de la web pública ----------
  async trayectoria() { return clone(db.trayectoria || []).sort((a, b) => b.starts_on.localeCompare(a.starts_on)); },
  async saveTrayectoria(t) {
    if (!(meP().is_admin || meP().role === 'docente')) deny();
    db.trayectoria ||= [];
    if (db.trayectoria.some(x => x.slug === t.slug && x.id !== t.id)) throw new Error('Ya hay otra entrada con esa dirección.');
    const row = db.trayectoria.find(x => x.id === t.id);
    if (row) Object.assign(row, t);
    else db.trayectoria.push({ id: uid(), kind: 'competencia', title_en: '', place: '', ends_on: null, achievement: '', achievement_en: '', summary: '', summary_en: '', body: '', body_en: '', cover_url: '', photos: [], video_url: '', link_url: '', event_id: null, visible: true, ...t });
    save();
  },
  async deleteTrayectoria(id) { if (!(meP().is_admin || meP().role === 'docente')) deny(); db.trayectoria = (db.trayectoria || []).filter(t => t.id !== id); save(); },

  // ---------- Charlas y competencias ----------
  async events() {
    const can = (e) => staff() || db.eventMembers.some(m => m.event_id === e.id && m.user_id === db.me);
    return clone(db.events.filter(can).map(e => ({ ...e, event_members: db.eventMembers.filter(m => m.event_id === e.id).map(m => ({ user_id: m.user_id })) })))
      .sort((a, b) => a.starts_on.localeCompare(b.starts_on));
  },
  async event(id) {
    const e = db.events.find(x => x.id === id);
    if (!e || !(staff() || db.eventMembers.some(m => m.event_id === id && m.user_id === db.me))) return null;
    return clone(e);
  },
  async saveEvent(e) {
    if (!staff()) deny();
    if (e.ends_on && e.starts_on && e.ends_on < e.starts_on) throw new Error('La fecha de fin no puede ser anterior al inicio');
    const row = db.events.find(x => x.id === e.id);
    if (row) { Object.assign(row, e); save(); return row.id; }
    const id = uid();
    db.events.push({ description: '', ends_on: null, location: '', organizer: '', website: '', status: 'preparacion', color: '#3774bc', ...e, id, created_by: db.me, created_at: now() });
    db.eventMembers.push({ event_id: id, user_id: db.me, role: 'Organización' });
    save(); return id;
  },
  async deleteEvent(id) {
    if (!staff()) deny();
    for (const k of ['eventMembers', 'eventProjects', 'eventMaterials', 'eventTasks']) db[k] = db[k].filter(r => r.event_id !== id);
    db.events = db.events.filter(e => e.id !== id); save();
  },
  async eventMembers(id) {
    return clone(db.eventMembers.filter(m => m.event_id === id).map(m => ({ ...db.profiles.find(p => p.id === m.user_id), event_role: m.role })))
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  },
  async addEventMembers(id, ids, role = '') {
    if (!staff()) deny();
    const ev = db.events.find(e => e.id === id);
    for (const user_id of ids) {
      if (db.eventMembers.some(m => m.event_id === id && m.user_id === user_id)) continue;
      db.eventMembers.push({ event_id: id, user_id, role });
      if (user_id !== db.me) db.notifications.push({ id: ++db.seq, user_id, project_id: null, message: `Te sumaron a la ${ev.kind} "${ev.title}"`, link: `#/evento/${id}`, read: false, created_at: now() });
    }
    save();
  },
  async setEventRole(id, userId, role) { if (!staff()) deny(); const m = db.eventMembers.find(x => x.event_id === id && x.user_id === userId); if (m) m.role = role; save(); },
  async removeEventMember(id, userId) { if (!staff()) deny(); db.eventMembers = db.eventMembers.filter(m => !(m.event_id === id && m.user_id === userId)); save(); },
  async eventProjects(id) {
    return clone(db.eventProjects.filter(r => r.event_id === id).map(r => ({ ...r, projects: r.project_id ? (({ name, color }) => ({ name, color }))(db.projects.find(p => p.id === r.project_id) || {}) : null })));
  },
  async addEventProject(row) {
    if (!staff()) deny();
    if (!row.project_id && !String(row.name || '').trim()) throw new Error('Elegí un proyecto o escribí su nombre');
    db.eventProjects.push({ id: uid(), name: '', note: '', created_at: now(), ...row }); save();
  },
  async deleteEventProject(rowId) { if (!staff()) deny(); db.eventProjects = db.eventProjects.filter(r => r.id !== rowId); save(); },
  async eventMaterials(id) { return clone(db.eventMaterials.filter(m => m.event_id === id)).sort((a, b) => b.created_at.localeCompare(a.created_at)); },
  async addEventMaterial(m, file) {
    let path = '', size = 0;
    if (file) { path = (await this.uploadFiles(m.event_id, 'eventos', [file]))[0].path; size = file.size; }
    db.eventMaterials.push({ id: uid(), url: '', ...m, path, size, author_id: db.me, created_at: now() }); save();
  },
  async deleteEventMaterial(m) {
    if (!staff() && m.author_id !== db.me) deny();
    db.eventMaterials = db.eventMaterials.filter(x => x.id !== m.id); save();
  },
  async eventTasks(id) { return clone(db.eventTasks.filter(t => t.event_id === id)).sort((a, b) => (a.done - b.done) || String(a.due_date || '9').localeCompare(String(b.due_date || '9'))); },
  async saveEventTask(t) {
    const row = db.eventTasks.find(x => x.id === t.id);
    const evId = row?.event_id || t.event_id;
    const assignee = t.assignee_id !== undefined ? t.assignee_id : row?.assignee_id;
    if (assignee && !db.eventMembers.some(m => m.event_id === evId && m.user_id === assignee)) throw new Error('La persona asignada no está en el equipo del evento');
    if (row) Object.assign(row, t);
    else db.eventTasks.push({ id: uid(), done: false, assignee_id: null, due_date: null, created_at: now(), ...t });
    save();
  },
  async deleteEventTask(id) { if (!staff()) deny(); db.eventTasks = db.eventTasks.filter(t => t.id !== id); save(); },
};
