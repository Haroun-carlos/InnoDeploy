"use client";

import { useState, useEffect } from "react";
import { settingsApi } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, UserPlus, Shield, Code, Eye } from "lucide-react";

const ROLES = [
  { value: "owner", label: "Owner", icon: Shield, color: "text-red-400", description: "Full access" },
  { value: "admin", label: "Admin", icon: Shield, color: "text-orange-400", description: "Manage team & settings" },
  { value: "developer", label: "Developer", icon: Code, color: "text-blue-400", description: "Create & deploy" },
  { value: "viewer", label: "Viewer", icon: Eye, color: "text-slate-400", description: "Read-only" },
];

export default function TeamManagement() {
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState("developer");
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await settingsApi.inviteMember({
        email: email.trim(),
        role: selectedRole,
      });

      setSuccess(`📧 Invitation sent to ${email} as ${selectedRole}`);
      setEmail("");
      setSelectedRole("developer");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm("Remove this member?")) return;

    try {
      await settingsApi.removeMember(memberId);
      setSuccess("Member removed");
      // Refresh members list
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to remove member");
    }
  };

  const getRoleIcon = (role: string) => {
    const r = ROLES.find((r) => r.value === role);
    const Icon = r?.icon || Shield;
    return <Icon className={`h-4 w-4 ${r?.color}`} />;
  };

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <UserPlus className="h-5 w-5 text-cyan-400" />
          Invite Team Member
        </h3>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-300">
            {success}
          </div>
        )}

        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="developer@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-slate-300">
                Role
              </Label>
              <select
                id="role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/30"
              >
                {ROLES.filter((r) => r.value !== "owner").map((r) => (
                  <option key={r.value} value={r.value} className="bg-slate-900">
                    {r.label} - {r.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !email}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/30 disabled:opacity-50"
          >
            {loading ? "Sending invitation..." : "Send Invitation"}
          </Button>
        </form>
      </div>

      {/* Role Reference */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm">
        <h3 className="mb-4 text-lg font-semibold text-white">Role Permissions</h3>
        <div className="grid gap-3">
          {ROLES.map((role) => (
            <div key={role.value} className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
              {getRoleIcon(role.value)}
              <div>
                <p className="font-medium text-white">{role.label}</p>
                <p className="text-sm text-slate-400">{role.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm">
        <h3 className="mb-4 text-lg font-semibold text-white">Permissions by Role</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-2 text-left font-semibold text-slate-300">Permission</th>
                <th className="px-4 py-2 text-center font-semibold text-slate-300">Owner</th>
                <th className="px-4 py-2 text-center font-semibold text-slate-300">Admin</th>
                <th className="px-4 py-2 text-center font-semibold text-slate-300">Developer</th>
                <th className="px-4 py-2 text-center font-semibold text-slate-300">Viewer</th>
              </tr>
            </thead>
            <tbody>
              {[
                { perm: "View Projects", owner: "✓", admin: "✓", dev: "✓", viewer: "✓" },
                { perm: "Create Projects", owner: "✓", admin: "✓", dev: "✓", viewer: "✗" },
                { perm: "Deploy", owner: "✓", admin: "✓", dev: "✓", viewer: "✗" },
                { perm: "Manage Team", owner: "✓", admin: "✓", dev: "✗", viewer: "✗" },
                { perm: "Org Settings", owner: "✓", admin: "✓", dev: "✗", viewer: "✗" },
                { perm: "Delete Org", owner: "✓", admin: "✗", dev: "✗", viewer: "✗" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-slate-300">{row.perm}</td>
                  <td className="px-4 py-3 text-center text-green-400">{row.owner}</td>
                  <td className="px-4 py-3 text-center text-green-400">{row.admin}</td>
                  <td className="px-4 py-3 text-center text-green-400">{row.dev}</td>
                  <td className="px-4 py-3 text-center text-slate-500">{row.viewer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
