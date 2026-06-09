# Bing Webmaster Tools — Setup paso a paso

Objetivo: verificar la propiedad de `https://hablah.com.ar` en Bing Webmaster Tools y enviar el sitemap para que Bing (y por extensión Yahoo, DuckDuckGo, ChatGPT search, Copilot) indexe el sitio.

## Estado actual

- `frontend/index.html` ya tiene la meta tag de Bing con un TOKEN PLACEHOLDER:
  ```html
  <meta name="msvalidate.01" content="PLACEHOLDER-REEMPLAZAR-CON-TOKEN-DE-BING" />
  ```
- Está justo debajo de la meta de Google verification (`google-site-verification`).
- Falta: obtener el token real de Bing y reemplazar el placeholder.

## Pasos

### 1. Ir a Bing Webmaster Tools
- URL: https://www.bing.com/webmasters
- Loguearse con cuenta Microsoft (la misma que usás para Outlook / Live / GitHub si está conectada).

### 2. Add a site
- Click en **Add a site** (o **Agregar sitio**).
- Ingresar: `https://hablah.com.ar`
- Opcional: importar desde Google Search Console si ya está conectado (atajo, evita los siguientes pasos de verificación).

### 3. Elegir método de verificación: HTML Meta Tag
- Bing ofrece 3 métodos:
  - XML file
  - **HTML Meta Tag** ← elegir este
  - CNAME (DNS)
- Al elegir HTML Meta Tag, Bing muestra una línea tipo:
  ```html
  <meta name="msvalidate.01" content="A1B2C3D4E5F6...XYZ" />
  ```

### 4. Copiar el token
- El token es el valor de `content="..."`. Ejemplo: `A1B2C3D4E5F6...XYZ`.
- **Solo el token**, no la etiqueta entera.

### 5. Pegarlo en index.html
- Archivo: `frontend/index.html`
- Línea: 7 (debajo de `google-site-verification`)
- Reemplazar:
  ```html
  <meta name="msvalidate.01" content="PLACEHOLDER-REEMPLAZAR-CON-TOKEN-DE-BING" />
  ```
  por:
  ```html
  <meta name="msvalidate.01" content="A1B2C3D4E5F6...XYZ" />
  ```
- Borrar el comentario `<!-- TODO: pegar token real... -->` si querés dejarlo limpio.

### 6. Commit + deploy
```bash
git add frontend/index.html
git commit -m "feat(seo): add Bing Webmaster Tools verification meta"
git push origin main
# Netlify NO auto-deploya. Forzar deploy del frontend:
netlify deploy --prod --dir=frontend/dist
# (o el comando habitual del proyecto si difiere)
```

Esperar a que Netlify termine el deploy y verificar en el browser:
```bash
curl -s https://hablah.com.ar/ | grep msvalidate
```
Tiene que devolver la línea con el token real.

### 7. Verify en Bing
- Volver a la pestaña de Bing Webmaster Tools.
- Apretar el botón **Verify**.
- Si el deploy ya está propagado, Bing confirma la verificación en segundos.
- Si falla: esperar 1–2 minutos por cache de CDN y reintentar.

### 8. Add sitemap
- En el panel del sitio verificado, ir a **Sitemaps**.
- Click en **Submit sitemap**.
- Ingresar: `https://hablah.com.ar/sitemap.xml`
- Bing acepta el envío y empieza a procesarlo (puede tardar varias horas / días en aparecer en index).

### 9. (Opcional) Configuración extra recomendada
- **URL Inspection**: enviar manualmente la home y rutas clave para acelerar el primer crawl.
- **Geo-targeting**: marcar Argentina / Latinoamérica como mercado primario.
- **Crawl Control**: dejar el default salvo que veamos problemas.
- **IndexNow**: activar IndexNow API key — empuja URLs nuevas a Bing en tiempo real (también lo consumen Yandex y otros). Cuando se active, agregar la key file al root del sitio.

## Validación final

Después de verificar y enviar sitemap, chequear en 24–48hs:
- Bing Webmaster Tools → **Site Explorer** debería mostrar URLs descubiertas.
- Búsqueda manual: `site:hablah.com.ar` en https://www.bing.com — al principio puede estar vacío, esperar.

## Notas

- El token de Bing es público (queda en el HTML de prod). No es un secreto, no rotarlo a menos que se reasigne propiedad.
- No borrar la meta tag después de verificar: Bing re-chequea periódicamente.
- Si en algún momento se migra el dominio o se rehace el HTML, mantener esta meta tag.
