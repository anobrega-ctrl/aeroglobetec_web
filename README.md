# AeroGlobETec · Web y plataforma de proyectos

Sitio y herramientas del taller AeroGlobETec (ETec · Universidad de Mendoza).

| Ruta | Qué es |
|---|---|
| `AeroGlobETec_Navegacion_Por_Pestanas.html` | Sitio público del taller |
| `rover-cate-2027.html` | Página interna del proyecto Dron Rover (CATE 2027) |
| `app/` | Plataforma de proyectos: login, proyectos, tareas, avances y rendimiento |
| `supabase/schema.sql` | Base de datos de la plataforma (tablas, permisos y automatismos) |

## La plataforma

Se entra con la cuenta de la ETec. El rol sale del mail:

| Mail | Rol |
|---|---|
| `@etec.um.edu.ar` | **Docente** |
| `@alumno.etec.um.edu.ar` | **Estudiante**. Un docente lo puede pasar a **estudiante líder**, que tiene los mismos permisos que un docente. |

Cualquier otro dominio queda rechazado por la base de datos.

**Admins:** tienen todos los permisos y pueden dar cualquier rol, incluso docente. Se definen en la tabla `admins` y solo se pueden agregar desde el SQL Editor de Supabase:

```sql
insert into public.admins (email) values ('nombre@alumno.etec.um.edu.ar');
```

**Qué tiene cada proyecto**

- **Resumen:** avance general, tareas vencidas, próximo hito con cuenta regresiva y avance por área.
- **Tareas:** tablero Kanban (pendiente → en curso → en revisión → hecha). Docentes y líderes las crean y las asignan. Cada estudiante mueve solo las suyas y las manda a revisión. Solo un docente o líder las marca como hechas.
- **Avances:** los estudiantes suben lo que hicieron, con fotos y archivos. Docentes y líderes los aprueban o piden cambios, con nota de 1 a 10 y devolución. Todos pueden comentar.
- **Hitos:** fechas clave del proyecto, con las tareas asociadas a cada una.
- **Equipo y áreas:** integrantes del proyecto y áreas (Mecánica, Electrónica, etc.) con sus responsables.
- **Archivos:** CAD, código, fotos y documentación, ordenados por carpeta.
- **Inventario:** componentes, cantidades, precios, estado de compra y responsable, con el presupuesto total.
- **Rendimiento:** puntaje orientativo por estudiante y resumen por área. Ver la fórmula abajo.
- **Bitácora:** historial automático de todo lo que pasa en el proyecto.
- **Informe PDF:** resumen imprimible del proyecto.
- **Notificaciones:** la campanita avisa cuando te asignan una tarea, te revisan un avance o te comentan.

**Fórmula del rendimiento (0 a 100)**

| Parte | Peso | Qué mide |
|---|---|---|
| Cumplimiento | 50 % | Tareas hechas sobre tareas asignadas |
| Calidad | 30 % | Nota promedio de los avances aprobados |
| Puntualidad | 20 % | Tareas terminadas antes de su vencimiento |

Si una parte todavía no tiene datos, no cuenta. Cada estudiante ve solo su propio puntaje, y docentes y líderes ven el de todos. Es una guía para el docente, no una nota automática. Los datos son de estudiantes menores de edad, así que conviene acordar con la escuela cómo se usan.

## Puesta en marcha (una sola vez)

### 1. Cargar la base de datos

En [Supabase](https://supabase.com/dashboard), dentro del proyecto, abrí **SQL Editor → New query**. Pegá todo el contenido de `supabase/schema.sql` y tocá **Run**. Se puede volver a correr sin problema cada vez que se actualice el archivo.

### 2. Configurar las direcciones de la web

En **Authentication → URL Configuration**:

- **Site URL:** la dirección donde se publique la plataforma, por ejemplo `https://anobrega-ctrl.github.io/aeroglobetec_web/app/`.
- **Redirect URLs:** agregá esa misma dirección y también `http://localhost:8765/app/` para probar en la compu.

### 3. Login por link al mail (ya funciona)

El login con link mágico funciona sin configurar nada más. El link hay que abrirlo **en el mismo navegador** donde se pidió.

Para poder entrar también desde otro dispositivo (por ejemplo, si el mail se abre en el celular), agregá el código al mail. En **Authentication → Emails → Templates → Magic Link**, sumá esta línea al cuerpo:

```html
<p>O escribí este código en la plataforma: <strong>{{ .Token }}</strong></p>
```

La pantalla de login ya tiene el campo para escribirlo. El servidor de mails que trae Supabase de fábrica manda **muy pocos mails por hora**. Para usarlo con todo el taller, configurá un SMTP propio en **Authentication → Emails → SMTP Settings**, por ejemplo con una cuenta de Gmail con contraseña de aplicación, o con un servicio como Brevo o Resend.

### 4. Login con Google (recomendado)

1. En [Google Cloud Console](https://console.cloud.google.com/), creá un proyecto. Andá a **APIs y servicios → Pantalla de consentimiento de OAuth**. Si la ETec usa Google Workspace, elegí **Interno**: así solo entran cuentas de la escuela.
2. En **Credenciales → Crear credenciales → ID de cliente de OAuth**, elegí **Aplicación web**.
3. En **URIs de redireccionamiento autorizados**, poné `https://rncvkqvpgtvxegvpkvtk.supabase.co/auth/v1/callback`.
4. Copiá el **Client ID** y el **Client Secret**. En Supabase, andá a **Authentication → Sign In / Providers → Google**, pegalos y activá el proveedor.

### 5. Claves

`app/js/config.js` tiene la URL del proyecto y la **publishable key**, que es pública por diseño. La **secret key nunca va en el código**, porque saltea todos los permisos. Si alguna vez se compartió, rotala en **Project Settings → API Keys**.

## Probar en la compu

Desde la carpeta del repo:

```bash
python -m http.server 8765
```

Después abrí:

- `http://localhost:8765/app/`: plataforma real, conectada a Supabase.
- `http://localhost:8765/app/?demo`: **modo demo**, con datos de ejemplo guardados solo en el navegador. Sirve para probar la interfaz sin login. Arriba se puede cambiar de usuario para ver la app como docente, líder o estudiante.

## Publicar

La plataforma es HTML, CSS y JavaScript sin compilación, así que se puede publicar con **GitHub Pages**: en el repo, **Settings → Pages → Deploy from a branch → main / (root)**. Queda en `https://<usuario>.github.io/aeroglobetec_web/app/`. Acordate de cargar esa dirección en el paso 2.

## Cómo está armado

```
app/
  index.html          entrada
  css/app.css         estilos
  js/config.js        URL y clave pública de Supabase
  js/api.js           acceso a datos (Supabase)
  js/demo-api.js      la misma API con datos de ejemplo (modo demo)
  js/ui.js            utilidades: formularios, fechas, avisos
  js/main.js          sesión, menú y rutas
  js/views/           pantallas (inicio, proyecto, usuarios, informe)
  js/views/tabs/      pestañas de cada proyecto
supabase/schema.sql   tablas, permisos (RLS), triggers y funciones de rendimiento
```

Los permisos de verdad los aplica la base de datos con Row Level Security. La interfaz solo esconde los botones que no corresponden.
