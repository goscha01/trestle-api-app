# Enformion API Setup Guide

## Getting Your Credentials

1. **Sign up or log in** to your Enformion account at https://api.enformion.com/
2. Navigate to your **API Dashboard**
3. Look for your **Access Profile** credentials:
   - `galaxy-ap-name` (API Name/Username)
   - `galaxy-ap-password` (API Password)

## Configuration

Add your credentials to `.env.local`:

```env
ENFORMION_API_NAME=your_actual_api_name_here
ENFORMION_API_PASSWORD=your_actual_api_password_here
```

⚠️ **Important**: Replace the placeholder values with your actual credentials!

## How to Use

### 1. Contact Enrichment & Person Search
**Requires at least 2 search criteria:**
- Name (First or Last)
- Contact (Phone or Email)
- Address (City or Postal Code)

**Examples:**
- ✅ First Name + Last Name
- ✅ Phone + Email
- ✅ First Name + City
- ✅ Email + Last Name
- ❌ Phone only (not enough criteria)

### 2. Reverse Phone Lookup
**Requires only:**
- Phone number

### Available Tabs

When you enter search data, these tabs will appear (if criteria are met):

- **📇 Enformion Contact** - Contact enrichment (top person match with phones, emails, addresses)
- **🔍 Enformion Search** - Person search (multiple matches with pagination)
- **📱 Enformion Reverse** - Reverse phone lookup (find person by phone)

## Testing

After adding credentials:

1. **Restart the dev server:**
   ```bash
   npm start
   ```

2. **Test with complete data:**
   - Enter: First Name = "John", Last Name = "Smith"
   - Or: Phone = "2483462681", Email = "test@example.com"

3. **Check the console logs** (browser and terminal) for detailed debugging info

## Troubleshooting

### Error: "Enformion API credentials not configured"
- Make sure you've replaced the placeholder values in `.env.local`
- Restart the dev server after updating `.env.local`

### Error: "At least two search criteria are required"
- Contact Enrichment and Person Search need 2+ criteria
- Reverse Phone only needs a phone number
- Make sure you're entering data in at least 2 fields from different categories

### No results returned
- Check terminal logs for the actual API response
- Verify your API credentials are correct
- Check if your Enformion account has available credits
- Some phone numbers or people may not be in the Enformion database

## API Endpoints Used

1. **Contact Enrichment**: `POST https://api.enformion.com/galaxy/contact-enrichment`
   - Search Type: `DevAPIContactEnrich`
   - Returns: Top person match only

2. **Person Search**: `POST https://api.enformion.com/galaxy/search`
   - Search Type: `Person`
   - Returns: Multiple matches with pagination

3. **Reverse Phone**: `POST https://api.enformion.com/galaxy/search`
   - Search Type: `ReversePhonePerson`
   - Returns: Person(s) associated with phone number

## Documentation

Official Enformion API docs: https://enformiongo.readme.io/reference/overview
