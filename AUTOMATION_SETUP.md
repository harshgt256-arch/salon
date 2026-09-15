# 🚀 Noir Studio Salon Automation Setup Guide

This guide connects your **Noir Studio Salon Website** with your **n8n Automation Agent** (`Appointment - Booking - Agent (3).json`) to enable automated bookings, Google Sheets recording, Google Calendar scheduling, and automated WhatsApp/Email reminders.

---

## 📋 1. What Has Been Updated on Your Website

Your booking modal in `src/sections/cta.js` and `src/styles/main.css` has been updated to match the automation agent's exact schema:
- **`name`** (Client full name)
- **`phone`** (WhatsApp number)
- **`email`** (Email address)
- **`service_type`** (Selected salon service)
- **`preferred_date`** (Booking date `YYYY-MM-DD`)
- **`preferred_time`** (Booking slot `HH:MM`)
- **`message`** (Special requests / hair notes)

---

## ⚙️ 2. Step-by-Step Setup in n8n

### Step 1: Import the Workflow
1. Open your **n8n instance** (self-hosted, n8n Cloud, or Railway).
2. Go to **Workflows** > **Add Workflow** > Click `...` (top right) > **Import from File**.
3. Select your file: `/Users/jayeshpatel/Downloads/Appointment - Booking - Agent (3).json`.

### Step 2: Google Sheet Setup
Create a Google Sheet with a tab named `Bookings` and these exact column headers in row 1:
```
booking_id | client_name | client_email | client_phone | service_type | preferred_date | preferred_time | message | status | created_at
```
In the n8n workflow, connect your Google Sheets credentials and paste your **Google Sheet ID** in:
- `Google Sheets - Add Booking`
- `Google Sheets - Read Tomorrow`
- `Google Sheets - Update Status`

### Step 3: Connect Integrations in n8n
- **Google Calendar**: For auto-scheduling appointments and conflict checks.
- **Twilio**: For WhatsApp messages (replace `YOUR_TWILIO_WHATSAPP_NUMBER` with your Twilio WhatsApp sender).
- **Gmail**: For sending email confirmations.

### Step 4: Connect the Website to Your n8n Webhook
1. In n8n, click on the **📥 Booking Webhook** node.
2. Copy the **Production Webhook URL** (e.g. `https://your-n8n-domain.com/webhook/booking-request`).
3. You can set this URL globally in your website by adding this script before `main.js` in `index.html` or in `src/sections/cta.js`:
```html
<script>
  window.SALON_BOOKING_WEBHOOK_URL = "https://your-n8n-domain.com/webhook/booking-request";
</script>
```

---

## 📲 3. How the Automation Works

1. **Client Books on Website**:
   - Client selects service, date, time slot, and enters their phone/name.
   - Website posts the JSON payload directly to the n8n webhook.
2. **Instant Logging & Validation**:
   - n8n validates required fields, formats the timestamp, and creates a unique `booking_id` (`BK...`).
   - The booking is appended to the Google Sheet with status `CONFIRMED`.
   - Google Calendar event is automatically created.
3. **Instant Confirmation**:
   - Client receives instant WhatsApp booking confirmation & Email receipt.
4. **Daily 24h Reminder**:
   - The scheduled trigger runs daily at 9:00 AM.
   - It filters all bookings where `preferred_date == tomorrow`.
   - Sends automated WhatsApp reminder: *"Hi [Name] ✨ Your appointment for [Service] is tomorrow at [Time]. Reply YES to confirm."*

---
