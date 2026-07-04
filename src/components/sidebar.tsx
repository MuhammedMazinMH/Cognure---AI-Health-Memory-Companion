// The left navigation rail used inside the dashboard. It is a CLIENT component
// because it reads the current URL to highlight the active link.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Network,
  MessageCircle,
  Clock,
  FileText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

// The list of navigation items. Each has a label, a link, and an icon.
const NAV_ITEMS = [
  { label: "Memory Graph", href: "/dashboard", icon: Network },
  { label: "Chat", href: "/dashboard/chat", icon: MessageCircle },
  { label: "Timeline", href: "/dashboard/timeline", icon: Clock },
  { label: "Documents", href: "/dashboard/documents", icon: FileText },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  // usePathname() tells us which page we are on, e.g. "/dashboard/chat".
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        // The Memory Graph link ("/dashboard") should only be active on the
        // exact page; the others are active when the URL starts with them.
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? // Active item uses the sage green brand color.
                  "bg-sage text-white"
                : "text-charcoal/70 hover:bg-sidebar-accent hover:text-charcoal"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
