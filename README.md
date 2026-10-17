# AeroGlobETec · Web y plataforma de proyectos

Sitio y herramientas del taller AeroGlobETec (ETec · Universidad de Mendoza).

| Ruta | Qué es |
|---|---|
| `index.html` | Sitio público del taller (su contenido se edita desde la plataforma, en **Sitio web**) |
| `assets/` | Imágenes de la web pública (logos, íconos e imagen para compartir el link) |
| `app/` | Plataforma: proyectos, tareas, avances, ensayos, turnos, rendimiento y editor del sitio |
| `app/sitio/editor.html` | Editor de contenidos del sitio público (se abre dentro de la plataforma) |
| `supabase/schema.sql` | Base de datos de la plataforma (tablas, permisos y automatismos) |
| `supabase/textos_sitio_borrador.sql` | Propuesta de textos para la web: los carga como borrador; se revisan y publican desde **Sitio web** |
| `supabase/imagenes_sitio.sql` | Pasa los logos del contenido publicado a los archivos de `assets/`. **Correrlo después de publicar la web nueva.** |
| `supabase/presentacion_dron_rover.sql` | Carga la presentación del proyecto Dron Rover en la plataforma |

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
- **Presentación:** la ficha del proyecto (qué es, misión, organización), con formato simple. La editan docentes y líderes.
- **Tareas:** tablero Kanban (pendiente → en curso → en revisión → hecha). Docentes y líderes las crean y las asignan. Cada estudiante mueve solo las suyas y las manda a revisión. Solo un docente o líder las marca como hechas.
- **Avances:** los estudiantes suben lo que hicieron, con fotos y archivos. Docentes y líderes los aprueban o piden cambios, con nota de 1 a 10 y devolución. Todos pueden comentar y mencionar con `@` a otros integrantes, que reciben un aviso.
- **Hitos:** fechas clave del proyecto, con las tareas asociadas a cada una.
- **Ensayos y fallas:** registro de cada prueba (objetivo, resultado, fotos) y de las fallas encontradas, con gravedad, responsable y cómo se resolvieron. Si un ensayo no sale bien, la app ofrece reportar la falla en el momento.
- **Equipo y áreas:** integrantes del proyecto y áreas (Mecánica, Electrónica, etc.) con sus responsables.
- **Archivos:** CAD, código, fotos y documentación, ordenados por carpeta.
- **Inventario:** componentes, cantidades, precios, estado de compra y responsable, con el presupuesto total.
- **Rendimiento:** puntaje orientativo por estudiante y resumen por área. Ver la fórmula abajo.
- **Bitácora:** historial automático de todo lo que pasa en el proyecto.
- **Informe PDF:** resumen imprimible del proyecto, con ensayos y fallas.
- **Excel:** descarga de tareas, avances, ensayos, fallas, hitos e inventario en un `.xlsx`. Docentes y líderes también reciben la hoja de rendimiento.
- **Notificaciones:** la campanita avisa cuando te asignan una tarea o una falla, te revisan un avance, te comentan o te mencionan.

**Sitio web:** docentes y admins editan textos, apartados, fotos, galerías y colores de la web pública desde la plataforma, con vista previa. Los cambios se guardan como borrador y la web los muestra recién al tocar **Publicar en la web**. La base de datos solo deja guardar, publicar y subir fotos a docentes y admins con sesión iniciada. La web pública lee lo publicado sin login.

**Charlas y competencias:** cada evento (charla o competencia) tiene fecha, lugar, estado, un equipo con roles (expositor/a, equipo técnico, etc.) y los proyectos que se presentan, sean del panel o de afuera. Además:
- **Materiales:** presentaciones, infografías, videos, documentos y enlaces. Los links de Canva, Google Slides/Docs/Drive y YouTube se ven embebidos adentro de la plataforma.
- **Preparación:** lista de tareas con responsable y fecha, que el equipo va tildando.

Los eventos los crean docentes y líderes, y cada uno lo ve solo su equipo. El inicio muestra los próximos.

**Docentes de la web:** en **Sitio web → Docentes** se agregan, ordenan, ocultan o quitan los profes (nombre, cargo, mail, teléfono y foto). La web los muestra al instante, sin publicar.

**Turnos de equipos:** agenda semanal para reservar la impresora 3D, la estación de soldado, el osciloscopio, etc. Cada turno queda a nombre de un proyecto y un área, y la base de datos no deja que dos turnos del mismo equipo se superpongan. Todos ven la agenda completa. Docentes y líderes cargan o desactivan equipos desde el botón **Equipos**.

**App instalable:** en Chrome o Android aparece **📲 Instalar app** en el menú de usuario (o el ícono de instalar en la barra de direcciones). En iPhone se instala desde *Compartir → Agregar a inicio*. Solo funciona con `https` o en `localhost`.

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

- **Site URL:** `https://aeroglobe.wetec.um.edu.ar/app/`
- **Redirect URLs:** `https://aeroglobe.wetec.um.edu.ar/app/` y `http://localhost:8765/app/` (para probar en la compu).

En Google Cloud, en el cliente OAuth, agregá `https://aeroglobe.wetec.um.edu.ar` en **Orígenes autorizados de JavaScript**.

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
3. En **URIs de redireccionamiento autorizados**, poné `https://nveisqekmbcdvnuebice.supabase.co/auth/v1/callback`.
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

La web se publica en el servidor de la escuela: **https://aeroglobe.wetec.um.edu.ar**. No hace falta compilar nada; se suben los archivos tal cual, a la raíz del sitio:

```
index.html     la web pública
assets/        imágenes de la web
app/           la plataforma (queda en /app/)
```

Las carpetas `supabase/` y el `README.md` no hace falta subirlas.

**Importante:** el contenido del editor usa las imágenes de `assets/`, así que esa carpeta siempre tiene que subirse junto con `index.html`.

La app instalable (PWA) y el login necesitan `https`, que el servidor ya tiene.

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
