import type { ReactNode } from "react";
import { studyNavItems, type StudyRouteKey } from "./studyNav";

type StudyShellProps = {
  activePage: StudyRouteKey;
  children: ReactNode;
  showMobileNav?: boolean;
  className?: string;
};

function isActive(itemKey: StudyRouteKey, activePage: StudyRouteKey) {
  if (activePage === "adaptive-review" && itemKey === "adaptive-practice") {
    return true;
  }
  return itemKey === activePage;
}

function NavButton({
  label,
  icon,
  href,
  active
}: {
  label: string;
  icon: string;
  href: string;
  active: boolean;
}) {
  return (
    <a
      className={`flex min-w-0 items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all duration-300 ease-in-out ${
        active
          ? "bg-secondary text-white shadow-lg shadow-secondary/20"
          : "text-slate-500 hover:translate-x-1 hover:bg-slate-50"
      }`}
      href={href}
    >
      <span
        aria-hidden="true"
        className="material-symbols-outlined shrink-0"
        style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        {icon}
      </span>
      <span className="min-w-0 truncate text-sm">{label}</span>
    </a>
  );
}

export default function StudyShell({ activePage, children, showMobileNav = true, className = "" }: StudyShellProps) {
  const sidebarItems = studyNavItems.filter((item) => item.key !== "adaptive-review");
  const mobileItems = studyNavItems.filter((item) => item.mobile !== false && item.key !== "adaptive-review");

  return (
    <div className={`bg-surface font-body text-on-surface ${className}`}>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col gap-2 bg-white p-4 shadow-[4px_0_24px_rgba(0,32,69,0.04)] md:flex">
        <div className="mb-8 px-2">
          <span className="font-headline text-lg font-black text-secondary">Lakshay AI</span>
        </div>

        <div className="mb-6 flex items-center gap-3 rounded-xl bg-[#F7FAFC] p-3">
          <img
            alt="Student profile avatar"
            className="h-10 w-10 rounded-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtNnjjb4Lg1R42BcLRl1dCfzYv4X6Wd0Emyz6F1cyiIcFIB1z_ciCFqf1tgPNuyaP2gMuQSD09UD0z-Hnzg2nsmMamDMlkAeOoUVB3UYAjY22IzDQc3W-uxnjf5TdvaIedD9jZPVhcZBiBEX4D83Dyt2Frl53C2BUgFKoUXFWRlwYZyrsNoxagCVPDvRrjFFNxCAOHFUfN6u_bvXs3OyVYzAIlkaLfocXgTTBMhzMpiQ_0g15XImONTUVFTQyMsEL_X58ezIcGjUlV"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-primary">JEE Main 2026</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Target Exam</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {sidebarItems.map((item) => (
            <NavButton key={item.key} label={item.label} icon={item.icon} href={item.href} active={isActive(item.key, activePage)} />
          ))}
        </nav>

        <div className="mt-auto space-y-1 border-t border-[#EBEEF0] pt-4">
          <a
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.01] active:scale-95"
            href="#/doubt-solver"
          >
            <span className="material-symbols-outlined text-sm">smart_toy</span>
            Ask AI Doubt
          </a>
          <a
            className="flex items-center gap-3 rounded-xl px-4 py-2 text-slate-500 transition-all duration-300 ease-in-out hover:bg-slate-50"
            href="#"
          >
            <span className="material-symbols-outlined text-xl">settings</span>
            <span className="text-sm">Settings</span>
          </a>
          <a
            className="flex items-center gap-3 rounded-xl px-4 py-2 text-slate-500 transition-all duration-300 ease-in-out hover:bg-slate-50"
            href="#"
          >
            <span className="material-symbols-outlined text-xl">help</span>
            <span className="text-sm">Help</span>
          </a>
        </div>
      </aside>

      {children}

      {showMobileNav ? (
        <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around rounded-t-[24px] border-t border-[#EBEEF0]/50 bg-white/95 px-3 pb-5 pt-3 backdrop-blur-xl shadow-[0_-8px_30px_rgba(0,0,0,0.1)] md:hidden">
          {mobileItems.map((item) => {
            const active = isActive(item.key, activePage);
            return (
              <a
                key={item.key}
                className={`flex min-w-0 flex-col items-center justify-center transition-transform duration-200 active:scale-90 ${
                  active ? "text-secondary" : "text-slate-400"
                }`}
                href={item.href}
              >
                <span className="material-symbols-outlined" style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                  {item.icon}
                </span>
                <span className="mt-1 max-w-[56px] truncate text-center text-[9px] font-bold uppercase tracking-widest">
                  {item.label}
                </span>
              </a>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
