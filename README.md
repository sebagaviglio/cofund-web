# Cofund — sitio + formulario de contacto

Sitio de una sola página para Cofund, con un formulario de contacto que
manda un email real usando una Vercel Function + Resend.

## Estructura

```
index.html        → el sitio completo (HTML + CSS + JS en un solo archivo)
api/contact.js     → función serverless que recibe el formulario y envía el email
package.json       → dependencia de Resend
.env.example       → variables de entorno necesarias
```

## Cómo queda funcionando

```
Formulario (index.html)
      ↓  POST fetch('/api/contact')
api/contact.js  (Vercel Function)
      ↓
Resend API  →  llega un email a tu casilla
```

No hay base de datos ni backend tradicional: Vercel ejecuta `api/contact.js`
como una función bajo demanda cada vez que alguien envía el formulario.

## Puesta en marcha (una sola vez)

### 1. Crear cuenta en Resend
Entrá a [resend.com](https://resend.com), creá una cuenta gratis (no pide tarjeta)
y generá una **API Key** desde el dashboard. Vas a obtener algo como `re_xxxxxxxx...`.

Con la cuenta recién creada, **ya podés enviar emails** usando el remitente de
prueba `onboarding@resend.dev` — no hace falta verificar nada todavía para que
el formulario funcione y los leads te lleguen por mail.

*(Opcional, para más adelante: si querés que el remitente visible sea algo
como `formulario@cofund.ar` en lugar de `@resend.dev`, hay que verificar el
dominio cofund.ar dentro de Resend — Settings → Domains. No es necesario para
que el formulario ande.)*

### 2. Subir este proyecto a GitHub
```bash
git init
git add .
git commit -m "Sitio Cofund con formulario funcional"
git branch -M main
git remote add origin https://github.com/tu-usuario/cofund-web.git
git push -u origin main
```

### 3. Importar el repo en Vercel
En [vercel.com/new](https://vercel.com/new), elegí el repositorio. Como no
hay ningún framework (es HTML simple + una función), Vercel lo va a detectar
como **"Other"** — no toques el Build Command ni el Output Directory, dejalos
en blanco/default.

### 4. Configurar las variables de entorno
Antes de hacer deploy (o después, y volver a desplegar), en
**Settings → Environment Variables** agregá:

| Variable | Valor |
|---|---|
| `RESEND_API_KEY` | la que generaste en el paso 1 |
| `CONTACT_TO_EMAIL` | *(opcional)* tu email, si no querés que use `seba@cofund.ar` por default |
| `CONTACT_FROM_EMAIL` | *(opcional)* dejalo como está hasta que verifiques el dominio |

### 5. Deploy
Si ya habías importado el repo antes de poner las variables, hacé un
**Redeploy** para que la función las tome. Listo — entrá a tu URL de Vercel
y probá el formulario.

## Probarlo en tu máquina antes de subirlo (opcional)

Abrir `index.html` haciendo doble clic **no** va a hacer funcionar el
formulario, porque `/api/contact` solo existe corrido por Vercel. Para
probarlo en local:

```bash
npm install -g vercel
vercel dev
```

La primera vez te va a pedir loguearte y vincular el proyecto. Copiá
`.env.example` como `.env.local` y completá tu `RESEND_API_KEY` ahí.

## Anti-spam

El formulario tiene un campo "honeypot" invisible (`_gotcha`). Si un bot lo
completa (los humanos nunca lo ven), el servidor responde como si todo
estuviera bien pero no manda el email. No requiere ningún captcha visible.

## Favicon e imagen para compartir (Open Graph)

Estos archivos van sueltos en la raíz del repo, al lado de `index.html`:

```
favicon.ico            → ícono clásico (multi-tamaño 16/32/48)
favicon-32x32.png      → ícono para navegadores modernos
apple-touch-icon.png   → ícono cuando alguien "agrega a inicio" en iOS
icon-192.png           → ícono para Android/Chrome
og-image.png           → la imagen que se ve al compartir el link (1200x630)
```

`index.html` ya los referencia en el `<head>` con rutas absolutas (`/favicon.ico`,
etc.), así que simplemente con subir estos archivos a la raíz del repo y hacer
push, Vercel los sirve automáticamente en esas rutas.

Las redes sociales (WhatsApp, Facebook, LinkedIn, Twitter/X) necesitan que
`og-image.png` esté en una URL pública real — por eso las metaetiquetas usan
`https://cofund.ar/og-image.png` en vez de una ruta relativa. Si en algún
momento cambiás de dominio, hay que actualizar esa URL en el `<head>` de
`index.html` (buscá `cofund.ar` y reemplazalo).

**Importante:** las redes sociales cachean la preview del link. Si actualizás
`og-image.png` más adelante y no se ve el cambio, usá el
[Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) o el
[Twitter Card Validator](https://cards-dev.twitter.com/validator) y pegá tu
URL — tienen un botón para forzar que vuelvan a buscar la imagen.

## Límite de archivo adjunto

El campo de "adjuntar presentación" acepta hasta **3MB**. Es a propósito:
las funciones de Vercel tienen un límite de tamaño de request (~4.5MB) y el
archivo viaja codificado en base64, que pesa ~33% más que el original.

## Si el formulario tira error después de publicado

- Revisá los **Logs** de la función en el dashboard de Vercel (Project →
  Deployments → la función `api/contact`) — ahí se ve el motivo exacto.
- La causa más común es que falte la variable `RESEND_API_KEY` en producción,
  o que esté mal copiada.
