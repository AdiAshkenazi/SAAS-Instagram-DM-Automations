/**
 * Fixes Telegram captions that exceed the 1024-char sendPhoto limit.
 *
 * Strategy: keep the header line and hashtag line, trim the body text
 * in the middle with "…" to fit within 1024 chars.
 *
 * Also resets any FAILED PostTarget records for Telegram posts that
 * were in the over-limit set back to PENDING so they will be retried.
 *
 * Usage: node scripts/fix-telegram-captions.mjs
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env manually
try {
  const envFile = readFileSync(path.join(__dirname, "../.env"), "utf8");
  for (const line of envFile.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  }
} catch { /* rely on system env */ }

const prisma = new PrismaClient();
const LIMIT = 1024;
const SCHEDULE_PATH = path.join(__dirname, "../../SOCIAL MEDIA - AI ATELIER/post_schedule.json");

function trimCaption(caption) {
  if (caption.length <= LIMIT) return caption;

  const lines = caption.split("\n");
  // Last line is hashtags, first two lines are header + blank line
  const header = lines.slice(0, 2).join("\n");           // "🎯 <b>AI Atelier</b>\n"
  const hashtags = lines[lines.length - 1];              // "#HashTag #HashTag ..."
  const bodyLines = lines.slice(2, lines.length - 1);    // everything in between

  const suffix = "\n\n…\n\n" + hashtags;
  const maxBody = LIMIT - header.length - suffix.length;

  let body = bodyLines.join("\n");
  if (body.length > maxBody) {
    body = body.slice(0, maxBody).replace(/\s+\S*$/, ""); // cut at word boundary
  }

  return header + body + suffix;
}

async function main() {
  // ── 1. Fix post_schedule.json ─────────────────────────────────────────────
  const schedule = JSON.parse(readFileSync(SCHEDULE_PATH, "utf8"));
  let fixedInFile = 0;

  for (const entry of schedule) {
    if (entry.telegram && entry.telegram.length > LIMIT) {
      entry.telegram = trimCaption(entry.telegram);
      fixedInFile++;
    }
  }

  writeFileSync(SCHEDULE_PATH, JSON.stringify(schedule, null, 2));
  console.log(`✅ Fixed ${fixedInFile} captions in post_schedule.json`);

  // Verify
  const stillOver = schedule.filter(e => e.telegram && e.telegram.length > LIMIT);
  if (stillOver.length > 0) {
    console.error("❌ Still over limit:", stillOver.map(e => `${e.scheduledAt}: ${e.telegram.length}`));
    process.exit(1);
  }
  console.log("   All captions now ≤ 1024 chars ✓\n");

  // ── 2. Patch database ─────────────────────────────────────────────────────
  const workspace = await prisma.workspace.findFirst({
    where: { name: { contains: "AI Atelier", mode: "insensitive" } },
    include: { accounts: true },
  });

  if (!workspace) {
    console.error("❌ AI Atelier workspace not found.");
    process.exit(1);
  }

  const tgAccount = workspace.accounts.find(a => a.platform === "TELEGRAM");
  if (!tgAccount) {
    console.error("❌ No TELEGRAM account found.");
    process.exit(1);
  }

  let updated = 0;
  let reset = 0;

  for (const entry of schedule) {
    const scheduledAt = new Date(entry.scheduledAt);

    // Find the Telegram WorkspacePost for this entry
    const post = await prisma.workspacePost.findFirst({
      where: {
        workspaceId: workspace.id,
        mediaUrl: entry.imageUrl,
        scheduledAt,
        targets: { some: { accountId: tgAccount.id } },
      },
      include: { targets: { where: { accountId: tgAccount.id } } },
    });

    if (!post) continue;

    // Update caption if it changed
    await prisma.workspacePost.update({
      where: { id: post.id },
      data: { caption: entry.telegram },
    });
    updated++;

    // Reset FAILED targets back to PENDING
    for (const target of post.targets) {
      if (target.status === "FAILED") {
        await prisma.postTarget.update({
          where: { id: target.id },
          data: { status: "PENDING", error: null },
        });
        reset++;
        console.log(`   ↩️  Reset FAILED → PENDING: ${entry.scheduledAt}`);
      }
    }
  }

  console.log(`\n✅ Updated ${updated} Telegram WorkspacePost captions in DB`);
  console.log(`   Reset ${reset} FAILED targets back to PENDING`);
  console.log(`\n   cron-job.org will retry the reset posts at the next run.`);
}

main()
  .catch(err => { console.error("❌ Fatal:", err.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
