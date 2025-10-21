export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    // Debug: log basic request metadata to help diagnose parsing/routing issues
    console.log('twilio proxy - incoming', { method: req.method, url: req.url, headers: req.headers && typeof req.headers === 'object' ? { 'content-type': req.headers['content-type'] || req.headers['Content-Type'] } : req.headers });
    // Support both GET phone lookups and POST identity match requests
    const method = req.method;

    // Helper: parse response as JSON, but include text in logs/error when parsing fails
  async function parseJsonSafe(response, opts = {}) {
      // Read text body first so we can always log and include it in errors
      let text = '';
      try {
        text = await response.text();
      } catch (xx) {
        text = '<unable to read body>';
      }

      const short = text && text.length > 1000 ? text.slice(0,1000) + '...(truncated)' : text;
      // If empty body, return an empty object to avoid JSON parse errors
      if (!text || !String(text).trim()) {
        console.warn('twilio proxy - upstream returned empty body', { status: response.status });
        return {};
      }

      try {
        return JSON.parse(text);
      } catch (e) {
        console.error('twilio proxy - non-json response', { status: response.status, text: short });
        if (opts.debug) {
          // return debug object instead of throwing so caller can inspect upstream body
          return { __debug_raw: text, __debug_status: response.status };
        }
        throw new Error(`Invalid JSON from upstream (status ${response.status}): ${short}`);
      }
    }

    // Twilio Lookup v1 phone lookup (GET)
    if (method === 'GET') {
      const rawPhone = req.query.phone ? String(req.query.phone) : '';
      const phone = rawPhone.replace(/\D/g, '');

      if (!phone) {
        return res.status(400).json({ error: 'Missing required parameter: phone' });
      }

      // Twilio credentials from environment (do not expose to client)
      const accountSid = process.env.TWILIO_SID;
      const authToken = process.env.TWILIO_TOKEN;

      if (!accountSid || !authToken) {
        return res.status(400).json({ error: 'Twilio credentials not configured on server. Set TWILIO_SID and TWILIO_TOKEN.' });
      }

      // Normalize to E.164
      let phoneE164;
      if (req.query.phone && String(req.query.phone).trim().startsWith('+')) {
        phoneE164 = String(req.query.phone).trim();
      } else if (phone.length === 10) {
        phoneE164 = `+1${phone}`;
      } else if (phone.length === 11 && phone.startsWith('1')) {
        phoneE164 = `+${phone}`;
      } else {
        phoneE164 = `+${phone}`;
      }

      const url = `https://lookups.twilio.com/v1/PhoneNumbers/${encodeURIComponent(phoneE164)}?Type=carrier`;

      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json'
        }
      });

      const upstreamText = await response.text().catch(() => '');
      console.log('twilio proxy - v1 carrier lookup response:', { status: response.status, body: upstreamText.slice(0, 500) });
      try {
        const parsed = upstreamText && String(upstreamText).trim() ? JSON.parse(upstreamText) : {};
        return res.status(response.status).json(parsed);
      } catch (e) {
        if (req.query && req.query._debug) return res.status(response.status).json({ __debug_raw: upstreamText, __debug_status: response.status });
        return res.status(response.status).json({ error: upstreamText || 'Upstream non-JSON', status: response.status });
      }
    }

    // Twilio Lookup v2 Identity Match (POST)
    if (method === 'POST') {
      // Expect JSON body with fields: at minimum phone; optional action: 'identity'|'caller_name'|'sms_pumping'
      let body;
      // Accessing req.body can throw inside some dev servers if the JSON is malformed.
      try {
        body = req.body;
        console.log('twilio proxy - raw body type:', typeof req.body);
      } catch (e) {
        console.warn('twilio proxy - req.body access threw, falling back to raw stream read:', e.message);
        // Read raw request body from the stream and attempt to parse
        body = await new Promise((resolve) => {
          let chunks = [];
          req.on('data', (c) => chunks.push(c));
          req.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            try { resolve(JSON.parse(raw)); } catch (_) { resolve(raw); }
          });
          // in case there's no body
          req.on('error', () => resolve(''));
        });
      }
      // If runtime provided a rawBody buffer (some dev servers), log a small sample
      try {
        if (req.rawBody) console.log('twilio proxy - rawBody sample:', String(req.rawBody).slice(0,200));
      } catch (xx) {}

      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          console.warn('twilio proxy - failed to parse body as JSON, attempting regex extraction', e.message);
          const rawStr = body;
          // Attempt to extract phone digits and action from the raw string as a best-effort fallback
          const phoneMatch = rawStr.match(/(\+?1?\d{10})|\d{10}/);
          const actionMatch = rawStr.match(/"action"\s*[:=]\s*"?(\w+)"?/i) || rawStr.match(/action\s*[:=]\s*'?(\w+)'?/i);
          const extracted = {};
          if (phoneMatch) extracted.phone = phoneMatch[0].replace(/[^\d+]/g, '');
          if (actionMatch && actionMatch[1]) extracted.action = actionMatch[1];
          if (Object.keys(extracted).length > 0) {
            body = extracted;
          } else {
            // fallback to empty object, handler will validate required fields and return proper 4xx
            body = {};
          }
        }
      }

      const { phone: rawPhoneBody, given_name, family_name, city, postal_code, action } = body || {};
      const acctSid = process.env.TWILIO_SID;
      const authTok = process.env.TWILIO_TOKEN;
      if (!acctSid || !authTok) {
        return res.status(400).json({ error: 'Twilio credentials not configured on server. Set TWILIO_SID and TWILIO_TOKEN.' });
      }

      if (!rawPhoneBody) {
        return res.status(400).json({ error: 'Missing required parameter in body: phone' });
      }

      const phoneDigits = String(rawPhoneBody).replace(/\D/g, '');
      let phoneE164Body;
      if (String(rawPhoneBody).trim().startsWith('+')) {
        phoneE164Body = String(rawPhoneBody).trim();
      } else if (phoneDigits.length === 10) {
        phoneE164Body = `+1${phoneDigits}`;
      } else if (phoneDigits.length === 11 && phoneDigits.startsWith('1')) {
        phoneE164Body = `+${phoneDigits}`;
      } else {
        phoneE164Body = `+${phoneDigits}`;
      }

      const auth = Buffer.from(`${acctSid}:${authTok}`).toString('base64');

      // identity-match (v2) uses GET /v2/PhoneNumbers/{phone}?Fields=identity_match&FirstName=...
      if (!action || action === 'identity') {
        const params = new URLSearchParams({ Fields: 'identity_match' });

        // Add identity match parameters with correct capitalization
        if (given_name) params.append('FirstName', given_name);
        if (family_name) params.append('LastName', family_name);
        if (city) params.append('City', city);
        if (postal_code) params.append('PostalCode', postal_code);

        const v2Url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(phoneE164Body)}?${params.toString()}`;

        const response = await fetch(v2Url, {
          method: 'GET',
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: 'application/json'
          }
        });

        const upstreamText = await response.text().catch(() => '');
        console.log('twilio proxy - identity match response:', { status: response.status, body: upstreamText.slice(0, 500) });
        try {
          const parsed = upstreamText && String(upstreamText).trim() ? JSON.parse(upstreamText) : {};
          return res.status(response.status).json(parsed);
        } catch (e) {
          if (req.query && req.query._debug) return res.status(response.status).json({ __debug_raw: upstreamText, __debug_status: response.status });
          return res.status(response.status).json({ error: upstreamText || 'Upstream non-JSON', status: response.status });
        }
      }

      // caller_name v2: GET https://lookups.twilio.com/v2/PhoneNumbers/{PhoneNumber}?Fields=caller_name
      if (action === 'caller_name') {
        const callerUrlV2 = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(phoneE164Body)}?Fields=caller_name`;
        const response = await fetch(callerUrlV2, {
          method: 'GET',
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: 'application/json'
          }
        });

        const rText = await response.text().catch(() => '');
        console.log('twilio proxy - caller_name response:', { status: response.status, body: rText.slice(0, 500) });
        try {
          const rParsed = rText && String(rText).trim() ? JSON.parse(rText) : {};
          return res.status(response.status).json(rParsed);
        } catch (e) {
          if (req.query && req.query._debug) return res.status(response.status).json({ __debug_raw: rText, __debug_status: response.status });
          return res.status(response.status).json({ error: rText || 'Upstream non-JSON', status: response.status });
        }
      }

      // sms pumping risk v2: GET https://lookups.twilio.com/v2/PhoneNumbers/{PhoneNumber}?Fields=sms_pumping_risk
      if (action === 'sms_pumping') {
        const riskUrl = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(phoneE164Body)}?Fields=sms_pumping_risk`;
        const response = await fetch(riskUrl, {
          method: 'GET',
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: 'application/json'
          }
        });

        const rText = await response.text().catch(() => '');
        console.log('twilio proxy - sms_pumping response:', { status: response.status, body: rText.slice(0, 500) });
        try {
          const rParsed = rText && String(rText).trim() ? JSON.parse(rText) : {};
          return res.status(response.status).json(rParsed);
        } catch (e) {
          if (req.query && req.query._debug) return res.status(response.status).json({ __debug_raw: rText, __debug_status: response.status });
          return res.status(response.status).json({ error: rText || 'Upstream non-JSON', status: response.status });
        }
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    // Log and return error details while debugging locally. Remove stack exposure before production.
    console.error('Twilio proxy error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message, stack: err.stack });
  }
}
