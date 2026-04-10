# InnoDeploy Notification & Email Setup Guide

Complete guide to configure email, Slack, Discord, and other notification channels in InnoDeploy.

## Table of Contents
1. [Email Configuration (SMTP)](#email-configuration-smtp)
2. [Slack Integration](#slack-integration)
3. [Discord Integration](#discord-integration)
4. [Testing Notifications](#testing-notifications)
5. [Troubleshooting](#troubleshooting)

---

## Email Configuration (SMTP)

Email is required for:
- User registration verification
- Password reset instructions
- Alert notifications
- System communications

### Using Gmail (Recommended for Development)

**Prerequisites:**
- Google Account
- 2-factor authentication enabled (required for app passwords)

**Steps:**

1. **Generate App Password**
   - Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Windows Computer"
   - Copy the 16-character password

2. **Update `.env` file:**
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx  # 16-char app password
   SMTP_FROM=noreply@innodeploy.com
   ```

3. **Restart Backend:**
   ```bash
   npm run dev  # HotReload will automatically restart
   ```

4. **Verify Connection:**
   ```bash
   # Check logs for: ✅ Email service connected successfully
   ```

### Using Other SMTP Providers

**SendGrid:**
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your-sendgrid-api-key
```

**AWS SES:**
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com  # Your region
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
```

**Mailgun:**
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
```

---

## Slack Integration

**Features:**
- Real-time alert notifications
- Color-coded severity levels (blue=info, orange=warning, red=critical)
- Project metrics and status updates

### Setup Steps

1. **Create Slack Webhook**
   - Go to [api.slack.com/apps](https://api.slack.com/apps)
   - Click "Create New App" → "From scratch"
   - Name: "InnoDeploy"
   - Select your workspace
   - Go to "Incoming Webhooks" → "Add New Webhook to Workspace"
   - Select channel (e.g., #alerts)
   - Copy the Webhook URL

2. **Update `.env` file:**
   ```bash
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   ```

3. **Update Organization in MongoDB:**
   ```javascript
   db.organisations.updateOne(
     { _id: ObjectId("your-org-id") },
     {
       $set: {
         "notificationChannels.slackWebhook": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
         "notificationChannels.slackEnabled": true
       }
     }
   )
   ```

4. **Test in Dashboard:**
   - Go to Settings → Alert Rules
   - Click "Test Notification"
   - You should see a message in Slack

---

## Discord Integration

**Features:**
- Embedded alert messages with color coding
- Service name and severity information
- Timestamp tracking

### Setup Steps

1. **Create Discord Webhook**
   - In Discord, right-click on a channel
   - Select "Edit Channel"
   - Go to "Webhooks" tab
   - Click "Create Webhook"
   - Name: "InnoDeploy"
   - Copy the Webhook URL

2. **Update `.env` file:**
   ```bash
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK
   ```

3. **Update Organization in MongoDB:**
   ```javascript
   db.organisations.updateOne(
     { _id: ObjectId("your-org-id") },
     {
       $set: {
         "notificationChannels.discordWebhook": "https://discord.com/api/webhooks/YOUR/WEBHOOK",
         "notificationChannels.discordEnabled": true
       }
     }
   )
   ```

4. **Test:** Use the "Test Notification" button in dashboard

---

## Testing Notifications

### Via API

```bash
curl -X POST http://localhost:5000/api/alerts/rules/test-notification \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

### Via Dashboard

1. Login to `http://localhost:3000`
2. Navigate to Settings → Alert Rules
3. Scroll to "Notification Channels"
4. Configure SMTP, Slack, Discord credentials
5. Click "Test Notification"

### Expected Results

- **Email:** Test email should arrive in inbox
- **Slack:** Message should appear in configured channel
- **Discord:** Embedded message should appear in channel

---

## Configuration Reference

### Environment Variables

```bash
# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
SMTP_FROM=noreply@innodeploy.com

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX

# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/XXX

# Frontend
CLIENT_URL=http://localhost:3000
```

### Organization Settings (MongoDB)

```javascript
{
  "notificationChannels": {
    "emailEnabled": true,
    "emailRecipients": ["admin@company.com"],  // or empty to use org members
    "slackEnabled": true,
    "slackWebhook": "https://hooks.slack.com/...",
    "discordEnabled": true,
    "discordWebhook": "https://discord.com/api/...",
    "expoEnabled": false,
    "webhookEnabled": false,
    "smtpHost": "smtp.gmail.com",
    "smtpPort": 587,
    "smtpUsername": "your-email@gmail.com",
    "smtpPassword": "your-password",
    "smtpFromEmail": "noreply@innodeploy.com"
  }
}
```

---

## Troubleshooting

### Email Not Sending

**Check:** Email service initialization
```
✅ Email service connected successfully
```

**Problem:** "Email service not configured"
- **Fix:** Verify SMTP_* env variables are set correctly
- **Reset:** `npm run dev` to reload environment

**Problem:** "Gmail authentication failed"
- **Fix:** Use app-specific password, not regular password
- **Link:** [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

**Problem:** Port issues
- **Port 465:** Use `secure: true` (TLS)
- **Port 587:** Use `secure: false` (STARTTLS)
- **Port 25:** Not recommended (often blocked)

### Slack/Discord Not Sending

**Check 1:** Webhook URL is correct
```bash
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"text":"Test"}'
```

**Check 2:** Webhook is enabled in Discord/Slack settings

**Check 3:** Organisation has webhook configured in MongoDB

### Verification Emails Not Sending

**Cause:** Email service not initialized
```
⚠️ Email service not configured
```

**Fix:** Restart backend after setting SMTP env variables

---

## Email Verification Flow

When users register:

1. User creates account with email
2. Backend generates verification token
3. Email service sends verification email
4. User clicks link in email: `/auth/verify-email?token=...`
5. Token verified and email marked as verified
6. User redirected to dashboard

**If email doesn't arrive:**
- Check spam/junk folder
- Check SMTP configuration in env
- Check backend logs for errors
- Use "Resend Verification Email" button on verification page

---

## Production Checklist

- [ ] Email service configured (SMTP_HOST, SMTP_USER, SMTP_PASS)
- [ ] Slack webhook configured (if using Slack)
- [ ] Discord webhook configured (if using Discord)
- [ ] Alert rules configured in Organisation settings
- [ ] Test notification successfully sent to all channels
- [ ] Email verification tested (signup and verify)
- [ ] Password reset email tested
- [ ] Monitoring alerts tested

---

## Support

For issues or questions:
1. Check logs: `npm run dev` output
2. Review MongoDB organisation settings
3. Test webhooks with curl
4. Check environment variables loaded correctly
