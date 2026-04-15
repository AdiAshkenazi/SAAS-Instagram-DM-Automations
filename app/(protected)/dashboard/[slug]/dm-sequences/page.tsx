"use client";

import {
  addSequenceStep,
  createDmSequence,
  deleteDmSequence,
  deleteSequenceStep,
  getDmSequences,
  getSequenceEnrollments,
  updateDmSequence,
  updateSequenceStep,
} from "@/actions/dm-sequence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  GripVertical,
  Mail,
  MessageCircle,
  Plus,
  RotateCcw,
  Trash2,
  Users,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = {
  id: string;
  stepOrder: number;
  message: string;
  delayHours: number;
  isEmailCapture: boolean;
  emailPrompt: string | null;
};

type Sequence = {
  id: string;
  name: string;
  active: boolean;
  triggerType: string;
  triggerWord: string | null;
  enrollCount: number;
  createdAt: string;
  steps: Step[];
  _count?: { enrollments: number };
};

type Enrollment = {
  id: string;
  contactIgId: string;
  nextStepOrder: number;
  completed: boolean;
  capturedEmail: string | null;
  enrolledAt: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIGGER_OPTIONS = [
  { value: "KEYWORD", label: "Keyword in DM", description: "DM when someone sends a keyword" },
  { value: "STORY_REPLY", label: "Story Reply", description: "DM when someone replies to your story" },
  { value: "MENTION", label: "Story Mention", description: "DM when someone @mentions you in a story" },
  { value: "COMMENT", label: "Comment Keyword", description: "DM when someone comments a keyword" },
];

const DELAY_OPTIONS = [
  { value: 0, label: "Immediately" },
  { value: 1, label: "1 hour later" },
  { value: 6, label: "6 hours later" },
  { value: 24, label: "1 day later" },
  { value: 48, label: "2 days later" },
  { value: 72, label: "3 days later" },
  { value: 168, label: "1 week later" },
];

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${checked ? "bg-green-500" : "bg-[#545454]"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

// ─── Step Card ────────────────────────────────────────────────────────────────

function StepCard({
  step,
  index,
  total,
  onDelete,
  onUpdate,
}: {
  step: Step;
  index: number;
  total: number;
  onDelete: () => void;
  onUpdate: (data: Partial<Step>) => void;
}) {
  const [msg, setMsg] = useState(step.message);
  const [delay, setDelay] = useState(step.delayHours);
  const [emailPrompt, setEmailPrompt] = useState(step.emailPrompt ?? "");
  const [saving, setSaving] = useState(false);

  const dirty = msg !== step.message || delay !== step.delayHours || emailPrompt !== (step.emailPrompt ?? "");

  const handleSave = async () => {
    setSaving(true);
    await updateSequenceStep(step.id, {
      message: step.isEmailCapture ? undefined : msg,
      delayHours: delay,
      emailPrompt: step.isEmailCapture ? emailPrompt : undefined,
    });
    onUpdate({ message: msg, delayHours: delay, emailPrompt });
    setSaving(false);
  };

  return (
    <div className="relative flex gap-x-3">
      {/* Timeline line */}
      {index < total - 1 && (
        <div className="absolute left-4 top-10 bottom-0 w-px bg-[#545454]" />
      )}

      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 z-10 ${
        step.isEmailCapture ? "bg-purple-500/20 border border-purple-500/40" : "bg-blue-500/20 border border-blue-500/40"
      }`}>
        {step.isEmailCapture ? (
          <Mail size={13} className="text-purple-400" />
        ) : (
          <MessageCircle size={13} className="text-blue-400" />
        )}
      </div>

      <div className="flex-1 bg-[#1D1D1D] rounded-xl border border-[#545454] p-4 flex flex-col gap-y-3 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#9B9CA0] uppercase tracking-wide">
            Step {index + 1} {step.isEmailCapture ? "— Email Capture" : "— Message"}
          </span>
          <button onClick={onDelete} className="text-[#545454] hover:text-red-400 transition">
            <Trash2 size={13} />
          </button>
        </div>

        {/* Delay */}
        {index > 0 && (
          <div className="flex items-center gap-x-2">
            <Clock size={12} className="text-[#9B9CA0]" />
            <select
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
              className="bg-background-80 border border-[#545454] rounded-md text-xs text-white px-2 py-1 outline-none"
            >
              {DELAY_OPTIONS.filter((d) => d.value > 0).map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        )}

        {step.isEmailCapture ? (
          <div className="flex flex-col gap-y-1.5">
            <label className="text-xs text-[#9B9CA0]">Prompt message</label>
            <Input
              value={emailPrompt}
              onChange={(e) => setEmailPrompt(e.target.value)}
              placeholder="Reply with your email to receive the free guide:"
              className="bg-background-80 border-[#545454] text-sm"
            />
            <p className="text-xs text-purple-400/80">
              After they reply with a valid email, the next step will be sent automatically.
            </p>
          </div>
        ) : (
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            rows={3}
            placeholder="Your message..."
            className="w-full bg-background-80 border border-[#545454] rounded-md px-3 py-2 text-sm text-white resize-none outline-none focus:border-blue-500"
          />
        )}

        {dirty && (
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="self-start bg-gradient-to-br from-[#3352CC] to-[#1C2D70] text-white rounded-full text-xs hover:opacity-80"
          >
            {saving ? <><RotateCcw size={10} className="mr-1 animate-spin" />Saving...</> : "Save"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Sequence Card ────────────────────────────────────────────────────────────

function SequenceCard({
  seq,
  onUpdated,
  onDeleted,
}: {
  seq: Sequence;
  onUpdated: (s: Sequence) => void;
  onDeleted: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showEnrollments, setShowEnrollments] = useState(false);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [name, setName] = useState(seq.name);
  const [triggerType, setTriggerType] = useState(seq.triggerType);
  const [triggerWord, setTriggerWord] = useState(seq.triggerWord ?? "");
  const [active, setActive] = useState(seq.active);
  const [steps, setSteps] = useState<Step[]>(seq.steps);
  const [addingStep, setAddingStep] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [newMsg, setNewMsg] = useState("");
  const [newDelay, setNewDelay] = useState(0);
  const [newIsEmail, setNewIsEmail] = useState(false);

  const needsKeyword = triggerType === "KEYWORD" || triggerType === "COMMENT";
  const dirty = name !== seq.name || triggerType !== seq.triggerType || triggerWord !== (seq.triggerWord ?? "");

  const handleToggle = async (val: boolean) => {
    setToggling(true);
    setActive(val);
    await updateDmSequence(seq.id, { active: val });
    setToggling(false);
    onUpdated({ ...seq, active: val, steps });
  };

  const handleSaveMeta = async () => {
    setSaving(true);
    const res = await updateDmSequence(seq.id, {
      name,
      triggerType,
      triggerWord: needsKeyword ? triggerWord : null,
    });
    if (res.status === 200) onUpdated({ ...(res.data as Sequence), steps });
    setSaving(false);
  };

  const handleAddStep = async () => {
    if (!newIsEmail && !newMsg.trim()) return;
    setAddingStep(true);
    const res = await addSequenceStep(seq.id, {
      message: newIsEmail ? "" : newMsg,
      delayHours: steps.length === 0 ? 0 : newDelay,
      isEmailCapture: newIsEmail,
    });
    if (res.status === 200 && res.data) {
      setSteps((prev) => [...prev, res.data as Step]);
      setNewMsg("");
      setNewDelay(24);
      setNewIsEmail(false);
    }
    setAddingStep(false);
  };

  const handleDeleteStep = async (stepId: string, sequenceId: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== stepId).map((s, i) => ({ ...s, stepOrder: i })));
    await deleteSequenceStep(stepId, sequenceId);
  };

  const loadEnrollments = async () => {
    if (enrollments.length > 0) { setShowEnrollments(!showEnrollments); return; }
    const res = await getSequenceEnrollments(seq.id);
    if (res.status === 200) setEnrollments(res.data as Enrollment[]);
    setShowEnrollments(true);
  };

  const triggerLabel = TRIGGER_OPTIONS.find((t) => t.value === triggerType)?.label ?? triggerType;

  return (
    <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-x-3 flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded((e) => !e)}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center flex-shrink-0">
            <Workflow size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{name}</p>
            <div className="flex items-center gap-x-3 mt-0.5 flex-wrap">
              <span className="text-xs text-[#9B9CA0]">{triggerLabel}{seq.triggerWord ? ` · "${seq.triggerWord}"` : ""}</span>
              <span className="text-xs text-[#9B9CA0]">{steps.length} step{steps.length !== 1 ? "s" : ""}</span>
              {seq.enrollCount > 0 && (
                <span className="text-xs text-green-400">{seq.enrollCount} enrolled</span>
              )}
            </div>
          </div>
          {expanded ? <ChevronUp size={16} className="text-[#9B9CA0] flex-shrink-0" /> : <ChevronDown size={16} className="text-[#9B9CA0] flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-x-3 ml-3 flex-shrink-0">
          <Toggle checked={active} onChange={handleToggle} />
          <button onClick={() => { if (confirm(`Delete "${name}"?`)) { deleteDmSequence(seq.id); onDeleted(seq.id); } }} className="p-1.5 rounded-lg text-[#9B9CA0] hover:text-red-400 hover:bg-red-400/10 transition">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-[#545454] p-5 flex flex-col gap-y-5">
          {/* Meta settings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="flex flex-col gap-y-1.5">
              <label className="text-xs text-[#9B9CA0] uppercase tracking-wide font-medium">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-background-80 border-[#545454]" />
            </div>
            <div className="flex flex-col gap-y-1.5">
              <label className="text-xs text-[#9B9CA0] uppercase tracking-wide font-medium">Trigger</label>
              <select
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value)}
                className="bg-background-80 border border-[#545454] rounded-md px-3 py-2 text-sm text-white outline-none"
              >
                {TRIGGER_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {needsKeyword && (
            <div className="flex flex-col gap-y-1.5">
              <label className="text-xs text-[#9B9CA0] uppercase tracking-wide font-medium">Keyword to match</label>
              <Input
                value={triggerWord}
                onChange={(e) => setTriggerWord(e.target.value)}
                placeholder="e.g. FREE, link, price..."
                className="bg-background-80 border-[#545454]"
              />
            </div>
          )}

          {dirty && (
            <Button onClick={handleSaveMeta} disabled={saving} className="self-start bg-gradient-to-br from-[#3352CC] to-[#1C2D70] text-white rounded-full hover:opacity-80 text-sm">
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          )}

          {/* Steps */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Sequence Steps</h3>

            {steps.length === 0 ? (
              <p className="text-[#9B9CA0] text-sm">No steps yet — add your first message below.</p>
            ) : (
              <div className="pl-2">
                {steps.map((step, i) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    index={i}
                    total={steps.length}
                    onDelete={() => handleDeleteStep(step.id, seq.id)}
                    onUpdate={(data) => setSteps((prev) => prev.map((s) => s.id === step.id ? { ...s, ...data } : s))}
                  />
                ))}
              </div>
            )}

            {/* Add step */}
            <div className="mt-3 bg-background-80 rounded-xl border border-dashed border-[#545454] p-4 flex flex-col gap-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#9B9CA0] uppercase tracking-wide">Add Step</p>
                <div className="flex gap-x-2">
                  <button
                    onClick={() => setNewIsEmail(false)}
                    className={`text-xs px-3 py-1 rounded-full border transition ${!newIsEmail ? "bg-blue-500/20 border-blue-500/50 text-blue-400" : "border-[#545454] text-[#9B9CA0]"}`}
                  >
                    Message
                  </button>
                  <button
                    onClick={() => setNewIsEmail(true)}
                    className={`text-xs px-3 py-1 rounded-full border transition ${newIsEmail ? "bg-purple-500/20 border-purple-500/50 text-purple-400" : "border-[#545454] text-[#9B9CA0]"}`}
                  >
                    <Mail size={10} className="inline mr-1" />Email Capture
                  </button>
                </div>
              </div>

              {steps.length > 0 && (
                <div className="flex items-center gap-x-2">
                  <Clock size={12} className="text-[#9B9CA0]" />
                  <select
                    value={newDelay}
                    onChange={(e) => setNewDelay(Number(e.target.value))}
                    className="bg-[#1D1D1D] border border-[#545454] rounded-md text-xs text-white px-2 py-1 outline-none"
                  >
                    {DELAY_OPTIONS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {!newIsEmail && (
                <textarea
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  rows={2}
                  placeholder={steps.length === 0 ? "Welcome message (sent immediately)..." : "Follow-up message..."}
                  className="w-full bg-[#1D1D1D] border border-[#545454] rounded-md px-3 py-2 text-sm text-white resize-none outline-none focus:border-blue-500"
                />
              )}

              <Button
                onClick={handleAddStep}
                disabled={addingStep || (!newIsEmail && !newMsg.trim())}
                className="self-start bg-gradient-to-br from-[#3352CC] to-[#1C2D70] text-white rounded-full text-sm hover:opacity-80"
              >
                <Plus size={13} className="mr-1" />
                {addingStep ? "Adding..." : "Add Step"}
              </Button>
            </div>
          </div>

          {/* Enrollments */}
          {seq.enrollCount > 0 && (
            <div>
              <button
                onClick={loadEnrollments}
                className="flex items-center gap-x-2 text-sm text-[#9B9CA0] hover:text-white transition"
              >
                <Users size={14} />
                {showEnrollments ? "Hide" : "View"} contacts ({seq.enrollCount})
              </button>

              {showEnrollments && enrollments.length > 0 && (
                <div className="mt-3 rounded-xl border border-[#545454] overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-background-80 text-[#9B9CA0]">
                      <tr>
                        <th className="text-left px-4 py-2">IG User ID</th>
                        <th className="text-left px-4 py-2">Step</th>
                        <th className="text-left px-4 py-2">Email</th>
                        <th className="text-left px-4 py-2">Status</th>
                        <th className="text-left px-4 py-2">Enrolled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrollments.map((e) => (
                        <tr key={e.id} className="border-t border-[#545454]/50">
                          <td className="px-4 py-2 text-white font-mono">{e.contactIgId.slice(0, 10)}…</td>
                          <td className="px-4 py-2 text-[#9B9CA0]">{e.nextStepOrder + 1}</td>
                          <td className="px-4 py-2 text-green-400">{e.capturedEmail ?? "—"}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded-full border text-xs ${e.completed ? "bg-green-400/10 border-green-400/30 text-green-400" : "bg-yellow-400/10 border-yellow-400/30 text-yellow-400"}`}>
                              {e.completed ? "done" : "active"}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-[#9B9CA0]">{format(new Date(e.enrolledAt), "MMM d")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DmSequencesPage() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTrigger, setNewTrigger] = useState("FOLLOW");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getDmSequences().then((res) => {
      if (res.status === 200) setSequences(res.data as Sequence[]);
      setLoading(false);
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const res = await createDmSequence(newName.trim(), newTrigger);
    if (res.status === 200) {
      setSequences((prev) => [res.data as Sequence, ...prev]);
      setNewName("");
      setShowCreate(false);
    }
    setCreating(false);
  };

  const activeCount = sequences.filter((s) => s.active).length;
  const totalEnrolled = sequences.reduce((sum, s) => sum + s.enrollCount, 0);

  return (
    <div className="flex flex-col gap-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-y-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Workflow size={22} className="text-blue-400" />
            DM Sequences
          </h1>
          <p className="text-[#9B9CA0] text-sm mt-1">
            Multi-step automated DM flows triggered by follows, keywords, story replies, and mentions
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-gradient-to-br from-[#3352CC] to-[#1C2D70] text-white rounded-full hover:opacity-80"
        >
          <Plus size={16} className="mr-2" />
          New Sequence
        </Button>
      </div>

      {/* Stats */}
      {sequences.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-4 flex items-center gap-x-3">
            <div className="p-2.5 rounded-xl bg-blue-400/10"><Workflow size={16} className="text-blue-400" /></div>
            <div><p className="text-[#9B9CA0] text-xs">Total Sequences</p><p className="text-xl font-bold">{sequences.length}</p></div>
          </div>
          <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-4 flex items-center gap-x-3">
            <div className="p-2.5 rounded-xl bg-green-400/10"><Zap size={16} className="text-green-400" /></div>
            <div><p className="text-[#9B9CA0] text-xs">Active</p><p className="text-xl font-bold">{activeCount}</p></div>
          </div>
          <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-4 flex items-center gap-x-3">
            <div className="p-2.5 rounded-xl bg-purple-400/10"><Users size={16} className="text-purple-400" /></div>
            <div><p className="text-[#9B9CA0] text-xs">Total Enrolled</p><p className="text-xl font-bold">{totalEnrolled}</p></div>
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="bg-[#1D1D1D] rounded-xl border border-[#545454]/60 p-4 flex gap-x-3">
        <div className="p-2 rounded-lg bg-blue-500/10 flex-shrink-0 self-start mt-0.5">
          <Workflow size={14} className="text-blue-400" />
        </div>
        <div className="text-sm text-[#9B9CA0] space-y-1">
          <p className="text-white font-medium">How sequences work</p>
          <p>When a trigger fires (new follower, keyword in DM, etc.), the contact is enrolled and receives your messages in order. Set delays between steps — from immediate to days later. Add an <span className="text-purple-400">Email Capture</span> step to collect their email before delivering content.</p>
          <p className="text-xs">The cron at <code className="bg-[#2a2a2a] px-1 rounded">/api/cron</code> delivers delayed steps — make sure it runs every 5 minutes.</p>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-[#1D1D1D] rounded-xl border border-blue-500/30 p-5 flex flex-col gap-y-3">
          <p className="font-semibold">Create New Sequence</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. New follower welcome series"
              className="bg-background-80 border-[#545454]"
              required
              autoFocus
            />
            <select
              value={newTrigger}
              onChange={(e) => setNewTrigger(e.target.value)}
              className="bg-background-80 border border-[#545454] rounded-md px-3 py-2 text-sm text-white outline-none"
            >
              {TRIGGER_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label} — {t.description}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-x-2">
            <Button type="submit" disabled={creating} className="bg-gradient-to-br from-[#3352CC] to-[#1C2D70] text-white rounded-full hover:opacity-80">
              {creating ? "Creating..." : "Create"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)} className="text-[#9B9CA0]">Cancel</Button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-y-3">
          {[0, 1].map((i) => <div key={i} className="bg-[#1D1D1D] rounded-xl border border-[#545454] h-20 animate-pulse" />)}
        </div>
      ) : sequences.length === 0 ? (
        <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-16 text-center flex flex-col items-center gap-y-3">
          <Workflow size={44} className="text-[#545454]" />
          <p className="font-semibold">No sequences yet</p>
          <p className="text-[#9B9CA0] text-sm max-w-sm">Create a sequence to start automatically nurturing contacts with multi-step DM flows.</p>
          <Button onClick={() => setShowCreate(true)} className="mt-2 bg-gradient-to-br from-[#3352CC] to-[#1C2D70] text-white rounded-full hover:opacity-80">
            <Plus size={15} className="mr-2" /> Create First Sequence
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-y-3">
          {sequences.map((seq) => (
            <SequenceCard
              key={seq.id}
              seq={seq}
              onUpdated={(updated) => setSequences((prev) => prev.map((s) => s.id === updated.id ? updated : s))}
              onDeleted={(id) => setSequences((prev) => prev.filter((s) => s.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
