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
    console.log('peopledatalabs proxy - incoming', { method: req.method, query: req.query });

    // Get API key from environment
    const apiKey = process.env.PEOPLEDATALABS_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: 'PeopleDataLabs API key not configured. Set PEOPLEDATALABS_API_KEY in .env file.',
        hint: 'Get your API key from https://dashboard.peopledatalabs.com/'
      });
    }

    // Build query parameters from request
    const params = new URLSearchParams();

    // Clean and add phone number (remove all non-digit characters except +)
    if (req.query.phone) {
      let cleanedPhone = String(req.query.phone).replace(/[^\d+]/g, '');

      // If the phone is 10 digits (likely US) and doesn't include a country code,
      // normalize to E.164 by prefixing +1. This reduces "not found" responses
      // from PeopleDataLabs when callers submit local 10-digit numbers.
      const digitsOnly = cleanedPhone.replace(/\D/g, '');
      if (!cleanedPhone.startsWith('+') && digitsOnly.length === 10) {
        cleanedPhone = `+1${digitsOnly}`;
      }

      params.append('phone', cleanedPhone);
    }
    if (req.query.email) params.append('email', req.query.email);
    if (req.query.profile) params.append('profile', req.query.profile);
    if (req.query.first_name) params.append('first_name', req.query.first_name);
    if (req.query.last_name) params.append('last_name', req.query.last_name);
    if (req.query.name) params.append('name', req.query.name);
    if (req.query.company) params.append('company', req.query.company);
    if (req.query.location) params.append('location', req.query.location);
    if (req.query.locality) params.append('locality', req.query.locality);
    if (req.query.region) params.append('region', req.query.region);
    if (req.query.country) params.append('country', req.query.country);
    if (req.query.school) params.append('school', req.query.school);
    if (req.query.lid) params.append('lid', req.query.lid);

    // Always request prettified JSON
    params.append('pretty', 'true');

    // Validate that at least one parameter is provided
    if (params.toString() === 'pretty=true') {
      return res.status(400).json({
        error: 'At least one search parameter is required',
        hint: 'Provide phone, email, profile, name, company, location, or other identifiers'
      });
    }

  // Determine which PeopleDataLabs endpoint to call. Supported options:
  // - enrich (default): /v5/person/enrich
  // - search: /v5/person/search
  // - identify: /v5/person/identify
  const requestedEndpoint = (req.query.endpoint || 'enrich').toString().toLowerCase();

    let remotePath = '/v5/person/enrich';
    if (requestedEndpoint === 'search') remotePath = '/v5/person/search';
    else if (requestedEndpoint === 'identify') remotePath = '/v5/person/identify';

    // Special handling for Person Search: it requires either a `query` (Elasticsearch DSL)
    // or `sql`. If the client provided a simple phone/email/name via query params,
    // translate common cases into a minimal `query` object so we don't return 400.
    if (requestedEndpoint === 'search') {
      // If user supplied an explicit `query`, forward it as-is.
      if (req.query.query) {
        // append provided query (assume it's already a JSON string or object)
        const q = typeof req.query.query === 'string' ? req.query.query : JSON.stringify(req.query.query);
        params.append('query', q);
      } else {
        // Build a simple term query when searchable identifiers are present.
        // Prefer phone (E.164) or email or name. This produces a safe, narrow query.
        const builtQuery = { query: { bool: { must: [] } } };

        // Use the cleaned phone from params instead of the raw query parameter
        const cleanedPhone = params.get('phone');
        if (cleanedPhone) {
          // phone_numbers is an array of strings in PDL schema
          builtQuery.query.bool.must.push({ term: { phone_numbers: cleanedPhone } });
        }
        if (req.query.email) {
          builtQuery.query.bool.must.push({ term: { 'emails.address': req.query.email } });
        }
        if (req.query.first_name || req.query.last_name) {
          const name = `${req.query.first_name || ''} ${req.query.last_name || ''}`.trim();
          if (name) builtQuery.query.bool.must.push({ match: { full_name: name } });
        }

        // If we couldn't build any clause, let the remote API return the validation error.
        if (builtQuery.query.bool.must.length > 0) {
          params.append('query', JSON.stringify(builtQuery));
          // default to a small page size to limit credits
          params.append('size', '10');
        }
      }
    }

    const url = `https://api.peopledatalabs.com${remotePath}?${params.toString()}`;
    console.log('peopledatalabs proxy - calling:', url.replace(apiKey, 'REDACTED'));

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    console.log('peopledatalabs proxy - response:', {
      status: response.status,
      likelihood: data.likelihood,
      match: data.status === 200,
      hasData: !!data.data
    });

    // When non-200, log the full response body for easier debugging (safe in dev).
    if (response.status !== 200) {
      console.log('peopledatalabs proxy - non-200 body:', JSON.stringify(data));
    }

    // PeopleDataLabs uses HTTP 404 to mean "no records found" (see their docs).
    // Also handle 402 for quota/payment errors.
    // Translate these to an HTTP 200 from our proxy while preserving the
    // original error payload in the JSON body. This keeps client-side fetch
    // flows simple (no HTTP error) while still surfacing the PDL status.
    if (response.status === 404 || response.status === 402) {
      return res.status(200).json({
        // keep the original status code in the body
        status: data.status || response.status,
        // forward the original error object if present
        error: data.error || { type: 'not_found', message: 'No records were found matching your request' },
        // explicit null data to indicate no match
        data: null
      });
    }

    return res.status(response.status).json(data);
  } catch (err) {
    console.error('PeopleDataLabs proxy error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      stack: err.stack
    });
  }
}
