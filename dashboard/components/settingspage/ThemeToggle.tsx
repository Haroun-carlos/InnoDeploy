"use client";

import { Moon, Monitor, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThemePreference } from "@/types";

interface ThemeToggleProps {
  value: ThemePreference;
  disabled?: boolean;
  onChange: (value: ThemePreference) => void;
}

const options: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function ThemeToggle({ value, disabled, onChange }: ThemeToggleProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map(({ value: optionValue, label, icon: Icon }) => (
        <button
          key={optionValue}
          type="button"
          disabled={disabled}
          onClick={() => onChange(optionValue)}
          className={cn(
            "flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
            value === optionValue ? "border-primary bg-primary/10 text-primary" : "border-input bg-background text-muted-foreground hover:bg-accent",
            disabled && "cursor-not-allowed opacity-60"
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}