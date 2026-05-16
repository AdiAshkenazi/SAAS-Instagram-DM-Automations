"use client";

import { getWorkspacePosts } from "@/actions/workspace-scheduler";
import { getWorkspaces } from "@/actions/workspace";
import { BarChart2, CalendarClock, CheckCircle2, Instagram, Send, Facebook, Zap, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const [stats, setStats] = useState({
    totalPosts: 0,
    publishedPosts: 0,
    pendingPosts: 0,
    failedPosts: 0,
    igAccounts: 0,
    fbAccounts: 0,
    tgAccounts: 0,
  });
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const wsRes = await getWorkspaces();
      if (wsRes.status !== 200 || !Array.isArray(wsRes.data)) { setLoading(false); return; }

      const workspaces = wsRes.data as any[];
      let igAccounts = 0, fbAccounts = 0, tgAccounts = 0;
      let allPosts: any[] = [];

      for (const ws of workspaces) {
        igAccounts += ws.accounts.filter((a: any) => a.platform === "INSTAGRAM").length;
        fbAccounts += ws.accounts.filter((a: any) => a.platform === "FACEBOOK").length;
        tgAccounts += ws.accounts.filter((a: any) => a.platform === "TELEGRAM").length;

        const postsRes = await getWorkspacePosts(ws.id);
        if (postsRes.status === 200 && Array.isArray(postsRes.data)) {
          allPosts = [...allPosts, ...postsRes.data];
        }
      }

      const published = allPosts.filter((p: any) => p.targets.some((t: any) => t.status === "PUBLISHED")).length;
      const pending = allPosts.filter((p: any) => p.targets.some((t: any) => t.status === "PENDING")).length;
      const failed = allPosts.filter((p: any) => p.targets.some((t: any) => t.status === "FAILED") && !p.targets.some((t: any) => t.status === "PUBLISHED")).length;

      setStats({ totalPosts: allPosts.length, publishedPosts: published, pendingPosts: pending, failedPosts: failed, igAccounts, fbAccounts, tgAccounts });
      setRecentPosts(allPosts.slice(0, 4));
      setLoading(false);
    };
    load();
  }, []);

  const statCards = [
    { label: "Published", value: stats.publishedPosts, icon: <CheckCircle2 size={20} className="text-green-400" />, color: "text-green-400" },
    { label: "Pending", value: stats.pendingPosts, icon: <Clock size={20} className="text-yellow-400" />, color: "text-yellow-400" },
    { label: "Total Posts", value: stats.totalPosts, icon: <CalendarClock size={20} className="text-blue-400" />, color: "text-blue-400" },
    { label: "Failed", value: stats.failedPosts, icon: <TrendingUp size={20} className="text-red-400" />, color: "text-red-400" },
  ];

  const quickLinks = [
    { label: "New Post", href: `/dashboard/${slug}/workspace-scheduler`, icon: <CalendarClock size={16} />, color: "from-[#3352CC] to-[#1C2D70]" },
    { label: "Analytics", href: `../analytics`, icon: <BarChart2 size={16} />, color: "from-purple-600 to-indigo-700" },
    { label: "DM Automation", href: `../automation`, icon: <Zap size={16} />, color: "from-pink-600 to-rose-700" },
  ];

  return (
    <div className="flex flex-col gap-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-[#9B9CA0] text-sm mt-1">Welcome back — here&apos;s what&apos;s happening</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-4 flex flex-col gap-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#9B9CA0] text-xs">{card.label}</span>
              {card.icon}
            </div>
            <p className={`text-3xl font-bold ${card.color}`}>
              {loading ? "—" : card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Posts */}
        <div className="lg:col-span-2 bg-[#1D1D1D] rounded-xl border border-[#545454] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Posts</h2>
            <Link href={`/dashboard/${slug}/workspace-scheduler`} className="text-xs text-blue-400 hover:underline">View all →</Link>
          </div>
          {loading ? (
            <div className="flex flex-col gap-y-2">
              {[0,1,2].map(i => <div key={i} className="h-12 bg-[#2a2a2a] rounded-lg animate-pulse" />)}
            </div>
          ) : recentPosts.length === 0 ? (
            <div className="text-center py-8">
              <CalendarClock size={36} className="mx-auto text-[#545454] mb-2" />
              <p className="text-[#9B9CA0] text-sm">No posts yet</p>
              <Link href={`/dashboard/${slug}/workspace-scheduler`} className="text-blue-400 text-sm hover:underline">Schedule your first post →</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-y-2">
              {recentPosts.map((post: any) => {
                const hasPublished = post.targets.some((t: any) => t.status === "PUBLISHED");
                const hasPending = post.targets.some((t: any) => t.status === "PENDING");
                const status = hasPublished ? "PUBLISHED" : hasPending ? "PENDING" : "FAILED";
                const statusColor = status === "PUBLISHED" ? "text-green-400 bg-green-400/10 border-green-400/30" : status === "PENDING" ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" : "text-red-400 bg-red-400/10 border-red-400/30";
                return (
                  <div key={post.id} className="flex items-center gap-x-3 bg-background-80 rounded-xl px-3 py-2.5">
                    <img src={post.mediaUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-[#2a2a2a]" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{post.caption || "No caption"}</p>
                      <p className="text-[10px] text-[#9B9CA0] mt-0.5">{new Date(post.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 ${statusColor}`}>{status.toLowerCase()}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-y-4">
          {/* Connected Accounts */}
          <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Connected Accounts</h2>
              <Link href={`../workspaces`} className="text-xs text-blue-400 hover:underline">Manage →</Link>
            </div>
            <div className="flex flex-col gap-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-x-2">
                  <Instagram size={14} className="text-pink-400" />
                  <span className="text-sm">Instagram</span>
                </div>
                <span className="text-sm font-semibold">{loading ? "—" : stats.igAccounts}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-x-2">
                  <Facebook size={14} className="text-blue-500" />
                  <span className="text-sm">Facebook</span>
                </div>
                <span className="text-sm font-semibold">{loading ? "—" : stats.fbAccounts}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-x-2">
                  <Send size={14} className="text-blue-400" />
                  <span className="text-sm">Telegram</span>
                </div>
                <span className="text-sm font-semibold">{loading ? "—" : stats.tgAccounts}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-5">
            <h2 className="font-semibold text-sm mb-3">Quick Actions</h2>
            <div className="flex flex-col gap-y-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`flex items-center gap-x-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-br ${link.color} text-white text-sm font-medium hover:opacity-90 transition`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
