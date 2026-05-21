/**
 * Общая логика отправки заявки в Telegram (Vercel / Netlify).
 */
function escapeTelegram(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildTelegramText(payload) {
  var lines = ['<b>Заявка с сайта «Сладость в радость»</b>', ''];
  if (payload.phone) lines.push('<b>Телефон:</b> ' + escapeTelegram(payload.phone));
  if (payload.email) lines.push('<b>Почта:</b> ' + escapeTelegram(payload.email));
  if (payload.message) {
    lines.push('');
    lines.push('<b>Сообщение:</b>');
    lines.push(escapeTelegram(payload.message));
  }
  lines.push('');
  lines.push('<i>Согласие на обработку ПДн: да</i>');
  return lines.join('\n');
}

function validatePayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'invalid_body' };
  }
  if (body._gotcha) {
    return { ok: false, status: 400, error: 'spam' };
  }

  var phone = String(body.phone || '').trim();
  var email = String(body.email || '').trim();
  var message = String(body.message || '').trim();
  var consent = !!body.consent;

  if (!phone && !email) {
    return { ok: false, status: 400, error: 'contact_required' };
  }
  if (phone) {
    var digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      return { ok: false, status: 400, error: 'phone_invalid' };
    }
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, status: 400, error: 'email_invalid' };
  }
  if (!consent) {
    return { ok: false, status: 400, error: 'consent_required' };
  }
  if (message.length > 4000) {
    return { ok: false, status: 400, error: 'message_too_long' };
  }

  return {
    ok: true,
    payload: { phone: phone, email: email, message: message, consent: consent }
  };
}

async function sendToTelegram(token, chatId, text) {
  var res = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });
  var data = await res.json().catch(function () {
    return {};
  });
  if (!res.ok || !data.ok) {
    return { ok: false, status: 502, error: 'telegram_failed' };
  }
  return { ok: true, status: 200 };
}

async function handleContactRequest(body, env) {
  var token = env.TELEGRAM_BOT_TOKEN;
  var chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return { ok: false, status: 503, error: 'not_configured' };
  }

  var validated = validatePayload(body);
  if (!validated.ok) return validated;

  var text = buildTelegramText(validated.payload);
  return sendToTelegram(token, chatId, text);
}

function corsHeaders(origin, env) {
  var allowed = env.ALLOWED_ORIGIN || '*';
  var value = allowed === '*' ? '*' : allowed;
  if (allowed !== '*' && origin && origin !== allowed) {
    value = allowed;
  }
  return {
    'Access-Control-Allow-Origin': value,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

module.exports = {
  handleContactRequest: handleContactRequest,
  corsHeaders: corsHeaders,
  validatePayload: validatePayload
};
