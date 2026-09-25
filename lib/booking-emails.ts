type BookingEmailInput = {
  bookingReference: string;
  dishName: string;
  sessionDate: string;
  sessionTime: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  notes: string | null;
};

export type BookingEmailResult = {
  confirmationEmailSent: boolean;
  adminNotificationSent: boolean;
  meetingUrl: string | null;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function notificationRecipients() {
  const configured = process.env.BOOKING_NOTIFICATION_EMAILS ?? process.env.ADMIN_EMAIL ?? "";
  return [...new Set(configured.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean))];
}

async function sendEmail(payload: { from: string; to: string[]; subject: string; html: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error(`Resend email failed (${response.status}): ${detail}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Resend email request failed", error instanceof Error ? error.message : error);
    return false;
  }
}

export async function sendBookingEmails(input: BookingEmailInput): Promise<BookingEmailResult> {
  const from = process.env.BOOKING_FROM_EMAIL?.trim();
  const meetingUrl = process.env.SESSION_MEETING_URL?.trim() || null;
  const admins = notificationRecipients();

  if (!process.env.RESEND_API_KEY || !from) {
    console.warn("Booking email delivery is not configured. Add RESEND_API_KEY and BOOKING_FROM_EMAIL.");
    return { confirmationEmailSent: false, adminNotificationSent: false, meetingUrl };
  }

  const safe = {
    reference: escapeHtml(input.bookingReference),
    dish: escapeHtml(input.dishName),
    date: escapeHtml(input.sessionDate),
    time: escapeHtml(input.sessionTime),
    name: escapeHtml(input.guestName),
    email: escapeHtml(input.guestEmail),
    phone: escapeHtml(input.guestPhone ?? "Not provided"),
    notes: escapeHtml(input.notes ?? "None"),
    meetingUrl: meetingUrl ? escapeHtml(meetingUrl) : null,
  };

  const meetingHtml = safe.meetingUrl
    ? `<p style="margin:24px 0"><a href="${safe.meetingUrl}" style="background:#000;color:#fff;padding:14px 20px;text-decoration:none;display:inline-block">Join the virtual session</a></p><p style="color:#555">Meeting link: ${safe.meetingUrl}</p>`
    : `<p style="color:#555">Your host will send the meeting link before the scheduled session.</p>`;
  const meetingText = meetingUrl ? `Meeting link: ${meetingUrl}` : "Your host will send the meeting link before the scheduled session.";

  const confirmation = sendEmail({
    from,
    to: [input.guestEmail],
    subject: `Your Berl's Cooking Class session is confirmed`,
    html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#111"><h1 style="font-family:Georgia,serif;font-weight:400">Session confirmed</h1><p>Hi ${safe.name},</p><p>Your virtual cooking session is booked.</p><table style="border-collapse:collapse;width:100%;margin:24px 0"><tr><td style="border-top:1px solid #111;padding:12px 0"><strong>Dish</strong></td><td style="border-top:1px solid #111;padding:12px 0">${safe.dish}</td></tr><tr><td style="border-top:1px solid #111;padding:12px 0"><strong>Date</strong></td><td style="border-top:1px solid #111;padding:12px 0">${safe.date}</td></tr><tr><td style="border-top:1px solid #111;padding:12px 0"><strong>Time</strong></td><td style="border-top:1px solid #111;padding:12px 0">${safe.time}</td></tr><tr><td style="border-block:1px solid #111;padding:12px 0"><strong>Reference</strong></td><td style="border-block:1px solid #111;padding:12px 0">${safe.reference}</td></tr></table>${meetingHtml}<p>Have your ingredients ready and join at the scheduled time.</p><p>Berl's Cooking Class<br>+1 (416) 826-8466</p></div>`,
    text: `Hi ${input.guestName},\n\nYour Berl's Cooking Class session is confirmed.\nDish: ${input.dishName}\nDate: ${input.sessionDate}\nTime: ${input.sessionTime}\nReference: ${input.bookingReference}\n${meetingText}\n\nHave your ingredients ready and join at the scheduled time.\nBerl's Cooking Class\n+1 (416) 826-8466`,
  });

  const notification = admins.length
    ? sendEmail({
        from,
        to: admins,
        subject: `New booking: ${input.dishName} on ${input.sessionDate}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#111"><h1 style="font-family:Georgia,serif;font-weight:400">New cooking session booking</h1><table style="border-collapse:collapse;width:100%;margin:24px 0"><tr><td style="border-top:1px solid #111;padding:10px 0"><strong>Guest</strong></td><td style="border-top:1px solid #111;padding:10px 0">${safe.name}</td></tr><tr><td style="border-top:1px solid #111;padding:10px 0"><strong>Email</strong></td><td style="border-top:1px solid #111;padding:10px 0">${safe.email}</td></tr><tr><td style="border-top:1px solid #111;padding:10px 0"><strong>Phone</strong></td><td style="border-top:1px solid #111;padding:10px 0">${safe.phone}</td></tr><tr><td style="border-top:1px solid #111;padding:10px 0"><strong>Dish</strong></td><td style="border-top:1px solid #111;padding:10px 0">${safe.dish}</td></tr><tr><td style="border-top:1px solid #111;padding:10px 0"><strong>Date and time</strong></td><td style="border-top:1px solid #111;padding:10px 0">${safe.date} at ${safe.time}</td></tr><tr><td style="border-top:1px solid #111;padding:10px 0"><strong>Notes</strong></td><td style="border-top:1px solid #111;padding:10px 0">${safe.notes}</td></tr><tr><td style="border-block:1px solid #111;padding:10px 0"><strong>Reference</strong></td><td style="border-block:1px solid #111;padding:10px 0">${safe.reference}</td></tr></table><p>Open the session manager to review upcoming bookings.</p></div>`,
        text: `New cooking session booking\nGuest: ${input.guestName}\nEmail: ${input.guestEmail}\nPhone: ${input.guestPhone ?? "Not provided"}\nDish: ${input.dishName}\nDate and time: ${input.sessionDate} at ${input.sessionTime}\nNotes: ${input.notes ?? "None"}\nReference: ${input.bookingReference}`,
      })
    : Promise.resolve(false);

  const [confirmationEmailSent, adminNotificationSent] = await Promise.all([confirmation, notification]);
  return { confirmationEmailSent, adminNotificationSent, meetingUrl };
}
