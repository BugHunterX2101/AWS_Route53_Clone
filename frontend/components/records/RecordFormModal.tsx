"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Modal } from "@/components/common/Modal";
import { useToast } from "@/context/ToastContext";
import { DnsRecord, DnsRecordCreate, RecordType, RECORD_TYPES } from "@/types/dns-record";
import { apiClient } from "@/lib/api-client";
import { Plus, Trash2 } from "lucide-react";

interface RecordFormModalProps {
  zoneId: string;
  zoneDomain: string;
  mode: "create" | "edit";
  initialData?: DnsRecord;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function formatValueForDisplay(record: DnsRecord): string {
  if (!record.values || record.values.length === 0) return "";
  const v = record.values[0];
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

export function RecordFormModal({
  zoneId,
  zoneDomain,
  mode,
  initialData,
  isOpen,
  onClose,
  onSuccess,
}: RecordFormModalProps) {
  const [name, setName] = useState(initialData?.name ?? zoneDomain);
  const [type, setType] = useState<RecordType>(initialData?.type ?? "A");
  const [ttl, setTtl] = useState(initialData?.ttl ?? 300);
  const [simpleValues, setSimpleValues] = useState<string[]>(
    initialData
      ? initialData.values.map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
      : [""]
  );
  // SRV fields
  const [srvPriority, setSrvPriority] = useState("10");
  const [srvWeight, setSrvWeight] = useState("20");
  const [srvPort, setSrvPort] = useState("80");
  const [srvTarget, setSrvTarget] = useState("");
  // MX fields
  const [mxEntries, setMxEntries] = useState<{ priority: string; hostname: string }[]>(
    initialData?.type === "MX"
      ? initialData.values.map((v: any) => ({ priority: String(v.priority ?? "10"), hostname: v.hostname ?? "" }))
      : [{ priority: "10", hostname: "" }]
  );
  // CAA fields
  const [caaFlag, setCaaFlag] = useState("0");
  const [caaTag, setCaaTag] = useState("issue");
  const [caaValue, setCaaValue] = useState("");

  const { success, error: toastError } = useToast();

  const buildValues = (): (string | Record<string, unknown>)[] => {
    switch (type) {
      case "SRV":
        return [{ priority: Number(srvPriority), weight: Number(srvWeight), port: Number(srvPort), target: srvTarget }];
      case "MX":
        return mxEntries.filter(e => e.hostname).map(e => ({ priority: Number(e.priority), hostname: e.hostname }));
      case "CAA":
        return [{ flag: Number(caaFlag), tag: caaTag, value: caaValue }];
      default:
        return simpleValues.filter(v => v.trim());
    }
  };

  const mutation = useMutation({
    mutationFn: (payload: DnsRecordCreate) =>
      mode === "create"
        ? apiClient.post(`/hosted-zones/${zoneId}/records`, payload)
        : apiClient.put(`/hosted-zones/${zoneId}/records/${initialData!.id}`, {
            ttl: payload.ttl,
            values: payload.values,
          }),
    onSuccess: () => {
      success(
        mode === "create" ? "Record created" : "Record updated",
        `${type} record has been ${mode === "create" ? "created" : "updated"} successfully.`
      );
      onSuccess();
    },
    onError: (err: Error) => toastError("Operation failed", err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const values = buildValues();
    if (values.length === 0) {
      toastError("Validation error", "At least one value is required");
      return;
    }
    mutation.mutate({ name, type, ttl, values });
  };

  const renderValueFields = () => {
    switch (type) {
      case "MX":
        return (
          <div className="space-y-2">
            {mxEntries.map((entry, i) => (
              <div key={i} className="flex gap-2 items-center">
                <div className="w-24">
                  <input
                    type="number"
                    value={entry.priority}
                    onChange={(e) => {
                      const next = [...mxEntries];
                      next[i].priority = e.target.value;
                      setMxEntries(next);
                    }}
                    className="input"
                    placeholder="Priority"
                    min={0}
                    max={65535}
                  />
                </div>
                <input
                  type="text"
                  value={entry.hostname}
                  onChange={(e) => {
                    const next = [...mxEntries];
                    next[i].hostname = e.target.value;
                    setMxEntries(next);
                  }}
                  className="input flex-1"
                  placeholder="mail.example.com."
                />
                {mxEntries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setMxEntries(mxEntries.filter((_, j) => j !== i))}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setMxEntries([...mxEntries, { priority: "10", hostname: "" }])}
              className="btn-ghost text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add MX entry
            </button>
            <p className="text-xs text-gray-500">Format: Priority + Hostname (e.g., 10 mail.example.com.)</p>
          </div>
        );

      case "SRV":
        return (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Priority</label>
              <input type="number" value={srvPriority} onChange={(e) => setSrvPriority(e.target.value)} className="input" min={0} max={65535} />
            </div>
            <div>
              <label className="label text-xs">Weight</label>
              <input type="number" value={srvWeight} onChange={(e) => setSrvWeight(e.target.value)} className="input" min={0} max={65535} />
            </div>
            <div>
              <label className="label text-xs">Port</label>
              <input type="number" value={srvPort} onChange={(e) => setSrvPort(e.target.value)} className="input" min={0} max={65535} />
            </div>
            <div>
              <label className="label text-xs">Target</label>
              <input type="text" value={srvTarget} onChange={(e) => setSrvTarget(e.target.value)} className="input" placeholder="target.example.com." />
            </div>
          </div>
        );

      case "CAA":
        return (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label text-xs">Flag</label>
              <input type="number" value={caaFlag} onChange={(e) => setCaaFlag(e.target.value)} className="input" min={0} max={255} />
            </div>
            <div>
              <label className="label text-xs">Tag</label>
              <select value={caaTag} onChange={(e) => setCaaTag(e.target.value)} className="input">
                <option value="issue">issue</option>
                <option value="issuewild">issuewild</option>
                <option value="iodef">iodef</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">Value</label>
              <input type="text" value={caaValue} onChange={(e) => setCaaValue(e.target.value)} className="input" placeholder="ca.example.com" />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            {simpleValues.map((val, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={val}
                  onChange={(e) => {
                    const next = [...simpleValues];
                    next[i] = e.target.value;
                    setSimpleValues(next);
                  }}
                  className="input flex-1"
                  placeholder={
                    type === "A" ? "192.0.2.1" :
                    type === "AAAA" ? "2001:db8::1" :
                    type === "CNAME" ? "target.example.com." :
                    type === "TXT" ? '"v=spf1 include:example.com ~all"' :
                    "Value"
                  }
                />
                {simpleValues.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSimpleValues(simpleValues.filter((_, j) => j !== i))}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {!["CNAME", "PTR"].includes(type) && (
              <button
                type="button"
                onClick={() => setSimpleValues([...simpleValues, ""])}
                className="btn-ghost text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add value
              </button>
            )}
          </div>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "Create record" : "Edit record"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          {/* Record name */}
          <div className="col-span-2 md:col-span-1">
            <label className="label">Record name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder={zoneDomain}
              disabled={mode === "edit"}
            />
            {mode === "edit" && <p className="text-xs text-gray-500 mt-1">Name cannot be changed after creation.</p>}
          </div>

          {/* Record type */}
          <div>
            <label className="label">Record type <span className="text-red-500">*</span></label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as RecordType)}
              className="input"
              disabled={mode === "edit"}
            >
              {RECORD_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {mode === "edit" && <p className="text-xs text-gray-500 mt-1">Type cannot be changed after creation.</p>}
          </div>
        </div>

        {/* TTL */}
        <div className="w-48">
          <label className="label">TTL (seconds)</label>
          <input
            type="number"
            value={ttl}
            onChange={(e) => setTtl(Number(e.target.value))}
            className="input"
            min={0}
            max={172800}
          />
          <p className="text-xs text-gray-500 mt-1">0–172800 seconds (default: 300)</p>
        </div>

        {/* Value(s) */}
        <div>
          <label className="label">Value(s) <span className="text-red-500">*</span></label>
          {renderValueFields()}
        </div>

        {/* Routing policy */}
        <div>
          <label className="label">Routing policy</label>
          <select className="input w-48" defaultValue="SIMPLE" disabled>
            <option value="SIMPLE">Simple routing</option>
            <option value="WEIGHTED" disabled>Weighted routing (Coming Soon)</option>
            <option value="LATENCY" disabled>Latency (Coming Soon)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Additional routing policies coming soon.</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {mode === "create" ? "Creating..." : "Saving..."}
              </>
            ) : (
              mode === "create" ? "Create record" : "Save changes"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
