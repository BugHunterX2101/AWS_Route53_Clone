"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/context/ToastContext";
import { HostedZone, HostedZoneCreate, PaginatedResponse } from "@/types/hosted-zone";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { SearchBar } from "@/components/common/SearchBar";
import { Pagination } from "@/components/common/Pagination";
import { ZoneFormModal } from "@/components/zones/ZoneFormModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import Link from "next/link";
import {
  Plus, Trash2, Edit2, RefreshCw, ExternalLink, Globe
} from "lucide-react";

export function HostedZonesTable() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editZone, setEditZone] = useState<HostedZone | null>(null);
  const [deleteZone, setDeleteZone] = useState<HostedZone | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const { data, isLoading, isFetching, refetch } = useQuery<PaginatedResponse<HostedZone>>({
    queryKey: queryKeys.zones.list({ search, page, pageSize }),
    queryFn: () =>
      apiClient.get("/hosted-zones", {
        q: search || undefined,
        page,
        page_size: pageSize,
      } as any),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/hosted-zones/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.zones.all() });
      success("Hosted zone deleted", "The zone and all its records have been removed.");
      setDeleteZone(null);
    },
    onError: (err: Error) => toastError("Delete failed", err.message),
  });

  const zones = data?.items ?? [];

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === zones.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(zones.map((z) => z.id)));
    }
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: "Hosted zones" }]} />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Hosted zones</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage DNS hosted zones for your domains
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="btn-secondary" disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Create hosted zone
          </button>
        </div>
      </div>

      <div className="card">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <SearchBar
            placeholder="Search by domain name"
            value={search}
            onSearch={(v) => { setSearch(v); setPage(1); }}
          />
          {selected.size > 0 && (
            <span className="text-sm text-gray-600 ml-2">
              {selected.size} selected
            </span>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header w-10">
                  <input
                    type="checkbox"
                    checked={zones.length > 0 && selected.size === zones.length}
                    onChange={toggleAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="table-header">Domain name</th>
                <th className="table-header">Type</th>
                <th className="table-header">Records</th>
                <th className="table-header">Description</th>
                <th className="table-header">Hosted zone ID</th>
                <th className="table-header">Created</th>
                <th className="table-header w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="table-cell">
                        <div className="skeleton h-4 rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : zones.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-500">
                    <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium">No hosted zones</p>
                    <p className="text-sm mt-1">
                      {search ? `No zones matching "${search}"` : "Create your first hosted zone to get started"}
                    </p>
                    {!search && (
                      <button onClick={() => setCreateOpen(true)} className="btn-primary mt-4">
                        <Plus className="w-4 h-4" />
                        Create hosted zone
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                zones.map((zone) => (
                  <tr
                    key={zone.id}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                  >
                    <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(zone.id)}
                        onChange={() => toggleSelect(zone.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="table-cell font-medium">
                      <Link
                        href={`/hosted-zones/${zone.id}`}
                        className="text-aws-teal hover:text-aws-teal-dark hover:underline"
                      >
                        {zone.domain_name}
                      </Link>
                    </td>
                    <td className="table-cell">
                      <span className={zone.type === "PUBLIC" ? "badge-public" : "badge-private"}>
                        {zone.type.charAt(0) + zone.type.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="table-cell text-gray-600">{zone.record_count}</td>
                    <td className="table-cell text-gray-500 max-w-xs truncate">
                      {zone.comment || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="table-cell font-mono text-xs text-gray-500">{zone.id}</td>
                    <td className="table-cell text-gray-500 text-xs">
                      {new Date(zone.created_at).toLocaleDateString()}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditZone(zone)}
                          className="btn-ghost p-1.5"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteZone(zone)}
                          className="btn-ghost p-1.5 text-red-500 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={data?.total ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      </div>

      {/* Modals */}
      <ZoneFormModal
        isOpen={createOpen || !!editZone}
        mode={editZone ? "edit" : "create"}
        initialData={editZone || undefined}
        onClose={() => { setCreateOpen(false); setEditZone(null); }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.zones.all() });
          setCreateOpen(false);
          setEditZone(null);
        }}
      />

      <ConfirmDialog
        isOpen={!!deleteZone}
        onClose={() => setDeleteZone(null)}
        onConfirm={() => deleteZone && deleteMutation.mutate(deleteZone.id)}
        title="Delete hosted zone"
        message={`Are you sure you want to delete "${deleteZone?.domain_name}"? This will permanently remove the zone and all its DNS records. This action cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
