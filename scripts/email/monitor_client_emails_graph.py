#!/usr/bin/env python3
"""
Monitor enquiries@mightyskytech.com using Microsoft Graph API.
Secure OAuth 2.0 authentication - no passwords stored in code.
"""

import os
import sys
import json
import requests
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

# Fix encoding for Windows PowerShell
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Configuration from environment
TENANT_ID = os.getenv("AZURE_TENANT_ID", "")
CLIENT_ID = os.getenv("AZURE_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET", "")
EMAIL = os.getenv("OUTLOOK_EMAIL", "enquiries@mightyskytech.com")

# Microsoft Graph API endpoints
GRAPH_API = "https://graph.microsoft.com/v1.0"
AUTH_URL = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"

# Local cache
EMAIL_CACHE_FILE = Path(__file__).parent / "email_cache.json"


class GraphAPIClient:
    """Microsoft Graph API client for email access."""
    
    def __init__(self, tenant_id: str, client_id: str, client_secret: str):
        self.tenant_id = tenant_id
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = None
        self.token_expires = None
    
    def authenticate(self) -> bool:
        """Get access token from Microsoft."""
        try:
            response = requests.post(
                AUTH_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "scope": "https://graph.microsoft.com/.default",
                    "grant_type": "client_credentials",
                }
            )
            response.raise_for_status()
            data = response.json()
            self.access_token = data.get("access_token")
            return bool(self.access_token)
        except Exception as e:
            print(f"❌ Authentication failed: {e}")
            print("\nCheck your Azure credentials:")
            print(f"   AZURE_TENANT_ID={TENANT_ID}")
            print(f"   AZURE_CLIENT_ID={CLIENT_ID}")
            print(f"   AZURE_CLIENT_SECRET=***")
            return False
    
    def get_headers(self) -> Dict[str, str]:
        """Return HTTP headers with authorization."""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    def get_emails(self) -> List[Dict]:
        """Fetch unread emails from inbox."""
        if not self.access_token:
            return []
        
        try:
            # Get last 10 emails, sorted by received date (newest first)
            response = requests.get(
                f"{GRAPH_API}/me/mailFolders/inbox/messages",
                headers=self.get_headers(),
                params={
                    "$select": "id,from,subject,receivedDateTime,bodyPreview,body,internetMessageId",
                    "$orderby": "receivedDateTime desc",
                    "$top": 10,
                    "$filter": "isRead eq false"  # Only unread
                }
            )
            response.raise_for_status()
            return response.json().get("value", [])
        except Exception as e:
            print(f"❌ Failed to fetch emails: {e}")
            return []
    
    def mark_as_read(self, email_id: str) -> bool:
        """Mark an email as read."""
        if not self.access_token:
            return False
        
        try:
            response = requests.patch(
                f"{GRAPH_API}/me/messages/{email_id}",
                headers=self.get_headers(),
                json={"isRead": True}
            )
            response.raise_for_status()
            return True
        except Exception as e:
            print(f"⚠️  Failed to mark email as read: {e}")
            return False


def load_cache() -> Dict:
    """Load email cache."""
    if EMAIL_CACHE_FILE.exists():
        with open(EMAIL_CACHE_FILE) as f:
            return json.load(f)
    return {"processed_ids": [], "last_check": None}


def save_cache(cache: Dict):
    """Save email cache."""
    with open(EMAIL_CACHE_FILE, "w") as f:
        json.dump(cache, f, indent=2)


def format_email(msg: Dict, index: int) -> str:
    """Format email for display."""
    sender = msg.get("from", {}).get("emailAddress", {})
    sender_email = sender.get("address", "Unknown")
    sender_name = sender.get("name", sender_email)
    
    subject = msg.get("subject", "(No Subject)")
    received = msg.get("receivedDateTime", "Unknown")
    body_preview = msg.get("bodyPreview", "")[:200]
    
    return f"""
[{index}] FROM: {sender_name} <{sender_email}>
    SUBJECT: {subject}
    DATE: {received}
    PREVIEW: {body_preview}..."""


def main():
    """Main entry point."""
    # Check credentials
    if not all([TENANT_ID, CLIENT_ID, CLIENT_SECRET]):
        print("❌ Missing Azure credentials!")
        print("\nSetup instructions:")
        print("1. Go to https://portal.azure.com/")
        print("2. Create an Azure AD app registration")
        print("3. Set environment variables:")
        print("   export AZURE_TENANT_ID=your-tenant-id")
        print("   export AZURE_CLIENT_ID=your-client-id")
        print("   export AZURE_CLIENT_SECRET=your-client-secret")
        print("\nSee scripts/email/setup_email_access.md for detailed instructions")
        return
    
    print("[*] Connecting to Microsoft Graph API...")
    
    # Authenticate
    client = GraphAPIClient(TENANT_ID, CLIENT_ID, CLIENT_SECRET)
    if not client.authenticate():
        return
    
    print(f"[+] Authenticated successfully")
    print(f"[*] Checking {EMAIL} for new emails...\n")
    
    # Get emails
    emails = client.get_emails()
    
    if not emails:
        print("✓ No unread emails")
        return
    
    print(f"📧 Found {len(emails)} unread email(s)\n")
    print("=" * 80)
    
    cache = load_cache()
    
    for i, msg in enumerate(emails, 1):
        msg_id = msg.get("id", "")
        
        # Check if already processed
        if msg_id in cache["processed_ids"]:
            continue
        
        print(format_email(msg, i))
        
        # Mark as read and cache
        if client.mark_as_read(msg_id):
            cache["processed_ids"].append(msg_id)
        
        print("-" * 80)
    
    # Update cache
    cache["last_check"] = datetime.now().isoformat()
    save_cache(cache)
    
    print("\n[+] Done!")


if __name__ == "__main__":
    main()
