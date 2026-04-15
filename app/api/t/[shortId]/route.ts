import { client } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { shortId: string } }) {
  const { shortId } = params;

  try {
    const link = await client.trackedLink.findUnique({ where: { shortId } });
    if (!link) return NextResponse.redirect(new URL("/", req.url));

    // Increment click count (fire-and-forget)
    client.trackedLink.update({
      where: { shortId },
      data: { clickCount: { increment: 1 } },
    }).catch(() => {});

    return NextResponse.redirect(link.targetUrl);
  } catch {
    return NextResponse.redirect(new URL("/", req.url));
  }
}
