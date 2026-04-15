"use server";

import { client } from "@/lib/prisma";
import { onCurrentUser } from "../user";
import { findUser } from "../user/queries";
import { nanoid } from "nanoid";

export const createTrackedLink = async (data: {
  targetUrl: string;
  label?: string;
  automationId?: string;
}) => {
  const user = await onCurrentUser();
  const profile = await findUser(user.id);
  if (!profile) return { status: 404, data: "User not found" };

  try {
    const shortId = nanoid(8);
    const link = await client.trackedLink.create({
      data: { shortId, targetUrl: data.targetUrl, label: data.label, automationId: data.automationId, userId: profile.id },
    });
    return {
      status: 200,
      data: {
        id: link.id,
        shortId: link.shortId,
        targetUrl: link.targetUrl,
        label: link.label,
        clickCount: link.clickCount,
        shortUrl: `${process.env.NEXT_PUBLIC_HOST_URL}/api/t/${link.shortId}`,
        createdAt: link.createdAt.toISOString(),
      },
    };
  } catch (err: any) {
    return { status: 500, data: err.message };
  }
};

export const getTrackedLinks = async () => {
  const user = await onCurrentUser();
  const profile = await findUser(user.id);
  if (!profile) return { status: 404, data: [] };

  try {
    const links = await client.trackedLink.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: "desc" },
    });
    return {
      status: 200,
      data: links.map((l) => ({
        id: l.id,
        shortId: l.shortId,
        targetUrl: l.targetUrl,
        label: l.label,
        clickCount: l.clickCount,
        shortUrl: `${process.env.NEXT_PUBLIC_HOST_URL}/api/t/${l.shortId}`,
        createdAt: l.createdAt.toISOString(),
      })),
    };
  } catch (err: any) {
    return { status: 500, data: [] };
  }
};

export const deleteTrackedLink = async (id: string) => {
  await onCurrentUser();
  try {
    await client.trackedLink.delete({ where: { id } });
    return { status: 200 };
  } catch (err: any) {
    return { status: 500, data: err.message };
  }
};
