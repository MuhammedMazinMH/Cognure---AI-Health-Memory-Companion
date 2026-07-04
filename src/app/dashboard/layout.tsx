// The shell shared by every dashboard page: a fixed left sidebar (240px wide),
// a top header, and the page content. It also guards the area: if you are not
// signed in, it sends you to /login.
//
// CLIENT component because it checks the session and manages the mobile
// sidebar open/close state.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-client";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  // `checking` is true while we verify the session, so we don't flash content.
  const [checking, setChecking] = useState(true);
  // Controls whether the sidebar is open on small screens.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // On mount, check for a logged-in user. No user => go to login.
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
      } else {
        setChecking(false);
      }
    });
  }, [router, supabase]);

  // While checking, show a simple loading screen.
  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="animate-pulse font-heading text-2xl text-sage">
          Cognure
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header passes a toggle so the hamburger can open the mobile sidebar. */}
      <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar: always visible from the md breakpoint up. */}
        <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:block">
          <Sidebar />
        </aside>

        {/* Mobile sidebar: slides in as an overlay when toggled open. */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            {/* Dim background; clicking it closes the menu. */}
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setSidebarOpen(false)}
            />
            <aside
              className={cn(
                "absolute left-0 top-0 h-full w-60 border-r bg-sidebar shadow-lg"
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <Sidebar />
            </aside>
          </div>
        )}

        {/* The actual page content. */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
