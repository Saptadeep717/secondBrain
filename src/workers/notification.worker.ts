import cron from "node-cron";
import nodemailer from "nodemailer";
import { UserModel } from "../db/models/user.model";
import { ContentModel } from "../db/models/content.model";
import { enrichWithFallback } from "../services/ai/llm.provider";

// ─── Mailer setup ─────────────────────────────────────────────────────────────
// Uses SendGrid SMTP — swap host/port for any other provider.
// Required env vars:
//   SMTP_HOST     e.g. "smtp.sendgrid.net"
//   SMTP_PORT     e.g. "587"
//   SMTP_USER     e.g. "apikey" (SendGrid)
//   SMTP_PASS     your SendGrid API key
//   EMAIL_FROM    e.g. "brain@yourdomain.com"

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.sendgrid.net",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// ─── Digest generator ────────────────────────────────────────────────────────

async function generateWeeklyDigest(userId: string): Promise<string | null> {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const contents = await ContentModel.find({
    userId,
    status: "enriched",
    createdAt: { $gte: since },
  })
    .populate("tags", "name")
    .lean();

  if (contents.length === 0) return null;

  const contentList = contents
    .map((item: any) => {
      const tags = item.tags?.map((t: any) => t.name).join(", ") || "untagged";
      return `- "${item.title}" [${tags}]: ${item.summary || "no summary"}`;
    })
    .join("\n");

  const prompt = `You are a personal knowledge assistant writing a friendly weekly digest email.

The user saved ${contents.length} items this week:
${contentList}

Write a short, warm, personal email digest in plain text (no HTML, no markdown).
Structure:
1. One opening sentence about the week's theme
2. 2-3 bullet highlights (specific titles)
3. One suggested next topic to explore
4. One closing sentence

Keep it under 200 words. Be specific, not generic.`;

  try {
    const result = await enrichWithFallback(prompt);
    return (result as any).summary || String(result);
  } catch {
    // Fallback to plain stats if LLM fails
    return `You saved ${contents.length} items this week. Keep building your second brain!`;
  }
}

// ─── Email sender ────────────────────────────────────────────────────────────

async function sendDigestEmail(
  email: string,
  username: string,
  digestText: string,
): Promise<void> {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "brain@secondbrain.app",
    to: email,
    subject: `Your Second Brain weekly digest 🧠`,
    text: `Hi ${username},\n\n${digestText}\n\n— Your Second Brain`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #333;">Your weekly digest 🧠</h2>
        <p>Hi <strong>${username}</strong>,</p>
        <div style="line-height: 1.7; color: #444;">
          ${digestText.replace(/\n/g, "<br>")}
        </div>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">— Your Second Brain</p>
      </div>
    `,
  });
}

// ─── Main job ─────────────────────────────────────────────────────────────────

async function runWeeklyDigest(): Promise<void> {
  console.log("[notification-worker] Running weekly digest job...");

  // Only users who have an email field — add email to user.model.ts
  // when you add OAuth or an email settings route
  const users = await UserModel.find({
    email: { $exists: true, $ne: "" },
  }).lean();

  console.log(`[notification-worker] Sending digest to ${users.length} users`);

  for (const user of users) {
    try {
      const digest = await generateWeeklyDigest((user._id as any).toString());
      if (!digest) {
        console.log(
          `[notification-worker] No content this week for userId=${user._id} — skipping`,
        );
        continue;
      }

      await sendDigestEmail((user as any).email, user.username, digest);

      console.log(`[notification-worker] ✅ Digest sent to userId=${user._id}`);

      // Small delay between emails — avoids SMTP rate limits
      await new Promise((r) => setTimeout(r, 500));
    } catch (err: any) {
      // One user failing doesn't stop the others
      console.error(
        `[notification-worker] ❌ Failed for userId=${user._id}: ${err.message}`,
      );
    }
  }

  console.log("[notification-worker] Weekly digest job complete");
}

// ─── Cron schedule ───────────────────────────────────────────────────────────

export function startNotificationWorker(): void {
  // Every Sunday at 9am UTC
  // Cron format: minute hour day-of-month month day-of-week
  cron.schedule("0 9 * * 0", async () => {
    try {
      await runWeeklyDigest();
    } catch (err: any) {
      console.error("[notification-worker] Cron job failed:", err.message);
    }
  });

  console.log("🔧 Notification worker started (weekly digest: Sunday 9am UTC)");
}
