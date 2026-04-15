import {
  AutomationDuoToneBlue,
  ContactsDuoToneBlue,
  HomeDuoToneBlue,
  RocketDuoToneBlue,
  SettingsDuoToneWhite,
} from "@/icons";

export const PAGE_BREAD_CRUMBS: string[] = [
  "contacts",
  "automation",
  "integrations",
  "settings",
  "workspaces",
  "scheduler",
  "workspace-scheduler",
  "analytics",
  "comment-automation",
  "dm-sequences",
  "link-tracker",
  "ai-caption",
];

// Maps URL label → display title (matches SIDEBAR_MENU titles)
export const PAGE_TITLES: Record<string, string> = {
  home: "Dashboard",
  analytics: "Analytics",
  automation: "DM Automation",
  "comment-automation": "Comment Replies",
  "dm-sequences": "DM Sequences",
  "workspace-scheduler": "Scheduler",
  workspaces: "Workspaces",
  "ai-caption": "AI Captions",
  "link-tracker": "Link Tracker",
  integrations: "Integrations",
  settings: "Settings",
  contacts: "Contacts",
  scheduler: "Scheduler",
};

type Props = {
  [page in string]: React.ReactNode;
};

export const PAGE_ICONS: Props = {
  AUTOMATION: <AutomationDuoToneBlue />,
  CONTACTS: <ContactsDuoToneBlue />,
  INTEGRATIONS: <RocketDuoToneBlue />,
  SETTINGS: <SettingsDuoToneWhite />,
  HOME: <HomeDuoToneBlue />,
};

export const PLANS = [
  {
    name: "Free Plan",
    description: "Perfect for getting started",
    price: "$0",
    features: [
      "Boost engagement with target responses",
      "Automate comment replies to enhance audience interaction",
      "Turn followers into customers with targeted messaging",
    ],
    cta: "Get Started",
  },
  {
    name: "Smart AI Plan",
    description: "Advanced features for power users",
    price: "$99",
    features: [
      "All features from Free Plan",
      "AI-powered response generation",
      "Advanced analytics and insights",
      "Priority customer support",
      "Custom branding options",
    ],
    cta: "Upgrade Now",
  },
];
