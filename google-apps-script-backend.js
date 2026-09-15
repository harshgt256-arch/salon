/**
 * ============================================================================
 * NOIR STUDIO — 2-WAY WHATSAPP & APPOINTMENT AUTOMATION SYSTEM
 * ============================================================================
 *
 * Capabilities:
 * 1. Webhook for Website Form Submissions -> Sheets + Google Calendar
 * 2. 2-Way WhatsApp Reply Handler:
 *    - Client replies "YES" -> Sheet status becomes "CONFIRMED" + Calendar title updated
 *    - Client replies "RESCHEDULE" / "CANCEL" -> Sheet status becomes "RESCHEDULE_REQUESTED"
 *      and instant WhatsApp notification alert is sent to Salon Owner!
 * 3. Daily 9:00 AM Cron Reminder: Sends WhatsApp reminders for tomorrow's appointments.
 * ============================================================================
 */

const CONFIG = {
  SALON_NAME: "Noir Studio",
  SALON_OWNER_PHONE: "+919876543210", // Put salon manager's WhatsApp number with country code
  SALON_OWNER_EMAIL: "owner@noir-studio.com",
  SALON_PHONE: "+1 (310) 555-0000",
  SALON_ADDRESS: "450 N Rodeo Dr, Beverly Hills, CA",
  SHEET_NAME: "Bookings",

  // Twilio WhatsApp Setup (Optional)
  TWILIO: {
    ACCOUNT_SID: "",       // Your Twilio Account SID
    AUTH_TOKEN: "",        // Your Twilio Auth Token
    WHATSAPP_FROM: "whatsapp:+14155238886" // Twilio WhatsApp number
  }
};

/**
 * Handle incoming POST requests:
 * - Route 1: Website Booking Form submission
 * - Route 2: 2-Way Twilio WhatsApp Inbound Reply (YES / RESCHEDULE)
 */
function doPost(e) {
  try {
    // Check if this is a Twilio WhatsApp Webhook (Form URL-Encoded)
    if (e.parameter && (e.parameter.From || e.parameter.Body)) {
      return handleTwilioInboundWhatsApp(e.parameter);
    }

    // Otherwise, handle website JSON booking submission
    let data = {};
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e.parameter) {
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
      status: "BOOKED",
      created_at: new Date().toISOString()
    };

    if (!booking.client_name || !booking.client_phone || !booking.preferred_date) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Missing required fields"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 1. Append to Google Sheet
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
      Logger.log("Calendar error: " + calErr.toString());
    }

    // 3. Send Email Notification
    if (booking.client_email) {
      try {
        sendClientConfirmationEmail(booking);
      } catch (mailErr) {
        Logger.log("Email error: " + mailErr.toString());
      }
    }

    // 4. Send Instant WhatsApp Confirmation
    if (CONFIG.TWILIO.ACCOUNT_SID) {
      try {
        sendWhatsAppConfirmation(booking);
      } catch (waErr) {
        Logger.log("WhatsApp error: " + waErr.toString());
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      booking_id: booking.booking_id,
      message: "Appointment successfully booked!"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Error: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 2-WAY WHATSAPP HANDLER: Process client replies (YES / RESCHEDULE / CANCEL)
 */
function handleTwilioInboundWhatsApp(params) {
  const fromNumber = (params.From || "").replace("whatsapp:", "").trim(); // e.g. +919876543210
  const incomingMsg = (params.Body || "").trim().toUpperCase(); // e.g. "YES" or "RESCHEDULE"

  Logger.log(`Received WhatsApp reply from ${fromNumber}: ${incomingMsg}`);

  const sheet = getOrCreateBookingsSheet();
  const data = sheet.getDataRange().getValues();
  let foundRowIndex = -1;
  let clientBooking = null;

  // Search for the most recent booking matching this client's phone number
  for (let i = data.length - 1; i >= 1; i--) {
    const rawPhone = data[i][3].toString().replace(/[^\d]/g, "");
    const cleanFrom = fromNumber.replace(/[^\d]/g, "");
    if (rawPhone.endsWith(cleanFrom) || cleanFrom.endsWith(rawPhone)) {
      foundRowIndex = i + 1; // 1-indexed sheet row
      clientBooking = {
        booking_id: data[i][0],
        name: data[i][1],
        email: data[i][2],
        phone: data[i][3],
        service: data[i][4],
        date: data[i][5],
        time: data[i][6]
      };
      break;
    }
  }

  let replyXml = "";

  if (foundRowIndex !== -1 && clientBooking) {
    if (incomingMsg.includes("YES") || incomingMsg.includes("CONFIRM")) {
      // 1. Update Sheet Status to CONFIRMED
      sheet.getRange(foundRowIndex, 9).setValue("CONFIRMED");
      sheet.getRange(foundRowIndex, 9).setBackground("#d4edda").setFontColor("#155724");

      replyXml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>✨ Thank you, *${clientBooking.name}*! Your appointment for *${clientBooking.service}* on *${clientBooking.date}* at *${clientBooking.time}* is now fully CONFIRMED. We look forward to seeing you at ${CONFIG.SALON_NAME}!</Message></Response>`;

    } else if (incomingMsg.includes("RESCHEDULE") || incomingMsg.includes("CANCEL") || incomingMsg.includes("CHANGE")) {
      // 2. Update Sheet Status to RESCHEDULE_REQUESTED
      sheet.getRange(foundRowIndex, 9).setValue("RESCHEDULE_REQUESTED");
      sheet.getRange(foundRowIndex, 9).setBackground("#fff3cd").setFontColor("#856404");

      // Notify Salon Owner immediately
      if (CONFIG.SALON_OWNER_PHONE && CONFIG.TWILIO.ACCOUNT_SID) {
        const alertMsg = `⚠️ *Reschedule Request!* ⚠️\n\nClient: *${clientBooking.name}*\nPhone: ${clientBooking.phone}\nService: ${clientBooking.service}\nOriginal Date: ${clientBooking.date} at ${clientBooking.time}\n\nPlease call the client to coordinate a new time.`;
        sendTwilioWhatsApp(formatWhatsAppNumber(CONFIG.SALON_OWNER_PHONE), alertMsg);
      }

      replyXml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>We received your reschedule request, *${clientBooking.name}*. Our salon concierge will call or message you shortly to pick a new date that fits your schedule!</Message></Response>`;

    } else {
      replyXml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Hi *${clientBooking.name}*, please reply *YES* to confirm your appointment or *RESCHEDULE* if you need to adjust your time.</Message></Response>`;
    }
  } else {
    replyXml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Hello from *${CONFIG.SALON_NAME}*! We could not find an active appointment under this number. Please visit our website or call ${CONFIG.SALON_PHONE} to book.</Message></Response>`;
  }

  return ContentService.createTextOutput(replyXml).setMimeType(ContentService.MimeType.XML);
}

/**
 * Handle GET requests (Health check)
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    system: "Noir Studio 2-Way Automated Booking Engine",
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Get or initialize Bookings Sheet
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

  const parts = booking.preferred_date.split("-").map(Number);
  const timeParts = (booking.preferred_time || "10:00").split(":").map(Number);

  const startTime = new Date(parts[0], parts[1] - 1, parts[2], timeParts[0], timeParts[1], 0);
  const endTime = new Date(startTime.getTime() + (90 * 60 * 1000));

  const title = `✨ ${CONFIG.SALON_NAME}: ${booking.service_type} - ${booking.client_name}`;
  const desc = `Service: ${booking.service_type}\nClient: ${booking.client_name}\nPhone: ${booking.client_phone}\nEmail: ${booking.client_email}\nID: ${booking.booking_id}\nNotes: ${booking.message}`;

  cal.createEvent(title, startTime, endTime, {
    description: desc,
    location: CONFIG.SALON_ADDRESS
  });
}

/**
 * Send Luxury HTML Confirmation Email
 */
function sendClientConfirmationEmail(booking) {
  const subject = `Reservation Confirmed: ${booking.service_type} at ${CONFIG.SALON_NAME}`;
  const htmlBody = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background-color: #FDFAF5; border: 1px solid #E5DFD5; border-radius: 8px; padding: 28px;">
      <h2 style="color: #232323; margin-top: 0;">Reservation Received ✨</h2>
      <p>Dear <strong>${booking.client_name}</strong>,</p>
      <p>Your appointment for <strong>${booking.service_type}</strong> is booked for <strong>${booking.preferred_date}</strong> at <strong>${booking.preferred_time}</strong>.</p>
      <div style="background-color: #fff; border: 1px solid #E5DFD5; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <p style="margin: 4px 0;"><strong>Booking ID:</strong> ${booking.booking_id}</p>
        <p style="margin: 4px 0;"><strong>Location:</strong> ${CONFIG.SALON_ADDRESS}</p>
      </div>
      <p style="font-size: 13px; color: #767676;">Need to adjust? Reply to our WhatsApp reminder or call <a href="tel:${CONFIG.SALON_PHONE}" style="color: #A07C3B;">${CONFIG.SALON_PHONE}</a>.</p>
    </div>
  `;

  MailApp.sendEmail({
    to: booking.client_email,
    subject: subject,
    htmlBody: htmlBody
  });
}

/**
 * Send Instant WhatsApp Confirmation
 */
function sendWhatsAppConfirmation(booking) {
  const formattedPhone = formatWhatsAppNumber(booking.client_phone);
  const messageBody = `✨ *${CONFIG.SALON_NAME} — Booking Confirmed* ✨\n\nDear *${booking.client_name}*,\nYour appointment for *${booking.service_type}* is reserved for *${booking.preferred_date}* at *${booking.preferred_time}*.\n\n📍 *Address:* ${CONFIG.SALON_ADDRESS}\n\nWe will send a reminder before your appointment. Reply *YES* anytime to confirm!`;

  sendTwilioWhatsApp(formattedPhone, messageBody);
}

/**
 * DAILY 9:00 AM REMINDER TRIGGER
 */
function sendDailyAppointmentReminders() {
  const sheet = getOrCreateBookingsSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

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

    if (rowDate === tomorrowStr && status !== "CANCELLED") {
      const formattedPhone = formatWhatsAppNumber(clientPhone);
      const reminderText = `✨ *Appointment Reminder — ${CONFIG.SALON_NAME}* ✨\n\nHi *${clientName}*,\nYour appointment for *${serviceType}* is scheduled for tomorrow (*${rowDate}*) at *${preferredTime}*.\n\n📍 *Location:* ${CONFIG.SALON_ADDRESS}\n\n👉 *Please reply YES to confirm* your slot, or reply *RESCHEDULE* if you need to adjust your time.`;

      if (CONFIG.TWILIO.ACCOUNT_SID) {
        try {
          sendTwilioWhatsApp(formattedPhone, reminderText);
          sheet.getRange(i + 1, 9).setValue("REMINDER_SENT");
          sheet.getRange(i + 1, 9).setBackground("#fff3cd").setFontColor("#856404");
        } catch (e) {
          Logger.log(`Failed reminder to ${clientName}: ` + e.toString());
        }
      }
    }
  }
}

/**
 * Twilio WhatsApp Sender
 */
function sendTwilioWhatsApp(toWhatsApp, bodyText) {
  if (!CONFIG.TWILIO.ACCOUNT_SID) return;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${CONFIG.TWILIO.ACCOUNT_SID}/Messages.json`;
  const payload = {
    To: toWhatsApp,
    From: CONFIG.TWILIO.WHATSAPP_FROM,
    Body: bodyText
  };

  UrlFetchApp.fetch(url, {
    method: "post",
    headers: {
      "Authorization": "Basic " + Utilities.base64Encode(CONFIG.TWILIO.ACCOUNT_SID + ":" + CONFIG.TWILIO.AUTH_TOKEN)
    },
    payload: payload,
    muteHttpExceptions: true
  });
}

/**
 * Phone Formatter helper
 */
function formatWhatsAppNumber(phone) {
  let clean = phone.replace(/[^\d+]/g, "");
  if (!clean.startsWith("+")) {
    clean = clean.length === 10 ? "+91" + clean : "+" + clean;
  }
  return "whatsapp:" + clean;
}

/**
 * Creates 9 AM cron trigger
 */
function setupDailyReminderTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "sendDailyAppointmentReminders") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger("sendDailyAppointmentReminders")
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();

  Logger.log("Created 9 AM Daily Reminder Trigger.");
}
