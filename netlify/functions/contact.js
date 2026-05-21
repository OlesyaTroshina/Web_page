const { handleContactRequest, corsHeaders } = require('../../api/contact-handler');

exports.handler = async function (event) {
  var origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
  var headers = corsHeaders(origin, process.env);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: headers,
      body: JSON.stringify({ ok: false, error: 'method_not_allowed' })
    };
  }

  var body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (e) {
    return {
      statusCode: 400,
      headers: headers,
      body: JSON.stringify({ ok: false, error: 'invalid_body' })
    };
  }

  try {
    var result = await handleContactRequest(body, process.env);
    return {
      statusCode: result.status,
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
      body: JSON.stringify({ ok: result.ok, error: result.error || null })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
      body: JSON.stringify({ ok: false, error: 'server_error' })
    };
  }
};
