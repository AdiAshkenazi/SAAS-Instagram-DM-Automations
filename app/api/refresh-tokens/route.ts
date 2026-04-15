import { client } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    // Find legacy integrations expiring soon
    const expiringIntegrations = await client.integrations.findMany({
      where: {
        expiresAt: { lte: fiveDaysFromNow },
        token: { not: "" },
      },
    });

    // Find workspace Instagram accounts expiring soon
    const expiringAccounts = await client.account.findMany({
      where: {
        platform: "INSTAGRAM",
        expiresAt: { lte: fiveDaysFromNow },
        token: { not: "" },
      },
    });

    let refreshed = 0;
    let failed = 0;

    // Refresh legacy integrations
    for (const integration of expiringIntegrations) {
      try {
        const res = await fetch(
          `${process.env.INSTAGRAM_BASE_URL}/refresh_access_token?grant_type=ig_refresh_token&access_token=${integration.token}`
        );
        const data = await res.json();

        if (data.access_token) {
          const newExpiry = new Date();
          newExpiry.setDate(newExpiry.getDate() + 60);

          await client.integrations.update({
            where: { id: integration.id },
            data: { token: data.access_token, expiresAt: newExpiry },
          });
          refreshed++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    // Refresh workspace Instagram accounts
    for (const account of expiringAccounts) {
      try {
        const res = await fetch(
          `${process.env.INSTAGRAM_BASE_URL}/refresh_access_token?grant_type=ig_refresh_token&access_token=${account.token}`
        );
        const data = await res.json();

        if (data.access_token) {
          const newExpiry = new Date();
          newExpiry.setDate(newExpiry.getDate() + 60);

          await client.account.update({
            where: { id: account.id },
            data: { token: data.access_token, expiresAt: newExpiry },
          });
          refreshed++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return NextResponse.json({
      refreshed,
      failed,
      checked: expiringIntegrations.length + expiringAccounts.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
