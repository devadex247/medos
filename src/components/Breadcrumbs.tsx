"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { DASHBOARD_ROUTES } from "@/lib/rbac";

export default function Breadcrumbs() {
  const pathname = usePathname();
  
  if (!pathname) return null;

  // Split path into segments and filter empty ones
  const segments = pathname.split("/").filter(Boolean);

  // If we are at the dashboard root or landing page
  if (segments.length === 0) return null;

  // Generate breadcrumb items
  const items = segments.map((segment, index) => {
    const url = `/${segments.slice(0, index + 1).join("/")}`;
    
    // Default label is capitalized segment
    let label = segment.charAt(0).toUpperCase() + segment.slice(1);
    
    // Look up in DASHBOARD_ROUTES for official labels
    const route = DASHBOARD_ROUTES.find((r) => r.href === url);
    if (route) {
      label = route.label;
    } else if (segment.toLowerCase() === "dashboard") {
      label = "Dashboard";
    } else if (/^\d+$/.test(segment)) {
      // If segment is an integer ID (like BigInt patient IDs)
      label = "Details";
    }

    return {
      label,
      url,
      isLast: index === segments.length - 1,
    };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
      <ol className="flex items-center space-x-1.5 sm:space-x-2">
        <li>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 hover:text-medosBlue dark:hover:text-med-teal transition-colors"
          >
            <Home size={14} className="flex-shrink-0" />
            <span className="sr-only">Home</span>
          </Link>
        </li>

        {items.map((item) => {
          // If it's the dashboard itself, we can skip showing "Dashboard" after the home icon,
          // since the Home icon points to /dashboard.
          if (item.label.toLowerCase() === "dashboard") {
            return null;
          }

          return (
            <li key={item.url} className="flex items-center space-x-1.5 sm:space-x-2">
              <ChevronRight size={14} className="text-slate-400 dark:text-slate-600 flex-shrink-0" />
              {item.isLast ? (
                <span className="text-slate-800 dark:text-slate-100 font-semibold truncate max-w-[120px] sm:max-w-[200px]" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.url}
                  className="hover:text-medosBlue dark:hover:text-med-teal transition-colors truncate max-w-[120px] sm:max-w-[200px]"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
