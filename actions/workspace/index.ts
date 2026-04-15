"use server";

import { client } from "@/lib/prisma";
import { onCurrentUser } from "../user";
import { findUser } from "../user/queries";

export const createWorkspace = async (data: {
  name: string;
  description?: string;
}) => {
  const user = await onCurrentUser();

  try {
    const profile = await findUser(user.id);
    if (!profile) return { status: 404, data: "User not found" };

    const workspace = await client.workspace.create({
      data: {
        name: data.name,
        description: data.description,
        userId: profile.id,
      },
      select: { id: true, name: true, description: true },
    });

    return { status: 200, data: workspace };
  } catch (error: any) {
    return { status: 500, data: error.message };
  }
};

export const getWorkspaces = async () => {
  const user = await onCurrentUser();

  try {
    const profile = await findUser(user.id);
    if (!profile) return { status: 404, data: [] };

    const workspaces = await client.workspace.findMany({
      where: { userId: profile.id },
      include: {
        accounts: {
          select: {
            id: true,
            platform: true,
            name: true,
            username: true,
            avatar: true,
            accountId: true,
            expiresAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Return plain serializable objects
    return {
      status: 200,
      data: workspaces.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description,
        accounts: w.accounts.map((a) => ({
          ...a,
          expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
        })),
      })),
    };
  } catch (error: any) {
    return { status: 500, data: [] };
  }
};

export const getWorkspace = async (workspaceId: string) => {
  const user = await onCurrentUser();

  try {
    const profile = await findUser(user.id);
    if (!profile) return { status: 404 };

    const workspace = await client.workspace.findFirst({
      where: { id: workspaceId, userId: profile.id },
      include: { accounts: true },
    });

    if (!workspace) return { status: 404 };
    return { status: 200, data: workspace };
  } catch (error: any) {
    return { status: 500 };
  }
};

export const deleteWorkspace = async (workspaceId: string) => {
  const user = await onCurrentUser();

  try {
    const profile = await findUser(user.id);
    if (!profile) return { status: 404 };

    await client.workspace.delete({
      where: { id: workspaceId, userId: profile.id },
    });

    return { status: 200, data: "Workspace deleted" };
  } catch (error: any) {
    return { status: 500, data: error.message };
  }
};

export const addInstagramAccount = async (
  workspaceId: string,
  data: {
    name: string;
    token: string;
    accountId: string;
    username?: string;
    avatar?: string;
    expiresAt?: Date;
  }
) => {
  const user = await onCurrentUser();

  try {
    const profile = await findUser(user.id);
    if (!profile) return { status: 404 };

    const account = await client.account.create({
      data: {
        platform: "INSTAGRAM",
        workspaceId,
        name: data.name,
        token: data.token,
        accountId: data.accountId,
        username: data.username,
        avatar: data.avatar,
        expiresAt: data.expiresAt,
      },
    });

    return { status: 200, data: account };
  } catch (error: any) {
    return { status: 500, data: error.message };
  }
};

export const addTelegramAccount = async (
  workspaceId: string,
  data: {
    name: string;
    botToken: string;
    channelId: string;
    username?: string;
  }
) => {
  const user = await onCurrentUser();

  try {
    const profile = await findUser(user.id);
    if (!profile) return { status: 404 };

    // Verify the bot token works by calling Telegram API
    const res = await fetch(
      `https://api.telegram.org/bot${data.botToken}/getChat?chat_id=${data.channelId}`
    );
    const tgData = await res.json();
    if (!tgData.ok) {
      return { status: 400, data: "Invalid bot token or channel ID" };
    }

    const account = await client.account.create({
      data: {
        platform: "TELEGRAM",
        workspaceId,
        name: data.name || tgData.result.title,
        token: data.botToken,
        accountId: data.channelId,
        username: data.username || tgData.result.username,
      },
    });

    return { status: 200, data: account };
  } catch (error: any) {
    return { status: 500, data: error.message };
  }
};

export const removeAccount = async (accountId: string) => {
  const user = await onCurrentUser();

  try {
    const profile = await findUser(user.id);
    if (!profile) return { status: 404 };

    await client.account.delete({
      where: { id: accountId },
    });

    return { status: 200, data: "Account removed" };
  } catch (error: any) {
    return { status: 500, data: error.message };
  }
};
