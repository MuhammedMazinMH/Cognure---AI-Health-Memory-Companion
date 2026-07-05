// The left navigation rail used inside the dashboard.
// CLIENT component because it reads the current URL to highlight the active link.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Network,
  MessageCircle,
  Clock,
  FileText,
  Settings,
  FileBarChart,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Memory Graph", href: "/dashboard", icon: Network },
  { label: "Chat", href: "/dashboard/chat", icon: MessageCircle },
  { label: "Timeline", href: "/dashboard/timeline", icon: Clock },
  { label: "Documents", href: "/dashboard/documents", icon: FileText },
  { label: "Report", href: "/dashboard/report", icon: FileBarChart },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col justify-between p-3 pb-5">
      {/* Brand mark inside sidebar (desktop) */}
      <div>
        <div className="mb-4 flex h-10 items-center px-3">
          <span className="font-heading text-base font-bold tracking-tight text-charcoal">
            Cognure
          </span>
        </div>

        {/* Nav links */}
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sage text-white shadow-sm"
                      : "text-charcoal/60 hover:bg-sidebar-accent hover:text-charcoal"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Bottom meta — version pill */}
      <div className="px-3">
        <div className="rounded-lg bg-sage/8 px-3 py-2.5">
          <p className="text-xs font-semibold text-sage">Health Memory AI</p>
          <p className="mt-0.5 text-xs text-charcoal/35">Private by design</p>
        </div>
      </div>
    </nav>
  );
}
