"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { NavList } from "./NavList";

/** Mobile hamburger that opens the sidebar as a slide-in drawer. Hidden on md+. */
export function MobileNav({ isAdmin = false, plan = "free" }: { isAdmin?: boolean; plan?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change + lock body scroll while open.
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
          {/* Drawer */}
          <aside className="cf-slide-in relative flex h-full w-72 max-w-[85%] flex-col border-r border-border bg-card shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <Logo href="/" />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavList onNavigate={() => setOpen(false)} isAdmin={isAdmin} plan={plan} />
          </aside>
        </div>
      )}
    </div>
  );
}
