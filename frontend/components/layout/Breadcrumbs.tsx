"use client";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
      <Link href="/hosted-zones" className="flex items-center gap-1 hover:text-aws-teal transition-colors">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          {item.href && index < items.length - 1 ? (
            <Link href={item.href} className="hover:text-aws-teal transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-800 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
