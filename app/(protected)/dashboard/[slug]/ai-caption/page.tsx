"use client";

import { generateCaption } from "@/actions/ai-caption";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";

const TONES = ["Professional", "Casual", "Inspirational", "Humorous", "Educational", "Promotional"];
const NICHES = ["Fashion & Style", "AI & Technology", "Fitness & Health", "Food & Lifestyle", "Business & Finance", "Travel", "Art & Design", "Beauty"];
const LANGUAGES = ["English", "Hebrew", "Spanish", "French", "German", "Arabic", "Portuguese"];

export default function AiCaptionPage() {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("Professional");
  const [niche, setNiche] = useState("AI & Technology");
  const [platform, setPlatform] = useState<"INSTAGRAM" | "TELEGRAM" | "BOTH">("INSTAGRAM");
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [language, setLanguage] = useState("English");

  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    setError("");

    const res = await generateCaption({
      topic,
      tone,
      niche,
      platform,
      includeHashtags,
      includeEmojis,
      language,
    });

    if (res.status === 200) {
      setCaption(res.data as string);
      setHistory((prev) => [res.data as string, ...prev.slice(0, 4)]);
    } else {
      setError(res.data as string);
    }
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles size={24} className="text-purple-400" />
          AI Caption Generator
        </h1>
        <p className="text-[#9B9CA0] text-sm mt-1">
          Generate engaging captions for Instagram and Telegram using AI
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings */}
        <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-5 flex flex-col gap-y-4">
          <h2 className="font-semibold">Caption Settings</h2>

          {/* Topic */}
          <div className="flex flex-col gap-y-1">
            <label className="text-sm text-[#9B9CA0]">Topic / Subject</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. New AI fashion collection inspired by futuristic design..."
              rows={3}
              className="w-full bg-background-80 border border-[#545454] rounded-md px-3 py-2 text-sm text-white resize-none outline-none focus:border-purple-500"
            />
          </div>

          {/* Tone */}
          <div className="flex flex-col gap-y-2">
            <label className="text-sm text-[#9B9CA0]">Tone</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`px-3 py-1 rounded-full text-xs border transition ${
                    tone === t
                      ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                      : "border-[#545454] text-[#9B9CA0] hover:border-white/40"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Niche */}
          <div className="flex flex-col gap-y-2">
            <label className="text-sm text-[#9B9CA0]">Niche</label>
            <div className="flex flex-wrap gap-2">
              {NICHES.map((n) => (
                <button
                  key={n}
                  onClick={() => setNiche(n)}
                  className={`px-3 py-1 rounded-full text-xs border transition ${
                    niche === n
                      ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                      : "border-[#545454] text-[#9B9CA0] hover:border-white/40"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div className="flex flex-col gap-y-2">
            <label className="text-sm text-[#9B9CA0]">Platform</label>
            <div className="flex gap-2">
              {(["INSTAGRAM", "TELEGRAM", "BOTH"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`px-3 py-1 rounded-full text-xs border transition capitalize ${
                    platform === p
                      ? "bg-pink-500/20 border-pink-500/50 text-pink-400"
                      : "border-[#545454] text-[#9B9CA0] hover:border-white/40"
                  }`}
                >
                  {p.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="flex flex-col gap-y-2">
            <label className="text-sm text-[#9B9CA0]">Language</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={`px-3 py-1 rounded-full text-xs border transition ${
                    language === l
                      ? "bg-green-500/20 border-green-500/50 text-green-400"
                      : "border-[#545454] text-[#9B9CA0] hover:border-white/40"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-x-4">
            <label className="flex items-center gap-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeHashtags}
                onChange={(e) => setIncludeHashtags(e.target.checked)}
              />
              <span className="text-sm text-[#9B9CA0]">Hashtags</span>
            </label>
            <label className="flex items-center gap-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeEmojis}
                onChange={(e) => setIncludeEmojis(e.target.checked)}
              />
              <span className="text-sm text-[#9B9CA0]">Emojis</span>
            </label>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading || !topic}
            className="bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-full hover:opacity-80"
          >
            <Wand2 size={14} className="mr-2" />
            {loading ? "Generating..." : "Generate Caption"}
          </Button>
        </div>

        {/* Output */}
        <div className="flex flex-col gap-y-4">
          {error && (
            <div className="bg-red-400/10 border border-red-400/30 rounded-xl p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {caption && (
            <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-5 flex flex-col gap-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Generated Caption</h2>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-x-1.5 text-xs text-[#9B9CA0] hover:text-white border border-[#545454] rounded-lg px-3 py-1.5 transition hover:border-white/40"
                >
                  {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="text-sm text-white whitespace-pre-wrap font-sans leading-relaxed">
                {caption}
              </pre>
              <div className="flex gap-x-2">
                <Button
                  onClick={handleGenerate}
                  disabled={loading}
                  variant="ghost"
                  className="text-[#9B9CA0] text-xs border border-[#545454] rounded-full hover:border-white/40"
                >
                  <Wand2 size={12} className="mr-1" />
                  Regenerate
                </Button>
              </div>
            </div>
          )}

          {!caption && !error && (
            <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-12 text-center flex flex-col items-center gap-y-3">
              <Sparkles size={40} className="text-[#545454]" />
              <p className="text-[#9B9CA0] text-sm">Fill in the settings and click Generate</p>
            </div>
          )}

          {/* History */}
          {history.length > 1 && (
            <div className="flex flex-col gap-y-2">
              <h3 className="text-sm font-semibold text-[#9B9CA0]">Previous Captions</h3>
              {history.slice(1).map((h, i) => (
                <div
                  key={i}
                  onClick={() => setCaption(h)}
                  className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-3 text-xs text-[#9B9CA0] line-clamp-2 cursor-pointer hover:border-white/40 transition"
                >
                  {h}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
