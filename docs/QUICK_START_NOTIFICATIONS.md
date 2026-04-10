# 🚀 Quick Start: Notifications Setup (5 Minutes)

This guide gets your InnoDeploy notifications working in minutes.

## Prerequisites
- MongoDB running
- Redis running
- Backend running (`npm run dev`)
- Dashboard running (`npm run dev`)

---

## Step 1: Configure Email (SMTP)

### Gmail (Recommended)

1. **Get Gmail App Password:**
   - Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - 2FA must be enabled
   - Select **Mail** and **Windows Computer**
   - Copy the 16-character password

2. **Update `backend/.env`:**
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx
   SMTP_FROM=your-email@gmail.com
   ```

3. **Restart Backend:**
   - Stop: `Ctrl+C`
   - Start: `npm run dev`
   - Look for: ✅ Email service connected successfully

---

## Step 2: Configure Slack (Optional)

1. **Create Slack Webhook:**
   - Go to [api.slack.com/apps](https://api.slack.com/apps)
   - Click "Create New App" 
   - Enter name: **InnoDeploy**
   - Go to **Incoming Webhooks**
   - Click **Add New Webhook to Workspace**
   - Select your #alerts channel
   - Copy webhook URL

2. **Update `backend/.env`:**
   ```bash
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   ```

3. **Restart backend:** `npm run dev`

---

## Step 3: Configure Discord (Optional)

1. **Create Discord Webhook:**
   - Right-click a Discord channel
   - **Edit Channel** → **Webhooks**
   - **Create Webhook**
   - Name: **InnoDeploy**
   - Copy Webhook URL

2. **Update `backend/.env`:**
   ```bash
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK
   ```

3. **Restart backend:** `npm run dev`

---

## Step 4: Test Everything

### Via Dashboard

1. Go to `http://localhost:3000/dashboard`
2. Click **Settings** → **Alert Rules**
3. Scroll to **Notification Channels**
4. Click **Test Notification**

### Expected Results

- ✅ Email arrives to inbox
- ✅ Slack message appears
- ✅ Discord message appears

---

## Step 5: Register New User

1. Go to `http://localhost:3000/register`
2. Fill in the form
3. **Verification email should arrive** (check inbox/spam)
4. Click verification link
5. Dashboard access confirmed ✅

---

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Email not sending | Check SMTP settings, verify password not in app |
| "Email service not configured" | Ensure SMTP_HOST, SMTP_USER, SMTP_PASS are set |
| Gmail auth failed | Use app password, not regular password |
| Slack/Discord not receiving | Verify webhook URL is correct, restart backend |
| Verification email missing | Check spam, verify SMTP is configured |

---

## Environment Variables Cheat Sheet

```bash
# Required for Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
SMTP_FROM=your-email@gmail.com

# Optional for Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Optional for Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Frontend
CLIENT_URL=http://localhost:3000
```

---

## What Now Works

✅ **Email Verification**
- Signup → Email verification → Dashboard

✅ **Password Reset**
- Forgot password → Email with reset link

✅ **Alert Notifications**
- CPU/Memory/Disk alerts → Email/Slack/Discord

✅ **System Emails**
- All system notifications via configured channels

---

## Next Steps

1. **Monitor Your Project**
   - Deploy something
   - Check alerts in Slack/Discord/Email

2. **Configure Alert Rules**
   - Set CPU, Memory, Latency thresholds
   - Choose notification channels per rule

3. **Add Team Members**
   - Invite users to organization
   - They'll get verification emails automatically

---

## Help & Support

For detailed setup:
- See [NOTIFICATION_SETUP.md](./NOTIFICATION_SETUP.md)

To configure via script:
```bash
cd backend
node setup-notifications.js
```

---

**You're all set! 🎉**
