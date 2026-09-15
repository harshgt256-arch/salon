/**
 * ============================================================================
 * NOIR STUDIO — DIRECT APPOINTMENT AUTOMATION (GOOGLE APPS SCRIPT)
 * ============================================================================
 *
 * Features:
 * 1. Webhook endpoint (doPost) for website booking submissions.
 * 2. Auto-records bookings into Google Sheets ("Bookings" sheet).
 * 3. Auto-creates events on Google Calendar with client details.
 * 4. Sends instant Email confirmation to client & salon owner.
 * 5. Sends WhatsApp confirmation / 24-hr reminder via Twilio WhatsApp API.
 * 6. Daily automatic scheduled trigger to send next-day appointment reminders.
 *
 * ----------------------------------------------------------------------------
 * SETUP INSTRUCTIONS (5 MINUTES):
 * ----------------------------------------------------------------------------
 * 1. Open Google Sheets (https://sheets.new).
 * 2. Rename the active sheet tab at the bottom to "Bookings".
 * 3. In Google Sheets, click Extensions > Apps Script.
 * 4. Delete any code in Code.gs and paste this entire file.
 * 5. Update the CONFIG object below with your details (Sheet ID, Twilio/Email).
 * 6. Click "Deploy" > "New deployment".
 *    - Type: Web app
 *    - Description: Salon Booking Backend
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 7. Click Deploy, authorize permissions, and copy the "Web app URL".
 * 8. Paste that Web App URL into your salon website (cta.js or window.SALON_BOOKING_WEBHOOK_URL).
 * 9. To enable Daily Reminders: Run the function `setupDailyReminderTrigger()` once in Apps Script!
 * ============================================================================
 */

const CONFIG = {
  // Salon Business Details
  SALON_NAME: "Noir Studio",
  SALON_OWNER_EMAIL: "owner@noir-studio.com", // Replace with salon manager's email
  SALON_PHONE: "+1 (310) 555-0000",
  SALON_ADDRESS: "450 N Rodeo Dr, Beverly Hills, CA",

  // Sheet Tab Name
  SHEET_NAME: "Bookings",

  // Twilio WhatsApp Configuration (Optional - leave blank if using Email only)
  TWILIO: {
    ACCOUNT_SID: "YOUR_TWILIO_ACCOUNT_SID",       // e.g. ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    AUTH_TOKEN: "YOUR_TWILIO_AUTH_TOKEN",         // e.g. xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    WHATSAPP_FROM: "whatsapp:+14155238886"        // Twilio Sandbox or approved sender number
  }
};

/**
 * Handle incoming POST requests from the website booking form
 */
function doPost(e) {
  try {
    let data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }

    const booking = {
      booking_id: "BK" + Date.now(),
      client_name: (data.name || data.client_name || "").trim(),
      client_email: (data.email || data.client_email || "").trim(),
      client_phone: (data.phone || data.client_phone || "").trim(),
      service_type: (data.service_type || "Hair Styling").trim(),
      preferred_date: (data.preferred_date || "").trim(),
      preferred_time: (data.preferred_time || "10:00").trim(),
      message: (data.message || "").trim(),
      status: "CONFIRMED",
      created_at: new Date().toISOString()
    };

    // Validation
    if (!booking.client_name || !booking.client_phone || !booking.preferred_date) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Missing required fields: Name, Phone, and Preferred Date are mandatory."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 1. Record to Google Sheet
    const sheet = getOrCreateBookingsSheet();
    sheet.appendRow([
      booking.booking_id,
      booking.client_name,
      booking.client_email,
      booking.client_phone,
      booking.service_type,
      booking.preferred_date,
      booking.preferred_time,
      booking.message,
      booking.status,
      booking.created_at
    ]);

    // 2. Create Google Calendar Event
    try {
      createCalendarEvent(booking);
    } catch (calErr) {
      Logger.log("Calendar creation error: " + calErr.toString());
    }

    // 3. Send Email Notification
    if (booking.client_email) {
      try {
        sendClientConfirmationEmail(booking);
      } catch (mailErr) {
        Logger.log("Email confirmation error: " + mailErr.toString());
      }
    }

    // 4. Send Instant WhatsApp Confirmation (if Twilio is configured)
    if (CONFIG.TWILIO.ACCOUNT_SID && !CONFIG.TWILIO.ACCOUNT_SID.includes("YOUR_")) {
      try {
        sendWhatsAppConfirmation(booking);
      } catch (waErr) {
        Logger.log("WhatsApp sending error: " + waErr.toString());
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      booking_id: booking.booking_id,
      message: "Appointment successfully booked and confirmed!"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Error handling booking: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET requests (Health check / status)
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    system: "Noir Studio Automated Booking Engine",
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Get or initialize the Bookings sheet with standard columns
 */
function getOrCreateBookingsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow([
      "booking_id",
      "client_name",
      "client_email",
      "client_phone",
      "service_type",
      "preferred_date",
      "preferred_time",
      "message",
      "status",
      "created_at"
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange("A1:J1").setFontWeight("bold").setBackground("#232323").setFontColor("#C9A96A");
  }
  return sheet;
}

/**
 * Add event to Default Google Calendar
 */
function createCalendarEvent(booking) {
  const cal = CalendarApp.getDefaultCalendar();
  if (!cal) return;

  const [year, month, day] = booking.preferred_date.split("-").map(Number);
  const [hours, minutes] = (booking.preferred_time || "10:00").split(":").map(Number);

  const startTime = new Date(year, month - 1, day, hours, minutes, 0);
  const endTime = new Date(startTime.getTime() + (90 * 60 * 1000)); // Default 90 min duration

  const title = `✨ ${CONFIG.SALON_NAME}: ${booking.service_type} - ${booking.client_name}`;
  const description = `
Service: ${booking.service_type}
Client: ${booking.client_name}
Phone: ${booking.client_phone}
Email: ${booking.client_email}
Booking ID: ${booking.booking_id}
Notes: ${booking.message || "None"}
  `.trim();

  cal.createEvent(title, startTime, endTime, {
    description: description,
    location: CONFIG.SALON_ADDRESS
  });
}

/**
 * Send Luxury HTML Confirmation Email to Client
 */
function sendClientConfirmationEmail(booking) {
  const subject = `Reservation Confirmed: ${booking.service_type} at ${CONFIG.SALON_NAME}`;
  const htmlBody = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background-color: #FDFAF5; border: 1px solid #E5DFD5; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #232323; color: #C9A96A; padding: 36px 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 26px; letter-spacing: 2px; text-transform: uppercase;">${CONFIG.SALON_NAME}</h1>
        <p style="margin: 6px 0 0; font-size: 14px; font-style: italic; color: #EDE8DF;">A Sanctuary for Women's Beauty</p>
      </div>
      <div style="padding: 36px 32px; color: #232323; line-height: 1.6;">
        <h2 style="font-size: 22px; color: #232323; margin-top: 0;">Reservation Confirmed</h2>
        <p>Dear <strong>${booking.client_name}</strong>,</p>
        <p>Your appointment has been reserved. We look forward to delivering an exceptional experience tailored specifically to you.</p>

        <div style="background-color: #FFFFFF; border: 1px solid #E5DFD5; border-radius: 6px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #767676;">Booking ID:</td><td style="font-weight: bold; color: #232323;">${booking.booking_id}</td></tr>
            <tr><td style="padding: 6px 0; color: #767676;">Service:</td><td style="font-weight: bold; color: #232323;">${booking.service_type}</td></tr>
            <tr><td style="padding: 6px 0; color: #767676;">Date:</td><td style="font-weight: bold; color: #232323;">${booking.preferred_date}</td></tr>
            <tr><td style="padding: 6px 0; color: #767676;">Time:</td><td style="font-weight: bold; color: #232323;">${booking.preferred_time}</td></tr>
            <tr><td style="padding: 6px 0; color: #767676;">Location:</td><td style="color: #232323;">${CONFIG.SALON_ADDRESS}</td></tr>
          </table>
        </div>

        <p style="font-size: 13px; color: #767676;">If you need to reschedule or have special requirements, please contact us at <a href="tel:${CONFIG.SALON_PHONE}" style="color: #A07C3B;">${CONFIG.SALON_PHONE}</a>.</p>
      </div>
      <div style="background-color: #F4EFE6; padding: 18px; text-align: center; font-size: 12px; color: #767676; border-top: 1px solid #E5DFD5;">
        ${CONFIG.SALON_NAME} &bull; ${CONFIG.SALON_ADDRESS}
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: booking.client_email,
    subject: subject,
    htmlBody: htmlBody
  });
}

/**
 * Send Instant WhatsApp Confirmation via Twilio API
 */
function sendWhatsAppConfirmation(booking) {
  const formattedPhone = formatWhatsAppNumber(booking.client_phone);
  const messageBody = `✨ *${CONFIG.SALON_NAME} — Reservation Confirmed* ✨\n\nDear *${booking.client_name}*,\nYour appointment for *${booking.service_type}* is confirmed for *${booking.preferred_date}* at *${booking.preferred_time}*.\n\n📍 *Location:* ${CONFIG.SALON_ADDRESS}\n\nWe look forward to welcoming you! Reply to this message if you need any assistance.`;

  sendTwilioWhatsApp(formattedPhone, messageBody);
}

/**
 * DAILY CRON REMINDER: Checks for appointments scheduled for tomorrow and sends reminders
 */
function sendDailyAppointmentReminders() {
  const sheet = getOrCreateBookingsSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  // Calculate tomorrow's date string YYYY-MM-DD
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = Utilities.formatDate(tomorrow, Session.getScriptTimeZone(), "yyyy-MM-dd");

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowDate = row[5] ? row[5].toString().trim() : "";
    const status = row[8] ? row[8].toString().trim() : "";
    const clientName = row[1];
    const clientPhone = row[3];
    const serviceType = row[4];
    const preferredTime = row[6];

    if (rowDate === tomorrowStr && status !== "CANCELLED" && status !== "REMINDER_SENT") {
      const formattedPhone = formatWhatsAppNumber(clientPhone);
      const reminderText = `✨ *Friendly Reminder from ${CONFIG.SALON_NAME}* ✨\n\nHi *${clientName}*,\nThis is a quick reminder for your *${serviceType}* appointment tomorrow (*${rowDate}*) at *${preferredTime}*.\n\n📍 *Address:* ${CONFIG.SALON_ADDRESS}\n\nPlease reply *YES* to confirm or reply to request a reschedule. See you tomorrow!`;

      if (CONFIG.TWILIO.ACCOUNT_SID && !CONFIG.TWILIO.ACCOUNT_SID.includes("YOUR_")) {
        try {
          sendTwilioWhatsApp(formattedPhone, reminderText);
          sheet.getRange(i + 1, 9).setValue("REMINDER_SENT");
          Logger.log(`Reminder sent to ${clientName} (${formattedPhone})`);
        } catch (e) {
          Logger.log(`Failed to send reminder to row ${i + 1}: ` + e.toString());
        }
      }
    }
  }
}

/**
 * Helper to trigger Twilio WhatsApp REST API
 */
function sendTwilioWhatsApp(toWhatsApp, bodyText) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${CONFIG.TWILIO.ACCOUNT_SID}/Messages.json`;
  const payload = {
    To: toWhatsApp,
    From: CONFIG.TWILIO.WHATSAPP_FROM,
    Body: bodyText
  };

  const options = {
    method: "post",
    headers: {
      "Authorization": "Basic " + Utilities.base64Encode(CONFIG.TWILIO.ACCOUNT_SID + ":" + CONFIG.TWILIO.AUTH_TOKEN)
    },
    payload: payload,
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  Logger.log("Twilio API response: " + response.getContentText());
}

/**
 * Format phone to whatsapp:+[country_code][number]
 */
function formatWhatsAppNumber(phone) {
  let clean = phone.replace(/[^\d+]/g, "");
  if (!clean.startsWith("+")) {
    if (clean.length === 10) {
      clean = "+91" + clean; // Default country code (adjust if needed e.g. +1 for US)
    } else {
      clean = "+" + clean;
    }
  }
  return "whatsapp:" + clean;
}

/**
 * RUN ONCE IN APPS SCRIPT: Creates daily trigger at 9:00 AM
 */
function setupDailyReminderTrigger() {
  // Clear existing triggers to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "sendDailyAppointmentReminders") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Create new 9 AM daily trigger
  ScriptApp.newTrigger("sendDailyAppointmentReminders")
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();

  Logger.log("Daily 9:00 AM Appointment Reminder Trigger successfully created!");
}
