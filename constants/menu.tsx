import {
  AutomationDuoToneWhite,
  HomeDuoToneWhite,
  RocketDuoToneWhite,
  SettingsDuoToneWhite,
} from "@/icons";
import { BarChart2, Briefcase, CalendarRange, Link2, MessageSquareMore, Sparkles, Workflow, Zap } from "lucide-react";
import { v4 as uuid } from "uuid";

type SIDEBAR_MENU_TYPE = {
  id: string;
  label: string;   // URL path segment
  title: string;   // Display name in sidebar
  icon: React.ReactNode;
  section?: string; // optional group header
};

export const SIDEBAR_MENU: SIDEBAR_MENU_TYPE[] = [
  // ── Overview ──────────────────────────────────────────────────────────────
  {
    id: uuid(),
    label: "home",
    title: "Dashboard",
    icon: <HomeDuoToneWhite />,
    section: "Overview",
  },
  {
    id: uuid(),
    label: "analytics",
    title: "Analytics",
    icon: <BarChart2 size={20} className="text-white" />,
  },

  // ── Automations ───────────────────────────────────────────────────────────
  {
    id: uuid(),
    label: "automation",
    title: "DM Automation",
    icon: <AutomationDuoToneWhite />,
    section: "Automations",
  },
  {
    id: uuid(),
    label: "comment-automation",
    title: "Comment Replies",
    icon: <MessageSquareMore size={20} className="text-white" />,
  },
  {
    id: uuid(),
    label: "dm-sequences",
    title: "DM Sequences",
    icon: <Workflow size={20} className="text-white" />,
  },

  // ── Publishing ────────────────────────────────────────────────────────────
  {
    id: uuid(),
    label: "workspace-scheduler",
    title: "Scheduler",
    icon: <CalendarRange size={20} className="text-white" />,
    section: "Publishing",
  },
  {
    id: uuid(),
    label: "workspaces",
    title: "Workspaces",
    icon: <Briefcase size={20} className="text-white" />,
  },

  // ── Tools ─────────────────────────────────────────────────────────────────
  {
    id: uuid(),
    label: "ai-caption",
    title: "AI Captions",
    icon: <Sparkles size={20} className="text-white" />,
    section: "Tools",
  },
  {
    id: uuid(),
    label: "link-tracker",
    title: "Link Tracker",
    icon: <Link2 size={20} className="text-white" />,
  },

  // ── Account ───────────────────────────────────────────────────────────────
  {
    id: uuid(),
    label: "integrations",
    title: "Integrations",
    icon: <RocketDuoToneWhite />,
    section: "Account",
  },
  {
    id: uuid(),
    label: "settings",
    title: "Settings",
    icon: <SettingsDuoToneWhite />,
  },
];
