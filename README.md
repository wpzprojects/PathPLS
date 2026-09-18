# PathPLS — Paso a paso PLS-CADD

Guía interactiva de referencia rápida para el modelado de líneas de transmisión en **PLS-CADD** y **PLS-POLE**: secuencia de pasos del proyecto, rutas de menú, criterios de diseño y un glosario de referencia.

Es una aplicación web estática (sin build ni dependencias de servidor) e instalable como **PWA** (Progressive Web App): puede agregarse a la pantalla de inicio y funciona sin conexión una vez visitada.

## Estructura

```
index.html               Documento principal (contenido de la guía)
css/styles.css           Estilos
js/app.js                Búsqueda, pestañas, acordeón, copiar ruta y visor de imágenes
manifest.webmanifest      Metadatos de instalación PWA
sw.js                     Service worker (caché de app shell + recursos visitados)
assets/icons/             Íconos de la app (192, 512, maskable, favicon, apple-touch-icon)
assets/img/               Capturas de pantalla referenciadas por cada paso
```

## Desarrollo local

No requiere instalación de dependencias. Basta con servir la carpeta con cualquier servidor estático, por ejemplo:

```bash
python3 -m http.server 8080
```

y abrir `http://localhost:8080`. El service worker sólo se registra y funciona correctamente cuando la app se sirve por HTTP(S) (no con `file://`).

## PWA

- **Instalable**: `manifest.webmanifest` define nombre, íconos y modo `standalone`.
- **Offline**: `sw.js` precachea el app shell (HTML, CSS, JS, íconos) en la instalación y cachea bajo demanda (cache-first) las imágenes y páginas visitadas, para que la guía siga disponible sin conexión tras la primera visita.
- Al publicar la app (GitHub Pages, Netlify, etc.) sobre HTTPS, los navegadores compatibles ofrecerán la opción de "Instalar" / "Agregar a pantalla de inicio".

## Origen del contenido

Construido a partir de `PLS 2025-09-08.xlsx`. Las rutas de menú se conservan en inglés, tal como aparecen en el programa.
