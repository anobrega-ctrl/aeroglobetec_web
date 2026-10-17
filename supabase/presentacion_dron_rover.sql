-- =====================================================================
-- Presentación del proyecto Dron Rover (lo que antes era rover-cate-2027.html).
-- Se carga en el proyecto cuyo nombre contenga "rover". Si todavía no existe,
-- crealo desde la plataforma y después corré este archivo, o pegá el texto
-- en Proyecto → Presentación → Escribir presentación.
-- =====================================================================

update public.projects
set presentation = $md$
# Dron Rover · CATE 2027

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
$md$
where name ilike '%rover%';
