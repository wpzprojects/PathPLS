# PathPLS — Guía interactiva PLS-CADD / PLS-POLE

Guía de referencia rápida para el modelado de líneas de transmisión en **PLS-CADD** y **PLS-POLE**: secuencia de pasos del proyecto con sus rutas de menú y capturas, comandos de uso diario, glosario y el flujo de trabajo recomendado por Power Line Systems.

Es una aplicación web estática (sin build ni backend propio) e instalable como **PWA**: puede agregarse a la pantalla de inicio y sigue disponible sin conexión una vez visitada.

Publicada en <https://wpzprojects.github.io/PathPLS/> (repo `wpzprojects/PathPLS`, rama `main`).

## Qué contiene la app

Seis pestañas:

| Pestaña | Contenido |
|---|---|
| **PLS-CADD** | Secuencia principal del proyecto, paso a paso |
| **Otras acciones** | Comandos sueltos de uso diario (mediciones, marcadores, puntos de terreno…) |
| **PLS-POLE** | Modelado de estructuras: configuración, biblioteca de componentes y geometría |
| **De interés** | Enlaces a bases de datos de PLS, glosario, extensiones de archivo y conversiones de unidades |
| **Workflow** | Visor del PDF *Proposed workflow for PLS-CADD* (19 láminas, Power Line Systems), con zoom hasta 800% |
| **Ayuda** | Resumen de cada sección, copia de seguridad y contacto |

Cada paso muestra su ruta de menú (con botón para copiarla), un comentario y, cuando aplica, capturas que se amplían en un visor. Hay búsqueda global (atajo `/`) y tema claro/oscuro.

**Copia de seguridad** (pestaña Ayuda): descarga `steps.json` tal cual (`.json`, para restaurar) o una versión legible en Excel (`.xlsx`, una hoja por panel con las capturas incrustadas).

## Estructura

```
index.html                  Página pública (pestañas, tarjetas, visores)
admin.html                  Editor de contenido
css/styles.css              Estilos compartidos (tokens --variables, tema claro/oscuro)
js/app.js                   Lógica pública: tabs, búsqueda, acordeón, lightbox, respaldo, visor de PDF
js/admin.js                 Lógica del editor
js/vendor/                  ExcelJS y PDF.js (locales, cargados bajo demanda)
steps.json                  Fuente de datos de los paneles PLS-CADD, Otras acciones y PLS-POLE
manifest.webmanifest        Metadatos de instalación PWA
sw.js                       Service worker
assets/icons/               Íconos de la app
assets/img/                 Capturas referenciadas por los pasos
assets/docs/                PDF del panel Workflow
Recursos/                   Material de origen (no forma parte de la app)
CLAUDE.md                   Notas técnicas detalladas del proyecto
```

### Datos: `steps.json`

```json
{ "plscadd": [ { "title": "", "desc": "", "steps": [
    { "title": "", "sub": "", "route": { "copy": "", "lines": [ { "alt": "", "segments": [] } ] },
      "comment": "", "commentList": [], "images": ["assets/img/..."] } ] } ],
  "otras": [], "plspole": [] }
```

`route` puede ser `null`. `comment` (texto) y `commentList` (viñetas) son excluyentes. Las rutas de menú se conservan en inglés, tal como aparecen en el programa.

## Editar el contenido (admin)

Se entra desde el ícono de sliders al final de la pestaña **Ayuda**. El editor lee y escribe `steps.json` directamente en GitHub mediante su API REST:

1. Pega tu token personal de GitHub (permiso `repo`); se guarda solo en el `localStorage` de tu navegador.
2. **Cargar desde GitHub** trae el contenido; **Guardar en GitHub** publica los cambios (si hay conflicto, recarga y reaplica).
3. Puedes agregar, mover y eliminar grupos y pasos, y subir imágenes por botón, arrastrando o pegando (Ctrl+V). Las imágenes se suben a `assets/img/`.

La clave de la entrada a admin es solo un filtro visual. La seguridad real de escritura es el token de GitHub de cada usuario.

## Desarrollo local

No requiere instalar dependencias. Basta con servir la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 8080
```

y abrir `http://localhost:8080`. El service worker solo funciona sobre HTTP(S), no con `file://`. Si el navegador sirve JS viejo, agrega `?v=algo` a la URL o desregistra el service worker.

No hay tests; la verificación es manual en el navegador.

## PWA y modo sin conexión

- **Instalable**: `manifest.webmanifest` define nombre, íconos y modo `standalone`.
- **Red primero**: para navegaciones y para todo `.html`, `.js`, `.css` y `.json`, el service worker pide primero a la red y guarda copia; el caché solo se usa como respaldo sin conexión. Así, con red, nunca se ve una versión vieja de la app ni del contenido.
- **Caché primero**: solo para íconos e imágenes, que se guardan bajo demanda.
- En la instalación se precachea el app shell (`index.html`, CSS, `app.js`, `steps.json`, manifest e íconos).
- Al cambiar los archivos precacheados en la instalación (por ejemplo los íconos), subir `CACHE_VERSION` en `sw.js`.

## Origen del contenido

Construido a partir de `PLS 2025-09-08.xlsx`. El PDF de la pestaña Workflow es material de Power Line Systems.
