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
      const cleanedPhone = String(req.query.phone).replace(/[^\d+]/g, '');
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

    const url = `https://api.peopledatalabs.com/v5/person/enrich?${params.toString()}`;
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
