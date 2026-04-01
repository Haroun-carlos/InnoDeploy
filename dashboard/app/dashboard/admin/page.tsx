"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { ShieldCheck, Users, UserPlus, FolderKanban, GitBranch, Server, ShieldAlert, FileText } from "lucide-react";
import Sidebar from "@/components/shared/Sidebar";
import Navbar from "@/components/shared/Navbar";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { adminApi } from "@/lib/apiClient";
import { useAuthStore } from "@/store/authStore";
import type { AdminOverviewPayload, AdminUsersPayload, AdminUser } from "@/types";

const formatDateTime = (value: string) => new Date(value).toLocaleString();

export default function AdminDashboardPage() {
  const isReady = useRequireAuth();
  const user = useAuthStore((state) => state.user);

  const [overview, setOverview] = useState<AdminOverviewPayload | null>(null);
  const [usersData, setUsersData] = useState<AdminUsersPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const canAccess = user?.role === "owner" || user?.role === "admin";

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await adminApi.getOverview({ recentDays: 7 });
      setOverview(data as AdminOverviewPayload);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || "Failed to load admin overview");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async (nextPage: number, nextSearch: string) => {
    setUsersLoading(true);
    try {
      const { data } = await adminApi.getUsers({
        page: nextPage,
        limit: 12,
        search: nextSearch || undefined,
      });
      setUsersData(data as AdminUsersPayload);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady || !canAccess) return;
    void loadOverview();
    void loadUsers(1, "");
  }, [isReady, canAccess]);

  useEffect(() => {
    if (!isReady || !canAccess) return;
    const timer = setTimeout(() => {
      setPage(1);
      void loadUsers(1, search.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [search, isReady, canAccess]);

  const stats = overview?.stats;
  const users = usersData?.users || [];
  const pagination = usersData?.pagination;

  const runUserAction = async (userId: string, action: () => Promise<unknown>) => {
    setActionLoading(userId);
    setError(null);
    try {
      await action();
      await loadUsers(page, search.trim());
      await loadOverview();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || "User action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const userRoleCounts = useMemo(() => {
    const counts: Record<AdminUser["role"], number> = {
      owner: 0,
      admin: 0,
      developer: 0,
      viewer: 0,
    };

    users.forEach((item) => {
      counts[item.role] += 1;
    });

    return [
      { role: "owner", count: counts.owner },
      { role: "admin", count: counts.admin },
      { role: "developer", count: counts.developer },
      { role: "viewer", count: counts.viewer },
    ];
  }, [users]);

  if (!isReady) return null;

  if (!canAccess) {
    return (
      <div className="flex min-h-screen bg-[#030711]">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Navbar />
          <main className="flex-1 p-6">
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
              You are not allowed to access the Admin dashboard.
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#030711]">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Navbar />
        <main className="relative flex-1 space-y-6 overflow-hidden p-6">
          <div className="pointer-events-none absolute inset-0 grid-pattern" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.06),transparent)]" />

          <section className="relative flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Admin Dashboard</h1>
              <p className="text-sm text-slate-400">
                Manage users and monitor all core models across the platform.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void loadOverview();
                void loadUsers(page, search.trim());
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
            >
              Refresh
            </button>
          </section>

          {error && (
            <div className="relative rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          <section className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {[
              { label: "All Users", value: stats?.users, icon: Users },
              { label: `New Users (${stats?.recentWindowDays || 7}d)`, value: stats?.newUsers, icon: UserPlus },
              { label: "Projects", value: stats?.projects, icon: FolderKanban },
              { label: "Pipelines", value: stats?.pipelines, icon: GitBranch },
              { label: "Hosts", value: stats?.hosts, icon: Server },
              { label: "Alerts", value: stats?.alerts, icon: ShieldAlert },
              { label: "Open Alerts", value: stats?.openAlerts, icon: ShieldCheck },
              { label: "Running Pipelines", value: stats?.runningPipelines, icon: GitBranch },
              { label: "Online Hosts", value: stats?.onlineHosts, icon: Server },
              { label: "Logs", value: stats?.logs, icon: FileText },
            ].map((card) => (
              <article
                key={card.label}
                className="rounded-2xl border border-white/10 bg-[#0a1628]/70 p-4 backdrop-blur-sm"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-400">{card.label}</p>
                  <card.icon className="h-4 w-4 text-cyan-300" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {loading ? "..." : (card.value ?? 0).toLocaleString()}
                </p>
              </article>
            ))}
          </section>

          <section className="relative grid gap-4 lg:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-[#0a1628]/70 p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-100">User Registrations (14d)</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overview?.trends.users || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-[#0a1628]/70 p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-100">Pipeline Runs (14d)</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview?.trends.pipelines || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#34d399" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-[#0a1628]/70 p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-100">Loaded User Roles</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userRoleCounts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="role" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>

          <section className="relative grid gap-4 xl:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-[#0a1628]/70 p-4">
              <h2 className="mb-3 text-base font-semibold text-white">All Users</h2>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search users by name or email"
                  className="h-10 w-full rounded-lg border border-white/10 bg-[#061122] px-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                      <th className="pb-2">Name</th>
                      <th className="pb-2">Email</th>
                      <th className="pb-2">Role</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Organisation</th>
                      <th className="pb-2">Created</th>
                      <th className="pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersLoading ? (
                      <tr>
                        <td colSpan={7} className="py-4 text-slate-400">Loading users...</td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 text-slate-400">No users found.</td>
                      </tr>
                    ) : (
                      users.map((item) => (
                        <tr key={item.id} className="border-b border-white/5 text-slate-200">
                          <td className="py-2.5">{item.name}</td>
                          <td className="py-2.5">{item.email}</td>
                          <td className="py-2.5">
                            <select
                              value={item.role}
                              disabled={actionLoading === item.id || item.id === user?.id}
                              onChange={(event) => {
                                const nextRole = event.target.value as "owner" | "admin" | "developer" | "viewer";
                                void runUserAction(item.id, () => adminApi.updateUserRole(item.id, nextRole));
                              }}
                              className="rounded-md border border-white/10 bg-[#061122] px-2 py-1 text-xs capitalize text-slate-200 outline-none"
                            >
                              <option value="owner">owner</option>
                              <option value="admin">admin</option>
                              <option value="developer">developer</option>
                              <option value="viewer">viewer</option>
                            </select>
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                                item.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
                              }`}
                            >
                              {item.isActive ? "active" : "deactivated"}
                            </span>
                          </td>
                          <td className="py-2.5">{item.organisation?.name || "-"}</td>
                          <td className="py-2.5 text-xs text-slate-400">{formatDateTime(item.createdAt)}</td>
                          <td className="py-2.5">
                            <div className="flex flex-wrap gap-1.5">
                              {item.isActive ? (
                                <button
                                  type="button"
                                  disabled={actionLoading === item.id || item.id === user?.id}
                                  onClick={() => {
                                    const reason = window.prompt("Reason for deactivation (optional)", "");
                                    void runUserAction(item.id, () => adminApi.deactivateUser(item.id, reason || undefined));
                                  }}
                                  className="rounded-md border border-amber-400/30 px-2 py-1 text-[11px] text-amber-300 disabled:opacity-40"
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={actionLoading === item.id}
                                  onClick={() => {
                                    void runUserAction(item.id, () => adminApi.activateUser(item.id));
                                  }}
                                  className="rounded-md border border-emerald-400/30 px-2 py-1 text-[11px] text-emerald-300 disabled:opacity-40"
                                >
                                  Reactivate
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={actionLoading === item.id || item.id === user?.id}
                                onClick={() => {
                                  const ok = window.confirm(`Delete user ${item.email}? This cannot be undone.`);
                                  if (!ok) return;
                                  void runUserAction(item.id, () => adminApi.deleteUser(item.id));
                                }}
                                className="rounded-md border border-rose-400/30 px-2 py-1 text-[11px] text-rose-300 disabled:opacity-40"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  {pagination ? `${pagination.total.toLocaleString()} total users` : ""}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!pagination || pagination.page <= 1}
                    onClick={() => {
                      if (!pagination) return;
                      const next = pagination.page - 1;
                      setPage(next);
                      void loadUsers(next, search.trim());
                    }}
                    className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-400">
                    Page {pagination?.page || 1} / {pagination?.totalPages || 1}
                  </span>
                  <button
                    type="button"
                    disabled={!pagination || pagination.page >= pagination.totalPages}
                    onClick={() => {
                      if (!pagination) return;
                      const next = pagination.page + 1;
                      setPage(next);
                      void loadUsers(next, search.trim());
                    }}
                    className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-[#0a1628]/70 p-4">
              <h2 className="mb-3 text-base font-semibold text-white">Recent Data Across Core Models</h2>
              <div className="space-y-4 text-sm">
                <div>
                  <h3 className="mb-2 font-medium text-cyan-300">New Users</h3>
                  <ul className="space-y-1 text-slate-300">
                    {(overview?.recent.users || []).slice(0, 5).map((item) => (
                      <li key={item.id} className="truncate">
                        {item.name} ({item.email})
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="mb-2 font-medium text-emerald-300">Projects / Pipelines / Hosts</h3>
                  <p className="text-slate-400">
                    Projects: {(overview?.recent.projects || []).length} recent, Pipelines: {(overview?.recent.pipelines || []).length} recent, Hosts: {(overview?.recent.hosts || []).length} recent.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 font-medium text-amber-300">Alerts / Logs</h3>
                  <p className="text-slate-400">
                    Alerts: {(overview?.recent.alerts || []).length} recent, Logs: {(overview?.recent.logs || []).length} recent.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#071326] p-3 text-xs text-slate-400">
                  This panel summarizes all core models requested: projects, pipelines, hosts, alerts, and logs.
                </div>
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}
