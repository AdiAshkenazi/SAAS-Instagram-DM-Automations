/**
 * Import AI Atelier 45-day schedule into the workspace scheduler.
 *
 * Usage:
 *   node scripts/import-ai-atelier.mjs
 *
 * What it does:
 *   1. Finds the "AI Atelier" workspace
 *   2. Finds its Instagram, Facebook, and Telegram accounts
 *   3. For each of the 90 posts in post_schedule.json:
 *      - Creates a WorkspacePost (Instagram/Facebook caption) + PostTargets for IG + FB
 *      - Creates a separate WorkspacePost (Telegram HTML caption) + PostTarget for TG
 *   Skips posts that are already scheduled (idempotent by mediaUrl + scheduledAt).
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env manually without dotenv dependency
try {
  const envFile = readFileSync(path.join(__dirname, "../.env"), "utf8");
  for (const line of envFile.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  }
} catch { /* .env not found, rely on system env */ }

const prisma = new PrismaClient();
const SCHEDULE_PATH = path.join(
  __dirname,
  "../../SOCIAL MEDIA - AI ATELIER/post_schedule.json"
);

async function main() {
  const schedule = JSON.parse(readFileSync(SCHEDULE_PATH, "utf8"));
  console.log(`Loaded ${schedule.length} posts from schedule.\n`);

  // ── 1. Find AI Atelier workspace ──────────────────────────────────────────
  const workspace = await prisma.workspace.findFirst({
    where: { name: { contains: "AI Atelier", mode: "insensitive" } },
    include: { accounts: true },
  });

  if (!workspace) {
    console.error('❌ No workspace found with name containing "AI Atelier".');
    console.error("   Check the workspace name in the app and update this script.");
    process.exit(1);
  }

  console.log(`✅ Found workspace: "${workspace.name}" (${workspace.id})`);
  console.log(`   Accounts: ${workspace.accounts.map(a => `${a.platform}:${a.name}`).join(", ")}\n`);

  const igAccount   = workspace.accounts.find(a => a.platform === "INSTAGRAM");
  const fbAccount   = workspace.accounts.find(a => a.platform === "FACEBOOK");
  const tgAccount   = workspace.accounts.find(a => a.platform === "TELEGRAM");

  if (!igAccount) console.warn("⚠️  No INSTAGRAM account found — IG posts will be skipped.");
  if (!fbAccount) console.warn("⚠️  No FACEBOOK account found — FB posts will be skipped.");
  if (!tgAccount) console.warn("⚠️  No TELEGRAM account found — TG posts will be skipped.");

  // ── 2. Fetch already-scheduled posts to avoid duplicates ─────────────────
  const existing = await prisma.workspacePost.findMany({
    where: { workspaceId: workspace.id },
    select: { mediaUrl: true, scheduledAt: true },
  });
  const existingKeys = new Set(
    existing.map(p => `${p.mediaUrl}|${p.scheduledAt.toISOString()}`)
  );
  console.log(`   ${existing.length} posts already in DB (will skip duplicates).\n`);

  // ── 3. Import ─────────────────────────────────────────────────────────────
  let created = 0;
  let skipped = 0;

  for (const entry of schedule) {
    const scheduledAt = new Date(entry.scheduledAt);
    const key = `${entry.imageUrl}|${scheduledAt.toISOString()}`;

    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }

    // Determine which social accounts are in this post's platforms list
    const wantsIG = entry.platforms.includes("instagram") && igAccount;
    const wantsFB = entry.platforms.includes("facebook")  && fbAccount;
    const wantsTG = entry.platforms.includes("telegram")  && tgAccount;

    // ── Instagram + Facebook share one WorkspacePost (full caption) ──────
    if (wantsIG || wantsFB) {
      const post = await prisma.workspacePost.create({
        data: {
          workspaceId: workspace.id,
          mediaUrl:    entry.imageUrl,
          mediaType:   "IMAGE",
          caption:     entry.caption,
          scheduledAt,
          targets: {
            create: [
              ...(wantsIG ? [{ accountId: igAccount.id }] : []),
              ...(wantsFB ? [{ accountId: fbAccount.id }] : []),
            ],
          },
        },
      });
      created++;
    }

    // ── Telegram gets its own WorkspacePost with shortened HTML caption ──
    if (wantsTG) {
      await prisma.workspacePost.create({
        data: {
          workspaceId: workspace.id,
          mediaUrl:    entry.imageUrl,
          mediaType:   "IMAGE",
          caption:     entry.telegram,
          scheduledAt,
          targets: {
            create: [{ accountId: tgAccount.id }],
          },
        },
      });
      created++;
    }
  }

  console.log(`✅ Done.`);
  console.log(`   Created: ${created} WorkspacePost records`);
  console.log(`   Skipped: ${skipped} (already existed)`);
  console.log(`\n   cron-job.org will pick these up automatically at each scheduled time.`);
}

main()
  .catch(err => { console.error("❌ Fatal:", err.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
