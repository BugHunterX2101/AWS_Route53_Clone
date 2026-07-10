"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Globe, LayoutDashboard, Shield, Activity, Network, User, ChevronRight, ChevronDown
} from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    label: "Hosted zones",
    href: "/hosted-zones",
    icon: <Globe className="w-4 h-4" />,
  },
  {
    label: "DNS management",
    href: "#",
    icon: <Network className="w-4 h-4" />,
    children: [
      { label: "Traffic policies", href: "/traffic-policies" },
    ],
  },
  {
    label: "Resolver",
    href: "/resolver",
    icon: <Shield className="w-4 h-4" />,
  },
  {
    label: "Health checks",
    href: "/health-checks",
    icon: <Activity className="w-4 h-4" />,
  },
  {
    label: "Profiles",
    href: "/profiles",
    icon: <User className="w-4 h-4" />,
  },
];

export function SideNav() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string[]>(["DNS management"]);

  const isActive = (href: string) => {
    if (href === "#") return false;
    if (href === "/hosted-zones") return pathname.startsWith("/hosted-zones");
    return pathname === href;
  };

  const toggleExpand = (label: string) => {
    setExpanded((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  return (
    <nav className="w-56 min-h-screen bg-aws-blue flex-shrink-0 flex flex-col">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-aws-orange rounded flex items-center justify-center flex-shrink-0">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-white text-xs font-bold leading-tight">Route53</div>
            <div className="text-gray-400 text-xs leading-tight">Clone Console</div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 py-2">
        {navItems.map((item) => (
          <div key={item.label}>
            {item.children ? (
              <>
                <button
                  onClick={() => toggleExpand(item.label)}
                  className="w-full sidebar-item-inactive justify-between"
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {expanded.includes(item.label) ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>
                {expanded.includes(item.label) && (
                  <div className="ml-3 border-l border-gray-600 ml-7">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={clsx(
                          "flex items-center px-4 py-2 text-sm transition-all",
                          isActive(child.href)
                            ? "text-aws-orange font-medium"
                            : "text-gray-400 hover:text-white"
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.href}
                className={clsx(
                  isActive(item.href) ? "sidebar-item-active" : "sidebar-item-inactive"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Bottom version */}
      <div className="px-4 py-3 border-t border-gray-700">
        <p className="text-gray-500 text-xs">Route53 Clone v1.0</p>
      </div>
    </nav>
  );
}
