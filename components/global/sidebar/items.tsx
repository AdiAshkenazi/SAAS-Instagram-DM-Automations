import { SIDEBAR_MENU } from "@/constants/menu";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Props = {
  page: string;
  slug: string;
};

function Items({ page, slug }: Props) {
  return (
    <>
      {SIDEBAR_MENU.map((item) => (
        <div key={item.id}>
          {/* Section header */}
          {item.section && (
            <p className="text-[#545454] text-[10px] font-semibold uppercase tracking-widest px-3 pt-4 pb-1">
              {item.section}
            </p>
          )}

          <Link
            href={`/dashboard/${slug}/${item.label === "home" ? "" : item.label}`}
            className={cn(
              "flex items-center gap-x-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors",
              (page === item.label || (page === slug && item.label === "home"))
                ? "bg-[#1D1D1D] text-white"
                : "text-[#9B9CA0] hover:text-white hover:bg-[#1D1D1D]/60"
            )}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            <span>{item.title}</span>
          </Link>
        </div>
      ))}
    </>
  );
}

export default Items;
