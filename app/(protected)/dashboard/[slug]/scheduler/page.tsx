"use client";

import { createScheduledPost, deleteScheduledPost, getScheduledPosts } from "@/actions/scheduler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarClock, ImageIcon, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type ScheduledPost = {
  id: string;
  mediaUrl: string;
  caption: string | null;
  scheduledAt: Date;
  status: string;
};

export default function SchedulerPage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const fetchPosts = async () => {
    setFetching(true);
    const res = await getScheduledPosts();
    if (res.status === 200) setPosts(res.data as ScheduledPost[]);
    setFetching(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl || !scheduledAt) return;
    setLoading(true);
    await createScheduledPost({
      mediaUrl,
      mediaType: "IMAGE",
      caption,
      scheduledAt: new Date(scheduledAt),
    });
    setMediaUrl("");
    setCaption("");
    setScheduledAt("");
    await fetchPosts();
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    await deleteScheduledPost(id);
  };

  const statusColor = {
    PENDING: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
    PUBLISHED: "text-green-400 bg-green-400/10 border-green-400/30",
    FAILED: "text-red-400 bg-red-400/10 border-red-400/30",
  };

  return (
    <div className="flex flex-col gap-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Scheduler</h1>
        <p className="text-[#9B9CA0] text-sm mt-1">Schedule posts to publish automatically on Instagram</p>
      </div>

      {/* New Post Form */}
      <form onSubmit={handleSubmit} className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-6 flex flex-col gap-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ImageIcon size={20} className="text-blue-400" />
          New Scheduled Post
        </h2>

        <div className="flex flex-col gap-y-1">
          <label className="text-sm text-[#9B9CA0]">Image URL</label>
          <Input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="bg-background-80 border-[#545454]"
            required
          />
        </div>

        <div className="flex flex-col gap-y-1">
          <label className="text-sm text-[#9B9CA0]">Caption</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write your caption here... #hashtags"
            rows={3}
            className="w-full bg-background-80 border border-[#545454] rounded-md px-3 py-2 text-sm text-white resize-none outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-col gap-y-1">
          <label className="text-sm text-[#9B9CA0]">Schedule Date & Time</label>
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="bg-background-80 border-[#545454]"
            required
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-br from-[#3352CC] to-[#1C2D70] text-white rounded-full py-5 hover:opacity-80"
        >
          <CalendarClock size={16} className="mr-2" />
          {loading ? "Scheduling..." : "Schedule Post"}
        </Button>
      </form>

      {/* Scheduled Posts List */}
      <div className="flex flex-col gap-y-3">
        <h2 className="text-lg font-semibold">Scheduled Posts ({posts.length})</h2>

        {fetching ? (
          <p className="text-[#9B9CA0] text-sm">Loading...</p>
        ) : posts.length === 0 ? (
          <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-10 text-center">
            <CalendarClock size={40} className="mx-auto text-[#545454] mb-3" />
            <p className="text-[#9B9CA0]">No scheduled posts yet</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-4 flex gap-x-4 items-start">
              <img
                src={post.mediaUrl}
                alt="post"
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-[#2a2a2a]"
                onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/64"; }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white line-clamp-2">{post.caption || <span className="text-[#9B9CA0]">No caption</span>}</p>
                <p className="text-xs text-[#9B9CA0] mt-1">
                  {format(new Date(post.scheduledAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              <div className="flex items-center gap-x-2 flex-shrink-0">
                <span className={`text-xs px-2 py-1 rounded-full border capitalize ${statusColor[post.status as keyof typeof statusColor]}`}>
                  {post.status.toLowerCase()}
                </span>
                {post.status === "PENDING" && (
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="p-1.5 rounded-lg text-[#9B9CA0] hover:text-red-400 hover:bg-red-400/10 transition"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
