"use client";
import Link from "next/link";
import { HostedZone } from "@/types/hosted-zone";
import { Globe, ChevronRight, Download } from "lucide-react";

interface ZoneHeaderProps {
  zone: HostedZone;
}

export function ZoneHeader({ zone }: ZoneHeaderProps) {
  const handleExport = (format: "json" | "bind") => {
    window.open(`/api/v1/hosted-zones/${zone.id}/export?format=${format}`, "_blank");
  };

  return (
    <div className="mb-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
        <Link href="/hosted-zones" className="hover:text-aws-teal transition-colors">
          Hosted zones
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-gray-800 font-medium">{zone.domain_name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-aws-teal/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Globe className="w-6 h-6 text-aws-teal" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{zone.domain_name}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className={zone.type === "PUBLIC" ? "badge-public" : "badge-private"}>
                {zone.type.charAt(0) + zone.type.slice(1).toLowerCase()} hosted zone
              </span>
              <span className="text-xs text-gray-500 font-mono">{zone.id}</span>
              <span className="text-xs text-gray-500">
                {zone.record_count} records
              </span>
            </div>
            {zone.comment && (
              <p className="text-sm text-gray-600 mt-1">{zone.comment}</p>
            )}
          </div>
        </div>

        {/* Export actions */}
        <div className="flex items-center gap-2">
          <div className="relative group">
            <button className="btn-secondary">
              <Download className="w-4 h-4" />
              Export
            </button>
            <div className="hidden group-hover:block absolute right-0 top-9 bg-white border border-gray-200 rounded shadow-aws-lg z-10 w-40 py-1">
              <button
                onClick={() => handleExport("json")}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Export as JSON
              </button>
              <button
                onClick={() => handleExport("bind")}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Export as BIND
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
