"use client";

import { usePath } from "@/hooks/user-nav";
import { HelpDuoToneWhite } from "@/icons";
import { LogoSmall } from "@/svgs/logo-small";
import React from "react";
import ClerkAuthState from "../clerk-auth-state";
import SubscriptionPlan from "../subscription-plan";
import Items from "./items";
import UpgradeCard from "./upgrade";

type Props = {
  slug: string;
};

function Sidebar({ slug }: Props) {
  const { page } = usePath();

  return (
    <div className="w-[240px] fixed left-0 lg:flex flex-col hidden bottom-0 top-0 m-3 rounded-2xl overflow-hidden border border-[#222222] bg-[#0a0a0a]">
      {/* Logo */}
      <div className="flex items-center gap-x-2.5 px-5 py-5 border-b border-[#181818]">
        <LogoSmall />
        <span className="text-white font-semibold text-sm tracking-wide">InstaFlow</span>
      </div>

      {/* Nav items — scrollable */}
      <div className="flex-1 overflow-y-auto py-2 px-2 scrollbar-none">
        <Items page={page} slug={slug} />
      </div>

      {/* Bottom section */}
      <div className="border-t border-[#181818] px-3 py-3 flex flex-col gap-y-1">
        <div className="flex items-center gap-x-2.5 rounded-xl px-3 py-2.5 text-[#9B9CA0] hover:text-white hover:bg-[#1D1D1D]/60 transition cursor-pointer">
          <ClerkAuthState />
          <p className="text-sm">Profile</p>
        </div>
        <div className="flex items-center gap-x-2.5 rounded-xl px-3 py-2.5 text-[#9B9CA0] hover:text-white hover:bg-[#1D1D1D]/60 transition cursor-pointer">
          <HelpDuoToneWhite />
          <p className="text-sm">Help</p>
        </div>
      </div>

      {/* Upgrade card */}
      <SubscriptionPlan type="FREE">
        <div className="px-3 pb-3">
          <UpgradeCard />
        </div>
      </SubscriptionPlan>
    </div>
  );
}

export default Sidebar;
