import { PAGE_ICONS, PAGE_TITLES } from "@/constants/pages";
import { SIDEBAR_MENU } from "@/constants/menu";
import React from "react";

type Props = {
  page: string;
  slug: string;
};

function MainBreadCrumbs({ page, slug }: Props) {
  const isHome = page === "Home";

  // Look up the display title — from PAGE_TITLES, fallback to capitalising the slug
  const menuItem = SIDEBAR_MENU.find((item) => item.label === page.toLowerCase());
  const displayTitle = isHome
    ? "Dashboard"
    : menuItem?.title ?? PAGE_TITLES[page.toLowerCase()] ?? page;

  return (
    <div className="flex flex-col items-start">
      {isHome && (
        <div className="flex justify-center w-full">
          <div className="radial--gradient w-4/12 py-5 lg:py-10 flex flex-col items-center">
            <p className="text-text-secondary text-lg">Welcome back</p>
            <h2 className="capitalize text-4xl font-medium">{slug}!</h2>
          </div>
        </div>
      )}
      <span className="radial--gradient inline-flex py-5 lg:py-10 pr-16 gap-x-2 items-center">
        {PAGE_ICONS[page.toUpperCase()]}
        <h2 className="font-semibold text-3xl">{displayTitle}</h2>
      </span>
    </div>
  );
}

export default MainBreadCrumbs;
