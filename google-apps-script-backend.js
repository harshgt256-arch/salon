/**
 * ============================================================================
 * NOIR STUDIO — 1-CLICK OWNER APPROVAL & BOOKING ENGINE
 * ============================================================================
 *
 * Flow:
 * 1. Client books on website -> Sheet status: "PENDING_APPROVAL".
 * 2. Client gets instant email: "We received your request! Reviewing availability..."
 * 3. Salon Owner gets VIP Email Alert with 2 One-Click Buttons:
 *    - ✅ [ACCEPT BOOKING]
 *    - ❌ [DECLINE / SLOT FULL]
 * 4. When Owner clicks ACCEPT:
 *    - Status -> "CONFIRMED" (Green)
 *    - Event is automatically created on Google Calendar!
 *    - Client receives official confirmation Email & WhatsApp.
 * 5. When Owner clicks DECLINE:
 *    - Status -> "DECLINED" (Red)
 *    - Client receives polite reschedule notice.
 * ============================================================================
 */

const CONFIG = {
  SALON_NAME: "Noir Studio",
  SALON_OWNER_EMAIL: "owner@noir-studio.com", // <-- Replace with your actual email to receive approval alerts!
  SALON_OWNER_PHONE: "+919876543210",         // <-- Replace with owner's WhatsApp number
  SALON_PHONE: "+1 (310) 555-0000",
  SALON_ADDRESS: "450 N Rodeo Dr, Beverly Hills, CA",
  SHEET_NAME: "Bookings",

  // Twilio WhatsApp Setup (Optional)
  TWILIO: {
    ACCOUNT_SID: "",
    AUTH_TOKEN: "",
    WHATSAPP_FROM: "whatsapp:+14155238886"
  }
};

/**
 * Handle incoming POST requests:
 * 1. Website Form Submission -> Logs PENDING booking & sends Approval Request to Owner
 * 2. Inbound WhatsApp Reply (if Twilio is hooked)
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
 * 2. 1-Click Owner Actions from Email Links: ?action=accept&id=BK... or ?action=decline&id=BK...
 */
function doGet(e) {
  const params = e.parameter || {};
  const action = (params.action || "").toLowerCase();
  const bookingId = (params.id || "").trim();

  // If this is a 1-Click Action from Owner's Email:
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
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
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

    // 4. Send WhatsApp Confirmation (if configured)
    if (CONFIG.TWILIO.ACCOUNT_SID) {
      try {
        sendWhatsAppConfirmation(booking);
      } catch (e) {
        Logger.log("WhatsApp error: " + e.toString());
      }
    }

    return HtmlService.createHtmlOutput(`
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 500px; margin: 60px auto; text-align: center; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 40px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <div style="width: 60px; height: 60px; background: #28a745; color: #fff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px; margin-bottom: 20px;">✓</div>
        <h2 style="color: #155724; margin-top: 0;">Appointment Confirmed!</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
          You have successfully approved <strong>${booking.client_name}</strong> for <strong>${booking.service_type}</strong> on <strong>${booking.preferred_date}</strong> at <strong>${booking.preferred_time}</strong>.
        </p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 14px; text-align: left;">
          <div>📅 <strong>Google Calendar:</strong> Event automatically added</div>
          <div style="margin-top: 6px;">✉️ <strong>Client Notification:</strong> Confirmation email & SMS dispatched</div>
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

    return HtmlService.createHtmlOutput(`
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 500px; margin: 60px auto; text-align: center; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 40px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <div style="width: 60px; height: 60px; background: #dc3545; color: #fff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 20px;">✕</div>
        <h2 style="color: #721c24; margin-top: 0;">Appointment Declined</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
          You marked this slot as unavailable for <strong>${booking.client_name}</strong>. A polite reschedule notification has been emailed to the client.
        </p>
        <p style="color: #888; font-size: 12px; margin-top: 20px;">You may now close this tab.</p>
      </div>
    `);
  }
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
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #E0E0E0; border-radius: 8px; overflow: hidden;">
      <div style="background: #232323; color: #C9A96A; padding: 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">New Appointment Request</h2>
        <p style="margin: 4px 0 0; font-size: 13px; color: #EDE8DF;">${CONFIG.SALON_NAME} Concierge</p>
      </div>

      <div style="padding: 24px 28px; color: #333; line-height: 1.6;">
        <p style="font-size: 15px; margin-top: 0;">A client has requested an appointment slot. Please review and approve:</p>

        <div style="background: #F9F7F4; border-left: 4px solid #C9A96A; padding: 16px; margin: 16px 0; font-size: 14px;">
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
