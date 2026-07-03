import { Logo } from "@/components/Logo";
import { NavList } from "./NavList";

/** Desktop sidebar (hidden on mobile — see MobileNav for the drawer). */
export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Logo href="/dashboard" />
      </div>
      <NavList isAdmin={isAdmin} />
    </aside>
  );
}
