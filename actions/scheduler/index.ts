"use server";

import { client } from "@/lib/prisma";
import { onCurrentUser } from "../user";
import { findUser } from "../user/queries";

export const createScheduledPost = async (data: {
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROSEL_ALBUM";
  caption?: string;
  scheduledAt: Date;
}) => {
  const user = await onCurrentUser();

  try {
    const profile = await findUser(user.id);
    if (!profile) return { status: 404, data: "User not found" };

    const post = await client.scheduledPost.create({
      data: {
        userId: profile.id,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        caption: data.caption,
        scheduledAt: data.scheduledAt,
      },
    });

    return { status: 200, data: post };
  } catch (error: any) {
    return { status: 500, data: error.message };
  }
};

export const getScheduledPosts = async () => {
  const user = await onCurrentUser();

  try {
    const profile = await findUser(user.id);
    if (!profile) return { status: 404, data: [] };

    const posts = await client.scheduledPost.findMany({
      where: { userId: profile.id },
      orderBy: { scheduledAt: "asc" },
    });

    return { status: 200, data: posts };
  } catch (error: any) {
    return { status: 500, data: [] };
  }
};

export const deleteScheduledPost = async (postId: string) => {
  const user = await onCurrentUser();

  try {
    const profile = await findUser(user.id);
    if (!profile) return { status: 404 };

    await client.scheduledPost.delete({
      where: { id: postId, userId: profile.id },
    });

    return { status: 200, data: "Post deleted" };
  } catch (error: any) {
    return { status: 500, data: error.message };
  }
};
