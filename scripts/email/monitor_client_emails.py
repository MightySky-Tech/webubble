#!/usr/bin/env python3
"""
Monitor enquiries@mightyskytech.com for client emails and provide summaries.
Uses Office 365 (Outlook) IMAP access with app password.
"""

import os
import sys
import json
import imaplib
import email
from email.header import decode_header
from datetime import datetime, timedelta
from pathlib import Path

# Fix encoding for Windows PowerShell
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Configuration
EMAIL = "enquiries@mightyskytech.com"
APP_PASSWORD = os.getenv("OUTLOOK_APP_PASSWORD", "")
IMAP_SERVER = "outlook.office365.com"
IMAP_PORT = 993

# Local storage for tracking processed emails
EMAIL_CACHE_FILE = Path(__file__).parent / "email_cache.json"


def load_email_cache():
    """Load previously processed email IDs."""
    if EMAIL_CACHE_FILE.exists():
        with open(EMAIL_CACHE_FILE) as f:
            return json.load(f)
    return {"processed_ids": [], "last_check": None}


def save_email_cache(cache):
    """Save processed email IDs."""
    with open(EMAIL_CACHE_FILE, "w") as f:
        json.dump(cache, f, indent=2)


def decode_email_header(header):
    """Decode email header values."""
    if not header:
        return ""
    try:
        decoded_parts = decode_header(header)
        result = ""
        for part, encoding in decoded_parts:
            if isinstance(part, bytes):
                result += part.decode(encoding or "utf-8", errors="ignore")
            else:
                result += str(part)
        return result
    except Exception as e:
        return str(header)


def connect_to_email():
    """Connect to Outlook IMAP server."""
    try:
        imap = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT)
        imap.login(EMAIL, APP_PASSWORD)
        return imap
    except imaplib.IMAP4.error as e:
        print(f"❌ Failed to connect to Outlook: {e}")
        print("   Check that:")
        print("   1. App password is correct")
        print("   2. Set OUTLOOK_APP_PASSWORD environment variable")
        return None


def check_new_emails():
    """Check for new emails from clients."""
    imap = connect_to_email()
    if not imap:
        return []

    try:
        # Select inbox
        imap.select("INBOX")
        
        # Search for emails from the last 7 days
        status, message_ids = imap.search(
            None, 
            'ALL'  # Get all emails, we'll filter by cache
        )
        
        if status != "OK":
            print("❌ Failed to search emails")
            return []

        cache = load_email_cache()
        new_emails = []
        
        # Process each email
        for msg_id in message_ids[0].split():
            if msg_id.decode() in cache["processed_ids"]:
                continue  # Already processed
            
            status, msg_data = imap.fetch(msg_id, "(RFC822)")
            if status != "OK":
                continue
            
            try:
                msg = email.message_from_bytes(msg_data[0][1])
                
                subject = decode_email_header(msg.get("Subject", ""))
                sender = decode_email_header(msg.get("From", ""))
                date = msg.get("Date", "")
                
                # Extract body
                body = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        if part.get_content_type() == "text/plain":
                            body = part.get_payload(decode=True).decode("utf-8", errors="ignore")
                            break
                else:
                    body = msg.get_payload(decode=True).decode("utf-8", errors="ignore")
                
                email_data = {
                    "id": msg_id.decode(),
                    "from": sender,
                    "subject": subject,
                    "date": date,
                    "body": body[:500] + "..." if len(body) > 500 else body,  # First 500 chars
                    "full_body": body,
                }
                
                new_emails.append(email_data)
                cache["processed_ids"].append(msg_id.decode())
            
            except Exception as e:
                print(f"⚠️  Error processing email {msg_id}: {e}")
                continue
        
        # Update cache
        cache["last_check"] = datetime.now().isoformat()
        save_email_cache(cache)
        
        return new_emails
    
    finally:
        imap.close()
        imap.logout()


def print_email_summary(emails):
    """Print a formatted summary of emails."""
    if not emails:
        print("✅ No new emails since last check")
        return
    
    print(f"\n📧 NEW EMAILS ({len(emails)})\n")
    print("=" * 80)
    
    for i, email_msg in enumerate(emails, 1):
        print(f"\n[{i}] FROM: {email_msg['from']}")
        print(f"    SUBJECT: {email_msg['subject']}")
        print(f"    DATE: {email_msg['date']}")
        print(f"    PREVIEW: {email_msg['body']}")
        print(f"    FULL ID: {email_msg['id']}")
        print("-" * 80)


def main():
    """Main entry point."""
    if not APP_PASSWORD:
        print("❌ Error: OUTLOOK_APP_PASSWORD environment variable not set")
        print("\nTo use this script:")
        print("1. Set environment variable: $env:OUTLOOK_APP_PASSWORD = 'your-app-password'")
        print("2. Run: python scripts/email/monitor_client_emails.py")
        return
    
    print(f"🔍 Checking {EMAIL} for new emails...")
    emails = check_new_emails()
    print_email_summary(emails)
    
    # Return JSON for programmatic use
    if emails:
        print("\n" + json.dumps({"emails": emails, "count": len(emails)}, indent=2))


if __name__ == "__main__":
    main()
