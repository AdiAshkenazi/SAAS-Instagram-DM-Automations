"use client";

import {
  getAnalyticsAccounts,
  getAutomationStats,
  getFollowerHistory,
  getInstagramInsights,
  getWorkspaceAccountInsights,
  getWorkspacePostStats,
} from "@/actions/analytics";
import { format } from "date-fns";
import {
  BarChart2,
  CalendarCheck,
  ChevronDown,
  Heart,
  Instagram,
  MessageCircle,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AnalyticsAccount = {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
  expiresAt: string | null;
  workspaceName: string;
};

type Profile = {
  username: string;
  name: string;
  biography: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  profile_picture_url: string;
};

type MediaItem = {
  id: string;
  caption: string | null;
  media_type: string;
  media_url: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
};

type AutomationStats = {
  totalAutomations: number;
  activeAutomations: number;
  totalDms: number;
  totalComments: number;
};

type PostStats = {
  totalPending: number;
  totalPublished: number;
  totalFailed: number;
  publishedThisMonth: number;
};

type FollowerPoint = {
  date: string;
  count: number;
  delta: number;
};

function StatCard({
  icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-5 flex items-center gap-x-4">
      <div className={`p-3 rounded-xl flex-shrink-0 ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[#9B9CA0] text-xs">{label}</p>
        <p className="text-2xl font-bold truncate">{typeof value === "number" ? value.toLocaleString() : value}</p>
        {sub && <p className="text-[#9B9CA0] text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [accounts, setAccounts] = useState<AnalyticsAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AnalyticsAccount | null>(null);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [automationStats, setAutomationStats] = useState<AutomationStats | null>(null);
  const [postStats, setPostStats] = useState<PostStats | null>(null);

  const [followerHistory, setFollowerHistory] = useState<FollowerPoint[]>([]);
  const [historyDays, setHistoryDays] = useState(30);

  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [igError, setIgError] = useState("");

  // Load account list + automation/post stats once
  useEffect(() => {
    const init = async () => {
      const [accountsRes, statsRes, postStatsRes] = await Promise.all([
        getAnalyticsAccounts(),
        getAutomationStats(),
        getWorkspacePostStats(),
      ]);

      if (accountsRes.status === 200 && Array.isArray(accountsRes.data) && accountsRes.data.length > 0) {
        setAccounts(accountsRes.data as AnalyticsAccount[]);
        setSelectedAccount((accountsRes.data as AnalyticsAccount[])[0]);
      }

      if (statsRes.status === 200 && statsRes.data) {
        setAutomationStats(statsRes.data as AutomationStats);
      }

      if (postStatsRes.status === 200 && postStatsRes.data) {
        setPostStats(postStatsRes.data as PostStats);
      }

      setLoadingAccounts(false);
    };
    init();
  }, []);

  // Load follower history when account or range changes
  useEffect(() => {
    if (!selectedAccount) return;
    getFollowerHistory(selectedAccount.id, historyDays).then((res) => {
      if (res.status === 200) setFollowerHistory(res.data as FollowerPoint[]);
      else setFollowerHistory([]);
    });
  }, [selectedAccount, historyDays]);

  // Load Instagram insights when selected account changes
  useEffect(() => {
    if (!selectedAccount) return;
    const load = async () => {
      setLoadingInsights(true);
      setIgError("");
      setProfile(null);
      setMedia([]);

      let res;
      if (selectedAccount.id === "__legacy__") {
        res = await getInstagramInsights();
        if (res.status === 200 && res.data) {
          setProfile(res.data.profile);
          setMedia(res.data.media);
        } else if (res.status === 401) {
          setIgError("Instagram account not connected. Go to Integrations to connect.");
        } else {
          setIgError("Failed to load Instagram insights.");
        }
      } else {
        res = await getWorkspaceAccountInsights(selectedAccount.id);
        if (res.status === 200 && res.data) {
          setProfile(res.data.profile);
          setMedia(res.data.media);
        } else {
          setIgError("Failed to load insights for this account.");
        }
      }

      setLoadingInsights(false);
    };
    load();
  }, [selectedAccount]);

  const daysUntilExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loadingAccounts) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-[#9B9CA0]">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-y-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 size={22} className="text-purple-400" />
            Analytics
          </h1>
          <p className="text-[#9B9CA0] text-sm mt-1">Instagram account performance and automation stats</p>
        </div>

        {/* Account Selector */}
        {accounts.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowAccountDropdown(!showAccountDropdown)}
              className="flex items-center gap-x-2 bg-[#1D1D1D] border border-[#545454] rounded-xl px-4 py-2.5 text-sm hover:border-white/40 transition"
            >
              {selectedAccount?.avatar ? (
                <img src={selectedAccount.avatar} className="w-5 h-5 rounded-full object-cover" alt="" />
              ) : (
                <Instagram size={14} className="text-pink-400" />
              )}
              <span>{selectedAccount?.username ? `@${selectedAccount.username}` : selectedAccount?.name}</span>
              <span className="text-[#545454] text-xs">{selectedAccount?.workspaceName}</span>
              <ChevronDown size={14} className="text-[#9B9CA0]" />
            </button>

            {showAccountDropdown && (
              <div className="absolute right-0 top-full mt-1 bg-[#1D1D1D] border border-[#545454] rounded-xl overflow-hidden z-10 min-w-[220px]">
                {accounts.map((acc) => {
                  const days = daysUntilExpiry(acc.expiresAt);
                  return (
                    <button
                      key={acc.id}
                      onClick={() => { setSelectedAccount(acc); setShowAccountDropdown(false); }}
                      className="w-full flex items-center gap-x-3 px-4 py-2.5 text-sm hover:bg-background-80 transition text-left"
                    >
                      {acc.avatar ? (
                        <img src={acc.avatar} className="w-6 h-6 rounded-full object-cover flex-shrink-0" alt="" />
                      ) : (
                        <Instagram size={14} className="text-pink-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{acc.username ? `@${acc.username}` : acc.name}</p>
                        <p className="text-[#545454] text-xs">{acc.workspaceName}</p>
                      </div>
                      {days !== null && days < 15 && (
                        <span className="text-orange-400 text-xs flex-shrink-0">{days}d</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Token expiry warning */}
      {selectedAccount && (() => {
        const days = daysUntilExpiry(selectedAccount.expiresAt);
        if (days !== null && days < 15) {
          return (
            <div className="flex items-center gap-x-3 bg-orange-400/10 border border-orange-400/30 rounded-xl p-4 text-orange-400 text-sm">
              <AlertTriangle size={16} className="flex-shrink-0" />
              Token expires in {days} day{days !== 1 ? "s" : ""}. Reconnect this account to avoid disruption.
            </div>
          );
        }
        return null;
      })()}

      {/* ── Workspace Post Stats ───────────────────────────────── */}
      {postStats && (
        <>
          <h2 className="text-base font-semibold text-[#9B9CA0] uppercase tracking-wide text-xs">Publishing Stats</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<CalendarCheck size={18} className="text-green-400" />}
              label="Published This Month"
              value={postStats.publishedThisMonth}
              color="bg-green-400/10"
            />
            <StatCard
              icon={<CheckCircle2 size={18} className="text-blue-400" />}
              label="Total Published"
              value={postStats.totalPublished}
              color="bg-blue-400/10"
            />
            <StatCard
              icon={<Clock size={18} className="text-yellow-400" />}
              label="Scheduled"
              value={postStats.totalPending}
              color="bg-yellow-400/10"
            />
            <StatCard
              icon={<XCircle size={18} className="text-red-400" />}
              label="Failed"
              value={postStats.totalFailed}
              color="bg-red-400/10"
            />
          </div>
        </>
      )}

      {/* ── Instagram Profile ─────────────────────────────────── */}
      {loadingInsights ? (
        <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-8 flex items-center justify-center">
          <p className="text-[#9B9CA0] text-sm">Loading Instagram data...</p>
        </div>
      ) : igError ? (
        <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-8 flex flex-col items-center gap-y-2 text-center">
          <BarChart2 size={36} className="text-[#545454]" />
          <p className="text-[#9B9CA0] text-sm">{igError}</p>
        </div>
      ) : profile ? (
        <>
          {/* Profile card */}
          <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-5 flex items-center gap-x-4">
            {profile.profile_picture_url ? (
              <img
                src={profile.profile_picture_url}
                alt={profile.username}
                className="w-16 h-16 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                {profile.username?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg">@{profile.username}</h2>
              {profile.name && <p className="text-[#9B9CA0] text-sm">{profile.name}</p>}
              {profile.biography && (
                <p className="text-[#9B9CA0] text-xs mt-1 line-clamp-2">{profile.biography}</p>
              )}
            </div>
          </div>

          {/* IG stats */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              icon={<Users size={18} className="text-blue-400" />}
              label="Followers"
              value={profile.followers_count ?? "—"}
              color="bg-blue-400/10"
            />
            <StatCard
              icon={<TrendingUp size={18} className="text-green-400" />}
              label="Following"
              value={profile.follows_count ?? "—"}
              color="bg-green-400/10"
            />
            <StatCard
              icon={<Instagram size={18} className="text-pink-400" />}
              label="Total Posts"
              value={profile.media_count ?? "—"}
              color="bg-pink-400/10"
            />
          </div>

          {/* ── Follower Trend ─────────────────────────────────── */}
          {(() => {
            const totalGain = followerHistory.reduce((s, p) => s + p.delta, 0);
            const gainDays = followerHistory.filter((p) => p.delta > 0).length;
            const lossDays = followerHistory.filter((p) => p.delta < 0).length;

            return (
              <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-5 flex flex-col gap-y-4">
                {/* Section header */}
                <div className="flex items-center justify-between flex-wrap gap-y-2">
                  <div className="flex items-center gap-x-2">
                    <Users size={16} className="text-blue-400" />
                    <h2 className="font-semibold">Follower Trend</h2>
                    {followerHistory.length > 0 && (
                      <span className={`flex items-center gap-x-1 text-xs px-2 py-0.5 rounded-full border ${
                        totalGain >= 0
                          ? "text-green-400 bg-green-400/10 border-green-400/20"
                          : "text-red-400 bg-red-400/10 border-red-400/20"
                      }`}>
                        {totalGain >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {totalGain >= 0 ? "+" : ""}{totalGain} last {historyDays}d
                      </span>
                    )}
                  </div>
                  {/* Range picker */}
                  <div className="flex gap-x-1">
                    {[7, 14, 30, 90].map((d) => (
                      <button
                        key={d}
                        onClick={() => setHistoryDays(d)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition ${
                          historyDays === d
                            ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                            : "border-[#545454] text-[#9B9CA0] hover:border-white/40"
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>

                {followerHistory.length === 0 ? (
                  <div className="flex flex-col items-center gap-y-2 py-10 text-center">
                    <Users size={32} className="text-[#545454]" />
                    <p className="text-[#9B9CA0] text-sm">No snapshots yet</p>
                    <p className="text-[#545454] text-xs max-w-xs">
                      The cron job snapshots your follower count every 5 minutes. Data will appear here after the first run.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Chart */}
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={followerHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="followerGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: "#9B9CA0", fontSize: 10 }}
                          tickFormatter={(v) => format(new Date(v), "MMM d")}
                          tickLine={false}
                          axisLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fill: "#9B9CA0", fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          domain={["auto", "auto"]}
                          tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                        />
                        <Tooltip
                          contentStyle={{ background: "#1D1D1D", border: "1px solid #545454", borderRadius: 8, fontSize: 12 }}
                          labelFormatter={(v) => format(new Date(v), "MMMM d, yyyy")}
                          formatter={(value: number, name: string) => [
                            name === "count" ? value.toLocaleString() : (value >= 0 ? `+${value}` : String(value)),
                            name === "count" ? "Followers" : "Daily change",
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="url(#followerGrad)"
                          dot={false}
                          activeDot={{ r: 4, fill: "#3b82f6" }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>

                    {/* Daily delta table */}
                    <div className="flex flex-col gap-y-0 mt-1">
                      <div className="grid grid-cols-3 text-xs text-[#545454] pb-1 border-b border-[#2a2a2a] mb-1">
                        <span>Date</span>
                        <span className="text-right">Followers</span>
                        <span className="text-right">Change</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto flex flex-col gap-y-0.5 scrollbar-none">
                        {[...followerHistory].reverse().map((p, i) => (
                          <div key={i} className="grid grid-cols-3 text-xs py-1.5 border-b border-[#1a1a1a] last:border-0">
                            <span className="text-[#9B9CA0]">{format(new Date(p.date), "MMM d, yyyy")}</span>
                            <span className="text-right text-white">{p.count.toLocaleString()}</span>
                            <span className={`text-right font-medium flex items-center justify-end gap-x-1 ${
                              p.delta > 0 ? "text-green-400" : p.delta < 0 ? "text-red-400" : "text-[#545454]"
                            }`}>
                              {p.delta > 0 && <TrendingUp size={10} />}
                              {p.delta < 0 && <TrendingDown size={10} />}
                              {p.delta > 0 ? `+${p.delta}` : p.delta === 0 ? "—" : String(p.delta)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Summary row */}
                      <div className="flex items-center justify-between pt-2 text-xs text-[#9B9CA0]">
                        <span>{gainDays} growth days · {lossDays} loss days</span>
                        <span className={totalGain >= 0 ? "text-green-400" : "text-red-400"}>
                          Net: {totalGain >= 0 ? "+" : ""}{totalGain}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* Recent posts grid */}
          {media.length > 0 && (
            <>
              <h2 className="text-base font-semibold">Recent Posts</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {media.map((item) => {
                  const thumb = item.thumbnail_url || item.media_url;
                  return (
                    <div key={item.id} className="bg-[#1D1D1D] rounded-xl border border-[#545454] overflow-hidden group">
                      {thumb && (
                        <div className="relative aspect-square overflow-hidden bg-[#2a2a2a]">
                          <img
                            src={thumb}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 gap-x-3">
                            <span className="flex items-center gap-x-1 text-white text-xs">
                              <Heart size={11} /> {item.like_count}
                            </span>
                            <span className="flex items-center gap-x-1 text-white text-xs">
                              <MessageCircle size={11} /> {item.comments_count}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-xs text-[#9B9CA0] mb-1">
                          {format(new Date(item.timestamp), "MMM d, yyyy")}
                        </p>
                        <p className="text-xs text-white line-clamp-2">
                          {item.caption || <span className="text-[#545454]">No caption</span>}
                        </p>
                        {!item.media_url && (
                          <div className="flex items-center gap-x-3 text-xs text-[#9B9CA0] mt-2">
                            <span className="flex items-center gap-x-1"><Heart size={11} /> {item.like_count}</span>
                            <span className="flex items-center gap-x-1"><MessageCircle size={11} /> {item.comments_count}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      ) : accounts.length === 0 ? (
        <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-12 flex flex-col items-center gap-y-3 text-center">
          <Instagram size={40} className="text-[#545454]" />
          <p className="text-[#9B9CA0] text-sm">No Instagram accounts connected.<br />Go to Workspaces or Integrations to connect one.</p>
        </div>
      ) : null}

      {/* ── Automation Stats ──────────────────────────────────── */}
      {automationStats && (
        <>
          <h2 className="text-base font-semibold">Automation Performance</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Zap size={18} className="text-yellow-400" />}
              label="Total Automations"
              value={automationStats.totalAutomations}
              color="bg-yellow-400/10"
            />
            <StatCard
              icon={<Zap size={18} className="text-green-400" />}
              label="Active"
              value={automationStats.activeAutomations}
              color="bg-green-400/10"
            />
            <StatCard
              icon={<MessageCircle size={18} className="text-pink-400" />}
              label="DMs Sent"
              value={automationStats.totalDms}
              color="bg-pink-400/10"
            />
            <StatCard
              icon={<MessageCircle size={18} className="text-orange-400" />}
              label="Comment Replies"
              value={automationStats.totalComments}
              color="bg-orange-400/10"
            />
          </div>
        </>
      )}
    </div>
  );
}
