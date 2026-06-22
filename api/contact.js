// /api/contact.js
//
// Vercel Serverless Function (Node.js runtime).
// Recibe el envío del formulario de contacto y manda un email con Resend.
//
// Por qué Resend y no SMTP: las funciones serverless de Vercel no sostienen
// bien una conexión SMTP (la conexión se puede cortar apenas la función responde),
// así que Vercel recomienda usar un servicio que envíe por HTTP. Resend es justamente eso.
//
// Variables de entorno necesarias (configurarlas en Vercel → Settings → Environment Variables):
//   RESEND_API_KEY      (obligatoria) — la API key de tu cuenta de Resend.
//   CONTACT_TO_EMAIL     (opcional)    — a qué email llegan los leads. Default: seba@cofund.ar
//   CONTACT_FROM_EMAIL   (opcional)    — remitente del email. Default: Cofund <onboarding@resend.dev>
//                                        (para usar una dirección propia como @cofund.ar hay que
//                                        verificar el dominio en Resend, ver README.md)

const { Resend } = require('resend');

let resendClient = null;
function getResend() {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

const TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'seba@cofund.ar';
const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || 'Cofund <onboarding@resend.dev>';

const MAX_BODY_BYTES = 4.4 * 1024 * 1024; // margen bajo el límite de ~4.5MB de Vercel

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Método no permitido.' });
    return;
  }

  try {
    const body = req.body || {};
    const {
      name,
      company,
      email,
      phone,
      message,
      honeypot,
      fileName,
      fileType,
      fileBase64,
    } = body;

    // Anti-spam silencioso: si el campo trampa viene relleno, es un bot.
    // Respondemos "ok" para no darle pistas, pero no enviamos nada.
    if (honeypot) {
      res.status(200).json({ ok: true });
      return;
    }

    if (!name || !email || !message) {
      res.status(400).json({ ok: false, error: 'Faltan campos obligatorios.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email))) {
      res.status(400).json({ ok: false, error: 'El email no es válido.' });
      return;
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('Falta la variable de entorno RESEND_API_KEY.');
      res.status(500).json({
        ok: false,
        error: 'El formulario todavía no está conectado del lado del servidor.',
      });
      return;
    }

    // Chequeo defensivo de tamaño total del payload (el adjunto en base64 pesa ~33% más que el archivo original)
    const approxSize = JSON.stringify(body).length;
    if (approxSize > MAX_BODY_BYTES) {
      res.status(413).json({
        ok: false,
        error: 'El archivo adjunto es demasiado pesado. Probá con uno de hasta 3MB.',
      });
      return;
    }

    const html = `
      <div style="font-family:sans-serif;font-size:15px;color:#0A1628;line-height:1.6">
        <h2 style="margin:0 0 16px">Nuevo proyecto desde cofund.ar</h2>
        <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
        <p><strong>Empresa:</strong> ${escapeHtml(company || '—')}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Teléfono:</strong> ${escapeHtml(phone || '—')}</p>
        <p><strong>Proyecto:</strong><br>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
      </div>
    `;

    const attachments = [];
    if (fileBase64 && fileName) {
      attachments.push({
        filename: fileName,
        content: fileBase64,
      });
    }

    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      reply_to: email,
      subject: `Nuevo proyecto: ${name}${company ? ' — ' + company : ''}`,
      html,
      attachments: attachments.length ? attachments : undefined,
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      res.status(502).json({
        ok: false,
        error: 'No pudimos enviar el mensaje. Probá de nuevo en un momento.',
      });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact function error:', err);
    res.status(500).json({ ok: false, error: 'Error interno. Intentá de nuevo más tarde.' });
  }
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
