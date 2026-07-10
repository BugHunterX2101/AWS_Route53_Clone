"use client";
import { Search, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onSearch: (value: string) => void;
  debounceMs?: number;
}

export function SearchBar({ placeholder = "Search...", value = "", onSearch, debounceMs = 300 }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (v: string) => {
    setLocalValue(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch(v);
    }, debounceMs);
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-9 pr-8 w-64"
      />
      {localValue && (
        <button
          onClick={() => handleChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
