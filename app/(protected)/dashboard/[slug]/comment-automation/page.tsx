"use client";

import {
  addCommentKeyword,
  createCommentAutomation,
  deleteCommentAutomation,
  getCommentAutomations,
  removeCommentKeyword,
  toggleCommentAutomation,
  updateCommentAutomation,
} from "@/actions/comment-automation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Hash,
  MessageSquareMore,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Keyword = { id: string; word: string };

type CommentAutomation = {
  id: string;
  name: string;
  active: boolean;
  replyType: "FIXED" | "AI";
  replyText: string | null;
  aiPrompt: string | null;
  sendDm: boolean;
  checkFollower: boolean;
  dmMessage: string | null;
  dmIfFollowing: string | null;
  dmIfNotFollowing: string | null;
  replyCount: number;
  dmCount: number;
  createdAt: string;
  keywords: Keyword[];
};

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        checked ? "bg-green-500" : "bg-[#545454]"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ─── Keyword tag ──────────────────────────────────────────────────────────────
function KeywordTag({ word, onRemove }: { word: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-x-1 text-xs bg-[#2a2a2a] border border-[#545454] rounded-full px-2.5 py-1 text-white">
      <Hash size={10} className="text-purple-400" />
      {word}
      <button onClick={onRemove} className="text-[#9B9CA0] hover:text-red-400 ml-0.5 transition">
        <X size={10} />
      </button>
    </span>
  );
}

// ─── Flow diagram: shows the automation logic visually ───────────────────────
function FlowPreview({ automation }: { automation: CommentAutomation }) {
  const hasReply = automation.replyType === "FIXED" ? !!automation.replyText : !!automation.aiPrompt;
  const hasDm = automation.sendDm;

  if (!hasReply && !hasDm) return null;

  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4 flex flex-col gap-y-2 text-sm">
      <p className="text-xs text-[#9B9CA0] uppercase tracking-wide font-medium mb-1">Flow Preview</p>

      {/* Trigger */}
      <div className="flex items-center gap-x-2">
        <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
          <MessageSquareMore size={13} className="text-orange-400" />
        </div>
        <span className="text-[#9B9CA0] text-xs">
          Comment matches{" "}
          {automation.keywords.length > 0
            ? automation.keywords.map((k) => `"${k.word}"`).join(", ")
            : "any keyword"}
        </span>
      </div>

      {/* Arrow */}
      <div className="ml-3.5 w-px h-4 bg-[#333]" />

      {/* Public reply */}
      {hasReply && (
        <>
          <div className="flex items-center gap-x-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <MessageSquareMore size={13} className="text-blue-400" />
            </div>
            <span className="text-[#9B9CA0] text-xs">
              Reply publicly:{" "}
              <span className="text-white">
                {automation.replyType === "AI"
                  ? "AI-generated reply"
                  : `"${(automation.replyText ?? "").slice(0, 40)}${(automation.replyText ?? "").length > 40 ? "…" : ""}"`}
              </span>
            </span>
          </div>
          {hasDm && <div className="ml-3.5 w-px h-4 bg-[#333]" />}
        </>
      )}

      {/* DM branch */}
      {hasDm && (
        <>
          <div className="flex items-center gap-x-2">
            <div className="w-7 h-7 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <Send size={13} className="text-green-400" />
            </div>
            <span className="text-[#9B9CA0] text-xs">Send DM to commenter</span>
          </div>

          {automation.checkFollower && (
            <>
              <div className="ml-3.5 w-px h-4 bg-[#333]" />
              <div className="ml-6 flex flex-col gap-y-2">
                {/* Following branch */}
                <div className="flex items-center gap-x-2">
                  <div className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <UserCheck size={11} className="text-green-400" />
                  </div>
                  <span className="text-green-400 text-xs font-medium">Following →</span>
                  <span className="text-[#9B9CA0] text-xs truncate max-w-[200px]">
                    {automation.dmIfFollowing
                      ? `"${automation.dmIfFollowing.slice(0, 40)}${automation.dmIfFollowing.length > 40 ? "…" : ""}"`
                      : <span className="text-orange-400">No message set</span>}
                  </span>
                </div>
                {/* Not following branch */}
                <div className="flex items-center gap-x-2">
                  <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <X size={11} className="text-red-400" />
                  </div>
                  <span className="text-red-400 text-xs font-medium">Not following →</span>
                  <span className="text-[#9B9CA0] text-xs truncate max-w-[160px]">
                    {automation.dmIfNotFollowing
                      ? `"${automation.dmIfNotFollowing.slice(0, 40)}${automation.dmIfNotFollowing.length > 40 ? "…" : ""}"`
                      : <span className="text-orange-400">No message set</span>}
                  </span>
                </div>
              </div>
            </>
          )}

          {!automation.checkFollower && automation.dmMessage && (
            <>
              <div className="ml-3.5 w-px h-4 bg-[#333]" />
              <div className="flex items-center gap-x-2 ml-6">
                <ArrowRight size={12} className="text-[#9B9CA0]" />
                <span className="text-[#9B9CA0] text-xs">
                  {`"${automation.dmMessage.slice(0, 60)}${automation.dmMessage.length > 60 ? "…" : ""}"`}
                </span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Single automation card ───────────────────────────────────────────────────
function AutomationCard({
  automation,
  onUpdated,
  onDeleted,
}: {
  automation: CommentAutomation;
  onUpdated: (updated: CommentAutomation) => void;
  onDeleted: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(automation.name);
  const [replyType, setReplyType] = useState<"FIXED" | "AI">(automation.replyType);
  const [replyText, setReplyText] = useState(automation.replyText ?? "");
  const [aiPrompt, setAiPrompt] = useState(automation.aiPrompt ?? "");
  const [sendDm, setSendDm] = useState(automation.sendDm);
  const [checkFollower, setCheckFollower] = useState(automation.checkFollower);
  const [dmMessage, setDmMessage] = useState(automation.dmMessage ?? "");
  const [dmIfFollowing, setDmIfFollowing] = useState(automation.dmIfFollowing ?? "");
  const [dmIfNotFollowing, setDmIfNotFollowing] = useState(automation.dmIfNotFollowing ?? "");
  const [keywords, setKeywords] = useState<Keyword[]>(automation.keywords);
  const [kwInput, setKwInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [active, setActive] = useState(automation.active);
  const kwRef = useRef<HTMLInputElement>(null);

  const currentState: CommentAutomation = {
    ...automation,
    name, replyType, replyText, aiPrompt,
    sendDm, checkFollower, dmMessage, dmIfFollowing, dmIfNotFollowing,
    keywords, active,
  };

  const handleToggle = async (val: boolean) => {
    setToggling(true);
    setActive(val);
    await toggleCommentAutomation(automation.id, val);
    setToggling(false);
    onUpdated({ ...currentState, active: val });
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await updateCommentAutomation(automation.id, {
      name,
      replyType,
      replyText: replyType === "FIXED" ? replyText : undefined,
      aiPrompt: replyType === "AI" ? aiPrompt : undefined,
      sendDm,
      checkFollower,
      dmMessage: !checkFollower ? dmMessage : undefined,
      dmIfFollowing: checkFollower ? dmIfFollowing : undefined,
      dmIfNotFollowing: checkFollower ? dmIfNotFollowing : undefined,
    });
    if (res.status === 200) onUpdated({ ...(res.data as CommentAutomation), keywords });
    setSaving(false);
  };

  const handleAddKeyword = async () => {
    const word = kwInput.replace(/^#/, "").trim().toLowerCase();
    if (!word) return;
    const res = await addCommentKeyword(automation.id, word);
    if (res.status === 200 && res.data) setKeywords((prev) => [...prev, res.data as Keyword]);
    setKwInput("");
    kwRef.current?.focus();
  };

  const handleRemoveKeyword = async (kwId: string) => {
    setKeywords((prev) => prev.filter((k) => k.id !== kwId));
    await removeCommentKeyword(kwId);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${name}"?`)) return;
    await deleteCommentAutomation(automation.id);
    onDeleted(automation.id);
  };

  const dirty =
    name !== automation.name ||
    replyType !== automation.replyType ||
    replyText !== (automation.replyText ?? "") ||
    aiPrompt !== (automation.aiPrompt ?? "") ||
    sendDm !== automation.sendDm ||
    checkFollower !== automation.checkFollower ||
    dmMessage !== (automation.dmMessage ?? "") ||
    dmIfFollowing !== (automation.dmIfFollowing ?? "") ||
    dmIfNotFollowing !== (automation.dmIfNotFollowing ?? "");

  return (
    <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div
          className="flex items-center gap-x-3 flex-1 min-w-0 cursor-pointer"
          onClick={() => setExpanded((e) => !e)}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center flex-shrink-0">
            <MessageSquareMore size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{name}</p>
            <div className="flex items-center gap-x-3 mt-0.5 flex-wrap gap-y-1">
              <span className="text-xs text-[#9B9CA0]">
                {keywords.length === 0 ? "All comments" : `${keywords.length} keyword${keywords.length !== 1 ? "s" : ""}`}
              </span>
              {sendDm && (
                <span className="flex items-center gap-x-1 text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-full px-2 py-0.5">
                  <Send size={9} /> + DM
                  {checkFollower && <span className="text-green-300/70"> · follower check</span>}
                </span>
              )}
              {automation.replyCount > 0 && (
                <span className="text-xs text-[#9B9CA0]">{automation.replyCount} replies</span>
              )}
              {automation.dmCount > 0 && (
                <span className="text-xs text-blue-400">{automation.dmCount} DMs sent</span>
              )}
            </div>
          </div>
          {expanded ? <ChevronUp size={16} className="text-[#9B9CA0] flex-shrink-0" /> : <ChevronDown size={16} className="text-[#9B9CA0] flex-shrink-0" />}
        </div>

        <div className="flex items-center gap-x-3 ml-3 flex-shrink-0">
          <Toggle checked={active} onChange={handleToggle} />
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg text-[#9B9CA0] hover:text-red-400 hover:bg-red-400/10 transition"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-[#545454] p-5 flex flex-col gap-y-6">

          {/* Flow preview */}
          <FlowPreview automation={currentState} />

          {/* Name */}
          <div className="flex flex-col gap-y-1.5">
            <label className="text-xs text-[#9B9CA0] font-medium uppercase tracking-wide">Rule Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background-80 border-[#545454]"
            />
          </div>

          {/* Keywords */}
          <div className="flex flex-col gap-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-[#9B9CA0] font-medium uppercase tracking-wide">
                Trigger Keywords
              </label>
              {keywords.length === 0 && (
                <span className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-full px-2 py-0.5">
                  Matches all comments
                </span>
              )}
            </div>
            <p className="text-xs text-[#9B9CA0]">
              Trigger only when comment contains one of these words. Leave empty to trigger on every comment.
            </p>
            <div className="flex flex-wrap gap-2 min-h-[28px]">
              {keywords.map((kw) => (
                <KeywordTag key={kw.id} word={kw.word} onRemove={() => handleRemoveKeyword(kw.id)} />
              ))}
            </div>
            <div className="flex gap-x-2">
              <Input
                ref={kwRef}
                value={kwInput}
                onChange={(e) => setKwInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddKeyword())}
                placeholder="e.g. price, link, info, #giveaway..."
                className="bg-background-80 border-[#545454] text-sm"
              />
              <Button
                type="button"
                onClick={handleAddKeyword}
                disabled={!kwInput.trim()}
                variant="ghost"
                className="border border-[#545454] text-[#9B9CA0] hover:text-white hover:border-white/40"
              >
                <Plus size={14} />
              </Button>
            </div>
          </div>

          {/* ── STEP 1: Public comment reply ────────────────────────────────── */}
          <div className="flex flex-col gap-y-3 p-4 rounded-xl bg-[#161616] border border-[#2a2a2a]">
            <div className="flex items-center gap-x-2">
              <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <MessageSquareMore size={12} className="text-blue-400" />
              </div>
              <p className="text-sm font-semibold text-white">Step 1 — Public Comment Reply</p>
            </div>
            <p className="text-xs text-[#9B9CA0]">
              Reply publicly under the comment. This boosts engagement and signals to the user to check their DMs.
            </p>

            {/* Reply type */}
            <div className="flex gap-x-2">
              <button
                onClick={() => setReplyType("FIXED")}
                className={`flex items-center gap-x-2 px-4 py-2 rounded-full text-sm border transition ${
                  replyType === "FIXED"
                    ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                    : "border-[#545454] text-[#9B9CA0] hover:border-white/40"
                }`}
              >
                <MessageSquareMore size={14} /> Fixed text
              </button>
              <button
                onClick={() => setReplyType("AI")}
                className={`flex items-center gap-x-2 px-4 py-2 rounded-full text-sm border transition ${
                  replyType === "AI"
                    ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                    : "border-[#545454] text-[#9B9CA0] hover:border-white/40"
                }`}
              >
                <Sparkles size={14} /> AI generated
              </button>
            </div>

            {replyType === "FIXED" ? (
              <div className="flex flex-col gap-y-1.5">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={2}
                  placeholder='e.g. "Thanks! Check your DMs 📩"'
                  className="w-full bg-background-80 border border-[#545454] rounded-md px-3 py-2 text-sm text-white resize-none outline-none focus:border-blue-500"
                />
                <p className="text-xs text-[#9B9CA0]">{replyText.length}/150 characters recommended</p>
              </div>
            ) : (
              <div className="flex flex-col gap-y-1.5">
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={2}
                  placeholder="e.g. You are a friendly assistant for a fashion brand. Be warm and encourage DMs."
                  className="w-full bg-background-80 border border-[#545454] rounded-md px-3 py-2 text-sm text-white resize-none outline-none focus:border-purple-500"
                />
                <p className="text-xs text-[#9B9CA0]">
                  Requires <code className="bg-[#2a2a2a] px-1 rounded text-xs">OPEN_AI_KEY</code> in .env
                </p>
              </div>
            )}
          </div>

          {/* ── STEP 2: Send DM ──────────────────────────────────────────────── */}
          <div className="flex flex-col gap-y-3 p-4 rounded-xl bg-[#161616] border border-[#2a2a2a]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-x-2">
                <div className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Send size={12} className="text-green-400" />
                </div>
                <p className="text-sm font-semibold text-white">Step 2 — Send DM</p>
              </div>
              <Toggle checked={sendDm} onChange={setSendDm} />
            </div>
            <p className="text-xs text-[#9B9CA0]">
              Automatically send a private DM to the commenter after replying to their comment.
            </p>

            {sendDm && (
              <div className="flex flex-col gap-y-4 mt-1">
                {/* Follower check toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                  <div className="flex items-center gap-x-2">
                    <UserCheck size={15} className="text-purple-400" />
                    <div>
                      <p className="text-sm text-white">Check if they follow you</p>
                      <p className="text-xs text-[#9B9CA0]">Send different DMs to followers vs non-followers</p>
                    </div>
                  </div>
                  <Toggle checked={checkFollower} onChange={setCheckFollower} />
                </div>

                {checkFollower ? (
                  <div className="flex flex-col gap-y-3">
                    {/* Following branch */}
                    <div className="flex flex-col gap-y-1.5">
                      <label className="text-xs font-medium flex items-center gap-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                        <span className="text-green-400">If following you</span>
                      </label>
                      <textarea
                        value={dmIfFollowing}
                        onChange={(e) => setDmIfFollowing(e.target.value)}
                        rows={3}
                        placeholder={`e.g. "Hey! Thanks for being a follower 🙌 Here's your exclusive link: [paste link here]"`}
                        className="w-full bg-background-80 border border-[#545454] focus:border-green-500/60 rounded-md px-3 py-2 text-sm text-white resize-none outline-none"
                      />
                    </div>

                    {/* Not following branch */}
                    <div className="flex flex-col gap-y-1.5">
                      <label className="text-xs font-medium flex items-center gap-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                        <span className="text-red-400">If NOT following you</span>
                      </label>
                      <textarea
                        value={dmIfNotFollowing}
                        onChange={(e) => setDmIfNotFollowing(e.target.value)}
                        rows={3}
                        placeholder={`e.g. "Hey! To get access to the exclusive link, please follow our account first, then comment again 😊"`}
                        className="w-full bg-background-80 border border-[#545454] focus:border-red-500/60 rounded-md px-3 py-2 text-sm text-white resize-none outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-y-1.5">
                    <label className="text-xs text-[#9B9CA0] font-medium">DM Message</label>
                    <textarea
                      value={dmMessage}
                      onChange={(e) => setDmMessage(e.target.value)}
                      rows={3}
                      placeholder={`e.g. "Hey! Thanks for your comment 👋 Here's the link you asked about: [paste link here]"`}
                      className="w-full bg-background-80 border border-[#545454] focus:border-green-500/60 rounded-md px-3 py-2 text-sm text-white resize-none outline-none"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Save */}
          <div className="flex items-center gap-x-3">
            <Button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-full hover:opacity-80 disabled:opacity-40"
            >
              {saving ? (
                <><RotateCcw size={13} className="mr-2 animate-spin" /> Saving...</>
              ) : (
                "Save Changes"
              )}
            </Button>
            {dirty && !saving && <span className="text-xs text-orange-400">Unsaved changes</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CommentAutomationPage() {
  const [automations, setAutomations] = useState<CommentAutomation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    getCommentAutomations().then((res) => {
      if (res.status === 200) setAutomations(res.data as CommentAutomation[]);
      setLoading(false);
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const res = await createCommentAutomation(newName.trim());
    if (res.status === 200) {
      setAutomations((prev) => [res.data as CommentAutomation, ...prev]);
      setNewName("");
      setShowCreate(false);
    }
    setCreating(false);
  };

  const totalDms = automations.reduce((sum, a) => sum + a.dmCount, 0);
  const totalReplies = automations.reduce((sum, a) => sum + a.replyCount, 0);
  const activeCount = automations.filter((a) => a.active).length;

  return (
    <div className="flex flex-col gap-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-y-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquareMore size={22} className="text-purple-400" />
            Comment Replies
          </h1>
          <p className="text-[#9B9CA0] text-sm mt-1">
            Auto-reply to comments and optionally send a DM — with follower-gating
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-full hover:opacity-80"
        >
          <Plus size={16} className="mr-2" />
          New Rule
        </Button>
      </div>

      {/* Stats strip */}
      {automations.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Rules", value: automations.length, color: "purple" },
            { label: "Active", value: activeCount, color: "green" },
            { label: "Comment Replies", value: totalReplies, color: "blue" },
            { label: "DMs Sent", value: totalDms, color: "orange" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-4 flex items-center gap-x-3">
              <div className={`p-2.5 rounded-xl bg-${color}-400/10`}>
                <Zap size={16} className={`text-${color}-400`} />
              </div>
              <div>
                <p className="text-[#9B9CA0] text-xs">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* How it works */}
      <div className="bg-[#1D1D1D] rounded-xl border border-[#545454]/60 p-4 flex gap-x-3">
        <div className="p-2 rounded-lg bg-purple-500/10 flex-shrink-0 self-start mt-0.5">
          <Sparkles size={14} className="text-purple-400" />
        </div>
        <div className="text-sm text-[#9B9CA0] space-y-1">
          <p className="text-white font-medium">How it works</p>
          <p>
            When someone comments on your post and their comment matches your keywords, the rule fires in two steps:
            <br />
            <span className="text-blue-400">Step 1</span> — Reply publicly under their comment (e.g. "Check your DMs!").
            <br />
            <span className="text-green-400">Step 2</span> — Optionally send them a private DM. Enable the follower check to send different messages to followers vs non-followers.
          </p>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-[#1D1D1D] rounded-xl border border-purple-500/30 p-5 flex flex-col gap-y-3"
        >
          <p className="font-semibold">Create New Rule</p>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Price enquiry → send link, Giveaway → DM winner"
            className="bg-background-80 border-[#545454]"
            required
            autoFocus
          />
          <div className="flex gap-x-2">
            <Button
              type="submit"
              disabled={creating}
              className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-full hover:opacity-80"
            >
              {creating ? "Creating..." : "Create"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)} className="text-[#9B9CA0]">
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="bg-[#1D1D1D] rounded-xl border border-[#545454] h-20 animate-pulse" />
          ))}
        </div>
      ) : automations.length === 0 ? (
        <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-16 text-center flex flex-col items-center gap-y-3">
          <MessageSquareMore size={44} className="text-[#545454]" />
          <p className="font-semibold">No comment rules yet</p>
          <p className="text-[#9B9CA0] text-sm max-w-sm">
            Create your first rule to auto-reply to comments and send DMs to people who engage with your posts.
          </p>
          <Button
            onClick={() => setShowCreate(true)}
            className="mt-2 bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-full hover:opacity-80"
          >
            <Plus size={15} className="mr-2" /> Create First Rule
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-y-3">
          {automations.map((a) => (
            <AutomationCard
              key={a.id}
              automation={a}
              onUpdated={(u) => setAutomations((prev) => prev.map((x) => (x.id === u.id ? u : x)))}
              onDeleted={(id) => setAutomations((prev) => prev.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
