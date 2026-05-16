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

    const workspace = await client.workspace.findFirst({ where: { id: workspaceId, userId: profile.id }, select: { id: true } });
    if (!workspace) return { status: 403, data: "Forbidden" };

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

    const workspace = await client.workspace.findFirst({ where: { id: workspaceId, userId: profile.id }, select: { id: true } });
    if (!workspace) return { status: 403, data: "Forbidden" };

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

export const linkFacebookPageFromInstagram = async (
  workspaceId: string,
  igAccountId: string  // the Account.id (UUID) of the Instagram account
) => {
  const user = await onCurrentUser();

  try {
    const profile = await findUser(user.id);
    if (!profile) return { status: 404, data: "User not found" };

    // Load the Instagram account record to get token + accountId (IG user ID)
    const igAccount = await client.account.findFirst({
      where: { id: igAccountId, workspaceId, platform: "INSTAGRAM" },
    });
    if (!igAccount) return { status: 404, data: "Instagram account not found" };

    // Try to get the linked Facebook Page using the stored IG token
    // This only works if the stored token is a Facebook Graph API token (not Instagram Basic Display)
    const res = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,picture&access_token=${igAccount.token}`
    );
    const data = await res.json();

    if (data.error) {
      return {
        status: 400,
        data: "Token type mismatch — to connect Facebook, use the manual 'Add Account → Facebook' form. Get your Page Access Token from: developers.facebook.com/tools/accesstoken"
      };
    }

    const pages: any[] = data.data ?? [];
    if (pages.length === 0) {
      return { status: 400, data: "No Facebook Pages found for this token. Use 'Add Account → Facebook' and enter the Page token manually from developers.facebook.com/tools/accesstoken" };
    }

    // Use first page (or match by IG connection in future)
    const fbPage = pages[0];

    // Check if already connected
    const existing = await client.account.findFirst({
      where: { workspaceId, platform: "FACEBOOK", accountId: fbPage.id },
    });
    if (existing) return { status: 409, data: "This Facebook Page is already connected" };

    const account = await client.account.create({
      data: {
        platform: "FACEBOOK",
        workspaceId,
        name: fbPage.name,
        token: fbPage.access_token,
        accountId: fbPage.id,
        avatar: fbPage.picture?.data?.url,
      },
    });

    return { status: 200, data: account };
  } catch (error: any) {
    return { status: 500, data: error.message };
  }
};

export const addFacebookAccount = async (
  workspaceId: string,
  data: {
    name: string;
    pageAccessToken: string;
    pageId: string;
  }
) => {
  const user = await onCurrentUser();

  try {
    const profile = await findUser(user.id);
    if (!profile) return { status: 404 };

    const workspace = await client.workspace.findFirst({ where: { id: workspaceId, userId: profile.id }, select: { id: true } });
    if (!workspace) return { status: 403, data: "Forbidden" };

    let pageName = data.name || "Facebook Page";
    let pageToken = data.pageAccessToken;

    // Step 1: Exchange short-lived token for long-lived user token
    try {
      const appId = process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      if (appId && appSecret) {
        const llRes = await fetch(
          `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${data.pageAccessToken}`
        );
        const llData = await llRes.json();
        if (!llData.error && llData.access_token) {
          // Step 2: Get permanent Page Token from long-lived user token
          const pageRes = await fetch(
            `https://graph.facebook.com/v19.0/${data.pageId}?fields=name,access_token&access_token=${llData.access_token}`
          );
          const pageData = await pageRes.json();
          if (!pageData.error && pageData.access_token) {
            pageToken = pageData.access_token;
            pageName = data.name || pageData.name || pageName;
          }
        }
      }
    } catch {}

    // Fallback: try direct page lookup with original token
    if (pageToken === data.pageAccessToken) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v19.0/${data.pageId}?fields=name&access_token=${data.pageAccessToken}`
        );
        const fbData = await res.json();
        if (!fbData.error) pageName = data.name || fbData.name || pageName;
      } catch {}
    }

    const account = await client.account.create({
      data: {
        platform: "FACEBOOK",
        workspaceId,
        name: pageName,
        token: pageToken,
        accountId: data.pageId,
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

    const account = await client.account.findFirst({
      where: { id: accountId, Workspace: { userId: profile.id } },
      select: { id: true },
    });
    if (!account) return { status: 404, data: "Account not found" };

    await client.account.delete({ where: { id: accountId } });

    return { status: 200, data: "Account removed" };
  } catch (error: any) {
    return { status: 500, data: error.message };
  }
};
