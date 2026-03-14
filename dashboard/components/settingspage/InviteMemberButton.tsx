"use client";

import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MemberRole } from "@/types";

interface InviteMemberButtonProps {
  disabled?: boolean;
  loading?: boolean;
  onInvite: (payload: { email: string; role: MemberRole }) => Promise<void>;
}

const roles: MemberRole[] = ["admin", "developer", "viewer"];

export default function InviteMemberButton({ disabled, loading, onInvite }: InviteMemberButtonProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("developer");

  const handleSubmit = async () => {
    await onInvite({ email, role });
    setEmail("");
    setRole("developer");
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <Button variant="outline" onClick={() => setOpen((current) => !current)} disabled={disabled}>
        {open ? <X className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
        {open ? "Close invite" : "Invite member"}
      </Button>

      {open && (
        <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 md:grid-cols-[1.5fr_180px_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              value={role}
              onChange={(event) => setRole(event.target.value as MemberRole)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {roles.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={() => void handleSubmit()} disabled={loading || !email.trim()}>
            {loading ? "Inviting..." : "Send invite"}
          </Button>
        </div>
      )}
    </div>
  );
}