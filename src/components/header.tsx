// The top bar of the dashboard: the Cognure logo, the "Add Memory" button,
// and an avatar menu with a Logout option. CLIENT component because of the
// dropdown and the logout action. It also toggles the mobile sidebar.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase-client";
import { UploadModal } from "@/components/upload-modal";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

// Props let the parent layout open/close the mobile sidebar.
interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  // We display the user's email and use its first letter for the avatar.
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    // Load the current user once when the header mounts.
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
    });
  }, [supabase]);

  // Sign the user out, then send them back to the login page.
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // The first letter of the email, used inside the round avatar.
  const initial = email ? email.charAt(0).toUpperCase() : "C";

  return (
    <header className="flex items-center justify-between border-b bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Hamburger button: only visible on small screens (md:hidden). */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo */}
        <span className="font-heading text-xl font-bold text-charcoal">
          Cognure
        </span>
      </div>

      <div className="flex items-center gap-3">
        <UploadModal />

        {/* Avatar dropdown with a Logout option. The Base UI trigger renders
            as a <button> by default, so we style it directly and place the
            avatar inside it. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="rounded-full outline-none ring-sage focus-visible:ring-2"
            aria-label="Open account menu"
          >
            <Avatar>
              <AvatarFallback className="bg-lavender text-white">
                {initial}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {/* Base UI requires labels to be inside a DropdownMenuGroup */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="truncate">
                {email || "Signed in"}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-coral">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
