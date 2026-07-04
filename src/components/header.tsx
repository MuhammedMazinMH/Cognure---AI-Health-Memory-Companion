// The top bar of the dashboard: hamburger (mobile), logo, Upload button, avatar menu.
// CLIENT component because of the dropdown and the logout action.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu, Plus, User } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase-client";
import { UploadModal } from "@/components/upload-modal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  const [email, setEmail] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
      setFullName((data.user?.user_metadata?.full_name as string) ?? "");
    });
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // Build initials from name or fall back to first letter of email.
  const initials = fullName
    ? fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : email.charAt(0).toUpperCase() || "C";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      {/* Left: hamburger + logo (mobile shows logo; desktop hides it since sidebar has it) */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:hidden"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Logo visible only on mobile when sidebar is hidden */}
        <span className="font-heading text-base font-bold text-charcoal md:hidden">
          Cognure
        </span>
      </div>

      {/* Right: upload + avatar */}
      <div className="flex items-center gap-3">
        {/* The UploadModal renders its own trigger button. */}
        <UploadModal
          trigger={
            <Button
              size="sm"
              className="inline-flex items-center gap-1.5 rounded-lg bg-sage px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sage/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Add document
            </Button>
          }
        />

        {/* Avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex h-8 w-8 items-center justify-center rounded-full bg-sage/15 text-xs font-bold text-sage transition-colors hover:bg-sage/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
            aria-label="Open account menu"
          >
            {initials}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="truncate text-sm font-semibold text-charcoal">
                  {fullName || "My Account"}
                </p>
                <p className="truncate text-xs text-charcoal/45">{email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/settings")}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <User className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex cursor-pointer items-center gap-2 text-sm text-coral focus:text-coral"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
