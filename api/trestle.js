export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { endpoint } = req.query;

    // Prefer server-side environment variable for the API key to avoid exposing it to clients
    const apiKeyFromEnv = process.env.TRESTLE_API_KEY;
    const apiKey = (req.query.apiKey && String(req.query.apiKey)) || apiKeyFromEnv;

    // Normalize and validate phone (allow digits only)
    const rawPhone = req.query.phone ? String(req.query.phone) : '';
    const phone = rawPhone.replace(/\D/g, '');

    // Validate inputs
    if (!phone) {
      console.error('trestle proxy - Missing phone parameter');
      return res.status(400).json({ error: 'Missing required parameter: phone' });
    }

    if (!apiKey) {
      console.error('trestle proxy - Missing API key. TRESTLE_API_KEY env var:', apiKeyFromEnv ? 'SET' : 'NOT SET');
      return res.status(400).json({
        error: 'Missing API key. Add TRESTLE_API_KEY to your .env file.',
        hint: 'Get your API key from https://dashboard.trestleiq.com/'
      });
    }

    if (phone.length !== 10) {
      return res.status(400).json({ error: 'Phone number must be 10 digits (numbers only).' });
    }

    // Determine the correct TrestleIQ API endpoint
    let apiUrl;
    if (endpoint === 'phone_intel') {
      apiUrl = `https://api.trestleiq.com/3.0/phone_intel?phone=${phone}`;
    } else if (endpoint === 'reverse_phone') {
      apiUrl = `https://api.trestleiq.com/3.2/phone?phone=${phone}`;
    } else {
      return res.status(400).json({ error: 'Invalid endpoint. Use "phone_intel" or "reverse_phone"' });
    }

    // Make the request to TrestleIQ API
    console.log('trestle proxy - calling:', apiUrl);
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    console.log('trestle proxy - response:', { status: response.status, data: JSON.stringify(data).slice(0, 200) });

    // Return the response with the same status code
    res.status(response.status).json(data);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}