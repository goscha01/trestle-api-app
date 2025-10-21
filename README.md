# trestle-api-app

Local demo for TrestleIQ + Twilio Lookup proxy (Vercel serverless functions).

Quick start

1. Install dependencies

```bash
npm install
```

2. Set environment variables for Twilio (local session)

PowerShell:

```powershell
$env:TWILIO_SID = 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
$env:TWILIO_TOKEN = 'your_auth_token'
npm start
```

CMD:

```cmd
set TWILIO_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
set TWILIO_TOKEN=your_auth_token
npm start
```

3. Open the printed URL from `vercel dev` (usually http://localhost:3000) and use the UI to test lookups.

Important: Do NOT commit your `.env` file. Add keys via Vercel dashboard for preview/production.
