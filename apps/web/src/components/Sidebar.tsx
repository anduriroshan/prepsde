"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/",         label: "Home",     icon: "⌂" },
  { href: "/dsa",      label: "DSA",      icon: "</>" },
  { href: "/reflect",  label: "Reflect",  icon: "✎" },
  { href: "/progress", label: "Progress", icon: "▦" },
  { href: "/profile",  label: "Profile",  icon: "◯" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-[#1a1a1a] border-r border-[rgba(255,255,255,0.06)] flex flex-col py-6 px-4">
      <div className="mb-8 px-2">
        <p className="text-[#9a9a9a] text-[11px] font-medium tracking-widest uppercase mb-1">PrepSDE</p>
        <p className="text-[#f0f0f0] text-[20px] font-bold">The Grind</p>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-card text-[14px] font-medium transition-colors ${
                active
                  ? "bg-[rgba(99,134,136,0.12)] text-[#638688]"
                  : "text-[#9a9a9a] hover:text-[#f0f0f0] hover:bg-[#242424]"
              }`}
            >
              <span className="text-[16px]">{item.icon}</span>
              {item.label}
              {active && <div className="ml-auto w-1 h-4 rounded-full bg-[#638688]" />}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[rgba(255,255,255,0.06)] pt-4 px-2">
        <p className="text-[#555555] text-[11px] font-mono">v1.0.0</p>
      </div>
    </aside>
  );
}
