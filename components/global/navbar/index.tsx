"use client";

import { PAGE_BREAD_CRUMBS } from "@/constants/pages";
import { usePath } from "@/hooks/user-nav";
import { HelpDuoToneWhite } from "@/icons";
import { LogoSmall } from "@/svgs/logo-small";
import { Menu } from "lucide-react";
import MainBreadCrumbs from "../bread-crumb/main-bread-crumbs";
import ClerkAuthState from "../clerk-auth-state";
import CreateAutomation from "../create-automation";
import Sheet from "../sheet";
import Items from "../sidebar/items";
import UpgradeCard from "../sidebar/upgrade";
import SubscriptionPlan from "../subscription-plan";
import Notification from "./notification";
import Search from "./search";

type Props = {
  slug: string;
};

function NavBar({ slug }: Props) {
  const { page } = usePath();
  const currentPage = PAGE_BREAD_CRUMBS.includes(page) || page == slug;

  return (
    currentPage && (
      <div className="flex flex-col">
        <div className="flex gap-x-3 lg:gap-x-5 justify-end">
          <span className="lg:hidden flex items-center flex-1 gap-x-2">
            <Sheet trigger={<Menu />} className="lg:hidden" side="left">
              <div className="flex flex-col w-full h-full bg-[#0a0a0a]">
                {/* Logo */}
                <div className="flex items-center gap-x-2.5 px-5 py-5 border-b border-[#181818]">
                  <LogoSmall />
                  <span className="text-white font-semibold text-sm tracking-wide">InstaFlow</span>
                </div>

                {/* Nav items */}
                <div className="flex-1 overflow-y-auto py-2 px-2">
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
            </Sheet>
          </span>
          <Search />
          <CreateAutomation />
          <Notification />
        </div>
        <MainBreadCrumbs page={page === slug ? "Home" : page} slug={slug} />
      </div>
    )
  );
}

export default NavBar;
