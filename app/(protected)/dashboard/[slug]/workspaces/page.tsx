"use client";

import {
  addInstagramAccount,
  addTelegramAccount,
  createWorkspace,
  deleteWorkspace,
  getWorkspaces,
  removeAccount,
} from "@/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Instagram,
  Plus,
  Send,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useState } from "react";

type Account = {
  id: string;
  platform: "INSTAGRAM" | "TELEGRAM";
  name: string;
  username: string | null;
  avatar: string | null;
  accountId: string;
  expiresAt: string | null;
};

type Workspace = {
  id: string;
  name: string;
  description: string | null;
  accounts: Account[];
};

const WORKSPACE_GRADIENTS = [
  "from-[#3352CC] to-[#1C2D70]",
  "from-purple-600 to-indigo-700",
  "from-pink-600 to-rose-700",
  "from-emerald-600 to-teal-700",
  "from-orange-600 to-amber-700",
];

function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return null;
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days > 30) return null;
  if (days <= 0)
    return (
      <span className="flex items-center gap-x-1 text-xs bg-red-400/10 border border-red-400/30 text-red-400 px-2 py-0.5 rounded-full">
        <AlertTriangle size={10} /> Expired
      </span>
    );
  return (
    <span className="flex items-center gap-x-1 text-xs bg-orange-400/10 border border-orange-400/30 text-orange-400 px-2 py-0.5 rounded-full">
      <AlertTriangle size={10} /> {days}d left
    </span>
  );
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // New workspace form
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  // Add account form state
  const [addingAccountTo, setAddingAccountTo] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<"INSTAGRAM" | "TELEGRAM">("INSTAGRAM");

  const [igToken, setIgToken] = useState("");
  const [igName, setIgName] = useState("");
  const [tgBotToken, setTgBotToken] = useState("");
  const [tgChannelId, setTgChannelId] = useState("");
  const [tgName, setTgName] = useState("");

  const [addingAccount, setAddingAccount] = useState(false);
  const [accountError, setAccountError] = useState("");

  const fetchWorkspaces = async () => {
    setLoading(true);
    const res = await getWorkspaces();
    if (res.status === 200) setWorkspaces(res.data as Workspace[]);
    setLoading(false);
  };

  useEffect(() => { fetchWorkspaces(); }, []);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    setCreating(true);
    const res = await createWorkspace({ name: newName, description: newDesc });
    if (res.status === 200) {
      setNewName("");
      setNewDesc("");
      setShowNewForm(false);
      await fetchWorkspaces();
    }
    setCreating(false);
  };

  const handleDeleteWorkspace = async (id: string) => {
    if (!confirm("Delete this workspace and all its accounts?")) return;
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    await deleteWorkspace(id);
  };

  const handleAddInstagram = async (workspaceId: string) => {
    if (!igToken) return;
    setAddingAccount(true);
    setAccountError("");

    try {
      const res = await fetch(
        `https://graph.instagram.com/me?fields=user_id,name,username,profile_picture_url&access_token=${igToken}`
      );
      const igData = await res.json();

      if (!igData.user_id) {
        setAccountError("Invalid or expired token. Get a valid token from the Graph API Explorer.");
        setAddingAccount(false);
        return;
      }

      const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days

      const result = await addInstagramAccount(workspaceId, {
        name: igName || igData.name || "Instagram Account",
        token: igToken,
        accountId: igData.user_id,
        username: igData.username,
        avatar: igData.profile_picture_url,
        expiresAt,
      });

      if (result.status === 200) {
        setIgToken("");
        setIgName("");
        setAddingAccountTo(null);
        await fetchWorkspaces();
      } else {
        setAccountError(result.data as string);
      }
    } catch (err: any) {
      setAccountError(err.message);
    }
    setAddingAccount(false);
  };

  const handleAddTelegram = async (workspaceId: string) => {
    if (!tgBotToken || !tgChannelId) return;
    setAddingAccount(true);
    setAccountError("");

    const result = await addTelegramAccount(workspaceId, {
      name: tgName,
      botToken: tgBotToken,
      channelId: tgChannelId,
    });

    if (result.status === 200) {
      setTgBotToken("");
      setTgChannelId("");
      setTgName("");
      setAddingAccountTo(null);
      await fetchWorkspaces();
    } else {
      setAccountError(result.data as string);
    }
    setAddingAccount(false);
  };

  const handleRemoveAccount = async (workspaceId: string, accountId: string) => {
    setWorkspaces((prev) =>
      prev.map((w) =>
        w.id === workspaceId
          ? { ...w, accounts: w.accounts.filter((a) => a.id !== accountId) }
          : w
      )
    );
    await removeAccount(accountId);
  };

  const igCount = (ws: Workspace) => ws.accounts.filter((a) => a.platform === "INSTAGRAM").length;
  const tgCount = (ws: Workspace) => ws.accounts.filter((a) => a.platform === "TELEGRAM").length;

  return (
    <div className="flex flex-col gap-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase size={22} className="text-blue-400" />
            Workspaces
          </h1>
          <p className="text-[#9B9CA0] text-sm mt-1">Manage your brands and connected accounts</p>
        </div>
        <Button
          onClick={() => setShowNewForm(!showNewForm)}
          className="bg-gradient-to-br from-[#3352CC] to-[#1C2D70] text-white rounded-full hover:opacity-80"
        >
          <Plus size={16} className="mr-2" />
          New Workspace
        </Button>
      </div>

      {/* New Workspace Form */}
      {showNewForm && (
        <form
          onSubmit={handleCreateWorkspace}
          className="bg-[#1D1D1D] rounded-xl border border-[#3352CC]/50 p-5 flex flex-col gap-y-3"
        >
          <h2 className="font-semibold">Create Workspace</h2>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Workspace name (e.g. AI Atelier)"
            className="bg-background-80 border-[#545454]"
            required
          />
          <Input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="bg-background-80 border-[#545454]"
          />
          <div className="flex gap-x-2">
            <Button
              type="submit"
              disabled={creating}
              className="bg-gradient-to-br from-[#3352CC] to-[#1C2D70] text-white rounded-full hover:opacity-80"
            >
              {creating ? "Creating..." : "Create"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowNewForm(false)} className="text-[#9B9CA0]">
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Workspace List */}
      {loading ? (
        <div className="flex flex-col gap-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-5 animate-pulse h-20" />
          ))}
        </div>
      ) : workspaces.length === 0 ? (
        <div className="bg-[#1D1D1D] rounded-xl border border-[#545454] p-16 text-center flex flex-col items-center gap-y-3">
          <Briefcase size={44} className="text-[#545454]" />
          <p className="font-semibold">No workspaces yet</p>
          <p className="text-[#9B9CA0] text-sm">Create a workspace to start managing your brand accounts</p>
        </div>
      ) : (
        workspaces.map((workspace, idx) => {
          const gradient = WORKSPACE_GRADIENTS[idx % WORKSPACE_GRADIENTS.length];
          const isExpanded = expanded === workspace.id;
          const hasExpiry = workspace.accounts.some(
            (a) => a.expiresAt && Math.ceil((new Date(a.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 15
          );

          return (
            <div key={workspace.id} className="bg-[#1D1D1D] rounded-xl border border-[#545454] overflow-hidden">
              {/* Workspace Header */}
              <div className="flex items-center justify-between p-5">
                <div
                  className="flex items-center gap-x-3 cursor-pointer flex-1 min-w-0"
                  onClick={() => setExpanded(isExpanded ? null : workspace.id)}
                >
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xl flex-shrink-0`}
                  >
                    {workspace.name[0].toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-x-2 flex-wrap">
                      <h2 className="font-semibold">{workspace.name}</h2>
                      {hasExpiry && (
                        <span className="text-xs text-orange-400 flex items-center gap-x-1">
                          <AlertTriangle size={11} /> Token expiring
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-x-3 mt-0.5">
                      {workspace.description && (
                        <p className="text-[#9B9CA0] text-xs truncate max-w-[200px]">{workspace.description}</p>
                      )}
                      <div className="flex items-center gap-x-2">
                        {igCount(workspace) > 0 && (
                          <span className="flex items-center gap-x-1 text-xs text-pink-400">
                            <Instagram size={11} /> {igCount(workspace)}
                          </span>
                        )}
                        {tgCount(workspace) > 0 && (
                          <span className="flex items-center gap-x-1 text-xs text-blue-400">
                            <Send size={11} /> {tgCount(workspace)}
                          </span>
                        )}
                        {workspace.accounts.length === 0 && (
                          <span className="text-xs text-[#545454]">No accounts</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded ? (
                    <ChevronUp size={16} className="text-[#9B9CA0] flex-shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-[#9B9CA0] flex-shrink-0" />
                  )}
                </div>

                <button
                  onClick={() => handleDeleteWorkspace(workspace.id)}
                  className="ml-2 p-1.5 rounded-lg text-[#9B9CA0] hover:text-red-400 hover:bg-red-400/10 transition flex-shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Expanded Section */}
              {isExpanded && (
                <div className="border-t border-[#545454] p-5 flex flex-col gap-y-4">
                  {/* Accounts */}
                  <div className="flex flex-col gap-y-2">
                    {workspace.accounts.length === 0 ? (
                      <p className="text-[#9B9CA0] text-sm">No accounts connected yet</p>
                    ) : (
                      workspace.accounts.map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center justify-between bg-background-80 rounded-xl px-4 py-3"
                        >
                          <div className="flex items-center gap-x-3">
                            {account.avatar ? (
                              <img
                                src={account.avatar}
                                alt={account.name}
                                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  account.platform === "INSTAGRAM"
                                    ? "bg-pink-500/20"
                                    : "bg-blue-500/20"
                                }`}
                              >
                                {account.platform === "INSTAGRAM" ? (
                                  <Instagram size={16} className="text-pink-400" />
                                ) : (
                                  <Send size={16} className="text-blue-400" />
                                )}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-x-2 flex-wrap">
                                <p className="text-sm font-medium">{account.name}</p>
                                {account.username && (
                                  <span className="text-xs text-[#9B9CA0]">@{account.username}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-x-2 mt-0.5">
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                                    account.platform === "INSTAGRAM"
                                      ? "bg-pink-500/10 text-pink-400"
                                      : "bg-blue-500/10 text-blue-400"
                                  }`}
                                >
                                  {account.platform}
                                </span>
                                {account.platform === "INSTAGRAM" && (
                                  account.expiresAt && Math.ceil((new Date(account.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) > 30 ? (
                                    <span className="flex items-center gap-x-1 text-xs text-green-400">
                                      <CheckCircle2 size={10} /> Active
                                    </span>
                                  ) : (
                                    <ExpiryBadge expiresAt={account.expiresAt} />
                                  )
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemoveAccount(workspace.id, account.id)}
                            className="p-1.5 rounded-lg text-[#9B9CA0] hover:text-red-400 hover:bg-red-400/10 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Account */}
                  {addingAccountTo === workspace.id ? (
                    <div className="flex flex-col gap-y-3 bg-background-80 rounded-xl p-4 border border-[#545454]">
                      <p className="text-sm font-medium">Connect Account</p>

                      {/* Platform Toggle */}
                      <div className="flex gap-x-2">
                        <button
                          onClick={() => setAccountType("INSTAGRAM")}
                          className={`flex items-center gap-x-2 px-4 py-2 rounded-full text-sm transition border ${
                            accountType === "INSTAGRAM"
                              ? "bg-pink-500/20 border-pink-500/50 text-pink-400"
                              : "border-[#545454] text-[#9B9CA0] hover:border-white/40"
                          }`}
                        >
                          <Instagram size={14} /> Instagram
                        </button>
                        <button
                          onClick={() => setAccountType("TELEGRAM")}
                          className={`flex items-center gap-x-2 px-4 py-2 rounded-full text-sm transition border ${
                            accountType === "TELEGRAM"
                              ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                              : "border-[#545454] text-[#9B9CA0] hover:border-white/40"
                          }`}
                        >
                          <Send size={14} /> Telegram
                        </button>
                      </div>

                      {accountType === "INSTAGRAM" ? (
                        <>
                          <Input
                            value={igName}
                            onChange={(e) => setIgName(e.target.value)}
                            placeholder="Display name (optional)"
                            className="bg-[#1D1D1D] border-[#545454]"
                          />
                          <Input
                            value={igToken}
                            onChange={(e) => setIgToken(e.target.value)}
                            placeholder="Instagram access token"
                            className="bg-[#1D1D1D] border-[#545454]"
                          />
                          <p className="text-xs text-[#9B9CA0]">
                            Get a long-lived token from{" "}
                            <span className="text-blue-400">Facebook Developer App → Tools → Graph API Explorer</span>
                            {" "}with <code className="text-xs bg-[#2a2a2a] px-1 rounded">instagram_business_basic</code> permission.
                          </p>
                        </>
                      ) : (
                        <>
                          <Input
                            value={tgName}
                            onChange={(e) => setTgName(e.target.value)}
                            placeholder="Channel display name"
                            className="bg-[#1D1D1D] border-[#545454]"
                          />
                          <Input
                            value={tgBotToken}
                            onChange={(e) => setTgBotToken(e.target.value)}
                            placeholder="Bot token (from @BotFather)"
                            className="bg-[#1D1D1D] border-[#545454]"
                          />
                          <Input
                            value={tgChannelId}
                            onChange={(e) => setTgChannelId(e.target.value)}
                            placeholder="Channel ID (e.g. @mychannel or -1001234567890)"
                            className="bg-[#1D1D1D] border-[#545454]"
                          />
                          <p className="text-xs text-[#9B9CA0]">
                            The bot must be an admin of the channel before connecting.
                          </p>
                        </>
                      )}

                      {accountError && (
                        <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                          {accountError}
                        </p>
                      )}

                      <div className="flex gap-x-2">
                        <Button
                          onClick={() =>
                            accountType === "INSTAGRAM"
                              ? handleAddInstagram(workspace.id)
                              : handleAddTelegram(workspace.id)
                          }
                          disabled={addingAccount}
                          className="bg-gradient-to-br from-[#3352CC] to-[#1C2D70] text-white rounded-full hover:opacity-80"
                        >
                          {addingAccount ? "Connecting..." : "Connect"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => { setAddingAccountTo(null); setAccountError(""); }}
                          className="text-[#9B9CA0]"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingAccountTo(workspace.id); setAccountError(""); }}
                      className="flex items-center gap-x-2 text-sm text-[#9B9CA0] hover:text-white border border-dashed border-[#545454] rounded-xl px-4 py-3 transition hover:border-white/40"
                    >
                      <Plus size={14} /> Add account
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
