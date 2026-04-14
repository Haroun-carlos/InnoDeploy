"use client";

import { X } from "lucide-react";

interface EnvironmentNameModalProps {
  open: boolean;
  title: string;
  subtitle: string;
  value: string;
  placeholder?: string;
  submitLabel: string;
  loading?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
  onClose: () => void;
}

export default function EnvironmentNameModal({
  open,
  title,
  subtitle,
  value,
  placeholder = "production",
  submitLabel,
  loading = false,
  onChange,
  onSubmit,
  onClose,
}: EnvironmentNameModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={() => {
          if (!loading) onClose();
        }}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-cyan-500/25 bg-[linear-gradient(180deg,rgba(8,18,34,0.98),rgba(6,13,24,0.98))] p-5 shadow-[0_24px_80px_rgba(2,8,23,0.75)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-100">{title}</h3>
            <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!loading) onClose();
            }}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label htmlFor="environment-name-input" className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
          Environment Name
        </label>
        <input
          id="environment-name-input"
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void onSubmit();
            }
            if (e.key === "Escape" && !loading) {
              onClose();
            }
          }}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-700 bg-[#0a1528] px-3 py-2.5 text-sm text-slate-100 outline-none ring-0 transition placeholder:text-slate-500 focus:border-cyan-400/50"
        />

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-md border border-slate-700 px-3.5 py-2 text-sm text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              void onSubmit();
            }}
            disabled={loading || !value.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-3.5 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" />}
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
