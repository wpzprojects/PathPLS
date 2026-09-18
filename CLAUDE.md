# PathPLS — Guía interactiva PLS-CADD / PLS-POLE

App web estática (sin build, sin dependencias de servidor), instalable como PWA. Sirve como guía paso a paso de referencia rápida para el modelado de líneas de transmisión en PLS-CADD y PLS-POLE.

## Estructura

- `index.html` — página pública: buscador, pestañas (PLS-CADD / Otras acciones / PLS-POLE / De interés), tarjetas de pasos con acordeón, lightbox de imágenes, engranaje oculto para entrar a admin (clave `pls`, ver `js/app.js`).
- `admin.html` + `js/admin.js` — editor de contenido protegido (sin auth real más allá del gate cosmético en index). Lee/escribe `steps.json` directamente en GitHub vía API REST (token personal con permiso "repo" guardado en `localStorage`, nunca se envía a otro sitio).
- `js/app.js` — lógica de la página pública: tema claro/oscuro, tabs, búsqueda/filtro, acordeón de pasos, copiar ruta de menú, lightbox, y el render dinámico de las tarjetas a partir de `steps.json`.
- `css/styles.css` — todos los estilos (tokens de color con `--variables`, tema claro/oscuro vía `[data-theme]`).
- `steps.json` — fuente de datos única. Estructura: `{ plscadd: [...], otras: [...], plspole: [...] }`, cada panel es un array de grupos `{ title, desc, steps: [...] }`, cada step: `{ title, sub, route, comment, commentList, images }`.
  - `route`: `null` o `{ copy, lines: [{ alt, segments: [...] }] }` — rutas de menú tipo `File > New > PLSCADD`, con posible variante alterna (`alt: true`, prefijo "o ").
  - `comment` (string) o `commentList` (array, se renderiza como viñetas) — mutuamente excluyentes.
  - `images`: array de rutas relativas (`assets/img/...`).
  - El panel "De interés" (glosario, extensiones de archivo, conversiones) está *hardcodeado* en `index.html`, no viene de `steps.json`.
- `manifest.webmanifest` + `sw.js` — PWA: precache de app shell, cache-first para imágenes/páginas visitadas.
- `assets/icons/`, `assets/img/` — íconos de la app y capturas de pantalla de cada paso.

## Cómo se edita el contenido

El flujo normal es vía `admin.html`:
1. Se carga `steps.json` desde GitHub (token + owner/repo/branch/path, con defaults `wpzprojects/PathPLS/main/steps.json`).
2. Se edita en el navegador (grupos y pasos con mover/eliminar/insertar, campos con `data-field` que se parsean/formatean con helpers en `admin.js`: `parseRouteText`/`routeToText`, `parseCommentText`/`commentToText`, `parseImagesText`/`imagesToText`).
3. Imágenes: se pueden subir por input de archivo o pegar (Ctrl+V) directamente en el campo de imágenes; se suben a `assets/img/` vía la API de contenidos de GitHub y se añade la ruta al step.
4. Se guarda con "Guardar en GitHub" (PUT a la API con el `sha` cargado; detecta conflicto 409 si alguien más guardó primero).
5. Cada grupo/step tiene un `_cid` interno (id temporal para animaciones FLIP y tracking en el DOM) que se agrega al cargar y se elimina (`stripCids`) antes de guardar — nunca debe persistirse en `steps.json`.

No hay build ni bundler: los cambios en `.html`/`.js`/`.css` se ven directo recargando el navegador. Para desarrollo local con service worker funcional, servir con HTTP (no `file://`), p. ej. `python3 -m http.server 8080`.

## Convenciones de estilo

- JS: IIFEs `(function () { ... })()`, `var`, sin frameworks ni módulos, ES5-friendly con algo de ES6 (`TextEncoder`, arrow-free).
- Sin comentarios explicativos salvo donde el comportamiento no es obvio (ver estilo actual en `app.js`/`admin.js`).
- CSS con variables custom (`--surface`, `--ink`, `--accent`, `--line`, etc.) para soportar tema claro/oscuro; en admin, tarjetas/steps usan `color-mix()` para tonos derivados del fondo.
- Sin frameworks de testing; verificación es manual en navegador (recargar `index.html`/`admin.html`).

## Notas de seguridad

- El "gate" de admin en `index.html` (clave `pls`) es solo para evitar clics accidentales, no es seguridad real — cualquiera con el HTML puede ver la clave.
- La seguridad real de escritura depende del token de GitHub que cada usuario pega en `admin.html`; se persiste en `localStorage` del navegador. No hay backend propio.
