import { Resend } from "resend";

// Lazy-initialise so a missing key doesn't crash unrelated server actions
function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set. Add it to your .env file.");
  return new Resend(key);
}

export async function sendReportEmail({
  to,
  studentName,
  reportUrl,
  term,
}: {
  to: string;
  studentName: string;
  reportUrl: string;
  term: string;
}) {
  return getResend().emails.send({
    from: "Abundant Rain School <reports@abundantrain.edu.gh>",
    to,
    subject: `${studentName}'s Terminal Report — ${term}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <div style="background:#7c3aed;padding:24px;text-align:center;">
          <h1 style="color:#fff;font-size:18px;margin:0;letter-spacing:0.5px;">ABUNDANT RAIN SCHOOL</h1>
          <p style="color:#ddd6fe;font-size:13px;margin:4px 0 0;">Abease, Amasaman, Accra</p>
          <p style="color:#f0c040;font-size:13px;font-weight:600;margin:4px 0 0;">✦ Let God Arise!</p>
        </div>

        <div style="padding:28px 24px;">
          <p style="color:#374151;font-size:15px;">Dear Parent / Guardian,</p>
          <p style="color:#374151;font-size:15px;line-height:1.6;">
            The terminal report for <strong>${studentName}</strong> (${term}) is now ready.
            Click the button below to view it online.
          </p>

          <div style="text-align:center;margin:28px 0;">
            <a href="${reportUrl}"
               style="background:#7c3aed;color:#fff;padding:13px 28px;border-radius:6px;
                      text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">
              View Report Card
            </a>
          </div>

          <p style="color:#9ca3af;font-size:13px;line-height:1.5;">
            This link is private — please do not share it publicly.<br />
            If you have any questions, contact the school directly.
          </p>
        </div>

        <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#6b7280;font-size:12px;margin:0;">
            © ${new Date().getFullYear()} Abundant Rain School · Let God Arise!
          </p>
        </div>
      </div>
    `,
  });
}
