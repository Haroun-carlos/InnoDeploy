"use client";

import { useState } from "react";
import { Search, Regex, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogSearchBarProps {
  value: string;
  isRegex: boolean;
  onChange: (value: string) => void;
  onRegexToggle: (enabled: boolean) => void;
}

export default function LogSearchBar({ value, isRegex, onChange, onRegexToggle }: LogSearchBarProps) {
  const [invalid, setInvalid] = useState(false);

  const handleChange = (raw: string) => {
    onChange(raw);
    if (isRegex) {
      try {
        if (raw) new RegExp(raw);
        setInvalid(false);
      } catch {
        setInvalid(true);
      }
    } else {
      setInvalid(false);
    }
  };

  const handleRegexToggle = () => {
    const next = !isRegex;
    onRegexToggle(next);
    if (!next) setInvalid(false);
    else if (value) {
      try { new RegExp(value); setInvalid(false); }
      catch { setInvalid(true); }
    }
  };

  return (
    <div className="relative flex items-center">
      <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={value}
        placeholder={isRegex ? "Search with regex…" : "Search logs…"}
        onChange={(e) => handleChange(e.target.value)}
        className={cn(
          "w-full rounded-md border bg-background pl-9 pr-20 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
          invalid && "border-red-500 focus:ring-red-500"
        )}
      />
      <div className="absolute right-2 flex items-center gap-1">
        {value && (
          <button
            onClick={() => { onChange(""); setInvalid(false); }}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
            title="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={handleRegexToggle}
          title="Toggle regex"
          className={cn(
            "flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono font-medium transition-colors",
            isRegex
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          <Regex className="h-3.5 w-3.5" />
          .*
        </button>
      </div>
      {invalid && (
        <p className="absolute -bottom-5 left-0 text-xs text-red-500">Invalid regular expression</p>
      )}
    </div>
  );
}
