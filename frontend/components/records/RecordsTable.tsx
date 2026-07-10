"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DnsRecord, RecordType } from "@/types/dns-record";
import { HostedZone, PaginatedResponse } from "@/types/hosted-zone";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { SearchBar } from "@/components/common/SearchBar";
import { Pagination } from "@/components/common/Pagination";
import { TypeFilter } from "@/components/records/TypeFilter";
import { RecordFormModal } from "@/components/records/RecordFormModal";
import { ImportRecordsModal } from "@/components/records/ImportRecordsModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/context/ToastContext";
import { useKeyboardShortcuts } from "@/context/KeyboardShortcutsContext";
import {
  Plus, RefreshCw, Edit2, Trash2, Lock, FileText, Upload, X, CheckSquare
} from "lucide-react";

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
  const [importOpen, setImportOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<DnsRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<DnsRecord | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();

  // Register keyboard shortcuts
  useEffect(() => {
    registerShortcut("records-create", {
      key: "c",
      description: "Create a new DNS record",
      action: () => setCreateOpen(true),
    });
    registerShortcut("records-import", {
      key: "i",
      description: "Import DNS records",
      action: () => setImportOpen(true),
    });
    registerShortcut("records-refresh", {
      key: "r",
      description: "Refresh records list",
      action: () => refetch(),
    });
    return () => {
      unregisterShortcut("records-create");
      unregisterShortcut("records-import");
      unregisterShortcut("records-refresh");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerShortcut, unregisterShortcut]);

  const { data, isLoading, isFetching, refetch } = useQuery<{
    items: DnsRecord[];
    total: number;
    page: number;
    page_size: number;
  }>({
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

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) =>
      apiClient.delete(`/hosted-zones/${zone.id}/records`, { ids } as any),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.records.all(zone.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.zones.all() });
      success(`Deleted ${data.deleted} record${data.deleted !== 1 ? "s" : ""}`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    },
    onError: (err: Error) => toastError("Bulk delete failed", err.message),
  });

  const records = data?.items ?? [];
  const selectableRecords = records.filter((r) => !r.is_system);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const selectableIds = selectableRecords.map((r) => r.id);
    const allSelected = selectableIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        selectableIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => new Set([...prev, ...selectableIds]));
    }
  };

  const allPageSelected =
    selectableRecords.length > 0 &&
    selectableRecords.every((r) => selectedIds.has(r.id));

  const someSelected = selectedIds.size > 0;

  const TYPE_COLORS: Record<string, string> = {
    A: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    AAAA: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
    CNAME: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    TXT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
    MX: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    NS: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    PTR: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    SRV: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
    SOA: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    CAA: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Records
          {data && <span className="ml-2 text-sm text-gray-500 font-normal">({data.total})</span>}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="btn-ghost" disabled={isFetching} title="Refresh (r)">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setImportOpen(true)} className="btn-secondary" title="Import records (i)">
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button onClick={() => setCreateOpen(true)} className="btn-primary" title="Create record (c)">
            <Plus className="w-4 h-4" />
            Create record
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 px-4 py-2.5 mb-3 bg-aws-teal/10 dark:bg-aws-teal/20 border border-aws-teal/30 rounded-md animate-fade-in">
          <CheckSquare className="w-4 h-4 text-aws-teal flex-shrink-0" />
          <span className="text-sm font-medium text-aws-teal">
            {selectedIds.size} record{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setBulkDeleteOpen(true)}
            className="btn-danger text-xs px-3 py-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete selected
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="btn-ghost text-xs px-2 py-1.5"
            title="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="card dark:bg-gray-900 dark:border-gray-700">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-wrap">
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
                <th className="table-header w-10 px-3">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-aws-teal focus:ring-aws-teal cursor-pointer"
                    checked={allPageSelected}
                    onChange={toggleSelectAll}
                    title="Select all on this page"
                    disabled={selectableRecords.length === 0}
                  />
                </th>
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
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="table-cell">
                        <div className="skeleton h-4 rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="font-medium">No records found</p>
                    <p className="text-sm mt-1">
                      {search || typeFilter ? "Try different search criteria" : "Create your first DNS record"}
                    </p>
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr
                    key={record.id}
                    className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors ${
                      selectedIds.has(record.id) ? "bg-aws-teal/5 dark:bg-aws-teal/10" : ""
                    }`}
                  >
                    <td className="table-cell px-3 w-10">
                      {!record.is_system ? (
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-aws-teal focus:ring-aws-teal cursor-pointer"
                          checked={selectedIds.has(record.id)}
                          onChange={() => toggleSelect(record.id)}
                        />
                      ) : (
                        <span className="w-4 h-4 block" />
                      )}
                    </td>
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
                    <td className="table-cell text-gray-600 dark:text-gray-400">{record.ttl}s</td>
                    <td className="table-cell text-sm max-w-xs">
                      <div className="truncate" title={formatValues(record)}>
                        {formatValues(record)}
                      </div>
                    </td>
                    <td className="table-cell text-gray-500 dark:text-gray-400 text-xs">{record.routing_policy}</td>
                    <td className="table-cell">
                      {record.is_system ? (
                        <span className="text-xs text-gray-400 dark:text-gray-600 italic" title="System-managed records cannot be modified or deleted">
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
                            className="btn-ghost p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
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

      {/* Import modal */}
      <ImportRecordsModal
        zoneId={zone.id}
        zoneDomain={zone.domain_name}
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => setImportOpen(false)}
      />

      {/* Single delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteRecord}
        onClose={() => setDeleteRecord(null)}
        onConfirm={() => deleteRecord && deleteMutation.mutate(deleteRecord.id)}
        title="Delete record"
        message={`Are you sure you want to delete the ${deleteRecord?.type} record "${deleteRecord?.name}"? This action cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />

      {/* Bulk delete confirm */}
      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
        title={`Delete ${selectedIds.size} record${selectedIds.size !== 1 ? "s" : ""}`}
        message={`Are you sure you want to delete ${selectedIds.size} selected record${selectedIds.size !== 1 ? "s" : ""}? System-managed records (NS/SOA) will be skipped. This action cannot be undone.`}
        isLoading={bulkDeleteMutation.isPending}
      />
    </div>
  );
}
