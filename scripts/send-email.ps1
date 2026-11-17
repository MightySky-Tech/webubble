#Requires -Version 5.0
<#
.SYNOPSIS
    Send emails from enquiries@mightyskytech.com using PowerShell
    
.DESCRIPTION
    Official email utility for MightySky Tech business communications
    Supports HTML and text emails, attachments, CC/BCC
    
.PARAMETER To
    Recipient email address (required)
    
.PARAMETER Subject
    Email subject (required)
    
.PARAMETER Body
    Email body content (required)
    
.PARAMETER IsHtml
    Use HTML formatting (default: $false)
    
.PARAMETER CC
    CC recipients (optional, comma-separated)
    
.PARAMETER BCC
    BCC recipients (optional, comma-separated)
    
.PARAMETER Attachments
    Array of attachment file paths (optional)
    
.EXAMPLE
    # Send simple text email
    .\send-email.ps1 -To "client@example.com" -Subject "Project Update" -Body "Work is complete"
    
.EXAMPLE
    # Send HTML email with attachment
    .\send-email.ps1 -To "client@example.com" -Subject "Invoice" -Body "<h1>Invoice</h1>" -IsHtml -Attachments "invoice.pdf"
    
.EXAMPLE
    # Send with CC
    .\send-email.ps1 -To "client@example.com" -Subject "Test" -Body "Test email" -CC "manager@company.com"
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidatePattern("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")]
    [string]$To,
    
    [Parameter(Mandatory=$true)]
    [string]$Subject,
    
    [Parameter(Mandatory=$true)]
    [string]$Body,
    
    [switch]$IsHtml,
    
    [string]$CC,
    
    [string]$BCC,
    
    [string[]]$Attachments
)

# Load configuration
$configPath = Join-Path (Split-Path $PSScriptRoot) "email-config.json"
if (-not (Test-Path $configPath)) {
    Write-Host "❌ Email configuration not found at: $configPath" -ForegroundColor Red
    Write-Host "   Please run email setup first" -ForegroundColor Yellow
    exit 1
}

try {
    $config = Get-Content $configPath | ConvertFrom-Json
} catch {
    Write-Host "❌ Failed to load email configuration: $_" -ForegroundColor Red
    exit 1
}

# Create secure credential
try {
    $securePassword = ConvertTo-SecureString $config.encryptedPassword -AsPlainText -Force
    $credential = New-Object System.Management.Automation.PSCredential($config.username, $securePassword)
} catch {
    Write-Host "❌ Failed to create credentials: $_" -ForegroundColor Red
    exit 1
}

# Create email message
try {
    $mailMessage = New-Object System.Net.Mail.MailMessage
    $mailMessage.From = $config.emailAddress
    $mailMessage.To.Add($To)
    $mailMessage.Subject = $Subject
    $mailMessage.Body = $Body
    $mailMessage.IsBodyHtml = $IsHtml
    
    # Add CC recipients
    if ($CC) {
        $CC.Split(",") | ForEach-Object {
            $mailMessage.CC.Add($_.Trim())
        }
    }
    
    # Add BCC recipients
    if ($BCC) {
        $BCC.Split(",") | ForEach-Object {
            $mailMessage.Bcc.Add($_.Trim())
        }
    }
    
    # Add attachments
    if ($Attachments) {
        foreach ($attachment in $Attachments) {
            if (Test-Path $attachment) {
                $mailMessage.Attachments.Add((New-Object System.Net.Mail.Attachment($attachment)))
            } else {
                Write-Host "⚠️  Attachment not found: $attachment" -ForegroundColor Yellow
            }
        }
    }
    
    # Send email
    $smtpClient = New-Object Net.Mail.SmtpClient($config.smtpServer, $config.smtpPort)
    $smtpClient.EnableSSL = $true
    $smtpClient.Credentials = $credential
    $smtpClient.Timeout = 10000
    
    Write-Host "📧 Sending email..." -ForegroundColor Cyan
    $smtpClient.Send($mailMessage)
    $smtpClient.Dispose()
    
    Write-Host "✅ Email sent successfully!" -ForegroundColor Green
    Write-Host "   From: $($config.emailAddress)" -ForegroundColor Gray
    Write-Host "   To: $To" -ForegroundColor Gray
    Write-Host "   Subject: $Subject" -ForegroundColor Gray
    
    if ($CC) {
        Write-Host "   CC: $CC" -ForegroundColor Gray
    }
    if ($BCC) {
        Write-Host "   BCC: $BCC" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ Failed to send email: $_" -ForegroundColor Red
    exit 1
}
