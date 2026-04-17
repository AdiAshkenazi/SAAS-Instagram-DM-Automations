"use server";

import { client } from "@/lib/prisma";
import { onCurrentUser } from "../user";
import { findUser } from "../user/queries";

export const createWorkspacePost = async (data: {
  workspaceId: string;
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROSEL_ALBUM" | "REEL" | "STORY";
  caption?: string;
  scheduledAt: Date;
  targetAccountIds: string[];
}) => {
  await onCurrentUser();

  try {
    const post = await client.workspacePost.create({
      data: {
        workspaceId: data.workspaceId,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        caption: data.caption,
        scheduledAt: data.scheduledAt,
        targets: {
          create: data.targetAccountIds.map((accountId) => ({ accountId })),
        },
      },
      include: {
        targets: { include: { Account: true } },
      },
    });

    return { status: 200, data: { id: post.id, scheduledAt: post.scheduledAt } };
  } catch (error: any) {
    return { status: 500, data: error.message };
  }
};

export const getWorkspacePosts = async (workspaceId: string) => {
  await onCurrentUser();

  try {
    const posts = await client.workspacePost.findMany({
      where: { workspaceId },
      include: {
        targets: {
          include: {
            Account: {
              select: { id: true, name: true, platform: true, username: true },
            },
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return {
      status: 200,
      data: posts.map((p) => ({
        id: p.id,
        mediaUrl: p.mediaUrl,
        mediaType: p.mediaType,
        caption: p.caption,
        scheduledAt: p.scheduledAt,
        targets: p.targets.map((t) => ({
          id: t.id,
          status: t.status,
          publishedAt: t.publishedAt,
          account: t.Account,
        })),
      })),
    };
  } catch (error: any) {
    return { status: 500, data: [] };
  }
};

export const updateWorkspacePost = async (
  postId: string,
  data: {
    mediaUrl?: string;
    mediaType?: "IMAGE" | "VIDEO" | "CAROSEL_ALBUM" | "REEL" | "STORY";
    caption?: string;
    scheduledAt?: Date;
  }
) => {
  await onCurrentUser();
  try {
    await client.workspacePost.update({ where: { id: postId }, data });
    return { status: 200 };
  } catch (error: any) {
    return { status: 500, data: error.message };
  }
};

export const deleteAllWorkspacePosts = async (workspaceId: string) => {
  await onCurrentUser();
  try {
    await client.workspacePost.deleteMany({ where: { workspaceId } });
    return { status: 200, data: "All posts deleted" };
  } catch (error: any) {
    return { status: 500, data: error.message };
  }
};

export const deleteWorkspacePost = async (postId: string) => {
  await onCurrentUser();

  try {
    await client.workspacePost.delete({ where: { id: postId } });
    return { status: 200, data: "Post deleted" };
  } catch (error: any) {
    return { status: 500, data: error.message };
  }
};
