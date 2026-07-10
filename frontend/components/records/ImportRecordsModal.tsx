"use client";
import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/common/Modal";
import { useToast } from "@/context/ToastContext";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { Upload, FileText, Code, AlertTriangle, CheckCircle } from "lucide-react";

interface ImportRecordsModalProps {
  zoneId: string;
  zoneDomain: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ImportTab = "bind" | "json";

interface ImportResult {
  created: number;
  skipped: number;
  total: number;
}

export function ImportRecordsModal({
  zoneId,
  zoneDomain,
  isOpen,
  onClose,
  onSuccess,
}: ImportRecordsModalProps) {
  const [tab, setTab] = useState<ImportTab>("bind");
  const [bindText, setBindText] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [skipExisting, setSkipExisting] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const importMutation = useMutation({
    mutationFn: async () => {
      setParseError(null);
      if (tab === "bind") {
        if (!bindText.trim()) throw new Error("Please enter or upload a BIND zone file");
        return apiClient.post(`/hosted-zones/${zoneId}/records/import/bind`, {
          bind_text: bindText,
          origin: zoneDomain,
          skip_existing: skipExisting,
        });
      } else {
        if (!jsonText.trim()) throw new Error("Please enter JSON records");
        let records;
        try {
          records = JSON.parse(jsonText);
          if (!Array.isArray(records)) throw new Error("JSON must be an array of records");
        } catch (e) {
          throw new Error(`Invalid JSON: ${(e as Error).message}`);
        }
        return apiClient.post(`/hosted-zones/${zoneId}/records/import/json`, {
          records,
          skip_existing: skipExisting,
        });
      }
    },
    onSuccess: (data: ImportResult) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: queryKeys.records.all(zoneId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.zones.all() });
      success(`Imported ${data.created} record${data.created !== 1 ? "s" : ""} successfully`);
      onSuccess();
    },
    onError: (err: Error) => {
      setParseError(err.message);
      toastError("Import failed", err.message);
    },
  });

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setBindText((ev.target?.result as string) || "");
    };
    reader.readAsText(file);
  }, []);

  const handleClose = () => {
    setResult(null);
    setParseError(null);
    setBindText("");
    setJsonText("");
    onClose();
  };

  const SAMPLE_BIND = `; Sample BIND zone file
$ORIGIN ${zoneDomain}
$TTL 300

@       IN  A       93.184.216.34
www     IN  CNAME   ${zoneDomain}
mail    IN  A       93.184.216.35
@       IN  MX      10 mail.${zoneDomain}
@       IN  TXT     "v=spf1 include:_spf.example.com ~all"`;

  const SAMPLE_JSON = JSON.stringify([
    { name: `sub.${zoneDomain}`, type: "A", ttl: 300, values: ["1.2.3.4"] },
    { name: `alias.${zoneDomain}`, type: "CNAME", ttl: 300, values: [`${zoneDomain}`] },
  ], null, 2);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import DNS Records"
      size="lg"
    >
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "bind"
                ? "border-aws-teal text-aws-teal"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
            onClick={() => { setTab("bind"); setResult(null); setParseError(null); }}
          >
            <FileText className="w-4 h-4" />
            BIND Zone File
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "json"
                ? "border-aws-teal text-aws-teal"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
            onClick={() => { setTab("json"); setResult(null); setParseError(null); }}
          >
            <Code className="w-4 h-4" />
            JSON
          </button>
        </div>

        {/* BIND tab */}
        {tab === "bind" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary text-sm"
              >
                <Upload className="w-4 h-4" />
                Upload .txt / .zone file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.zone,.conf"
                className="hidden"
                onChange={handleFileUpload}
              />
              <span className="text-xs text-gray-400 dark:text-gray-500">or paste below</span>
            </div>
            <textarea
              className="input font-mono text-xs resize-none h-52 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
              placeholder={SAMPLE_BIND}
              value={bindText}
              onChange={(e) => setBindText(e.target.value)}
            />
            <details className="text-xs text-gray-500 dark:text-gray-400">
              <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                View sample BIND format
              </summary>
              <pre className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                {SAMPLE_BIND}
              </pre>
            </details>
          </div>
        )}

        {/* JSON tab */}
        {tab === "json" && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Paste a JSON array of records. Each record needs{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">name</code>,{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">type</code>,{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">ttl</code>, and{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">values</code>.
            </p>
            <textarea
              className="input font-mono text-xs resize-none h-52 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
              placeholder={SAMPLE_JSON}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
          </div>
        )}

        {/* Skip existing toggle */}
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={skipExisting}
            onChange={(e) => setSkipExisting(e.target.checked)}
            className="rounded border-gray-300 text-aws-teal focus:ring-aws-teal"
          />
          Skip records that already exist (same name + type)
        </label>

        {/* Error */}
        {parseError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {parseError}
          </div>
        )}

        {/* Success result */}
        {result && (
          <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-700 dark:text-green-400">
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>{result.created}</strong> record{result.created !== 1 ? "s" : ""} imported,{" "}
              <strong>{result.skipped}</strong> skipped
              {result.skipped > 0 && " (already existed or invalid)"}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={handleClose} className="btn-secondary">
            {result ? "Close" : "Cancel"}
          </button>
          {!result && (
            <button
              onClick={() => importMutation.mutate()}
              className="btn-primary"
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? "Importing…" : "Import Records"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
