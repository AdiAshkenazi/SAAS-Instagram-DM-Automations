import { client } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function publishToInstagram(
  igUserId: string,
  token: string,
  mediaUrl: string,
  caption: string,
  mediaType: string
): Promise<string> {
  const body: Record<string, string> = {
    caption,
    access_token: token,
  };

  if (mediaType === "REEL") {
    body.media_type = "REELS";
    body.video_url = mediaUrl;
  } else if (mediaType === "STORY") {
    body.media_type = "STORIES";
    body.image_url = mediaUrl;
  } else {
    body.image_url = mediaUrl;
  }

  // Step 1: Create container
  const containerRes = await fetch(
    `${process.env.INSTAGRAM_BASE_URL}/${igUserId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const container = await containerRes.json();
  if (!container.id) throw new Error(`Container failed: ${JSON.stringify(container)}`);

  // Step 2: Wait for FINISHED
  let attempts = 0;
  let containerStatus = "";
  while (containerStatus !== "FINISHED" && attempts < 15) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusRes = await fetch(
      `${process.env.INSTAGRAM_BASE_URL}/${container.id}?fields=status_code&access_token=${token}`
    );
    const statusData = await statusRes.json();
    containerStatus = statusData.status_code;
    attempts++;
  }
  if (containerStatus !== "FINISHED") throw new Error("Container not ready after 30s");

  // Step 3: Publish
  const publishRes = await fetch(
    `${process.env.INSTAGRAM_BASE_URL}/${igUserId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: container.id, access_token: token }),
    }
  );
  const published = await publishRes.json();
  if (!published.id) throw new Error(`Publish failed: ${JSON.stringify(published)}`);

  return published.id;
}

async function publishToTelegram(
  botToken: string,
  channelId: string,
  mediaUrl: string,
  caption: string,
  mediaType: string
): Promise<string> {
  const isVideo = mediaType === "VIDEO" || mediaType === "REEL";
  const method = isVideo ? "sendVideo" : "sendPhoto";
  const mediaKey = isVideo ? "video" : "photo";

  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: channelId,
        [mediaKey]: mediaUrl,
        caption,
        parse_mode: "HTML",
      }),
    }
  );
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram failed: ${data.description}`);
  return String(data.result.message_id);
}

// ─── Main Cron Handler ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    let published = 0;
    let failed = 0;

    // ── 1. Legacy ScheduledPost (original single-account scheduler) ──────────
    const dueLegacyPosts = await client.scheduledPost.findMany({
      where: { status: "PENDING", scheduledAt: { lte: now } },
      include: { User: { include: { integrations: true } } },
    });

    for (const post of dueLegacyPosts) {
      try {
        const token = post.User.integrations[0]?.token;
        const igUserId = post.User.integrations[0]?.instagramId;
        if (!token || !igUserId) throw new Error("No Instagram credentials");

        const postId = await publishToInstagram(
          igUserId, token, post.mediaUrl, post.caption ?? "", post.mediaType
        );

        await client.scheduledPost.update({
          where: { id: post.id },
          data: { status: "PUBLISHED", instagramId: postId },
        });
        published++;
      } catch (err: any) {
        await client.scheduledPost.update({
          where: { id: post.id },
          data: { status: "FAILED" },
        });
        failed++;
      }
    }

    // ── 2. WorkspacePost (multi-platform scheduler) ──────────────────────────
    const dueWorkspacePosts = await client.workspacePost.findMany({
      where: {
        scheduledAt: { lte: now },
        targets: { some: { status: "PENDING" } },
      },
      include: {
        targets: {
          where: { status: "PENDING" },
          include: { Account: true },
        },
      },
    });

    for (const post of dueWorkspacePosts) {
      for (const target of post.targets) {
        try {
          let publishedId: string;

          if (target.Account.platform === "INSTAGRAM") {
            publishedId = await publishToInstagram(
              target.Account.accountId,
              target.Account.token,
              post.mediaUrl,
              post.caption ?? "",
              post.mediaType
            );
          } else if (target.Account.platform === "TELEGRAM") {
            publishedId = await publishToTelegram(
              target.Account.token,
              target.Account.accountId,
              post.mediaUrl,
              post.caption ?? "",
              post.mediaType
            );
          } else {
            throw new Error(`Unknown platform: ${target.Account.platform}`);
          }

          await client.postTarget.update({
            where: { id: target.id },
            data: {
              status: "PUBLISHED",
              publishedId,
              publishedAt: new Date(),
            },
          });
          published++;
        } catch (err: any) {
          await client.postTarget.update({
            where: { id: target.id },
            data: { status: "FAILED", error: err.message },
          });
          failed++;
        }
      }
    }

    // ── 3. DM Sequence steps ──────────────────────────────────────────────────
    const dueEnrollments = await client.sequenceEnrollment.findMany({
      where: {
        completed: false,
        waitingForEmail: false,
        nextSendAt: { lte: now },
      },
      include: {
        Sequence: { include: { steps: { orderBy: { stepOrder: "asc" } } } },
      },
    });

    let sequencesSent = 0;

    for (const enrollment of dueEnrollments) {
      const steps = enrollment.Sequence.steps;
      const step = steps.find((s) => s.stepOrder === enrollment.nextStepOrder);

      if (!step) {
        // Sequence complete
        await client.sequenceEnrollment.update({ where: { id: enrollment.id }, data: { completed: true } });
        continue;
      }

      try {
        if (step.isEmailCapture) {
          // Send the email capture prompt
          const prompt = step.emailPrompt || "Please reply with your email address to receive this:";
          await fetch(`https://graph.instagram.com/${enrollment.ownerIgId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipient: { id: enrollment.contactIgId },
              message: { text: prompt },
              access_token: enrollment.ownerToken,
            }),
          });
          await client.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: { waitingForEmail: true },
          });
        } else {
          // Send the message
          await fetch(`https://graph.instagram.com/${enrollment.ownerIgId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipient: { id: enrollment.contactIgId },
              message: { text: step.message },
              access_token: enrollment.ownerToken,
            }),
          });

          const nextStep = steps.find((s) => s.stepOrder === enrollment.nextStepOrder + 1);
          await client.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: {
              nextStepOrder: enrollment.nextStepOrder + 1,
              nextSendAt: nextStep ? new Date(now.getTime() + nextStep.delayHours * 3600 * 1000) : now,
              completed: !nextStep,
            },
          });
          sequencesSent++;
        }
      } catch (err: any) {
        console.error("Sequence step error:", err.message);
      }
    }

    // ── 4. Follower count snapshots ──────────────────────────────────────────
    let snapshotsTaken = 0;
    const BASE_URL = process.env.INSTAGRAM_BASE_URL!;

    // Workspace accounts
    const wsAccounts = await client.account.findMany({
      where: { platform: "INSTAGRAM" },
      include: { Workspace: { select: { userId: true } } },
    });

    for (const acc of wsAccounts) {
      try {
        const res = await fetch(
          `${BASE_URL}/${acc.accountId}?fields=followers_count&access_token=${acc.token}`
        );
        const data = await res.json();
        if (typeof data.followers_count === "number") {
          await client.followerSnapshot.create({
            data: {
              accountRef: acc.id,
              ownerUserId: acc.Workspace.userId,
              count: data.followers_count,
            },
          });
          snapshotsTaken++;
        }
      } catch {
        // silent — don't break the cron
      }
    }

    // Legacy integration accounts
    const integrations = await client.integrations.findMany({
      where: { instagramId: { not: null } },
      select: { id: true, token: true, instagramId: true, userId: true },
    });

    for (const ig of integrations) {
      if (!ig.instagramId || !ig.userId) continue;
      try {
        const res = await fetch(
          `${BASE_URL}/${ig.instagramId}?fields=followers_count&access_token=${ig.token}`
        );
        const data = await res.json();
        if (typeof data.followers_count === "number") {
          await client.followerSnapshot.create({
            data: {
              accountRef: "__legacy__",
              ownerUserId: ig.userId,
              count: data.followers_count,
            },
          });
          snapshotsTaken++;
        }
      } catch {
        // silent
      }
    }

    return NextResponse.json({
      published,
      failed,
      legacy: dueLegacyPosts.length,
      workspace: dueWorkspacePosts.length,
      sequenceStepsSent: sequencesSent,
      snapshotsTaken,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
