import Image from "next/image";
import React from "react";

type Props = {
  children: React.ReactNode;
};

function Layout({ children }: Props) {
  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-900 via-blue-950 to-[#0a0a0a]">
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_60%,transparent_100%)]" />
        {/* Logo */}
        <div className="relative z-10">
          <Image src="/Insta flo-logo.png" alt="Insta Flo" width={240} height={80} className="object-contain" />
        </div>
        {/* Tagline */}
        <div className="relative z-10">
          <p className="text-3xl font-bold text-white leading-snug">
            Schedule, automate,<br />and grow — all in one place.
          </p>
          <p className="text-blue-300 mt-3 text-sm">
            Instagram · Facebook · Telegram
          </p>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex flex-1 justify-center items-center bg-[#0a0a0a]/60 backdrop-blur-sm">
        {children}
      </div>
    </div>
  );
}

export default Layout;
