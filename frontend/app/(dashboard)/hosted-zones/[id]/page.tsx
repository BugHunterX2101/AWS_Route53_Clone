"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { HostedZone } from "@/types/hosted-zone";
import { ZoneHeader } from "@/components/zones/ZoneHeader";
import { RecordsTable } from "@/components/records/RecordsTable";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

interface ZoneDetailPageProps {
  params: { id: string };
}

export default function ZoneDetailPage({ params }: ZoneDetailPageProps) {
  const { id } = params;

  const { data: zone, isLoading, error } = useQuery<HostedZone>({
    queryKey: queryKeys.zones.detail(id),
    queryFn: () => apiClient.get(`/hosted-zones/${id}`),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-64 rounded" />
        <div className="skeleton h-32 w-full rounded" />
        <div className="skeleton h-64 w-full rounded" />
      </div>
    );
  }

  if (error || !zone) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Zone not found</h2>
        <p className="text-gray-500 text-sm mb-4">
          The hosted zone you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
        </p>
        <Link href="/hosted-zones" className="btn-primary">
          Back to Hosted Zones
        </Link>
      </div>
    );
  }

  return (
    <div>
      <ZoneHeader zone={zone} />
      <RecordsTable zone={zone} />
    </div>
  );
}
