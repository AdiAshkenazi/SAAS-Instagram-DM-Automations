import { findAutomation } from "@/actions/automation/queries";
import {
  createChatHistory,
  getChatHistory,
  getKeywordAutomation,
  getKeywordPost,
  getStoryReplyAutomation,
  matchKeyword,
  trackResponse,
} from "@/actions/webhook/queries";
import { sendDm, sendPrivateMessage } from "@/lib/fetch";
import { openai } from "@/lib/openai";
import { client } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.INSTAGRAM_BASE_URL!;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getTokenForIgUser(igUserId: string): Promise<{ token: string; userId: string } | null> {
  const wsAccount = await client.account.findFirst({
    where: { accountId: igUserId, platform: "INSTAGRAM" },
    select: { token: true },
  });
  if (wsAccount) {
    const user = await client.user.findFirst({
      where: { workspaces: { some: { accounts: { some: { accountId: igUserId } } } } },
      select: { id: true },
    });
    return user ? { token: wsAccount.token, userId: user.id } : null;
  }
  const integration = await client.integrations.findFirst({
    where: { instagramId: igUserId },
    select: { token: true, userId: true },
  });
  if (integration?.userId) return { token: integration.token, userId: integration.userId };
  return null;
}

// ─── STORY MENTION handler ────────────────────────────────────────────────────

async function handleMention(igUserId: string, mediaId: string) {
  try {
    const creds = await getTokenForIgUser(igUserId);
    if (!creds) return;

    // Get sender from the mentioned media
    const res = await fetch(`${BASE}/${mediaId}?fields=owner&access_token=${creds.token}`);
    const data = await res.json();
    const senderId = data?.owner?.id;
    if (!senderId || senderId === igUserId) return;

    // Check for MENTION trigger automation
    const automation = await client.automation.findFirst({
      where: {
        active: true,
        trigger: { some: { type: "MENTION" } },
        User: {
          OR: [
            { integrations: { some: { instagramId: igUserId } } },
            { workspaces: { some: { accounts: { some: { accountId: igUserId } } } } },
          ],
        },
      },
      include: { listener: true },
    });

    if (automation?.listener?.prompt) {
      await sendDm(igUserId, senderId, automation.listener.prompt, creds.token);
      await client.listener.update({ where: { automationId: automation.id }, data: { dmCount: { increment: 1 } } });
    }

    // Enroll in any active MENTION sequences
    await enrollInSequences(igUserId, senderId, creds.token, "MENTION", "");
  } catch (err) {
    console.error("Mention handler error:", err);
  }
}

// ─── SEQUENCE enrollment ──────────────────────────────────────────────────────

async function enrollInSequences(
  ownerIgId: string,
  contactIgId: string,
  token: string,
  triggerType: string,
  text: string
) {
  try {
    const sequences = await client.dmSequence.findMany({
      where: {
        active: true,
        triggerType,
        User: {
          OR: [
            { integrations: { some: { instagramId: ownerIgId } } },
            { workspaces: { some: { accounts: { some: { accountId: ownerIgId } } } } },
          ],
        },
        ...(triggerType === "KEYWORD" || triggerType === "COMMENT"
          ? { triggerWord: { not: null } }
          : {}),
      },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });

    for (const seq of sequences) {
      // For keyword triggers, check if text matches
      if ((seq.triggerType === "KEYWORD" || seq.triggerType === "COMMENT") && seq.triggerWord) {
        if (!text.toLowerCase().includes(seq.triggerWord.toLowerCase())) continue;
      }

      if (seq.steps.length === 0) continue;

      // Don't re-enroll same contact in same sequence
      const existing = await client.sequenceEnrollment.findUnique({
        where: { sequenceId_contactIgId: { sequenceId: seq.id, contactIgId } },
      });
      if (existing) continue;

      // Send step 0 immediately if delayHours === 0
      const firstStep = seq.steps[0];
      let nextStepOrder = 0;
      let nextSendAt = new Date();

      if (firstStep.delayHours === 0 && !firstStep.isEmailCapture) {
        await sendDm(ownerIgId, contactIgId, firstStep.message, token);
        nextStepOrder = 1;
        nextSendAt = seq.steps[1]
          ? new Date(Date.now() + seq.steps[1].delayHours * 3600 * 1000)
          : new Date();
      } else if (firstStep.isEmailCapture) {
        // Send email capture prompt
        const prompt = firstStep.emailPrompt || "Please reply with your email address to receive this:";
        await sendDm(ownerIgId, contactIgId, prompt, token);
      }

      await client.sequenceEnrollment.create({
        data: {
          sequenceId: seq.id,
          contactIgId,
          ownerIgId,
          ownerToken: token,
          nextStepOrder,
          nextSendAt,
          waitingForEmail: firstStep.isEmailCapture && firstStep.delayHours === 0,
        },
      });

      // Increment enroll count
      await client.dmSequence.update({ where: { id: seq.id }, data: { enrollCount: { increment: 1 } } });
    }
  } catch (err) {
    console.error("Sequence enrollment error:", err);
  }
}

// ─── EMAIL CAPTURE: check if incoming DM is an email reply ───────────────────

async function handleEmailCaptureReply(
  ownerIgId: string,
  senderId: string,
  text: string,
  token: string
): Promise<boolean> {
  // Check sequence enrollments waiting for email
  const enrollment = await client.sequenceEnrollment.findFirst({
    where: { ownerIgId, contactIgId: senderId, waitingForEmail: true },
    include: { Sequence: { include: { steps: { orderBy: { stepOrder: "asc" } } } } },
  });

  if (!enrollment) {
    // Check legacy automation email capture
    const state = await client.emailCaptureState.findFirst({
      where: { ownerIgId, senderIgId: senderId },
    });
    if (!state) return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(text.trim())) {
      await sendDm(ownerIgId, senderId, "That doesn't look like a valid email. Please try again:", token);
      return true;
    }

    // Save captured email and send the actual message
    const listener = await client.listener.findUnique({ where: { id: state.listenerId } });
    if (listener) {
      await client.capturedEmail.create({ data: { listenerId: listener.id, senderIgId: senderId, email: text.trim() } });
      await client.emailCaptureState.delete({ where: { id: state.id } });
      await sendDm(ownerIgId, senderId, listener.prompt, token);
    }
    return true;
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(text.trim())) {
    await sendDm(ownerIgId, senderId, "That doesn't look like a valid email. Please reply with your email address:", token);
    return true;
  }

  // Save email, advance to next step
  await client.sequenceEnrollment.update({
    where: { id: enrollment.id },
    data: {
      capturedEmail: text.trim(),
      waitingForEmail: false,
      nextStepOrder: enrollment.nextStepOrder + 1,
      nextSendAt: new Date(), // process immediately on next cron
    },
  });

  // Send the next step immediately if it exists and has no delay
  const nextStep = enrollment.Sequence.steps[enrollment.nextStepOrder + 1];
  if (nextStep && nextStep.delayHours === 0) {
    await sendDm(ownerIgId, senderId, nextStep.message, token);
    await client.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        nextStepOrder: enrollment.nextStepOrder + 2,
        nextSendAt: enrollment.Sequence.steps[enrollment.nextStepOrder + 2]
          ? new Date(Date.now() + enrollment.Sequence.steps[enrollment.nextStepOrder + 2].delayHours * 3600 * 1000)
          : new Date(),
        completed: !enrollment.Sequence.steps[enrollment.nextStepOrder + 2],
      },
    });
  }

  return true;
}

// ─── Follower check ───────────────────────────────────────────────────────────

async function checkIsFollower(ownerIgId: string, commenterIgId: string, token: string): Promise<boolean> {
  try {
    let url = `${BASE}/${ownerIgId}/followers?fields=id&limit=500&access_token=${token}`;
    for (let page = 0; page < 5; page++) {
      const res = await fetch(url);
      const data = await res.json();
      if (!Array.isArray(data.data)) return false;
      if (data.data.some((f: any) => f.id === commenterIgId)) return true;
      if (!data.paging?.next) break;
      url = data.paging.next;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── Comment Automation helper ────────────────────────────────────────────────

async function handleCommentAutomation(
  igUserId: string,
  commentId: string,
  commentText: string,
  commenterIgId: string
) {
  try {
    const creds = await getTokenForIgUser(igUserId);
    if (!creds) return;

    const automations = await client.commentAutomation.findMany({
      where: { userId: creds.userId, active: true },
      include: { keywords: true },
    });

    const lowerText = commentText.toLowerCase();

    for (const automation of automations) {
      const hasKeywords = automation.keywords.length > 0;
      const matches = !hasKeywords || automation.keywords.some((kw) => lowerText.includes(kw.word.toLowerCase()));
      if (!matches) continue;

      const updates: { replyCount?: any; dmCount?: any } = {};

      // ── 1. Public comment reply ──────────────────────────────────────────────
      let replyMessage: string | null = null;
      if (automation.replyType === "FIXED" && automation.replyText) {
        replyMessage = automation.replyText;
      } else if (automation.replyType === "AI" && process.env.OPEN_AI_KEY) {
        const prompt = automation.aiPrompt
          ? `${automation.aiPrompt}\n\nReply to this Instagram comment in 1-2 sentences: "${commentText}"`
          : `Reply to this Instagram comment in a friendly, engaging way in 1-2 sentences: "${commentText}"`;
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 100,
          temperature: 0.8,
        });
        replyMessage = completion.choices[0]?.message?.content?.trim() ?? null;
      }

      if (replyMessage) {
        await fetch(`${BASE}/${commentId}/replies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: replyMessage, access_token: creds.token }),
        });
        updates.replyCount = { increment: 1 };
      }

      // ── 2. Comment-to-DM flow ────────────────────────────────────────────────
      if (automation.sendDm && commenterIgId) {
        let dmText: string | null = null;

        if (automation.checkFollower) {
          const isFollower = await checkIsFollower(igUserId, commenterIgId, creds.token);
          dmText = isFollower
            ? (automation.dmIfFollowing ?? null)
            : (automation.dmIfNotFollowing ?? null);
        } else {
          dmText = automation.dmMessage ?? null;
        }

        if (dmText) {
          await sendDm(igUserId, commenterIgId, dmText, creds.token);
          updates.dmCount = { increment: 1 };
        }
      }

      if (Object.keys(updates).length > 0) {
        await client.commentAutomation.update({ where: { id: automation.id }, data: updates });
      }
      break;
    }
  } catch (err) {
    console.error("Comment automation error:", err);
  }
}

// ─── Route handlers ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const hub = req.nextUrl.searchParams.get("hub.challenge");
  return new NextResponse(hub);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  let matcher;

  try {
    const igUserId: string = body.entry[0].id;
    const change = body.entry[0].changes?.[0];
    const messaging = body.entry[0].messaging?.[0];

    // ── Story Mention ────────────────────────────────────────────────────────
    if (change?.field === "mentions") {
      handleMention(igUserId, change.value.media_id);
      return NextResponse.json({ message: "ok" }, { status: 200 });
    }

    // ── Story Reply ──────────────────────────────────────────────────────────
    if (messaging?.message?.reply_to?.story) {
      const senderId = messaging.sender.id;
      const messageText = messaging.message?.text ?? "";

      const storyAutomation = await client.automation.findFirst({
        where: {
          active: true,
          trigger: { some: { type: "STORY_REPLY" } },
          User: { integrations: { some: { instagramId: igUserId } } },
        },
        include: { listener: true, User: { select: { integrations: { select: { token: true } } } } },
      });

      if (storyAutomation?.listener) {
        const token = storyAutomation.User?.integrations[0]?.token;
        if (token) {
          if (storyAutomation.listener.requireEmail) {
            const emailPrompt = storyAutomation.listener.emailPrompt || "Reply with your email to receive this:";
            await sendDm(igUserId, senderId, emailPrompt, token);
            await client.emailCaptureState.upsert({
              where: { listenerId_senderIgId: { listenerId: storyAutomation.listener.id, senderIgId: senderId } },
              create: { listenerId: storyAutomation.listener.id, ownerIgId: igUserId, senderIgId: senderId },
              update: {},
            });
          } else {
            await sendDm(igUserId, senderId, storyAutomation.listener.prompt, token);
          }
          await trackResponse(storyAutomation.id, "DM");
        }
      }

      // Also enroll in STORY_REPLY sequences
      const creds = await getTokenForIgUser(igUserId);
      if (creds) await enrollInSequences(igUserId, senderId, creds.token, "STORY_REPLY", messageText);

      return NextResponse.json({ message: "Story reply processed" }, { status: 200 });
    }

    // ── Comments ─────────────────────────────────────────────────────────────
    if (change?.field === "comments") {
      const commentVal = change.value;
      const commenterIgId = commentVal.from?.id ?? "";
      handleCommentAutomation(igUserId, commentVal.id, commentVal.text ?? "", commenterIgId);

      // Also enroll in COMMENT sequences
      const creds = await getTokenForIgUser(igUserId);
      if (creds) {
        await enrollInSequences(igUserId, commenterIgId, creds.token, "COMMENT", commentVal.text ?? "");
      }
    }

    // ── DMs ───────────────────────────────────────────────────────────────────
    if (messaging) {
      const senderId = messaging.sender.id;
      const msgText = messaging.message?.text ?? "";
      const creds = await getTokenForIgUser(igUserId);

      // Check if this is an email capture reply
      if (creds) {
        const handled = await handleEmailCaptureReply(igUserId, senderId, msgText, creds.token);
        if (handled) return NextResponse.json({ message: "ok" }, { status: 200 });
      }

      // Keyword matching for existing automation
      matcher = await matchKeyword(msgText);
    }

    if (change?.field === "comments") {
      matcher = await matchKeyword(change.value.text ?? "");
    }

    if (matcher && matcher.automationId) {
      console.log("🤖 Matched keyword");

      if (messaging) {
        const senderId = messaging.sender.id;
        const automation = await getKeywordAutomation(matcher.automationId, true);

        if (automation?.trigger && automation.listener) {
          const token = automation.User?.integrations[0].token!;

          if (automation.listener.listener === "MESSAGE") {
            if (automation.listener.requireEmail) {
              const emailPrompt = automation.listener.emailPrompt || "Reply with your email to receive this:";
              await sendDm(igUserId, senderId, emailPrompt, token);
              await client.emailCaptureState.upsert({
                where: { listenerId_senderIgId: { listenerId: automation.listener.id, senderIgId: senderId } },
                create: { listenerId: automation.listener.id, ownerIgId: igUserId, senderIgId: senderId },
                update: {},
              });
            } else {
              const dm = await sendDm(igUserId, senderId, automation.listener.prompt, token);
              if (dm.status === 200) {
                const tracked = await trackResponse(automation.id, "DM");
                if (tracked) return NextResponse.json({ message: "Message sent" }, { status: 200 });
              }
            }
          }

          if (automation.listener.listener === "SMARTAI" && automation.User?.subscription?.plan === "PRO") {
            const smart_ai_message = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{ role: "assistant", content: `${automation.listener.prompt}: Keep responses under 2 sentences` }],
            });
            if (smart_ai_message.choices[0].message.content) {
              const receiver = createChatHistory(automation.id, igUserId, senderId, messaging.message.text);
              const sender = createChatHistory(automation.id, igUserId, senderId, smart_ai_message.choices[0].message.content);
              await client.$transaction([receiver, sender]);
              const dm = await sendDm(igUserId, senderId, smart_ai_message.choices[0].message.content, token);
              if (dm.status === 200) {
                const tracked = await trackResponse(automation.id, "DM");
                if (tracked) return NextResponse.json({ message: "Message sent" }, { status: 200 });
              }
            }
          }
        }

        // Also enroll in keyword sequences
        const creds = await getTokenForIgUser(igUserId);
        if (creds) await enrollInSequences(igUserId, senderId, creds.token, "KEYWORD", messaging.message?.text ?? "");
      }

      if (change?.field === "comments") {
        const commentVal = change.value;
        const automation = await getKeywordAutomation(matcher.automationId, false);
        const automation_post = await getKeywordPost(commentVal.media?.id, automation?.id!);

        if (automation?.trigger && automation_post && automation.listener) {
          const token = automation.User?.integrations[0].token!;

          if (automation.listener.listener === "MESSAGE") {
            const dm = await sendPrivateMessage(igUserId, commentVal.id, automation.listener.prompt, token);
            if (dm.status === 200) {
              const tracked = await trackResponse(automation.id, "COMMENT");
              if (tracked) return NextResponse.json({ message: "Message sent" }, { status: 200 });
            }
          }
        }
      }
    }

    // ── No keyword match: check chat history for SMARTAI continuation ─────────
    if (!matcher && messaging) {
      const senderId = messaging.sender.id;
      const customer_history = await getChatHistory(messaging.recipient.id, senderId);

      if (customer_history.history.length > 0) {
        const automation = await findAutomation(customer_history.automationId!);
        if (automation?.User?.subscription?.plan === "PRO" && automation.listener?.listener === "SMARTAI") {
          const smart_ai_message = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "assistant", content: `${automation.listener.prompt}: Keep responses under 2 sentences` },
              ...customer_history.history,
              { role: "user", content: messaging.message.text },
            ],
          });
          if (smart_ai_message.choices[0].message.content) {
            const receiver = createChatHistory(automation.id, igUserId, senderId, messaging.message.text);
            const sender = createChatHistory(automation.id, igUserId, senderId, smart_ai_message.choices[0].message.content);
            await client.$transaction([receiver, sender]);
            const dm = await sendDm(igUserId, senderId, smart_ai_message.choices[0].message.content, automation.User.integrations[0].token!);
            if (dm.status === 200) return NextResponse.json({ message: "Message sent" }, { status: 200 });
          }
        }
      }
      return NextResponse.json({ message: "No automation set" }, { status: 200 });
    }

    return NextResponse.json({ message: "ok" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "ok" }, { status: 200 });
  }
}
