"use client";

import { getWorkspaces } from "@/actions/workspace";
import {
  createWorkspacePost,
  deleteWorkspacePost,
  getWorkspacePosts,
} from "@/actions/workspace-scheduler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import {
  CalendarClock,
  ChevronDown,
  Image as ImageIcon,
  Instagram,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Account = {
  id: string;
  platform: "INSTAGRAM" | "TELEGRAM";
  name: string;
  username: string | null;
};

type Workspace = {
  id: string;
  name: string;
  accounts: Account[];
};

type PostTarget = {
  id: string;
  status: string;
  publishedAt: string | null;
  account: Account;
};

type WorkspacePost = {
  id: string;
  mediaUrl: string;
  mediaType: string;
  caption: string | null;
  scheduledAt: string;
  targets: PostTarget[];
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  PUBLISHED: "text-green-400 bg-green-400/10 border-green-400/30",
  FAILED: "text-red-400 bg-red-400/10 border-red-400/30",
};

export default function WorkspaceSchedulerPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [posts, setPosts] = useState<WorkspacePost[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Form state
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"IMAGE" | "VIDEO" | "REEL" | "STORY">("IMAGE");
  const [caption, setCaption] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadPosts = async (workspaceId: string, silent = false) => {
    if (!silent) setLoadingPosts(true);
    else setRefreshing(true);
    const res = await getWorkspacePosts(workspaceId);
    if (res.status === 200) setPosts(res.data as unknown as WorkspacePost[]);
    if (!silent) setLoadingPosts(false);
    else setRefreshing(false);
  };

  useEffect(() => {
    const load = async () => {
      const res = await getWorkspaces();
      if (res.status === 200 && Array.isArray(res.data) && res.data.length > 0) {
        setWorkspaces(res.data as Workspace[]);
        setSelectedWorkspace(res.data[0] as Workspace);
      }
      setLoadingWorkspaces(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedWorkspace) return;
    loadPosts(selectedWorkspace.id);
  }, [selectedWorkspace]);

  // Auto-poll every 30s while any post is PENDING
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    const hasPending = posts.some((p) => p.targets.some((t) => t.status === "PENDING"));
    if (!hasPending || !selectedWorkspace) return;
    pollRef.current = setInterval(() => {
      loadPosts(selectedWorkspace.id, true);
    }, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [posts, selectedWorkspace]);

  const toggleAccount = (id: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspace || !mediaUrl || !scheduledAt || selectedAccounts.length === 0) return;
    setSubmitting(true);

    const res = await createWorkspacePost({
      workspaceId: selectedWorkspace.id,
      mediaUrl,
      mediaType,
      caption,
      scheduledAt: new Date(scheduledAt),
      targetAccountIds: selectedAccounts,
    });

    if (res.status === 200) {
      setMediaUrl("");
      setCaption("");
      setScheduledAt("");
      setSelectedAccounts([]);
      await loadPosts(selectedWorkspace.id);
    }
    setSubmitting(false);
  };

  const handleDelete = async (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    await deleteWorkspacePost(postId);
  };

  if (loadingWorkspaces) {
    return <div className="text-[#9B9CA0] text-sm">Loading...</div>;
  }

  if (workspaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-y-3">
        <CalendarClock size={48} className="text-[#545454]" />
        <h2 className="text-lg font-semibold">No Workspaces Found</h2>
        <p className="text-[#9B9CA0] text-sm">Create a workspace and connect accounts first</p>
        <a href="../workspaces" className="text-blue-400 text-sm hover:underline">Go to Workspaces →</a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workspace Scheduler</h1>
          <p className="text-[#9B9CA0] text-sm mt-1">Schedule posts across Instagram and Telegram</p>
        </div>

        {/* Workspace Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-x-2 bg-[#1D1D1D] border border-[#545454] rounded-xl px-4 py-2 text-sm hover:border-white/40 transition"
          >
            <div className="w-5 h-5 rounded bg-gradient-to-br from-[#3352CC] to-[#1C2D70] flex items-center justify-center text-xs font-bold">
              {selectedWorkspace?.name[0]}
            </div>
            {selectedWorkspace?.name}
            <ChevronDown size={14} className="text-[#9B9CA0]" />
          </button>
          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 bg-[#1D1D1D] border border-[#545454] rounded-xl overflow-hidden z-10 min-w-[160px]">
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  onClick={() => { setSelectedWorkspace(w); setShowDropdown(false); setSelectedAccounts([]); }}
                  className="w-full flex items-center gap-x-2 px-4 py-2.5 text-sm hover:bg-background-80 transition text-left"
                >
                  <div className="w-5 h-5 rounded bg-gradient-to-br from-[#3352CC] to-[#1C2D70] flex items-center justify-center text-xs font-bold">
                    {w.name[0]}
                  </div>
                  {w.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New Post Form */}
        <form onSubmit={handleSubmit} className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-5 flex flex-col gap-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <ImageIcon size={18} className="text-blue-400" />
            New Post
          </h2>

          {/* Media Type */}
          <div className="flex flex-wrap gap-2">
            {(["IMAGE", "VIDEO", "REEL", "STORY"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMediaType(t)}
                className={`px-3 py-1 rounded-full text-xs border transition ${
                  mediaType === t
                    ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                    : "border-[#545454] text-[#9B9CA0] hover:border-white/40"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <Input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="Media URL (image or video)"
            className="bg-background-80 border-[#545454]"
            required
          />

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption... #hashtags"
            rows={4}
            className="w-full bg-background-80 border border-[#545454] rounded-md px-3 py-2 text-sm text-white resize-none outline-none focus:border-blue-500"
          />

          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="bg-background-80 border-[#545454]"
            required
          />

          {/* Target Accounts */}
          <div className="flex flex-col gap-y-2">
            <p className="text-xs text-[#9B9CA0]">Publish to:</p>
            {selectedWorkspace?.accounts.length === 0 ? (
              <p className="text-xs text-[#545454]">No accounts connected to this workspace</p>
            ) : (
              selectedWorkspace?.accounts.map((acc) => (
                <label key={acc.id} className="flex items-center gap-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAccounts.includes(acc.id)}
                    onChange={() => toggleAccount(acc.id)}
                    className="rounded"
                  />
                  <div className="flex items-center gap-x-2">
                    {acc.platform === "INSTAGRAM" ? (
                      <Instagram size={14} className="text-pink-400" />
                    ) : (
                      <Send size={14} className="text-blue-400" />
                    )}
                    <span className="text-sm">{acc.name}</span>
                    {acc.username && <span className="text-xs text-[#9B9CA0]">@{acc.username}</span>}
                  </div>
                </label>
              ))
            )}
          </div>

          <Button
            type="submit"
            disabled={submitting || selectedAccounts.length === 0}
            className="bg-gradient-to-br from-[#3352CC] to-[#1C2D70] text-white rounded-full hover:opacity-80"
          >
            <CalendarClock size={14} className="mr-2" />
            {submitting ? "Scheduling..." : "Schedule Post"}
          </Button>
        </form>

        {/* Scheduled Posts */}
        <div className="flex flex-col gap-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Scheduled ({posts.length})</h2>
            {selectedWorkspace && (
              <button
                onClick={() => loadPosts(selectedWorkspace.id, true)}
                disabled={refreshing}
                className="p-1.5 rounded-lg text-[#9B9CA0] hover:text-white hover:bg-[#2a2a2a] transition"
                title="Refresh"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              </button>
            )}
          </div>

          {loadingPosts ? (
            <p className="text-[#9B9CA0] text-sm">Loading...</p>
          ) : posts.length === 0 ? (
            <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-8 text-center">
              <CalendarClock size={36} className="mx-auto text-[#545454] mb-2" />
              <p className="text-[#9B9CA0] text-sm">No scheduled posts</p>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-4 flex gap-x-3">
                <img
                  src={post.mediaUrl}
                  alt=""
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-[#2a2a2a]"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#9B9CA0] mb-1">
                    {format(new Date(post.scheduledAt), "MMM d, yyyy 'at' h:mm a")}
                    <span className="ml-2 text-[#545454]">{post.mediaType}</span>
                  </p>
                  <p className="text-sm text-white line-clamp-2 mb-2">
                    {post.caption || <span className="text-[#9B9CA0]">No caption</span>}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {post.targets.map((t) => (
                      <div key={t.id} className="flex items-center gap-x-1.5">
                        {t.account.platform === "INSTAGRAM" ? (
                          <Instagram size={11} className="text-pink-400" />
                        ) : (
                          <Send size={11} className="text-blue-400" />
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[t.status]}`}>
                          {t.status.toLowerCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {post.targets.every((t) => t.status === "PENDING") && (
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="p-1.5 rounded-lg text-[#9B9CA0] hover:text-red-400 hover:bg-red-400/10 transition flex-shrink-0 self-start"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
