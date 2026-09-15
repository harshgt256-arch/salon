/**
 * ============================================================================
 * NOIR STUDIO — 1-CLICK OWNER APPROVAL & BOOKING ENGINE (EMAIL & WHATSAPP)
 * ============================================================================
 *
 * Flow:
 * 1. Client books on website -> Sheet status: "PENDING_APPROVAL".
 * 2. Client gets instant acknowledgement Email.
 * 3. Salon Owner gets:
 *    - 📧 VIP Email Alert with 1-Click [ACCEPT] and [DECLINE] buttons.
 *    - 💬 WhatsApp Message with 1-Click Action Links to Accept/Decline directly from phone.
 * 4. When Owner taps/clicks ACCEPT:
 *    - Status -> "CONFIRMED" (Green in Google Sheets)
 *    - Event is automatically created on Google Calendar!
 *    - Client receives official confirmation Email & WhatsApp.
 * 5. When Owner taps/clicks DECLINE:
 *    - Status -> "DECLINED" (Red in Google Sheets)
 *    - Client receives polite reschedule notice.
 * ============================================================================
 */

const CONFIG = {
  SALON_NAME: "Noir Studio",
  SALON_OWNER_EMAIL: "harshvasava062@gmail.com", // <-- Set your email to receive approval alerts!
  SALON_OWNER_PHONE: "+919876543210",          // <-- Owner's WhatsApp number (with country code e.g. +91...)
  SALON_PHONE: "+1 (310) 555-0000",
  SALON_ADDRESS: "450 N Rodeo Dr, Beverly Hills, CA",
  SHEET_NAME: "Bookings",

  // Twilio WhatsApp Setup (Free Sandbox or Production Account)
  TWILIO: {
    ACCOUNT_SID: "", // <-- Paste your Twilio Account SID here
    AUTH_TOKEN: "",  // <-- Paste your Twilio Auth Token here
    WHATSAPP_FROM: "whatsapp:+14155238886" // Twilio WhatsApp Sender Number
  }
};

/**
 * Handle incoming POST requests:
 * 1. Website Form Submission -> Logs PENDING booking & sends Approval Request to Owner (Email + WhatsApp)
 * 2. Inbound Twilio WhatsApp Webhook (e.g. Owner replies YES/NO to WhatsApp)
 */
function doPost(e) {
  try {
    if (e.parameter && (e.parameter.From || e.parameter.Body)) {
      return handleTwilioInboundWhatsApp(e.parameter);
    }

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
      status: "PENDING_APPROVAL",
      created_at: new Date().toISOString()
    };

    if (!booking.client_name || !booking.client_phone || !booking.preferred_date) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Missing required fields"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 1. Append to Sheet as PENDING_APPROVAL
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

    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 9).setBackground("#fff3cd").setFontColor("#856404").setFontWeight("bold");

    // 2. Send "Request Received" Email to Client
    if (booking.client_email) {
      try {
        sendClientRequestReceivedEmail(booking);
      } catch (mailErr) {
        Logger.log("Client email error: " + mailErr.toString());
      }
    }

    // 3. Send 1-Click Actionable Approval Email to Salon Owner
    try {
      sendOwnerApprovalEmail(booking);
    } catch (ownerErr) {
      Logger.log("Owner approval email error: " + ownerErr.toString());
    }

    // 4. Send 1-Click Actionable WhatsApp Message to Salon Owner
    try {
      sendOwnerApprovalWhatsApp(booking);
    } catch (waErr) {
      Logger.log("Owner WhatsApp error: " + waErr.toString());
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      booking_id: booking.booking_id,
      status: "PENDING_APPROVAL",
      message: "Request received! Salon manager will approve your slot shortly."
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
 * Handle GET requests:
 * 1. Health check
 * 2. 1-Click Owner Actions from Email / WhatsApp Links: ?action=accept&id=BK... or ?action=decline&id=BK...
 */
function doGet(e) {
  const params = e.parameter || {};
  const action = (params.action || "").toLowerCase();
  const bookingId = (params.id || "").trim();

  // If this is a 1-Click Action from Owner's Email or WhatsApp:
  if (action && bookingId) {
    return handleOwnerDecision(action, bookingId);
  }

  // Otherwise, default Health Check response
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    system: "Noir Studio 1-Click Approval Engine",
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * PROCESS OWNER 1-CLICK DECISION (ACCEPT or DECLINE)
 */
function handleOwnerDecision(action, bookingId) {
  const sheet = getOrCreateBookingsSheet();
  const data = sheet.getDataRange().getValues();
  let foundRow = -1;
  let booking = null;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().trim() === bookingId) {
      foundRow = i + 1; // 1-indexed row
      booking = {
        booking_id: data[i][0],
        client_name: data[i][1],
        client_email: data[i][2],
        client_phone: data[i][3],
        service_type: data[i][4],
        preferred_date: data[i][5],
        preferred_time: data[i][6],
        message: data[i][7],
        current_status: data[i][8]
      };
      break;
    }
  }

  if (foundRow === -1 || !booking) {
    return HtmlService.createHtmlOutput(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h2 style="color: #dc3545;">⚠️ Booking Not Found</h2>
        <p>Could not locate booking ID: <strong>${bookingId}</strong>.</p>
      </div>
    `);
  }

  if (action === "accept") {
    // 1. Update Sheet Status to CONFIRMED
    sheet.getRange(foundRow, 9).setValue("CONFIRMED");
    sheet.getRange(foundRow, 9).setBackground("#d4edda").setFontColor("#155724").setFontWeight("bold");

    // 2. Create Google Calendar Event
    try {
      createCalendarEvent(booking);
    } catch (e) {
      Logger.log("Calendar error: " + e.toString());
    }

    // 3. Send Official Confirmation Email to Client
    if (booking.client_email) {
      try {
        sendClientOfficiallyConfirmedEmail(booking);
      } catch (e) {
        Logger.log("Confirmation email error: " + e.toString());
      }
    }

    // 4. Send WhatsApp Confirmation to Client
    try {
      sendClientWhatsAppConfirmation(booking);
    } catch (e) {
      Logger.log("Client WhatsApp error: " + e.toString());
    }

    return HtmlService.createHtmlOutput(`
      <div style="font-family: sans-serif; max-width: 500px; margin: 60px auto; text-align: center; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 40px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <div style="width: 60px; height: 60px; background: #28a745; color: #fff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px; margin-bottom: 20px;">✓</div>
        <h2 style="color: #155724; margin-top: 0;">Appointment Confirmed!</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
          You approved <strong>${booking.client_name}</strong> for <strong>${booking.service_type}</strong> on <strong>${booking.preferred_date}</strong> at <strong>${booking.preferred_time}</strong>.
        </p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 14px; text-align: left;">
          <div>📅 <strong>Google Calendar:</strong> Event automatically added</div>
          <div style="margin-top: 6px;">✉️ <strong>Client Notification:</strong> Confirmation email & WhatsApp dispatched</div>
        </div>
        <p style="color: #888; font-size: 12px;">You may now close this tab.</p>
      </div>
    `);

  } else if (action === "decline") {
    // 1. Update Sheet Status to DECLINED
    sheet.getRange(foundRow, 9).setValue("DECLINED");
    sheet.getRange(foundRow, 9).setBackground("#f8d7da").setFontColor("#721c24").setFontWeight("bold");

    // 2. Send Polite Reschedule Email to Client
    if (booking.client_email) {
      try {
        sendClientDeclinedEmail(booking);
      } catch (e) {
        Logger.log("Decline email error: " + e.toString());
      }
    }

    // 3. Send Polite Reschedule WhatsApp to Client
    try {
      sendClientWhatsAppDeclined(booking);
    } catch (e) {
      Logger.log("Client decline WhatsApp error: " + e.toString());
    }

    return HtmlService.createHtmlOutput(`
      <div style="font-family: sans-serif; max-width: 500px; margin: 60px auto; text-align: center; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 40px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <div style="width: 60px; height: 60px; background: #dc3545; color: #fff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 20px;">✕</div>
        <h2 style="color: #721c24; margin-top: 0;">Appointment Declined</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
          You marked this slot as unavailable for <strong>${booking.client_name}</strong>. A polite reschedule notification has been sent to the client.
        </p>
        <p style="color: #888; font-size: 12px; margin-top: 20px;">You may now close this tab.</p>
      </div>
    `);
  }
}

/**
 * 📲 Send 1-Click Actionable WhatsApp Message to Salon Owner
 */
function sendOwnerApprovalWhatsApp(booking) {
  if (!CONFIG.TWILIO.ACCOUNT_SID || !CONFIG.TWILIO.AUTH_TOKEN) {
    Logger.log("Twilio credentials not configured, skipping owner WhatsApp.");
    return;
  }

  const scriptUrl = ScriptApp.getService().getUrl();
  const acceptUrl = `${scriptUrl}?action=accept&id=${booking.booking_id}`;
  const declineUrl = `${scriptUrl}?action=decline&id=${booking.booking_id}`;

  const message =
    `🔔 *NEW APPOINTMENT REQUEST*\n\n` +
    `👤 *Client:* ${booking.client_name}\n` +
    `💇 *Service:* ${booking.service_type}\n` +
    `📅 *Date:* ${booking.preferred_date}\n` +
    `⏰ *Time:* ${booking.preferred_time}\n` +
    `📞 *Phone:* ${booking.client_phone}\n` +
    `📝 *Notes:* ${booking.message || 'None'}\n\n` +
    `👉 *Tap to Accept & Add to Calendar:*\n${acceptUrl}\n\n` +
    `👉 *Tap to Decline / Slot Full:*\n${declineUrl}`;

  sendTwilioWhatsApp(CONFIG.SALON_OWNER_PHONE, message);
}

/**
 * Send 1-Click Actionable Email to Salon Owner
 */
function sendOwnerApprovalEmail(booking) {
  const scriptUrl = ScriptApp.getService().getUrl();
  const acceptUrl = `${scriptUrl}?action=accept&id=${booking.booking_id}`;
  const declineUrl = `${scriptUrl}?action=decline&id=${booking.booking_id}`;

  const subject = `🔔 [ACTION REQUIRED] New Booking Request: ${booking.client_name} (${booking.preferred_date} @ ${booking.preferred_time})`;

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #E0E0E0; border-radius: 8px; overflow: hidden;">
      <div style="background: #232323; color: #C9A96A; padding: 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">New Appointment Request</h2>
        <p style="margin: 4px 0 0; font-size: 13px; color: #EDE8DF;">${CONFIG.SALON_NAME} Concierge</p>
      </div>

      <div style="padding: 24px 28px; color: #333; line-height: 1.6;">
        <p style="font-size: 15px; margin-top: 0;">A client has requested an appointment slot. Please review and approve:</p>

        <div style="background: #F9F7F4; border: 1px solid #E5DFD5; padding: 16px; margin: 16px 0; font-size: 14px; border-radius: 6px;">
          <p style="margin: 4px 0;"><strong>👤 Client:</strong> ${booking.client_name}</p>
          <p style="margin: 4px 0;"><strong>💇 Service:</strong> ${booking.service_type}</p>
          <p style="margin: 4px 0;"><strong>📅 Date:</strong> ${booking.preferred_date}</p>
          <p style="margin: 4px 0;"><strong>⏰ Time Slot:</strong> ${booking.preferred_time}</p>
          <p style="margin: 4px 0;"><strong>📞 WhatsApp:</strong> <a href="https://wa.me/${booking.client_phone.replace(/[^\d]/g, '')}">${booking.client_phone}</a></p>
          <p style="margin: 4px 0;"><strong>✉️ Email:</strong> ${booking.client_email || 'Not provided'}</p>
          <p style="margin: 4px 0;"><strong>📝 Notes:</strong> ${booking.message || 'None'}</p>
        </div>

        <p style="font-size: 14px; font-weight: bold; margin-bottom: 12px;">Are you available for this appointment?</p>

        <!-- 1-Click Action Buttons -->
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="width: 48%; text-align: center;">
              <a href="${acceptUrl}" style="display: block; background: #28a745; color: #ffffff; text-decoration: none; padding: 14px 20px; border-radius: 6px; font-weight: bold; font-size: 15px;">
                ✅ Accept & Add to Calendar
              </a>
            </td>
            <td style="width: 4%;"></td>
            <td style="width: 48%; text-align: center;">
              <a href="${declineUrl}" style="display: block; background: #dc3545; color: #ffffff; text-decoration: none; padding: 14px 20px; border-radius: 6px; font-weight: bold; font-size: 15px;">
                ❌ Decline / Slot Full
              </a>
            </td>
          </tr>
        </table>

        <small style="color: #888; font-size: 12px; display: block; text-align: center;">Clicking 'Accept' will automatically update Google Calendar and send the confirmation receipt to the client.</small>
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: CONFIG.SALON_OWNER_EMAIL,
    subject: subject,
    htmlBody: htmlBody
  });
}

/**
 * Step 1: Send "Request Received / Pending Review" Email to Client
 */
function sendClientRequestReceivedEmail(booking) {
  const subject = `Appointment Request Received: ${booking.service_type} at ${CONFIG.SALON_NAME}`;
  const htmlBody = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background-color: #FDFAF5; border: 1px solid #E5DFD5; border-radius: 8px; padding: 32px;">
      <h2 style="color: #232323; margin-top: 0;">Request Received ✨</h2>
      <p>Dear <strong>${booking.client_name}</strong>,</p>
      <p>We received your booking request for <strong>${booking.service_type}</strong> on <strong>${booking.preferred_date}</strong> at <strong>${booking.preferred_time}</strong>.</p>
      <div style="background: #ffffff; border: 1px solid #E5DFD5; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #856404; font-weight: bold;">Under Salon Review</span></p>
        <p style="margin: 4px 0;"><strong>Booking ID:</strong> ${booking.booking_id}</p>
        <p style="margin: 4px 0;"><strong>Location:</strong> ${CONFIG.SALON_ADDRESS}</p>
      </div>
      <p style="font-size: 14px; color: #555;">Our concierge is reviewing the artist schedule and will send your official confirmation receipt shortly.</p>
    </div>
  `;

  MailApp.sendEmail({
    to: booking.client_email,
    subject: subject,
    htmlBody: htmlBody
  });
}

/**
 * Step 2A: Send "Officially Confirmed" Email to Client (Triggered on Owner ACCEPT)
 */
function sendClientOfficiallyConfirmedEmail(booking) {
  const subject = `🎉 Officially Confirmed: ${booking.service_type} at ${CONFIG.SALON_NAME}`;
  const htmlBody = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background-color: #FDFAF5; border: 1px solid #E5DFD5; border-radius: 8px; padding: 32px;">
      <h2 style="color: #1b5e20; margin-top: 0;">Your Appointment is Officially Confirmed! ✨</h2>
      <p>Dear <strong>${booking.client_name}</strong>,</p>
      <p>Great news! Your booking has been approved by our master stylists. We look forward to welcoming you to Noir Studio.</p>

      <div style="background: #ffffff; border: 1px solid #E5DFD5; border-radius: 6px; padding: 18px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 5px 0; color: #767676;">Booking ID:</td><td style="font-weight: bold; color: #232323;">${booking.booking_id}</td></tr>
          <tr><td style="padding: 5px 0; color: #767676;">Service:</td><td style="font-weight: bold; color: #232323;">${booking.service_type}</td></tr>
          <tr><td style="padding: 5px 0; color: #767676;">Date:</td><td style="font-weight: bold; color: #232323;">${booking.preferred_date}</td></tr>
          <tr><td style="padding: 5px 0; color: #767676;">Time:</td><td style="font-weight: bold; color: #232323;">${booking.preferred_time}</td></tr>
          <tr><td style="padding: 5px 0; color: #767676;">Location:</td><td style="color: #232323;">${CONFIG.SALON_ADDRESS}</td></tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #767676;">Need to reschedule? Call us at <a href="tel:${CONFIG.SALON_PHONE}" style="color: #A07C3B;">${CONFIG.SALON_PHONE}</a>.</p>
    </div>
  `;

  MailApp.sendEmail({
    to: booking.client_email,
    subject: subject,
    htmlBody: htmlBody
  });
}

/**
 * Step 2B: Send "Declined / Slot Unavailable" Email to Client (Triggered on Owner DECLINE)
 */
function sendClientDeclinedEmail(booking) {
  const subject = `Update regarding your appointment request at ${CONFIG.SALON_NAME}`;
  const htmlBody = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background-color: #FDFAF5; border: 1px solid #E5DFD5; border-radius: 8px; padding: 32px;">
      <h2 style="color: #232323; margin-top: 0;">Appointment Update</h2>
      <p>Dear <strong>${booking.client_name}</strong>,</p>
      <p>Thank you for choosing ${CONFIG.SALON_NAME}. Regrettably, our stylists are fully booked for <strong>${booking.service_type}</strong> on <strong>${booking.preferred_date}</strong> at <strong>${booking.preferred_time}</strong>.</p>
      <p>We would love to accommodate you at another time! Please reply to this email or call us at <a href="tel:${CONFIG.SALON_PHONE}" style="color: #A07C3B;">${CONFIG.SALON_PHONE}</a> to pick an alternate slot.</p>
    </div>
  `;

  MailApp.sendEmail({
    to: booking.client_email,
    subject: subject,
    htmlBody: htmlBody
  });
}

/**
 * Send WhatsApp Confirmation to Client
 */
function sendClientWhatsAppConfirmation(booking) {
  if (!CONFIG.TWILIO.ACCOUNT_SID || !CONFIG.TWILIO.AUTH_TOKEN) return;

  const msg =
    `✨ *Booking Confirmed at ${CONFIG.SALON_NAME}!*\n\n` +
    `Dear ${booking.client_name}, your appointment is officially approved.\n\n` +
    `💇 *Service:* ${booking.service_type}\n` +
    `📅 *Date:* ${booking.preferred_date}\n` +
    `⏰ *Time:* ${booking.preferred_time}\n` +
    `📍 *Location:* ${CONFIG.SALON_ADDRESS}\n` +
    `🔖 *ID:* ${booking.booking_id}\n\n` +
    `We look forward to pampering you! See you soon.`;

  sendTwilioWhatsApp(booking.client_phone, msg);
}

/**
 * Send WhatsApp Decline Notice to Client
 */
function sendClientWhatsAppDeclined(booking) {
  if (!CONFIG.TWILIO.ACCOUNT_SID || !CONFIG.TWILIO.AUTH_TOKEN) return;

  const msg =
    `Hello ${booking.client_name},\n\n` +
    `Thank you for requesting an appointment at ${CONFIG.SALON_NAME}.\n` +
    `Unfortunately, our stylists are fully booked for ${booking.service_type} on ${booking.preferred_date} at ${booking.preferred_time}.\n\n` +
    `Please call us at ${CONFIG.SALON_PHONE} to reschedule to a time that suits you!`;

  sendTwilioWhatsApp(booking.client_phone, msg);
}

/**
 * Core Twilio Outbound Dispatcher
 */
function sendTwilioWhatsApp(toPhone, messageBody) {
  if (!CONFIG.TWILIO.ACCOUNT_SID || !CONFIG.TWILIO.AUTH_TOKEN) return;

  let cleanPhone = toPhone.toString().replace(/[^\d+]/g, '');
  if (!cleanPhone.startsWith('+')) {
    cleanPhone = '+91' + cleanPhone; // Default to India (+91) if no country code provided
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${CONFIG.TWILIO.ACCOUNT_SID}/Messages.json`;
  const payload = {
    To: `whatsapp:${cleanPhone}`,
    From: CONFIG.TWILIO.WHATSAPP_FROM,
    Body: messageBody
  };

  const options = {
    method: "post",
    headers: {
      "Authorization": "Basic " + Utilities.base64Encode(`${CONFIG.TWILIO.ACCOUNT_SID}:${CONFIG.TWILIO.AUTH_TOKEN}`)
    },
    payload: payload,
    muteHttpExceptions: true
  };

  const resp = UrlFetchApp.fetch(url, options);
  Logger.log(`Twilio WhatsApp dispatch to ${cleanPhone}: ` + resp.getContentText());
}

/**
 * Inbound WhatsApp webhook handler (Optional Twilio interactive replies)
 */
function handleTwilioInboundWhatsApp(params) {
  const from = params.From || "";
  const body = (params.Body || "").trim();
  const phone = from.replace("whatsapp:", "").replace(/[^\d]/g, "");

  Logger.log(`Received WhatsApp reply from ${from}: ${body}`);

  return ContentService.createTextOutput(`
    <Response>
      <Message>Thank you for reaching out to ${CONFIG.SALON_NAME}. Our team will assist you shortly.</Message>
    </Response>
  `).setMimeType(ContentService.MimeType.XML);
}

/**
 * Daily 24h WhatsApp Reminder Trigger (9:00 AM Cron)
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
    const preferredDate = row[5] ? Utilities.formatDate(new Date(row[5]), Session.getScriptTimeZone(), "yyyy-MM-dd") : "";
    const status = (row[8] || "").toString().toUpperCase();
    const phone = row[3];
    const name = row[1];
    const service = row[4];
    const time = row[6];

    if (preferredDate === tomorrowStr && status === "CONFIRMED" && phone) {
      const reminderMsg =
        `Hi ${name} ✨\n\n` +
        `This is a friendly reminder from *${CONFIG.SALON_NAME}* about your appointment tomorrow for *${service}* at *${time}*.\n\n` +
        `📍 Location: ${CONFIG.SALON_ADDRESS}\n\n` +
        `Reply *YES* to confirm or *RESCHEDULE* if you need to adjust your slot.`;

      sendTwilioWhatsApp(phone, reminderMsg);
    }
  }
}

/**
 * Helper to create event in Google Calendar
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
