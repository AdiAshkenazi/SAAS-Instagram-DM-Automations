import { client } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ shortId: string }> }) {
  const { shortId } = await params;

  try {
    const link = await client.trackedLink.findUnique({ where: { shortId } });
    if (!link) return NextResponse.redirect(new URL("/", req.url));

    // Validate URL scheme before redirecting
    let targetUrl: URL;
    try {
      targetUrl = new URL(link.targetUrl);
      if (targetUrl.protocol !== "https:" && targetUrl.protocol !== "http:") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Increment click count (fire-and-forget)
    client.trackedLink.update({
      where: { shortId },
      data: { clickCount: { increment: 1 } },
    }).catch(() => {});

    return NextResponse.redirect(targetUrl.toString());
  } catch {
    return NextResponse.redirect(new URL("/", req.url));
  }
}
