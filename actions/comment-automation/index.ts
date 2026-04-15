"use server";

import { client } from "@/lib/prisma";
import { onCurrentUser } from "../user";
import { findUser } from "../user/queries";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function serializeAutomation(a: any) {
  return {
    id: a.id,
    name: a.name,
    active: a.active,
    replyType: a.replyType,
    replyText: a.replyText,
    aiPrompt: a.aiPrompt,
    sendDm: a.sendDm,
    checkFollower: a.checkFollower,
    dmMessage: a.dmMessage,
    dmIfFollowing: a.dmIfFollowing,
    dmIfNotFollowing: a.dmIfNotFollowing,
    replyCount: a.replyCount,
    dmCount: a.dmCount,
    createdAt: a.createdAt.toISOString(),
    keywords: a.keywords.map((k: any) => ({ id: k.id, word: k.word })),
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createCommentAutomation = async (name: string) => {
  const user = await onCurrentUser();
  const profile = await findUser(user.id);
  if (!profile) return { status: 404, data: "User not found" };

  try {
    const automation = await client.commentAutomation.create({
      data: { userId: profile.id, name },
      include: { keywords: true },
    });
    return { status: 200, data: serializeAutomation(automation) };
  } catch (err: any) {
    return { status: 500, data: err.message };
  }
};

export const getCommentAutomations = async () => {
  const user = await onCurrentUser();
  const profile = await findUser(user.id);
  if (!profile) return { status: 404, data: [] };

  try {
    const automations = await client.commentAutomation.findMany({
      where: { userId: profile.id },
      include: { keywords: true },
      orderBy: { createdAt: "desc" },
    });
    return { status: 200, data: automations.map(serializeAutomation) };
  } catch (err: any) {
    return { status: 500, data: [] };
  }
};

export const updateCommentAutomation = async (
  id: string,
  data: {
    name?: string;
    replyType?: "FIXED" | "AI";
    replyText?: string;
    aiPrompt?: string;
    sendDm?: boolean;
    checkFollower?: boolean;
    dmMessage?: string;
    dmIfFollowing?: string;
    dmIfNotFollowing?: string;
  }
) => {
  await onCurrentUser();
  try {
    const updated = await client.commentAutomation.update({
      where: { id },
      data,
      include: { keywords: true },
    });
    return { status: 200, data: serializeAutomation(updated) };
  } catch (err: any) {
    return { status: 500, data: err.message };
  }
};

export const toggleCommentAutomation = async (id: string, active: boolean) => {
  await onCurrentUser();
  try {
    await client.commentAutomation.update({ where: { id }, data: { active } });
    return { status: 200 };
  } catch (err: any) {
    return { status: 500, data: err.message };
  }
};

export const deleteCommentAutomation = async (id: string) => {
  await onCurrentUser();
  try {
    await client.commentAutomation.delete({ where: { id } });
    return { status: 200 };
  } catch (err: any) {
    return { status: 500, data: err.message };
  }
};

export const addCommentKeyword = async (automationId: string, word: string) => {
  await onCurrentUser();
  const clean = word.replace(/^#/, "").trim().toLowerCase();
  if (!clean) return { status: 400, data: "Empty keyword" };

  try {
    const kw = await client.commentKeyword.create({
      data: { automationId, word: clean },
    });
    return { status: 200, data: { id: kw.id, word: kw.word } };
  } catch (err: any) {
    if (err.code === "P2002") return { status: 409, data: "Already added" };
    return { status: 500, data: err.message };
  }
};

export const removeCommentKeyword = async (keywordId: string) => {
  await onCurrentUser();
  try {
    await client.commentKeyword.delete({ where: { id: keywordId } });
    return { status: 200 };
  } catch (err: any) {
    return { status: 500, data: err.message };
  }
};
