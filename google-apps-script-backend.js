/**
 * ============================================================================
 * NOIR STUDIO — 1-CLICK OWNER APPROVAL & CAPACITY CONFLICT CHECKER ENGINE
 * ============================================================================
 *
 * Flow:
 * 1. Real-Time Capacity Check:
 *    - Website queries: ?action=check_availability&date=YYYY-MM-DD
 *    - Checks Bookings sheet & Google Calendar for slot occupancy.
 *    - Allows up to MAX_CONCURRENT_CHAIRS (default 4) simultaneous bookings per slot.
 *    - Greys out full slots or shows "Only X spots left".
 * 2. Client books on website -> Sheet status: "PENDING_APPROVAL".
 * 3. Salon Owner receives WhatsApp + Email with 1-Click Action Buttons:
 *    - ✅ [ACCEPT BOOKING] -> Confirms slot, blocks calendar, alerts client.
 *    - 🔄 [SUGGEST NEW SLOT / RESCHEDULE] -> Opens interactive proposal page.
 *    - ❌ [DECLINE / CANCEL] -> Politely declines booking.
 * 4. Client Reschedule Handshake:
 *    - Client accepts suggested alternate slot with 1 tap.
 * ============================================================================
 */

const CONFIG = {
  SALON_NAME: "Noir Studio",
  SALON_OWNER_EMAIL: "harshvasava062@gmail.com", // <-- Your email for alerts
  SALON_OWNER_PHONE: "+919876543210",          // <-- Your WhatsApp number with country code (+91...)
  SALON_PHONE: "+1 (310) 555-0000",
  SALON_ADDRESS: "450 N Rodeo Dr, Beverly Hills, CA",
  SHEET_NAME: "Bookings",

  // Multi-chair salon capacity: maximum simultaneous clients per time slot
  MAX_CONCURRENT_CHAIRS: 4,

  // Standard salon time slots
  SLOTS: ["10:00", "11:30", "13:00", "14:30", "16:00", "17:30", "19:00"],

  // Twilio WhatsApp Setup (Optional)
  TWILIO: {
    ACCOUNT_SID: "",
    AUTH_TOKEN: "",
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
    if (data.action === "submit_reschedule" || (e.parameter && e.parameter.action === "submit_reschedule")) {
      const bId = data.booking_id || e.parameter.booking_id;
      const newDate = data.new_date || e.parameter.new_date;
      const newTime = data.new_time || e.parameter.new_time;
      const reason = data.reason || e.parameter.reason || "Stylist requested schedule adjustment";
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

    // Capacity Conflict Check before accepting
    const availability = checkSlotAvailability(booking.preferred_date, booking.preferred_time);
    if (!availability.available) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        conflict: true,
        message: `Sorry, this time slot (${booking.preferred_time}) is fully booked. Please choose an alternate slot.`
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
      remaining_spots: availability.remaining - 1,
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
 * 1. Real-Time Slot Availability Check: ?action=check_availability&date=YYYY-MM-DD
 * 2. 1-Click Owner Actions: ?action=accept | ?action=reschedule | ?action=decline
 * 3. 1-Click Client Reschedule Confirmation: ?action=client_accept_reschedule
 */
function doGet(e) {
  const params = e.parameter || {};
  const action = (params.action || "").toLowerCase();
  const bookingId = (params.id || "").trim();
  const date = (params.date || "").trim();

  // 1. REAL-TIME AVAILABILITY QUERY
  if (action === "check_availability" && date) {
    const slotsStatus = getDayAvailability(date);
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      date: date,
      max_capacity_per_slot: CONFIG.MAX_CONCURRENT_CHAIRS,
      slots: slotsStatus
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 2. 1-Click Action from Owner or Client
  if (action && bookingId) {
    return handleRouterActions(action, bookingId, params);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    system: "Noir Studio Multi-Chair Capacity & Booking Engine",
    max_capacity_per_slot: CONFIG.MAX_CONCURRENT_CHAIRS,
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Check availability for an entire day across all time slots
 */
function getDayAvailability(dateStr) {
  const sheet = getOrCreateBookingsSheet();
  const data = sheet.getDataRange().getValues();

  // Count existing confirmed and pending bookings per slot
  const slotCounts = {};
  CONFIG.SLOTS.forEach(slot => { slotCounts[slot] = 0; });

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    let rowDate = "";
    if (row[5] instanceof Date) {
      rowDate = Utilities.formatDate(row[5], Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else if (row[5]) {
      rowDate = row[5].toString().trim().split("T")[0];
    }

    const rowTime = (row[6] || "").toString().trim();
    const rowStatus = (row[8] || "").toString().toUpperCase();

    // Only count active bookings (CONFIRMED or PENDING_APPROVAL)
    if (rowDate === dateStr && (rowStatus === "CONFIRMED" || rowStatus === "PENDING_APPROVAL")) {
      if (slotCounts.hasOwnProperty(rowTime)) {
        slotCounts[rowTime] += 1;
      }
    }
  }

  const results = {};
  CONFIG.SLOTS.forEach(slot => {
    const booked = slotCounts[slot] || 0;
    const remaining = Math.max(0, CONFIG.MAX_CONCURRENT_CHAIRS - booked);
    results[slot] = {
      booked: booked,
      capacity: CONFIG.MAX_CONCURRENT_CHAIRS,
      remaining: remaining,
      available: remaining > 0,
      status: remaining === 0 ? "FULL" : (remaining <= 2 ? "FEW_LEFT" : "AVAILABLE")
    };
  });

  return results;
}

/**
 * Check if a single slot has capacity
 */
function checkSlotAvailability(dateStr, timeStr) {
  const day = getDayAvailability(dateStr);
  if (day && day[timeStr]) {
    return day[timeStr];
  }
  return { available: true, remaining: CONFIG.MAX_CONCURRENT_CHAIRS, booked: 0 };
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
      foundRow = i + 1;
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

  const displayDate = formatDateForDisplay(booking.preferred_date);
  const displayTime = formatTimeForDisplay(booking.preferred_time);

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
      } catch (e) {}
    }

    try {
      sendClientWhatsAppConfirmation(booking);
    } catch (e) {}

    return HtmlService.createHtmlOutput(`
      <div style="font-family: sans-serif; max-width: 500px; margin: 60px auto; text-align: center; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 40px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <div style="width: 60px; height: 60px; background: #28a745; color: #fff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px; margin-bottom: 20px;">✓</div>
        <h2 style="color: #155724; margin-top: 0;">Appointment Confirmed!</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
          You approved <strong>${booking.client_name}</strong> for <strong>${booking.service_type}</strong> on <strong>${displayDate}</strong> at <strong>${displayTime}</strong>.
        </p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 14px; text-align: left;">
          <div>📅 <strong>Google Calendar:</strong> Event automatically added</div>
          <div style="margin-top: 6px;">✉️ <strong>Client Notification:</strong> Confirmation email & WhatsApp dispatched</div>
        </div>
        <p style="color: #888; font-size: 12px;">You may now close this tab.</p>
      </div>
    `);

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
          button { width: 100%; margin-top: 20px; padding: 14px; background: #C9A96A; color: #fff; font-weight: bold; font-size: 16px; border: none; border-radius: 6px; cursor: pointer; }
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

  } else if (action === "decline") {
    sheet.getRange(foundRow, 9).setValue("DECLINED");
    sheet.getRange(foundRow, 9).setBackground("#f8d7da").setFontColor("#721c24").setFontWeight("bold");

    if (booking.client_email) {
      try {
        sendClientDeclinedEmail(booking);
      } catch (e) {}
    }

    try {
      sendClientWhatsAppDeclined(booking);
    } catch (e) {}

    return HtmlService.createHtmlOutput(`
      <div style="font-family: sans-serif; max-width: 500px; margin: 60px auto; text-align: center; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 40px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <div style="width: 60px; height: 60px; background: #dc3545; color: #fff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 20px;">✕</div>
        <h2 style="color: #721c24; margin-top: 0;">Appointment Declined</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
          You marked this slot as unavailable for <strong>${booking.client_name}</strong>. A notification has been sent to the client.
        </p>
      </div>
    `);

  } else if (action === "client_accept_reschedule") {
    const newDate = params.date || booking.preferred_date;
    const newTime = params.time || booking.preferred_time;

    sheet.getRange(foundRow, 6).setValue(newDate);
    sheet.getRange(foundRow, 7).setValue(newTime);
    sheet.getRange(foundRow, 9).setValue("CONFIRMED");
    sheet.getRange(foundRow, 9).setBackground("#d4edda").setFontColor("#155724").setFontWeight("bold");

    booking.preferred_date = newDate;
    booking.preferred_time = newTime;

    try {
      createCalendarEvent(booking);
    } catch (e) {}

    if (booking.client_email) {
      try {
        sendClientOfficiallyConfirmedEmail(booking);
      } catch (e) {}
    }

    MailApp.sendEmail({
      to: CONFIG.SALON_OWNER_EMAIL,
      subject: `✅ Reschedule Accepted by Client: ${booking.client_name} (${newDate} @ ${newTime})`,
      htmlBody: `<p>Great news! <strong>${booking.client_name}</strong> accepted your suggested slot for <strong>${booking.service_type}</strong> on <strong>${newDate}</strong> at <strong>${newTime}</strong>.<br>It is now on your Google Calendar.</p>`
    });

    return HtmlService.createHtmlOutput(`
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 60px auto; text-align: center; background: #FDFAF5; border: 1px solid #E5DFD5; border-radius: 12px; padding: 40px;">
        <h2 style="color: #155724; margin-top: 0;">✨ Rescheduled Appointment Confirmed!</h2>
        <p style="color: #333; font-size: 16px;">
          Thank you, <strong>${booking.client_name}</strong>! Your appointment has been updated to <strong>${newDate}</strong> at <strong>${newTime}</strong>.
        </p>
      </div>
    `);
  }
}

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

    if (booking.client_email) {
      try {
        sendClientRescheduleProposalEmail(booking, newDate, newTime, reason);
      } catch (e) {}
    }

    try {
      sendClientRescheduleProposalWhatsApp(booking, newDate, newTime, reason);
    } catch (e) {}
  }

  return HtmlService.createHtmlOutput(`
    <div style="font-family: sans-serif; max-width: 500px; margin: 60px auto; text-align: center; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 40px;">
      <h2 style="color: #232323; margin-top: 0;">Reschedule Proposal Sent!</h2>
      <p style="color: #555;">We proposed <strong>${newDate}</strong> at <strong>${newTime}</strong> to <strong>${booking ? booking.client_name : ''}</strong>.</p>
    </div>
  `);
}

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
    `📞 *Phone:* ${booking.client_phone}\n\n` +
    `👉 *1. Accept:*\n${acceptUrl}\n\n` +
    `👉 *2. Reschedule:*\n${rescheduleUrl}\n\n` +
    `👉 *3. Decline:*\n${declineUrl}`;

  sendTwilioWhatsApp(CONFIG.SALON_OWNER_PHONE, message);
}

function sendOwnerApprovalEmail(booking) {
  const scriptUrl = ScriptApp.getService().getUrl();
  const acceptUrl = `${scriptUrl}?action=accept&id=${booking.booking_id}`;
  const rescheduleUrl = `${scriptUrl}?action=reschedule&id=${booking.booking_id}`;
  const declineUrl = `${scriptUrl}?action=decline&id=${booking.booking_id}`;

  const subject = `🔔 [ACTION REQUIRED] Booking: ${booking.client_name} (${booking.preferred_date} @ ${booking.preferred_time})`;

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #E0E0E0; border-radius: 8px; padding: 24px;">
      <h2 style="margin-top:0; color: #232323;">New Appointment Request</h2>
      <div style="background: #F9F7F4; border: 1px solid #E5DFD5; padding: 14px; margin: 16px 0; border-radius: 6px;">
        <p><strong>👤 Client:</strong> ${booking.client_name}</p>
        <p><strong>💇 Service:</strong> ${booking.service_type}</p>
        <p><strong>📅 Date:</strong> ${booking.preferred_date}</p>
        <p><strong>⏰ Time Slot:</strong> ${booking.preferred_time}</p>
        <p><strong>📞 Phone:</strong> ${booking.client_phone}</p>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding-bottom: 10px;"><a href="${acceptUrl}" style="display: block; text-align: center; background: #28a745; color: #fff; text-decoration: none; padding: 12px; border-radius: 6px; font-weight: bold;">✅ Accept & Add to Calendar</a></td></tr>
        <tr><td style="padding-bottom: 10px;"><a href="${rescheduleUrl}" style="display: block; text-align: center; background: #C9A96A; color: #fff; text-decoration: none; padding: 12px; border-radius: 6px; font-weight: bold;">🔄 Suggest Alternate Slot (Reschedule)</a></td></tr>
        <tr><td><a href="${declineUrl}" style="display: block; text-align: center; background: #dc3545; color: #fff; text-decoration: none; padding: 12px; border-radius: 6px; font-weight: bold;">❌ Decline / Slot Full</a></td></tr>
      </table>
    </div>
  `;

  MailApp.sendEmail({
    to: CONFIG.SALON_OWNER_EMAIL,
    subject: subject,
    htmlBody: htmlBody
  });
}

function sendClientRescheduleProposalEmail(booking, newDate, newTime, reason) {
  const scriptUrl = ScriptApp.getService().getUrl();
  const acceptUrl = `${scriptUrl}?action=client_accept_reschedule&id=${booking.booking_id}&date=${encodeURIComponent(newDate)}&time=${encodeURIComponent(newTime)}`;

  const subject = `Salon Reschedule Suggestion: ${booking.service_type} at ${CONFIG.SALON_NAME}`;
  const htmlBody = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background-color: #FDFAF5; border: 1px solid #E5DFD5; border-radius: 8px; padding: 32px;">
      <h2 style="color: #232323; margin-top: 0;">Schedule Adjustment Request ✨</h2>
      <p>Dear <strong>${booking.client_name}</strong>,</p>
      <p>Our stylists have proposed this alternate slot for your appointment:</p>
      <div style="background: #ffffff; border: 1px solid #E5DFD5; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <p style="font-size: 16px; font-weight: bold; color: #A07C3B;">📅 ${newDate} at ⏰ ${newTime}</p>
        <p><strong>Service:</strong> ${booking.service_type}</p>
        ${reason ? `<p><strong>Note:</strong> <em>"${reason}"</em></p>` : ''}
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${acceptUrl}" style="background: #28a745; color: #fff; text-decoration: none; padding: 14px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">✓ Accept This New Time Slot</a>
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: booking.client_email,
    subject: subject,
    htmlBody: htmlBody
  });
}

function sendClientRescheduleProposalWhatsApp(booking, newDate, newTime, reason) {
  if (!CONFIG.TWILIO.ACCOUNT_SID || !CONFIG.TWILIO.AUTH_TOKEN) return;

  const scriptUrl = ScriptApp.getService().getUrl();
  const acceptUrl = `${scriptUrl}?action=client_accept_reschedule&id=${booking.booking_id}&date=${encodeURIComponent(newDate)}&time=${encodeURIComponent(newTime)}`;

  const msg =
    `Hello ${booking.client_name} ✨\n\n` +
    `Our master stylist has proposed an alternate slot for your *${booking.service_type}*:\n\n` +
    `📅 *Date:* ${newDate}\n` +
    `⏰ *Time:* ${newTime}\n\n` +
    `👉 *Tap to confirm this slot:*\n${acceptUrl}`;

  sendTwilioWhatsApp(booking.client_phone, msg);
}

function sendClientRequestReceivedEmail(booking) {
  const subject = `Appointment Request Received: ${booking.service_type} at ${CONFIG.SALON_NAME}`;
  const htmlBody = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background-color: #FDFAF5; border: 1px solid #E5DFD5; border-radius: 8px; padding: 32px;">
      <h2 style="color: #232323; margin-top: 0;">Request Received ✨</h2>
      <p>Dear <strong>${booking.client_name}</strong>,</p>
      <p>We received your booking request for <strong>${booking.service_type}</strong> on <strong>${booking.preferred_date}</strong> at <strong>${booking.preferred_time}</strong>.</p>
      <p>Our concierge is reviewing availability and will confirm shortly.</p>
    </div>
  `;

  MailApp.sendEmail({
    to: booking.client_email,
    subject: subject,
    htmlBody: htmlBody
  });
}

function sendClientOfficiallyConfirmedEmail(booking) {
  const subject = `🎉 Officially Confirmed: ${booking.service_type} at ${CONFIG.SALON_NAME}`;
  const htmlBody = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background-color: #FDFAF5; border: 1px solid #E5DFD5; border-radius: 8px; padding: 32px;">
      <h2 style="color: #1b5e20; margin-top: 0;">Appointment Confirmed! ✨</h2>
      <p>Dear <strong>${booking.client_name}</strong>,</p>
      <p>Your appointment has been officially confirmed for <strong>${booking.service_type}</strong> on <strong>${booking.preferred_date}</strong> at <strong>${booking.preferred_time}</strong>.</p>
    </div>
  `;

  MailApp.sendEmail({
    to: booking.client_email,
    subject: subject,
    htmlBody: htmlBody
  });
}

function sendClientDeclinedEmail(booking) {
  const subject = `Update regarding your appointment request at ${CONFIG.SALON_NAME}`;
  const htmlBody = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background-color: #FDFAF5; border: 1px solid #E5DFD5; border-radius: 8px; padding: 32px;">
      <h2 style="color: #232323; margin-top: 0;">Appointment Update</h2>
      <p>Dear <strong>${booking.client_name}</strong>,</p>
      <p>Regrettably, we are fully booked for <strong>${booking.service_type}</strong> on <strong>${booking.preferred_date}</strong> at <strong>${booking.preferred_time}</strong>.</p>
    </div>
  `;

  MailApp.sendEmail({
    to: booking.client_email,
    subject: subject,
    htmlBody: htmlBody
  });
}

function sendClientWhatsAppConfirmation(booking) {
  if (!CONFIG.TWILIO.ACCOUNT_SID || !CONFIG.TWILIO.AUTH_TOKEN) return;

  const msg =
    `✨ *Booking Confirmed at ${CONFIG.SALON_NAME}!*\n\n` +
    `Dear ${booking.client_name}, your appointment is confirmed for *${booking.service_type}* on *${booking.preferred_date}* at *${booking.preferred_time}*.\n\n` +
    `📍 ${CONFIG.SALON_ADDRESS}`;

  sendTwilioWhatsApp(booking.client_phone, msg);
}

function sendClientWhatsAppDeclined(booking) {
  if (!CONFIG.TWILIO.ACCOUNT_SID || !CONFIG.TWILIO.AUTH_TOKEN) return;

  const msg =
    `Hello ${booking.client_name},\n\n` +
    `Unfortunately, our stylists are fully booked for ${booking.service_type} on ${booking.preferred_date} at ${booking.preferred_time}. Please call us at ${CONFIG.SALON_PHONE} to choose another time!`;

  sendTwilioWhatsApp(booking.client_phone, msg);
}

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

  UrlFetchApp.fetch(url, options);
}

function handleTwilioInboundWhatsApp(params) {
  return ContentService.createTextOutput(`
    <Response>
      <Message>Thank you for contacting ${CONFIG.SALON_NAME}. We will assist you shortly.</Message>
    </Response>
  `).setMimeType(ContentService.MimeType.XML);
}

function formatDateForDisplay(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  const s = val.toString().trim();
  if (s.includes("T")) return s.split("T")[0];
  return s;
}

function formatTimeForDisplay(val) {
  if (!val) return "10:00";
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "HH:mm");
  }
  const s = val.toString().trim();
  const match = s.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = match[1].padStart(2, '0');
    const mins = match[2];
    return `${hours}:${mins}`;
  }
  return s;
}

function createCalendarEvent(booking) {
  const cal = CalendarApp.getDefaultCalendar();
  if (!cal) return;

  const dateStr = formatDateForDisplay(booking.preferred_date);
  const timeStr = formatTimeForDisplay(booking.preferred_time);

  const parts = dateStr.split("-").map(Number);
  const timeParts = timeStr.split(":").map(Number);

  if (parts.length < 3 || isNaN(parts[0])) {
    Logger.log("Invalid date string for calendar: " + dateStr);
    return;
  }

  const year = parts[0];
  const month = parts[1] - 1;
  const day = parts[2];
  const hour = isNaN(timeParts[0]) ? 10 : timeParts[0];
  const minute = isNaN(timeParts[1]) ? 0 : timeParts[1];

  const startTime = new Date(year, month, day, hour, minute, 0);
  const endTime = new Date(startTime.getTime() + (90 * 60 * 1000));

  const title = `✨ ${CONFIG.SALON_NAME}: ${booking.service_type} - ${booking.client_name}`;
  const desc = `Service: ${booking.service_type}\nClient: ${booking.client_name}\nPhone: ${booking.client_phone}\nEmail: ${booking.client_email}\nID: ${booking.booking_id}\nNotes: ${booking.message}`;

  cal.createEvent(title, startTime, endTime, {
    description: desc,
    location: CONFIG.SALON_ADDRESS
  });
}

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
