import { PlaneBlue, SmartAi, TinyInstagram } from "@/icons";
import { v4 } from "uuid";

export type AutomationsTriggerProps = {
  id: string;
  label: string;
  icon: JSX.Element;
  description: string;
  type: "COMMENT" | "DM" | "STORY_REPLY" | "MENTION";
};
export type AutomationTypeProps = {
  id: string;
  label: string;
  icon: JSX.Element;
  description: string;
  type: "SMARTAI" | "MESSAGE";
};

export const AUTOMATION_TRIGGERS: AutomationsTriggerProps[] = [
  {
    id: v4(),
    label: "User comments on my post",
    icon: <TinyInstagram />,
    description: "Select if you want to automate comments on your post",
    type: "COMMENT",
  },
  {
    id: v4(),
    label: "User sends me a dm with a keyword",
    icon: <TinyInstagram />,
    description: "Select if you want to automate DMs on your profile",
    type: "DM",
  },
  {
    id: v4(),
    label: "User replies to my story",
    icon: <TinyInstagram />,
    description: "Select if you want to auto-reply when someone replies to your story",
    type: "STORY_REPLY",
  },
  {
    id: v4(),
    label: "User mentions me in a story",
    icon: <TinyInstagram />,
    description: "Auto-DM when someone tags your account in their story",
    type: "MENTION",
  },
];

export const AUTOMATION_LISTENERS: AutomationTypeProps[] = [
  {
    id: v4(),
    label: "Send the user a message",
    icon: <PlaneBlue />,
    description: "Enter the message that you want to send the user.",
    type: "MESSAGE",
  },
  {
    id: v4(),
    label: "Let Smart AI take over",
    icon: <SmartAi />,
    description: "Tell AI about your project. (Upgrade to use this feature)",
    type: "SMARTAI",
  },
];
