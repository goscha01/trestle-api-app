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
    console.log('enformion proxy - incoming', { method: req.method, query: req.query });
    console.log('enformion proxy - ALL PARAMS:', JSON.stringify(req.query, null, 2));

    // Get API credentials from environment
    const apiName = process.env.ENFORMION_API_NAME;
    const apiPassword = process.env.ENFORMION_API_PASSWORD;

    if (!apiName || !apiPassword) {
      return res.status(400).json({
        error: 'Enformion API credentials not configured. Set ENFORMION_API_NAME and ENFORMION_API_PASSWORD in .env file.',
        hint: 'Get your credentials from https://api.enformion.com/'
      });
    }

    // Determine which endpoint to call based on query parameter
    const endpoint = (req.query.endpoint || 'contact-enrichment').toString().toLowerCase();

    let searchType = null; // Will be set based on endpoint
    let apiUrl = '';

    if (endpoint === 'contact-enrichment') {
      // Pattern: endpoint name without 'Search' suffix
      searchType = 'ContactEnrichment';
      apiUrl = 'https://devapi.enformion.com/ContactEnrichmentSearch';
    } else if (endpoint === 'person-search') {
      // Pattern: endpoint name without 'Search' suffix
      searchType = 'Person';
      apiUrl = 'https://devapi.enformion.com/PersonSearch';
    } else if (endpoint === 'reverse-phone') {
      // Confirmed working search type: ReversePhone
      searchType = 'ReversePhone';
      apiUrl = 'https://devapi.enformion.com/ReversePhoneSearch';
    }

    // Build request body
    const requestBody = {};

    // Add personal identifiers
    if (req.query.firstName) requestBody.FirstName = req.query.firstName;
    if (req.query.middleName) requestBody.MiddleName = req.query.middleName;
    if (req.query.lastName) requestBody.LastName = req.query.lastName;
    if (req.query.dob) requestBody.Dob = req.query.dob;
    if (req.query.age) requestBody.Age = parseInt(req.query.age);

    // Add contact info
    if (req.query.phone) {
      // Enformion wants 10-digit US phone numbers without country code
      let cleanedPhone = String(req.query.phone).replace(/[^\d]/g, '');

      // Remove leading 1 if present (country code)
      if (cleanedPhone.length === 11 && cleanedPhone.startsWith('1')) {
        cleanedPhone = cleanedPhone.substring(1);
      }

      // Ensure we have exactly 10 digits
      if (cleanedPhone.length === 10) {
        requestBody.Phone = cleanedPhone;
        console.log('enformion proxy - added phone to request body:', cleanedPhone);
      } else {
        console.log('enformion proxy - invalid phone length:', cleanedPhone.length, cleanedPhone);
      }
    }

    if (req.query.email) requestBody.Email = req.query.email;

    // Add address
    if (req.query.addressLine1 || req.query.addressLine2 || req.query.city || req.query.state || req.query.zip) {
      requestBody.Address = {};
      if (req.query.addressLine1) requestBody.Address.AddressLine1 = req.query.addressLine1;
      if (req.query.addressLine2) requestBody.Address.AddressLine2 = req.query.addressLine2;
      if (req.query.city) requestBody.Address.City = req.query.city;
      if (req.query.state) requestBody.Address.State = req.query.state;
      if (req.query.zip) requestBody.Address.Zip = req.query.zip;
    }

    // Handle standalone city/state/zip even without full address object
    if (!requestBody.Address && (req.query.city || req.query.state || req.query.zip)) {
      requestBody.Address = {};
      if (req.query.city) requestBody.Address.City = req.query.city;
      if (req.query.state) requestBody.Address.State = req.query.state;
      if (req.query.zip) requestBody.Address.Zip = req.query.zip;
    }

    // Add optional includes for person search
    if (endpoint === 'person-search') {
      // Note: 'Demographics' is NOT a valid Includes value according to Enformion API
      // Valid values include: Addresses, PhoneNumbers, EmailAddresses, Relatives, DatesOfBirth, etc.
      requestBody.Includes = ['Addresses', 'PhoneNumbers', 'EmailAddresses', 'Relatives', 'Akas'];
      requestBody.Page = parseInt(req.query.page) || 1;
      requestBody.ResultsPerPage = parseInt(req.query.resultsPerPage) || 10;
    }

    console.log('enformion proxy - FINAL REQUEST BODY BEFORE VALIDATION:', JSON.stringify(requestBody, null, 2));

    // Validate that we have enough search criteria
    // For reverse-phone, only phone is needed
    if (endpoint === 'reverse-phone') {
      console.log('enformion proxy - reverse-phone validation, requestBody.Phone:', requestBody.Phone);
      if (!requestBody.Phone) {
        console.log('enformion proxy - ERROR: Phone missing for reverse-phone');
        return res.status(400).json({
          error: 'Phone number is required for reverse phone lookup',
          hint: 'Provide a phone number',
          debug: { requestBody, query: req.query }
        });
      }
    } else {
      // For other endpoints, need at least 2 criteria
      const hasName = requestBody.FirstName || requestBody.LastName;
      const hasContact = requestBody.Phone || requestBody.Email;
      const hasAddress = requestBody.Address && (requestBody.Address.City || requestBody.Address.State || requestBody.Address.Zip);
      const searchCriteriaCount = [hasName, hasContact, hasAddress].filter(Boolean).length;

      console.log('enformion proxy - search criteria count:', searchCriteriaCount, { hasName, hasContact, hasAddress });

      if (searchCriteriaCount < 2) {
        return res.status(400).json({
          error: 'At least two search criteria are required',
          hint: 'Provide at least two of: Name, Phone, Email, or Address (with City/State/Zip)',
          receivedCriteria: { hasName, hasContact, hasAddress }
        });
      }
    }

    console.log('enformion proxy - calling:', apiUrl);
    console.log('enformion proxy - search type:', searchType || 'none (omitted)');
    console.log('enformion proxy - request body:', JSON.stringify(requestBody, null, 2));

    // Build headers - only include search type if it's set
    const headers = {
      'Content-Type': 'application/json',
      'galaxy-ap-name': apiName,
      'galaxy-ap-password': apiPassword,
      'galaxy-client-type': 'web'
    };

    if (searchType) {
      headers['galaxy-search-type'] = searchType;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    // Get response as text first to handle non-JSON responses
    const responseText = await response.text();
    console.log('enformion proxy - raw response (first 500 chars):', responseText.substring(0, 500));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('enformion proxy - JSON parse error:', parseError.message);
      console.error('enformion proxy - response was HTML/text, not JSON');
      return res.status(500).json({
        error: 'Enformion API returned an error',
        message: 'The API returned HTML instead of JSON. This usually means authentication failed or wrong endpoint.',
        hint: 'Check your API credentials and ensure they are correct',
        responsePreview: responseText.substring(0, 200)
      });
    }

    console.log('enformion proxy - response:', {
      status: response.status,
      ok: response.ok,
      hasData: !!(data && (data.Persons || data.Person || data.persons || data.Results))
    });
    console.log('enformion proxy - response body:', JSON.stringify(data, null, 2));

    // Log non-200 responses for debugging
    if (response.status !== 200) {
      console.log('enformion proxy - non-200 body:', JSON.stringify(data));
    }

    // Handle errors - convert to consistent format
    if (!response.ok) {
      return res.status(200).json({
        status: response.status,
        error: data.error || data.Error || data.message || 'Request failed',
        data: null
      });
    }

    // Check if no results found - handle different response structures
    // Note: Enformion person-search returns lowercase 'persons', not uppercase 'Persons'
    const hasReversePhoneRecords = data.reversePhoneRecords && data.reversePhoneRecords.length > 0;
    const hasPersons = (data.Persons && data.Persons.length > 0) || (data.persons && data.persons.length > 0);
    const hasResults = data.Results && data.Results.length > 0;
    const hasPerson = data.Person;

    if (data && !hasReversePhoneRecords && !hasPersons && !hasResults && !hasPerson) {
      return res.status(200).json({
        status: 404,
        error: { type: 'not_found', message: 'No records were found matching your request' },
        data: null
      });
    }

    // Transform reversePhoneRecords to expected Persons structure for consistency
    if (hasReversePhoneRecords) {
      const transformedPersons = data.reversePhoneRecords.map(record => {
        // Extract person data from tahoePerson if available
        const person = record.tahoePerson || {};
        return {
          // Top-level phone info from record
          phoneNumber: record.phoneNumber,
          carrier: record.carrier,
          phoneType: record.phoneType,
          latitude: record.latitude,
          longitude: record.longitude,
          // Person details
          name: person.name || {},
          akas: person.akas || [],
          phoneNumbers: person.phoneNumbers || [],
          addresses: person.addresses || [],
          age: person.age,
          dob: person.dob,
          gender: person.gender,
          // Keep original structure for reference
          _raw: record
        };
      });

      return res.status(200).json({
        status: 200,
        data: {
          Persons: transformedPersons,
          _original: data
        }
      });
    }

    // Normalize lowercase 'persons' to uppercase 'Persons' for consistency
    if (data.persons && !data.Persons) {
      return res.status(200).json({
        status: 200,
        data: {
          Persons: data.persons,
          _original: data
        }
      });
    }

    return res.status(200).json({
      status: 200,
      data: data
    });

  } catch (err) {
    console.error('Enformion proxy error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      stack: err.stack
    });
  }
}
