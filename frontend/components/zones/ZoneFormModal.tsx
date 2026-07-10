"use client";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Modal } from "@/components/common/Modal";
import { useToast } from "@/context/ToastContext";
import { HostedZone } from "@/types/hosted-zone";
import { apiClient } from "@/lib/api-client";

interface ZoneFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  initialData?: HostedZone;
  onClose: () => void;
  onSuccess: () => void;
}

export function ZoneFormModal({ isOpen, mode, initialData, onClose, onSuccess }: ZoneFormModalProps) {
  const [domainName, setDomainName] = useState(initialData?.domain_name?.replace(/\.$/, "") ?? "");
  const [type, setType] = useState<"PUBLIC" | "PRIVATE">(initialData?.type ?? "PUBLIC");
  const [comment, setComment] = useState(initialData?.comment ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { success, error: toastError } = useToast();

  const mutation = useMutation({
    mutationFn: (payload: object) =>
      mode === "create"
        ? apiClient.post("/hosted-zones", payload)
        : apiClient.put(`/hosted-zones/${initialData!.id}`, payload),
    onSuccess: () => {
      success(
        mode === "create" ? "Hosted zone created" : "Hosted zone updated",
        mode === "create"
          ? `Zone for ${domainName} has been created with NS and SOA records.`
          : "Description has been updated."
      );
      onSuccess();
    },
    onError: (err: Error) => toastError("Operation failed", err.message),
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!domainName.trim()) {
      errs.domain_name = "Domain name is required";
    } else if (!/^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+([a-zA-Z]{2,}\.?)$/.test(domainName.trim())) {
      errs.domain_name = "Enter a valid domain name (e.g., example.com)";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (mode === "create") {
      mutation.mutate({ domain_name: domainName, type, comment: comment || undefined });
    } else {
      mutation.mutate({ comment: comment || undefined });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "Create hosted zone" : "Edit hosted zone"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Domain name */}
        <div>
          <label className="label">
            Domain name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={domainName}
            onChange={(e) => setDomainName(e.target.value)}
            className={`input ${errors.domain_name ? "border-red-400 focus:ring-red-400" : ""}`}
            placeholder="example.com"
            disabled={mode === "edit"}
          />
          {mode === "edit" && (
            <p className="text-xs text-gray-500 mt-1">Domain name cannot be changed after creation.</p>
          )}
          {errors.domain_name && <p className="text-xs text-red-500 mt-1">{errors.domain_name}</p>}
        </div>

        {/* Type */}
        <div>
          <label className="label">Type</label>
          <div className="space-y-2">
            {(["PUBLIC", "PRIVATE"] as const).map((t) => (
              <label key={t} className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${
                type === t ? "border-aws-teal bg-blue-50" : "border-gray-200 hover:bg-gray-50"
              } ${mode === "edit" ? "opacity-60 cursor-not-allowed" : ""}`}>
                <input
                  type="radio"
                  value={t}
                  checked={type === t}
                  onChange={() => setType(t)}
                  disabled={mode === "edit"}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium">{t.charAt(0) + t.slice(1).toLowerCase()} hosted zone</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {t === "PUBLIC"
                      ? "Routes traffic on the internet"
                      : "Routes traffic within an Amazon VPC"}
                  </div>
                </div>
              </label>
            ))}
          </div>
          {mode === "edit" && (
            <p className="text-xs text-gray-500 mt-1">Zone type cannot be changed after creation.</p>
          )}
        </div>

        {/* Comment */}
        <div>
          <label className="label">Description (optional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="input resize-none"
            rows={3}
            placeholder="Brief description of this hosted zone"
          />
        </div>

        {mode === "create" && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-700">
            <strong>Note:</strong> Route53 will automatically create NS and SOA records for this zone.
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {mode === "create" ? "Creating..." : "Saving..."}
              </>
            ) : (
              mode === "create" ? "Create hosted zone" : "Save changes"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
