const { handleContactRequest, corsHeaders } = require('./contact-handler');

module.exports = async function handler(req, res) {
  var origin = req.headers.origin || '';
  var headers = corsHeaders(origin, process.env);

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', headers['Access-Control-Allow-Origin']);
    res.setHeader('Access-Control-Allow-Methods', headers['Access-Control-Allow-Methods']);
    res.setHeader('Access-Control-Allow-Headers', headers['Access-Control-Allow-Headers']);
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).set(headers).json({ ok: false, error: 'method_not_allowed' });
  }

  try {
    var result = await handleContactRequest(req.body || {}, process.env);
    return res.status(result.status).set(headers).json({
      ok: result.ok,
      error: result.error || null
    });
  } catch (e) {
    return res.status(500).set(headers).json({ ok: false, error: 'server_error' });
  }
};
