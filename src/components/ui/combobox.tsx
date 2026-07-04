"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

export function Combobox({
  value, onChange, options, placeholder, className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = value.trim()
    ? options.filter(o => o.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 8)
    : options.slice(0, 8);

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <Input
        type="text"
        value={value}
        onFocus={() => setOpen(true)}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {filtered.map(o => (
            <button key={o} type="button" onMouseDown={() => { onChange(o); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 text-gray-700">
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
