"use client";

import { createTrackedLink, deleteTrackedLink, getTrackedLinks } from "@/actions/link-tracker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy, ExternalLink, Link2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type TrackedLink = {
  id: string;
  shortId: string;
  targetUrl: string;
  label: string | null;
  clickCount: number;
  shortUrl: string;
  createdAt: string;
};

export default function LinkTrackerPage() {
  const [links, setLinks] = useState<TrackedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [targetUrl, setTargetUrl] = useState("");
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    getTrackedLinks().then((res) => {
      if (res.status === 200) setLinks(res.data as TrackedLink[]);
      setLoading(false);
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) return;
    setCreating(true);
    const res = await createTrackedLink({ targetUrl: targetUrl.trim(), label: label.trim() || undefined });
    if (res.status === 200) {
      setLinks((prev) => [res.data as TrackedLink, ...prev]);
      setTargetUrl("");
      setLabel("");
      setShowCreate(false);
    }
    setCreating(false);
  };

  const handleCopy = (link: TrackedLink) => {
    navigator.clipboard.writeText(link.shortUrl);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
    await deleteTrackedLink(id);
  };

  const totalClicks = links.reduce((sum, l) => sum + l.clickCount, 0);

  return (
    <div className="flex flex-col gap-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-y-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Link2 size={22} className="text-green-400" />
            Link Tracker
          </h1>
          <p className="text-[#9B9CA0] text-sm mt-1">
            Create short trackable links to use in your DMs and see exactly how many clicks each gets
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-full hover:opacity-80"
        >
          <Plus size={16} className="mr-2" />
          New Link
        </Button>
      </div>

      {/* Stats */}
      {links.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-4 flex items-center gap-x-3">
            <div className="p-2.5 rounded-xl bg-green-400/10"><Link2 size={16} className="text-green-400" /></div>
            <div><p className="text-[#9B9CA0] text-xs">Total Links</p><p className="text-xl font-bold">{links.length}</p></div>
          </div>
          <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-4 flex items-center gap-x-3">
            <div className="p-2.5 rounded-xl bg-blue-400/10"><ExternalLink size={16} className="text-blue-400" /></div>
            <div><p className="text-[#9B9CA0] text-xs">Total Clicks</p><p className="text-xl font-bold">{totalClicks.toLocaleString()}</p></div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-[#1D1D1D] rounded-xl border border-[#545454]/60 p-4 flex gap-x-3">
        <div className="p-2 rounded-lg bg-green-500/10 flex-shrink-0 self-start mt-0.5">
          <Link2 size={14} className="text-green-400" />
        </div>
        <div className="text-sm text-[#9B9CA0]">
          <p className="text-white font-medium">Use tracked links in your automations</p>
          <p className="mt-1">Paste a tracked link into any DM automation or sequence message. Every click is counted so you can see which campaigns drive the most traffic.</p>
          <p className="mt-1 text-xs">Short links look like: <code className="bg-[#2a2a2a] px-1 rounded">{process.env.NEXT_PUBLIC_HOST_URL}/api/t/abc12345</code></p>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-[#1D1D1D] rounded-xl border border-green-500/30 p-5 flex flex-col gap-y-3">
          <p className="font-semibold">Create Tracked Link</p>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. Free guide download)"
            className="bg-background-80 border-[#545454]"
          />
          <Input
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="Destination URL (e.g. https://yoursite.com/offer)"
            className="bg-background-80 border-[#545454]"
            required
            type="url"
            autoFocus
          />
          <div className="flex gap-x-2">
            <Button type="submit" disabled={creating} className="bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-full hover:opacity-80">
              {creating ? "Creating..." : "Create Link"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)} className="text-[#9B9CA0]">Cancel</Button>
          </div>
        </form>
      )}

      {/* Links list */}
      {loading ? (
        <div className="flex flex-col gap-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="bg-[#1D1D1D] rounded-xl border border-[#545454] h-20 animate-pulse" />)}
        </div>
      ) : links.length === 0 ? (
        <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-16 text-center flex flex-col items-center gap-y-3">
          <Link2 size={44} className="text-[#545454]" />
          <p className="font-semibold">No tracked links yet</p>
          <p className="text-[#9B9CA0] text-sm max-w-sm">Create your first tracked link and paste it into any DM automation to measure click-through rates.</p>
          <Button onClick={() => setShowCreate(true)} className="mt-2 bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-full hover:opacity-80">
            <Plus size={15} className="mr-2" /> Create First Link
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-y-3">
          {links.map((link) => (
            <div key={link.id} className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-4 flex items-center gap-x-4">
              {/* Click bar */}
              <div className="w-12 h-12 rounded-xl bg-green-400/10 border border-green-400/20 flex flex-col items-center justify-center flex-shrink-0">
                <p className="text-green-400 font-bold text-lg leading-none">{link.clickCount >= 1000 ? `${(link.clickCount / 1000).toFixed(1)}k` : link.clickCount}</p>
                <p className="text-[#9B9CA0] text-[10px]">clicks</p>
              </div>

              <div className="flex-1 min-w-0">
                {link.label && <p className="text-sm font-medium text-white truncate">{link.label}</p>}
                <p className="text-xs text-green-400 font-mono truncate">{link.shortUrl}</p>
                <p className="text-xs text-[#9B9CA0] truncate mt-0.5">{link.targetUrl}</p>
              </div>

              <div className="flex items-center gap-x-2 flex-shrink-0">
                <button
                  onClick={() => handleCopy(link)}
                  className="flex items-center gap-x-1.5 text-xs text-[#9B9CA0] hover:text-white border border-[#545454] rounded-lg px-3 py-1.5 transition hover:border-white/40"
                >
                  {copiedId === link.id ? <><Check size={11} className="text-green-400" /> Copied!</> : <><Copy size={11} /> Copy</>}
                </button>
                <a
                  href={link.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-[#9B9CA0] hover:text-white border border-[#545454] hover:border-white/40 transition"
                >
                  <ExternalLink size={13} />
                </a>
                <button
                  onClick={() => handleDelete(link.id)}
                  className="p-1.5 rounded-lg text-[#9B9CA0] hover:text-red-400 hover:bg-red-400/10 transition"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
