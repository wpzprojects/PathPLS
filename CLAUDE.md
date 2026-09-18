# PathPLS — Guía interactiva PLS-CADD / PLS-POLE

App web estática (sin build, sin dependencias de servidor), instalable como PWA. Sirve como guía paso a paso de referencia rápida para el modelado de líneas de transmisión en PLS-CADD y PLS-POLE. Publicada en `https://wpzprojects.github.io/PathPLS/` (repo `wpzprojects/PathPLS`, rama `main`).

## Estructura

- `index.html` — página pública: buscador, pestañas (PLS-CADD / Otras acciones / PLS-POLE / De interés / Ayuda), tarjetas de pasos con acordeón, lightbox de imágenes. Los paneles "De interés" y "Ayuda" (resumen por sección, tarjeta "Copia de seguridad" y tarjeta de contacto) están *hardcodeados* aquí. El botón de entrada a admin (ícono de sliders, clave `pls`, ver `js/app.js`) vive al final del panel "Ayuda".
- `admin.html` + `js/admin.js` — editor de contenido (sin auth real más allá del gate cosmético). Lee/escribe `steps.json` en GitHub vía API REST. El repo destino va fijo en constantes (`GH_OWNER/GH_REPO/GH_BRANCH/GH_PATH` en `admin.js`); el único campo de conexión editable es el token personal ("repo"), guardado en `localStorage` (evento `input`, no `change`) y nunca enviado a otro sitio.
- `js/app.js` — lógica pública: tema claro/oscuro (clave `pls-theme` en localStorage), tabs, búsqueda/filtro, acordeón, copiar ruta, lightbox, copia de seguridad (Ayuda: `.json` = `steps.json` tal cual; `.xlsx` = una hoja por panel con capturas incrustadas, ~2 MB), render dinámico de tarjetas desde `steps.json` (solo paneles `plscadd`, `otras`, `plspole`).
- `js/vendor/exceljs.min.js` — ExcelJS 4.4.0 local, cargado bajo demanda solo al pulsar "Versión legible (.xlsx)" (no afecta la carga normal).
- `css/styles.css` — estilos compartidos con tokens `--variables`; tema claro por defecto, oscuro vía `@media (prefers-color-scheme)` o `[data-theme="dark"]`.
- `steps.json` — fuente de datos: `{ plscadd, otras, plspole }`, cada uno array de grupos `{ title, desc, steps }`; step: `{ title, sub, route, comment, commentList, images }`.
  - `route`: `null` o `{ copy, lines: [{ alt, segments }] }`. `comment` (string) o `commentList` (viñetas), excluyentes. `images`: rutas relativas `assets/img/...`.
- `manifest.webmanifest` + `sw.js` — PWA. Estrategia: **red primero** (caché solo como respaldo offline) para navegaciones y todo `.html/.js/.css/.json`; caché primero solo para íconos/imágenes. Subir `CACHE_VERSION` cuando cambien archivos del app shell cacheados en install (íconos).
- `assets/icons/` (fondo verde `#1E4034`), `assets/img/` (capturas de pasos).

## admin.html — cómo funciona el editor

1. "Cargar desde GitHub" trae `steps.json` (+ `sha`); "Guardar en GitHub" hace PUT con ese `sha` (409 = conflicto, recargar).
2. Grupos y pasos: mover ▲▼, eliminar (doble clic de confirmación con clase `confirming`, **sin diálogos nativos**), insertar entre pasos con el "+" circular; el final de cada grupo usa ese mismo "+" (ya no hay botón de texto). La tarjeta nueva entra deslizándose desde la izquierda (`markEntering` + `@keyframes stepIn`). Campos con `data-field` parseados con `parseRouteText/routeToText`, `parseCommentText/commentToText`.
3. **Imágenes por paso**: un solo widget `.admin-images` (alto fijo 55px) con miniaturas + botón "+". Subir por botón, arrastrar un archivo al campo, o pegar (Ctrl+V) → sube a `assets/img/` vía API y agrega la ruta. Al pasar sobre una miniatura aparece "×" (doble clic para borrar); doble clic en la miniatura la abre ampliada (visor `#lb`, mismos estilos que la guía). Arrastrar miniaturas reordena en vivo (FLIP, `dragThumb`/`thumbFlip`/`commitThumbOrder`; identidad por `data-path`). Las recién subidas se muestran con `URL.createObjectURL` (`localPreviews`) porque la ruta remota tarda en existir en Pages. No hay edición manual de rutas de imagen.
4. Cada grupo/step lleva un `_cid` temporal (animaciones FLIP); se agrega al cargar y se quita con `stripCids` antes de guardar — nunca debe llegar a `steps.json`.

## Sistema visual de admin (todo en el `<style>` de `admin.html`)

- Tokens por tema (claro en `:root`, oscuro en los dos bloques dark): `--group-bg/-border`, `--group-top-bg` (relleno verde del encabezado de grupo `.admin-group-top`), `--step-bg/-border` (en claro `--step-bg` = `--ground`), `--card-shadow`, `--field-bg`, `--step-field-bg` (campos dentro del paso: blanco en claro, igual a `--step-bg` en oscuro), `--btn-*` / `--btn-hover-*` (botones de acción: verde oscuro `--accent-ink` en claro, gris neutro en oscuro), `--move-*` (flechas ▲▼: verde en claro, gris en oscuro).
- Tema oscuro usa una paleta gris neutra (sobrescribe `--surface*`, `--line*`, `--ink*`) solo dentro de admin; el verde queda para acentos. El fondo de página (`--ground`) no se toca.
- "Eliminar" solo se pone rojo (`.confirming`) al confirmar. Ojo con la especificidad: `.admin-move button` (0,1,1) le gana a `.admin-danger`; por eso existen reglas `.admin-move .admin-danger…`.
- `--group-bg` oscuro = `#424242`. La zona del "+" (`.admin-insert-zone`) tiene `margin:9px 0`.
- El "+" de insertar entre pasos es verde en reposo y se invierte (relleno verde, "+" blanco) en hover.
- Línea divisoria grupo/pasos: `border-top` de `.admin-steps` con márgenes negativos (-18px) para llegar de borde a borde; el espaciado sobre/bajo la línea se calibró empíricamente (~16.9px).

## Convenciones

- JS: IIFEs, `var`, sin frameworks ni módulos, ES5-friendly. Sin comentarios salvo donde el porqué no es obvio.
- Sin tests; verificación manual en navegador. Para probar admin sin token real, se puede sobrescribir `window.fetch` para simular la API de GitHub.
- Al probar en local, el caché HTTP del navegador puede servir JS viejo: usar `?v=algo` en la URL o desregistrar el SW.
- Los experimentos de diseño se suben como commit aparte (fácil de revertir) y se validan en la app publicada.
- Tipografía/estilo de íconos: trazo fino monocolor con `currentColor`; evitar composiciones recargadas.

## Notas de seguridad

- El gate de admin (clave `pls`, campo de texto plano a propósito para que Chrome no lo mezcle con el token en su gestor de contraseñas) no es seguridad real: la clave está visible en `js/app.js`.
- La seguridad real de escritura es el token de GitHub de cada usuario en `localStorage`. No hay backend propio.
