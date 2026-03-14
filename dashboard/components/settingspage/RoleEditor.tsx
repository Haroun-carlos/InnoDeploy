"use client";

import type { MemberRole } from "@/types";

interface RoleEditorProps {
  value: MemberRole;
  disabled?: boolean;
  onChange: (role: MemberRole) => void;
}

const roles: MemberRole[] = ["owner", "admin", "developer", "viewer"];

export default function RoleEditor({ value, disabled, onChange }: RoleEditorProps) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as MemberRole)}
      className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
    >
      {roles.map((role) => (
        <option key={role} value={role}>
          {role}
        </option>
      ))}
    </select>
  );
}