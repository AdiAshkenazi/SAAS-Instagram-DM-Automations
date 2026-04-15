"use server";

import { client } from "@/lib/prisma";
import { onCurrentUser } from "../user";
import { findUser } from "../user/queries";

// Fetch Instagram profile + media for a given token / igId
async function fetchIgData(igId: string, token: string) {
  const base = process.env.INSTAGRAM_BASE_URL;

  const [profileRes, mediaRes] = await Promise.all([
    fetch(
      `${base}/${igId}?fields=username,name,biography,followers_count,follows_count,media_count,profile_picture_url&access_token=${token}`
    ),
    fetch(
      `${base}/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count&limit=12&access_token=${token}`
    ),
  ]);

  const profileData = await profileRes.json();
  const mediaData = await mediaRes.json();

  return {
    profile: profileData.error ? null : profileData,
    media: mediaData?.data || [],
  };
}

// Analytics for a workspace account (pass Account.id)
export const getWorkspaceAccountInsights = async (accountId: string) => {
  await onCurrentUser();

  try {
    const account = await client.account.findUnique({
      where: { id: accountId },
      select: { token: true, accountId: true, platform: true, name: true, username: true, avatar: true, expiresAt: true },
    });

    if (!account || account.platform !== "INSTAGRAM") {
      return { status: 400, data: null };
    }

    const { profile, media } = await fetchIgData(account.accountId, account.token);

    return {
      status: 200,
      data: { profile, media, accountMeta: { name: account.name, username: account.username, avatar: account.avatar, expiresAt: account.expiresAt } },
    };
  } catch (error: any) {
    return { status: 500, data: null };
  }
};

// Analytics from legacy integration (single connected IG account)
export const getInstagramInsights = async () => {
  const user = await onCurrentUser();

  try {
    const profile = await findUser(user.id);
    const token = profile?.integrations[0]?.token;
    const igId = profile?.integrations[0]?.instagramId;

    if (!token || !igId) return { status: 401, data: null };

    const { profile: igProfile, media } = await fetchIgData(igId, token);

    return {
      status: 200,
      data: { profile: igProfile, media },
    };
  } catch (error: any) {
    return { status: 500, data: null };
  }
};

// Workspace Instagram accounts the user can select in analytics
export const getAnalyticsAccounts = async () => {
  const user = await onCurrentUser();

  try {
    const profile = await findUser(user.id);
    if (!profile) return { status: 404, data: [] };

    const workspaces = await client.workspace.findMany({
      where: { userId: profile.id },
      select: {
        id: true,
        name: true,
        accounts: {
          where: { platform: "INSTAGRAM" },
          select: { id: true, name: true, username: true, avatar: true, expiresAt: true },
        },
      },
    });

    const accounts = workspaces.flatMap((w) =>
      w.accounts.map((a) => ({
        id: a.id,
        name: a.name,
        username: a.username,
        avatar: a.avatar,
        expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
        workspaceName: w.name,
      }))
    );

    // Also include legacy integration
    const legacy = profile.integrations[0];
    if (legacy?.instagramId) {
      accounts.unshift({
        id: "__legacy__",
        name: "Connected Account",
        username: null,
        avatar: null,
        expiresAt: legacy.expiresAt ? legacy.expiresAt.toISOString() : null,
        workspaceName: "Integrations",
      });
    }

    return { status: 200, data: accounts };
  } catch (error: any) {
    return { status: 500, data: [] };
  }
};

// Automation stats
export const getAutomationStats = async () => {
  const user = await onCurrentUser();

  try {
    const profile = await findUser(user.id);
    if (!profile) return { status: 404, data: null };

    const [totalAutomations, activeAutomations, totalDms, totalComments] =
      await Promise.all([
        client.automation.count({ where: { userId: profile.id } }),
        client.automation.count({ where: { userId: profile.id, active: true } }),
        client.listener.aggregate({
          where: { Automation: { userId: profile.id } },
          _sum: { dmCount: true },
        }),
        client.listener.aggregate({
          where: { Automation: { userId: profile.id } },
          _sum: { commentCount: true },
        }),
      ]);

    return {
      status: 200,
      data: {
        totalAutomations,
        activeAutomations,
        totalDms: totalDms._sum.dmCount ?? 0,
        totalComments: totalComments._sum.commentCount ?? 0,
      },
    };
  } catch (error: any) {
    return { status: 500, data: null };
  }
};

// Follower count history for a given accountRef (Account.id or "__legacy__")
export const getFollowerHistory = async (accountRef: string, days: number = 30) => {
  const user = await onCurrentUser();

  try {
    const profile = await findUser(user.id);
    if (!profile) return { status: 404, data: [] };

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const snapshots = await client.followerSnapshot.findMany({
      where: {
        accountRef,
        ownerUserId: profile.id,
        snappedAt: { gte: since },
      },
      orderBy: { snappedAt: "asc" },
      select: { count: true, snappedAt: true },
    });

    // Collapse to one data point per day (take last snapshot of each day)
    const byDay: Record<string, { date: string; count: number }> = {};
    for (const snap of snapshots) {
      const day = snap.snappedAt.toISOString().slice(0, 10);
      byDay[day] = { date: day, count: snap.count };
    }

    const points = Object.values(byDay);

    // Annotate with daily delta
    const result = points.map((p, i) => ({
      date: p.date,
      count: p.count,
      delta: i === 0 ? 0 : p.count - points[i - 1].count,
    }));

    return { status: 200, data: result };
  } catch (error: any) {
    return { status: 500, data: [] };
  }
};

// Workspace post publishing stats (all workspaces)
export const getWorkspacePostStats = async () => {
  const user = await onCurrentUser();

  try {
    const profile = await findUser(user.id);
    if (!profile) return { status: 404, data: null };

    const workspaces = await client.workspace.findMany({
      where: { userId: profile.id },
      select: { id: true },
    });
    const workspaceIds = workspaces.map((w) => w.id);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalPending, totalPublished, totalFailed, publishedThisMonth] =
      await Promise.all([
        client.postTarget.count({
          where: { WorkspacePost: { workspaceId: { in: workspaceIds } }, status: "PENDING" },
        }),
        client.postTarget.count({
          where: { WorkspacePost: { workspaceId: { in: workspaceIds } }, status: "PUBLISHED" },
        }),
        client.postTarget.count({
          where: { WorkspacePost: { workspaceId: { in: workspaceIds } }, status: "FAILED" },
        }),
        client.postTarget.count({
          where: {
            WorkspacePost: { workspaceId: { in: workspaceIds } },
            status: "PUBLISHED",
            publishedAt: { gte: monthStart },
          },
        }),
      ]);

    return {
      status: 200,
      data: { totalPending, totalPublished, totalFailed, publishedThisMonth },
    };
  } catch (error: any) {
    return { status: 500, data: null };
  }
};
