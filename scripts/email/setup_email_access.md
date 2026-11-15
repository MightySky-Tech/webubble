# Email Access Setup for Webubble

## Current Status

✅ **App Password Created:** M0nday@12

⚠️ **Issue:** Outlook has disabled basic IMAP authentication for security reasons.

## Solution: Microsoft Graph API

We'll use Microsoft Graph API instead, which is:
- ✅ More secure (OAuth 2.0)
- ✅ Officially supported by Microsoft
- ✅ Doesn't require password storage
- ✅ Can be revoked anytime

## Setup Instructions

### Step 1: Register an Azure Application

1. Go to https://portal.azure.com/
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Fill in:
   - **Name:** `Webubble Email Monitor`
   - **Supported account types:** `Accounts in this organizational directory only`
5. Click **Register**

### Step 2: Grant Permissions

1. In the app, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Search for and select:
   - `Mail.Read` (read emails)
   - `Mail.Send` (send replies)
6. Click **Add permissions**
7. ⚠️ **IMPORTANT:** Click **Grant admin consent for [your org]**

### Step 3: Create a Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add description: `Email monitoring`
4. Set expiry: 12 months
5. Copy the **Value** (not ID) - this is your secret key

### Step 4: Collect Your Credentials

You'll need:
- **Tenant ID:** Go to **Overview** tab, copy the "Directory (tenant) ID"
- **Client ID:** Copy from **Overview** tab
- **Client Secret:** From Step 3
- **Email:** enquiries@mightyskytech.com

### Step 5: Store Credentials Securely

Create a `.env.email` file (NOT committed to git):

```env
OUTLOOK_EMAIL=enquiries@mightyskytech.com
AZURE_TENANT_ID=your-tenant-id-here
AZURE_CLIENT_ID=your-client-id-here
AZURE_CLIENT_SECRET=your-client-secret-here
```

### Step 6: Run the Email Monitor

```bash
# On Windows PowerShell
python scripts/email/monitor_client_emails.py

# On macOS/Linux
export $(cat scripts/email/.env.email | xargs)
python scripts/email/monitor_client_emails.py
```

## What the Script Does

✅ Connects to enquiries@mightyskytech.com via Microsoft Graph API
✅ Fetches new emails since last check
✅ Shows sender, subject, date, and preview
✅ Stores processed email IDs locally (won't show duplicates)
✅ Returns JSON for automation
✅ Can be run on a schedule (GitHub Actions, cron, Task Scheduler)

## Automation (Optional)

### GitHub Actions - Check emails daily

Create `.github/workflows/check-client-emails.yml`:

```yaml
name: Check Client Emails

on:
  schedule:
    - cron: "0 9 * * *"  # Every day at 9 AM UTC
  workflow_dispatch:

jobs:
  check-emails:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Check emails
        env:
          AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
          AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
        run: python scripts/email/monitor_client_emails.py
```

### Windows Task Scheduler

```powershell
# Run as admin
$action = New-ScheduledTaskAction -Execute "python" -Argument "scripts/email/monitor_client_emails.py"
$trigger = New-ScheduledTaskTrigger -Daily -At 9:00AM
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "Webubble-Check-Emails"
```

## Security Notes

✅ **Secure:**
- OAuth 2.0 authentication (no passwords in code)
- Can be revoked from Azure portal anytime
- App-specific permissions only
- Secrets stored in `.env.email` (not committed)

⚠️ **Important:**
- NEVER commit `.env.email` to git
- Keep `AZURE_CLIENT_SECRET` private
- Rotate secret annually
- Use GitHub Secrets for CI/CD

## Support

**Issues?**
1. Check that admin consent was granted in Azure
2. Verify `.env.email` has correct credentials
3. Run: `python -m pip install requests` (if Microsoft Graph connector fails)
4. Check Azure app permissions are set correctly

**Next:** Once Azure setup is complete, let me know and I'll update the email monitor script to use the Graph API.
