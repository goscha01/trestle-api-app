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
    const { endpoint, phone, apiKey } = req.query;

    // Validate inputs
    if (!phone || !apiKey) {
      return res.status(400).json({ 
        error: 'Missing required parameters: phone and apiKey' 
      });
    }

    if (phone.length !== 10) {
      return res.status(400).json({ 
        error: 'Phone number must be 10 digits' 
      });
    }

    // Determine the correct TrestleIQ API endpoint
    let apiUrl;
    if (endpoint === 'phone_intel') {
      apiUrl = `https://api.trestleiq.com/3.0/phone_intel?phone=${phone}`;
    } else if (endpoint === 'reverse_phone') {
      apiUrl = `https://api.trestleiq.com/3.2/phone?phone=${phone}`;
    } else {
      return res.status(400).json({ 
        error: 'Invalid endpoint. Use "phone_intel" or "reverse_phone"' 
      });
    }

    // Make the request to TrestleIQ API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();

    // Return the response with the same status code
    res.status(response.status).json(data);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}