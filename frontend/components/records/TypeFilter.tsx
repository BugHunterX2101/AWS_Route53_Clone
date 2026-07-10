"use client";
import { RecordType, RECORD_TYPES } from "@/types/dns-record";

interface TypeFilterProps {
  value: RecordType | "";
  onChange: (type: RecordType | "") => void;
}

export function TypeFilter({ value, onChange }: TypeFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 whitespace-nowrap">Record type:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as RecordType | "")}
        className="border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-aws-teal bg-white"
      >
        <option value="">All types</option>
        {RECORD_TYPES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </div>
  );
}
