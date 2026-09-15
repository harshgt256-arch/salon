/**
 * ============================================================================
 * NOIR STUDIO — 1-CLICK OWNER APPROVAL & RESCHEDULE ENGINE
 * ============================================================================
 *
 * Flow:
 * 1. Client books on website -> Sheet status: "PENDING_APPROVAL".
 * 2. Client gets instant acknowledgement Email.
 * 3. Salon Owner gets VIP Email + WhatsApp Alert with 3 Actions:
 *    - ✅ [ACCEPT BOOKING] -> Confirmed, Calendar created, Client notified.
 *    - 🔄 [SUGGEST NEW SLOT / RESCHEDULE] -> Opens a quick page to suggest a date/time.
 *    - ❌ [DECLINE / CANCEL] -> Politely declines booking.
 * 4. Reschedule Handshake:
 *    - Owner picks alternate Date + Time + Note.
 *    - Sheet status -> "RESCHEDULE_PROPOSED".
 *    - Client receives Email & WhatsApp with 1-Click "Accept Proposed Slot" link!
 *    - When client accepts -> Automatically moves to CONFIRMED & adds to Google Calendar!
 * ============================================================================
 */

const CONFIG = {
  SALON_NAME: "Noir Studio",
  SALON_OWNER_EMAIL: "harshvasava062@gmail.com", // <-- Replace with your email to receive approval alerts!
  SALON_OWNER_PHONE: "+919876543210",          // <-- Replace with owner's WhatsApp number (+91...)
  SALON_PHONE: "+1 (310) 555-0000",
  SALON_ADDRESS: "450 N Rodeo Dr, Beverly Hills, CA",
  SHEET_NAME: "Bookings",

  // Twilio WhatsApp Setup (Free Sandbox or Production Account)
  TWILIO: {
    ACCOUNT_SID: "", // <-- Paste your Twilio Account SID here
    AUTH_TOKEN: "",  // <-- Paste your Twilio Auth Token here
    WHATSAPP_FROM: "whatsapp:+14155238886"
  }
};

/**
 * Handle incoming POST requests:
 * 1. Website Form Submission -> Logs PENDING booking & sends Approval Request to Owner (Email + WhatsApp)
 * 2. Owner Reschedule Submission (from Reschedule Form)
 * 3. Inbound Twilio WhatsApp Webhook
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

    // Owner submitting a Reschedule Proposal via Form
    if (data.action === "submit_reschedule" || e.parameter.action === "submit_reschedule") {
      const bId = data.booking_id || e.parameter.booking_id;
      const newDate = data.new_date || e.parameter.new_date;
      const newTime = data.new_time || e.parameter.new_time;
      const reason = data.reason || e.parameter.reason || "Stylist requested a schedule adjustment";
      return handleOwnerSubmitReschedule(bId, newDate, newTime, reason);
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
      message: "Request received! Salon manager will review your slot shortly."
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
 * 2. 1-Click Owner Actions: ?action=accept | ?action=reschedule | ?action=decline
 * 3. 1-Click Client Reschedule Confirmation: ?action=client_accept_reschedule
 */
function doGet(e) {
  const params = e.parameter || {};
  const action = (params.action || "").toLowerCase();
  const bookingId = (params.id || "").trim();

  // If this is a 1-Click Action from Owner or Client:
  if (action && bookingId) {
    return handleRouterActions(action, bookingId, params);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    system: "Noir Studio 1-Click Approval & Reschedule Engine",
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Router for GET actions
 */
function handleRouterActions(action, bookingId, params) {
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

  // ACTION 1: OWNER ACCEPTS
  if (action === "accept") {
    sheet.getRange(foundRow, 9).setValue("CONFIRMED");
    sheet.getRange(foundRow, 9).setBackground("#d4edda").setFontColor("#155724").setFontWeight("bold");

    try {
      createCalendarEvent(booking);
    } catch (e) {
      Logger.log("Calendar error: " + e.toString());
    }

    if (booking.client_email) {
      try {
        sendClientOfficiallyConfirmedEmail(booking);
      } catch (e) {
        Logger.log("Confirmation email error: " + e.toString());
      }
    }

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

  // ACTION 2: OWNER OPENS RESCHEDULE PORTAL
  } else if (action === "reschedule") {
    const scriptUrl = ScriptApp.getService().getUrl();
    return HtmlService.createHtmlOutput(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #FAF8F5; padding: 20px; color: #232323; margin: 0; }
          .container { max-width: 480px; margin: 20px auto; background: #fff; border-radius: 12px; padding: 30px; border: 1px solid #E5DFD5; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
          .badge { display: inline-block; background: #fff3cd; color: #856404; font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 20px; margin-bottom: 12px; }
          h2 { margin-top: 0; color: #232323; font-size: 22px; }
          .info-box { background: #fdfaf5; border: 1px solid #E5DFD5; border-radius: 6px; padding: 14px; font-size: 14px; margin-bottom: 20px; }
          label { display: block; font-size: 13px; font-weight: 600; margin-top: 14px; margin-bottom: 6px; color: #444; }
          input, select, textarea { width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 15px; }
          input:focus, select:focus, textarea:focus { border-color: #C9A96A; outline: none; }
          button { width: 100%; margin-top: 20px; padding: 14px; background: #C9A96A; color: #fff; font-weight: bold; font-size: 16px; border: none; border-radius: 6px; cursor: pointer; }
          button:hover { background: #b08d4f; }
        </style>
      </head>
      <body>
        <div class="container">
          <span class="badge">🔄 Reschedule Request</span>
          <h2>Suggest Alternate Slot</h2>
          <div class="info-box">
            <div><strong>Client:</strong> ${booking.client_name}</div>
            <div><strong>Service:</strong> ${booking.service_type}</div>
            <div><strong>Original Slot:</strong> ${booking.preferred_date} @ ${booking.preferred_time}</div>
          </div>

          <form action="${scriptUrl}" method="POST">
            <input type="hidden" name="action" value="submit_reschedule">
            <input type="hidden" name="booking_id" value="${booking.booking_id}">

            <label>Proposed Alternate Date *</label>
            <input type="date" name="new_date" required value="${booking.preferred_date}">

            <label>Proposed Alternate Time *</label>
            <select name="new_time" required>
              <option value="10:00">10:00 AM</option>
              <option value="11:30">11:30 AM</option>
              <option value="13:00">01:00 PM</option>
              <option value="14:30">02:30 PM</option>
              <option value="16:00">04:00 PM</option>
              <option value="17:30">05:30 PM</option>
              <option value="19:00">07:00 PM</option>
            </select>

            <label>Reason / Note for Client</label>
            <textarea name="reason" rows="2" placeholder="e.g. Master stylist is available at this time."></textarea>

            <button type="submit">Send Proposal to Client →</button>
          </form>
        </div>
      </body>
      </html>
    `);

  // ACTION 3: OWNER DECLINES
  } else if (action === "decline") {
    sheet.getRange(foundRow, 9).setValue("DECLINED");
    sheet.getRange(foundRow, 9).setBackground("#f8d7da").setFontColor("#721c24").setFontWeight("bold");

    if (booking.client_email) {
      try {
        sendClientDeclinedEmail(booking);
      } catch (e) {
        Logger.log("Decline email error: " + e.toString());
      }
    }

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

  // ACTION 4: CLIENT ACCEPTS OWNER'S RESCHEDULE PROPOSAL
  } else if (action === "client_accept_reschedule") {
    const newDate = params.date || booking.preferred_date;
    const newTime = params.time || booking.preferred_time;

    // Update row date, time, and confirmed status
    sheet.getRange(foundRow, 6).setValue(newDate);
    sheet.getRange(foundRow, 7).setValue(newTime);
    sheet.getRange(foundRow, 9).setValue("CONFIRMED");
    sheet.getRange(foundRow, 9).setBackground("#d4edda").setFontColor("#155724").setFontWeight("bold");

    booking.preferred_date = newDate;
    booking.preferred_time = newTime;

    // Create Calendar Event
    try {
      createCalendarEvent(booking);
    } catch (e) {
      Logger.log("Calendar error: " + e.toString());
    }

    // Send confirmation to client
    if (booking.client_email) {
      try {
        sendClientOfficiallyConfirmedEmail(booking);
      } catch (e) {}
    }

    // Alert Owner that client accepted the rescheduled slot
    MailApp.sendEmail({
      to: CONFIG.SALON_OWNER_EMAIL,
      subject: `✅ Reschedule Accepted by Client: ${booking.client_name} (${newDate} @ ${newTime})`,
      htmlBody: `<p>Great news! <strong>${booking.client_name}</strong> accepted your suggested slot for <strong>${booking.service_type}</strong> on <strong>${newDate}</strong> at <strong>${newTime}</strong>.<br>It is now added to your Google Calendar.</p>`
    });

    return HtmlService.createHtmlOutput(`
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 60px auto; text-align: center; background: #FDFAF5; border: 1px solid #E5DFD5; border-radius: 12px; padding: 40px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <h2 style="color: #155724; margin-top: 0;">✨ Rescheduled Appointment Confirmed!</h2>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Thank you, <strong>${booking.client_name}</strong>! Your appointment has been updated to <strong>${newDate}</strong> at <strong>${newTime}</strong>.
        </p>
        <div style="background: #fff; padding: 18px; border-radius: 8px; margin: 24px 0; font-size: 14px; text-align: left; border: 1px solid #E5DFD5;">
          <div>💇 <strong>Service:</strong> ${booking.service_type}</div>
          <div style="margin-top: 6px;">📅 <strong>Date:</strong> ${newDate}</div>
          <div style="margin-top: 6px;">⏰ <strong>Time:</strong> ${newTime}</div>
          <div style="margin-top: 6px;">📍 <strong>Location:</strong> ${CONFIG.SALON_ADDRESS}</div>
        </div>
        <p style="color: #666; font-size: 13px;">A confirmation receipt has been emailed to you. We look forward to seeing you!</p>
      </div>
    `);
  }
}

/**
 * Handle Owner submitting the Reschedule form
 */
function handleOwnerSubmitReschedule(bookingId, newDate, newTime, reason) {
  const sheet = getOrCreateBookingsSheet();
  const data = sheet.getDataRange().getValues();
  let foundRow = -1;
  let booking = null;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().trim() === bookingId) {
      foundRow = i + 1;
      booking = {
        booking_id: data[i][0],
        client_name: data[i][1],
        client_email: data[i][2],
        client_phone: data[i][3],
        service_type: data[i][4],
        preferred_date: data[i][5],
        preferred_time: data[i][6],
        message: data[i][7]
      };
      break;
    }
  }

  if (foundRow !== -1 && booking) {
    sheet.getRange(foundRow, 9).setValue("RESCHEDULE_PROPOSED");
    sheet.getRange(foundRow, 9).setBackground("#e2e3e5").setFontColor("#383d41").setFontWeight("bold");

    // Send Reschedule Proposal Email to Client
    if (booking.client_email) {
      try {
        sendClientRescheduleProposalEmail(booking, newDate, newTime, reason);
      } catch (e) {
        Logger.log("Proposal email error: " + e.toString());
      }
    }

    // Send Reschedule Proposal WhatsApp to Client
    try {
      sendClientRescheduleProposalWhatsApp(booking, newDate, newTime, reason);
    } catch (e) {
      Logger.log("Proposal WhatsApp error: " + e.toString());
    }
  }

  return HtmlService.createHtmlOutput(`
    <div style="font-family: sans-serif; max-width: 500px; margin: 60px auto; text-align: center; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 40px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
      <div style="width: 60px; height: 60px; background: #C9A96A; color: #fff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 20px;">✓</div>
      <h2 style="color: #232323; margin-top: 0;">Reschedule Proposal Sent!</h2>
      <p style="color: #555; font-size: 15px; line-height: 1.6;">
        We proposed <strong>${newDate}</strong> at <strong>${newTime}</strong> to <strong>${booking.client_name}</strong> via Email & WhatsApp.
      </p>
      <p style="color: #888; font-size: 13px;">As soon as the client clicks to accept, the booking will automatically confirm and sync with your Google Calendar.</p>
    </div>
  `);
}

/**
 * Send 1-Click Actionable WhatsApp Message to Salon Owner (with 3 Links)
 */
function sendOwnerApprovalWhatsApp(booking) {
  if (!CONFIG.TWILIO.ACCOUNT_SID || !CONFIG.TWILIO.AUTH_TOKEN) return;

  const scriptUrl = ScriptApp.getService().getUrl();
  const acceptUrl = `${scriptUrl}?action=accept&id=${booking.booking_id}`;
  const rescheduleUrl = `${scriptUrl}?action=reschedule&id=${booking.booking_id}`;
  const declineUrl = `${scriptUrl}?action=decline&id=${booking.booking_id}`;

  const message =
    `🔔 *NEW BOOKING REQUEST*\n\n` +
    `👤 *Client:* ${booking.client_name}\n` +
    `💇 *Service:* ${booking.service_type}\n` +
    `📅 *Date:* ${booking.preferred_date}\n` +
    `⏰ *Time:* ${booking.preferred_time}\n` +
    `📞 *Phone:* ${booking.client_phone}\n` +
    `📝 *Notes:* ${booking.message || 'None'}\n\n` +
    `👉 *1. Accept & Add to Calendar:*\n${acceptUrl}\n\n` +
    `👉 *2. Suggest Alternate Slot (Reschedule):*\n${rescheduleUrl}\n\n` +
    `👉 *3. Decline / Slot Full:*\n${declineUrl}`;

  sendTwilioWhatsApp(CONFIG.SALON_OWNER_PHONE, message);
}

/**
 * Send 1-Click Actionable Email to Salon Owner (with 3 Actions)
 */
function sendOwnerApprovalEmail(booking) {
  const scriptUrl = ScriptApp.getService().getUrl();
  const acceptUrl = `${scriptUrl}?action=accept&id=${booking.booking_id}`;
  const rescheduleUrl = `${scriptUrl}?action=reschedule&id=${booking.booking_id}`;
  const declineUrl = `${scriptUrl}?action=decline&id=${booking.booking_id}`;

  const subject = `🔔 [ACTION REQUIRED] Booking Request: ${booking.client_name} (${booking.preferred_date} @ ${booking.preferred_time})`;

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #E0E0E0; border-radius: 8px; overflow: hidden;">
      <div style="background: #232323; color: #C9A96A; padding: 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">New Appointment Request</h2>
        <p style="margin: 4px 0 0; font-size: 13px; color: #EDE8DF;">${CONFIG.SALON_NAME} Concierge</p>
      </div>

      <div style="padding: 24px 28px; color: #333; line-height: 1.6;">
        <p style="font-size: 15px; margin-top: 0;">A client has requested an appointment slot. Please review:</p>

        <div style="background: #F9F7F4; border: 1px solid #E5DFD5; padding: 16px; margin: 16px 0; font-size: 14px; border-radius: 6px;">
          <p style="margin: 4px 0;"><strong>👤 Client:</strong> ${booking.client_name}</p>
          <p style="margin: 4px 0;"><strong>💇 Service:</strong> ${booking.service_type}</p>
          <p style="margin: 4px 0;"><strong>📅 Date:</strong> ${booking.preferred_date}</p>
          <p style="margin: 4px 0;"><strong>⏰ Time Slot:</strong> ${booking.preferred_time}</p>
          <p style="margin: 4px 0;"><strong>📞 WhatsApp:</strong> <a href="https://wa.me/${booking.client_phone.replace(/[^\d]/g, '')}">${booking.client_phone}</a></p>
          <p style="margin: 4px 0;"><strong>✉️ Email:</strong> ${booking.client_email || 'Not provided'}</p>
          <p style="margin: 4px 0;"><strong>📝 Notes:</strong> ${booking.message || 'None'}</p>
        </div>

        <p style="font-size: 14px; font-weight: bold; margin-bottom: 12px;">Choose an Action:</p>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding-bottom: 10px;">
              <a href="${acceptUrl}" style="display: block; text-align: center; background: #28a745; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: bold; font-size: 14px;">
                ✅ Accept & Add to Calendar
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 10px;">
              <a href="${rescheduleUrl}" style="display: block; text-align: center; background: #C9A96A; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: bold; font-size: 14px;">
                🔄 Suggest Alternate Slot (Reschedule)
              </a>
            </td>
          </tr>
          <tr>
            <td>
              <a href="${declineUrl}" style="display: block; text-align: center; background: #dc3545; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: bold; font-size: 14px;">
                ❌ Decline / Slot Full
              </a>
            </td>
          </tr>
        </table>
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
 * Send Reschedule Proposal Email to Client with 1-Click Accept
 */
function sendClientRescheduleProposalEmail(booking, newDate, newTime, reason) {
  const scriptUrl = ScriptApp.getService().getUrl();
  const acceptUrl = `${scriptUrl}?action=client_accept_reschedule&id=${booking.booking_id}&date=${encodeURIComponent(newDate)}&time=${encodeURIComponent(newTime)}`;

  const subject = `Salon Reschedule Suggestion: ${booking.service_type} at ${CONFIG.SALON_NAME}`;
  const htmlBody = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background-color: #FDFAF5; border: 1px solid #E5DFD5; border-radius: 8px; padding: 32px;">
      <h2 style="color: #232323; margin-top: 0;">Schedule Adjustment Request ✨</h2>
      <p>Dear <strong>${booking.client_name}</strong>,</p>
      <p>Thank you for choosing ${CONFIG.SALON_NAME}. Our stylists are currently unavailable for your original slot, but we would love to welcome you at this proposed alternate time:</p>

      <div style="background: #ffffff; border: 1px solid #E5DFD5; border-radius: 6px; padding: 20px; margin: 20px 0;">
        <p style="margin: 4px 0; color: #767676; font-size: 13px;">PROPOSED NEW SLOT:</p>
        <p style="margin: 6px 0; font-size: 18px; font-weight: bold; color: #A07C3B;">📅 ${newDate} at ⏰ ${newTime}</p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Service:</strong> ${booking.service_type}</p>
        ${reason ? `<p style="margin: 6px 0; font-size: 13px; color: #555;"><strong>Note from Salon:</strong> <em>"${reason}"</em></p>` : ''}
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${acceptUrl}" style="background: #28a745; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
          ✓ Accept This Time Slot & Confirm
        </a>
      </div>

      <p style="font-size: 13px; color: #767676; text-align: center;">If this time does not work for you, feel free to call us at <a href="tel:${CONFIG.SALON_PHONE}" style="color: #A07C3B;">${CONFIG.SALON_PHONE}</a>.</p>
    </div>
  `;

  MailApp.sendEmail({
    to: booking.client_email,
    subject: subject,
    htmlBody: htmlBody
  });
}

/**
 * Send Reschedule Proposal WhatsApp to Client with 1-Click Accept
 */
function sendClientRescheduleProposalWhatsApp(booking, newDate, newTime, reason) {
  if (!CONFIG.TWILIO.ACCOUNT_SID || !CONFIG.TWILIO.AUTH_TOKEN) return;

  const scriptUrl = ScriptApp.getService().getUrl();
  const acceptUrl = `${scriptUrl}?action=client_accept_reschedule&id=${booking.booking_id}&date=${encodeURIComponent(newDate)}&time=${encodeURIComponent(newTime)}`;

  const msg =
    `Hello ${booking.client_name} ✨\n\n` +
    `Regarding your appointment for *${booking.service_type}* at *${CONFIG.SALON_NAME}*:\n` +
    `Our master stylist has proposed an alternate slot for you:\n\n` +
    `📅 *Proposed Date:* ${newDate}\n` +
    `⏰ *Proposed Time:* ${newTime}\n` +
    (reason ? `📝 *Note:* ${reason}\n\n` : `\n`) +
    `👉 *Tap here to confirm this new slot:*\n${acceptUrl}\n\n` +
    `Or call us at ${CONFIG.SALON_PHONE} to choose another time!`;

  sendTwilioWhatsApp(booking.client_phone, msg);
}

/**
 * Send "Request Received / Pending Review" Email to Client
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
      <p style="font-size: 14px; color: #555;">Our concierge is reviewing artist availability and will send your confirmation shortly.</p>
    </div>
  `;

  MailApp.sendEmail({
    to: booking.client_email,
    subject: subject,
    htmlBody: htmlBody
  });
}

/**
 * Send "Officially Confirmed" Email to Client
 */
function sendClientOfficiallyConfirmedEmail(booking) {
  const subject = `🎉 Officially Confirmed: ${booking.service_type} at ${CONFIG.SALON_NAME}`;
  const htmlBody = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background-color: #FDFAF5; border: 1px solid #E5DFD5; border-radius: 8px; padding: 32px;">
      <h2 style="color: #1b5e20; margin-top: 0;">Your Appointment is Officially Confirmed! ✨</h2>
      <p>Dear <strong>${booking.client_name}</strong>,</p>
      <p>Great news! Your booking has been approved. We look forward to welcoming you to Noir Studio.</p>

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
 * Send "Declined / Slot Unavailable" Email to Client
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
    cleanPhone = '+91' + cleanPhone;
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

  Logger.log(`Received WhatsApp reply from ${from}: ${body}`);

  return ContentService.createTextOutput(`
    <Response>
      <Message>Thank you for reaching out to ${CONFIG.SALON_NAME}. Our team will assist you shortly.</Message>
    </Response>
  `).setMimeType(ContentService.MimeType.XML);
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
