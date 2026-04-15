"use client";

import { updateListenerEmailCapture } from "@/actions/automation";
import { Separator } from "@/components/ui/separator";
import { useQueryAutomations } from "@/hooks/user-queries";
import { PlaneBlue, SmartAi, Warning } from "@/icons";
import { Mail } from "lucide-react";
import { useState } from "react";
import PostButton from "../post";

type Props = {
  id: string;
};

function ThenNode({ id }: Props) {
  const { data } = useQueryAutomations(id);
  const commentTrigger = data?.data?.trigger?.find((t) => t.type === "COMMENT");
  const listener = data?.data?.listener;

  const [requireEmail, setRequireEmail] = useState(listener?.requireEmail ?? false);
  const [emailPrompt, setEmailPrompt] = useState(listener?.emailPrompt ?? "");
  const [saving, setSaving] = useState(false);

  if (!listener) return <></>;

  const handleToggleEmail = async (val: boolean) => {
    setRequireEmail(val);
    setSaving(true);
    await updateListenerEmailCapture(id, val, emailPrompt);
    setSaving(false);
  };

  const handleSaveEmailPrompt = async () => {
    setSaving(true);
    await updateListenerEmailCapture(id, requireEmail, emailPrompt);
    setSaving(false);
  };

  return (
    <div className="w-full lg:w-10/12 relative xl:w-6/12 p-5 rounded-xl flex flex-col bg-[#1D1D1D] gap-y-3">
      <div className="absolute h-20 left-1/2 bottom-full flex flex-col items-center z-50">
        <span className="h-[9px] w-[9px] bg-connector/10 rounded-full" />
        <Separator orientation="vertical" className="bottom-full flex-1 border-[1px] border-connector/10" />
        <span className="h-[9px] w-[9px] bg-connector/10 rounded-full" />
      </div>

      <div className="flex gap-x-2">
        <Warning />
        Then...
      </div>

      <div className="bg-background-80 p-3 rounded-xl flex flex-col gap-y-2">
        <div className="flex gap-x-2 items-center">
          {listener.listener === "MESSAGE" ? <PlaneBlue /> : <SmartAi />}
          <p className="text-lg">
            {listener.listener === "MESSAGE" ? "Send The User Message" : "Let Smart AI Take Over"}
          </p>
        </div>
        <p className="font-light text-text-secondary">{listener.prompt}</p>
      </div>

      {/* Email capture toggle */}
      {listener.listener === "MESSAGE" && (
        <div className="bg-background-80 p-3 rounded-xl flex flex-col gap-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-x-2">
              <Mail size={14} className="text-purple-400" />
              <p className="text-sm font-medium">Require email before delivering</p>
            </div>
            <button
              onClick={() => handleToggleEmail(!requireEmail)}
              disabled={saving}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${
                requireEmail ? "bg-purple-500" : "bg-[#545454]"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${requireEmail ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>
          {requireEmail && (
            <div className="flex flex-col gap-y-1.5 mt-1">
              <input
                value={emailPrompt}
                onChange={(e) => setEmailPrompt(e.target.value)}
                placeholder="Reply with your email to receive this:"
                className="w-full bg-[#1D1D1D] border border-[#545454] rounded-md px-3 py-1.5 text-sm text-white outline-none focus:border-purple-500"
              />
              <button
                onClick={handleSaveEmailPrompt}
                disabled={saving}
                className="self-start text-xs text-purple-400 hover:text-purple-300 transition"
              >
                {saving ? "Saving…" : "Save prompt"}
              </button>
              <p className="text-xs text-[#9B9CA0]">
                User will be asked for their email first. After they reply with a valid email, the message above is sent. Captured emails appear in Analytics.
              </p>
            </div>
          )}
        </div>
      )}

      {data?.data?.posts.length === 0 && commentTrigger && <PostButton id={id} />}
    </div>
  );
}

export default ThenNode;
