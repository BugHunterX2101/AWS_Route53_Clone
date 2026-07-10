"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DnsRecord, RecordType } from "@/types/dns-record";
import { HostedZone, PaginatedResponse } from "@/types/hosted-zone";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { SearchBar } from "@/components/common/SearchBar";
import { Pagination } from "@/components/common/Pagination";
import { TypeFilter } from "@/components/records/TypeFilter";
import { RecordFormModal } from "@/components/records/RecordFormModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/context/ToastContext";
import { Plus, RefreshCw, Edit2, Trash2, Lock, FileText } from "lucide-react";

interface RecordsTableProps {
  zone: HostedZone;
}

function formatValues(record: DnsRecord): string {
  if (!record.values || record.values.length === 0) return "—";
  return record.values
    .map((v) => {
      if (typeof v === "string") return v;
      if (typeof v === "object" && v !== null) {
        const obj = v as Record<string, unknown>;
        if ("priority" in obj && "hostname" in obj) return `${obj.priority} ${obj.hostname}`;
        if ("priority" in obj && "target" in obj) return `${obj.priority} ${obj.weight} ${obj.port} ${obj.target}`;
        if ("flag" in obj) return `${obj.flag} ${obj.tag} ${obj.value}`;
        return JSON.stringify(v);
      }
      return String(v);
    })
    .join(", ");
}

export function RecordsTable({ zone }: RecordsTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<RecordType | "">("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<DnsRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<DnsRecord | null>(null);

  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const { data, isLoading, isFetching, refetch } = useQuery<{ items: DnsRecord[]; total: number; page: number; page_size: number }>({
    queryKey: queryKeys.records.list(zone.id, { search, typeFilter, page, pageSize }),
    queryFn: () =>
      apiClient.get(`/hosted-zones/${zone.id}/records`, {
        q: search || undefined,
        type: typeFilter || undefined,
        page,
        page_size: pageSize,
      } as any),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/hosted-zones/${zone.id}/records/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.records.all(zone.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.zones.all() });
      success("Record deleted");
      setDeleteRecord(null);
    },
    onError: (err: Error) => toastError("Delete failed", err.message),
  });

  const records = data?.items ?? [];

  const TYPE_COLORS: Record<string, string> = {
    A: "bg-blue-100 text-blue-800",
    AAAA: "bg-indigo-100 text-indigo-800",
    CNAME: "bg-purple-100 text-purple-800",
    TXT: "bg-yellow-100 text-yellow-800",
    MX: "bg-green-100 text-green-800",
    NS: "bg-red-100 text-red-800",
    PTR: "bg-orange-100 text-orange-800",
    SRV: "bg-pink-100 text-pink-800",
    SOA: "bg-gray-200 text-gray-700",
    CAA: "bg-teal-100 text-teal-800",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Records
          {data && <span className="ml-2 text-sm text-gray-500 font-normal">({data.total})</span>}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="btn-ghost" disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Create record
          </button>
        </div>
      </div>

      <div className="card">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 flex-wrap">
          <SearchBar
            placeholder="Search by record name"
            value={search}
            onSearch={(v) => { setSearch(v); setPage(1); }}
          />
          <TypeFilter
            value={typeFilter}
            onChange={(t) => { setTypeFilter(t); setPage(1); }}
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Record name</th>
                <th className="table-header">Type</th>
                <th className="table-header">TTL</th>
                <th className="table-header">Value / Route traffic to</th>
                <th className="table-header">Routing policy</th>
                <th className="table-header w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="table-cell">
                        <div className="skeleton h-4 rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-medium">No records found</p>
                    <p className="text-sm mt-1">
                      {search || typeFilter ? "Try different search criteria" : "Create your first DNS record"}
                    </p>
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="table-cell font-mono text-sm">
                      <div className="flex items-center gap-1.5">
                        {record.name}
                        {record.is_system && (
                          <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" aria-label="System-managed record" />
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${TYPE_COLORS[record.type] || "bg-gray-100 text-gray-700"}`}>
                        {record.type}
                      </span>
                    </td>
                    <td className="table-cell text-gray-600">{record.ttl}s</td>
                    <td className="table-cell text-sm max-w-xs">
                      <div className="truncate" title={formatValues(record)}>
                        {formatValues(record)}
                      </div>
                    </td>
                    <td className="table-cell text-gray-500 text-xs">{record.routing_policy}</td>
                    <td className="table-cell">
                      {record.is_system ? (
                        <span className="text-xs text-gray-400 italic" title="System-managed records cannot be modified or deleted">
                          System
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditRecord(record)}
                            className="btn-ghost p-1.5"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteRecord(record)}
                            className="btn-ghost p-1.5 text-red-500 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          pageSize={pageSize}
          total={data?.total ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      </div>

      {/* Create / Edit modal */}
      <RecordFormModal
        zoneId={zone.id}
        zoneDomain={zone.domain_name}
        mode={createOpen ? "create" : "edit"}
        initialData={editRecord || undefined}
        isOpen={createOpen || !!editRecord}
        onClose={() => { setCreateOpen(false); setEditRecord(null); }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.records.all(zone.id) });
          queryClient.invalidateQueries({ queryKey: queryKeys.zones.all() });
          setCreateOpen(false);
          setEditRecord(null);
        }}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteRecord}
        onClose={() => setDeleteRecord(null)}
        onConfirm={() => deleteRecord && deleteMutation.mutate(deleteRecord.id)}
        title="Delete record"
        message={`Are you sure you want to delete the ${deleteRecord?.type} record "${deleteRecord?.name}"? This action cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
