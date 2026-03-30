"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import Sidebar from "@/components/shared/Sidebar";
import Navbar from "@/components/shared/Navbar";
import AddHostButton from "@/components/hostspage/AddHostButton";
import AddHostModal from "@/components/hostspage/AddHostModal";
import HostDetailPanel from "@/components/hostspage/HostDetailPanel";
import HostsList from "@/components/hostspage/HostsList";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { hostApi } from "@/lib/apiClient";
import { t } from "@/lib/settingsI18n";
import { Server } from "lucide-react";
import type { Host, HostFormData } from "@/types";

export default function HostsPage() {
  const language = useLanguagePreference();
  const isReady = useRequireAuth();
  const searchParams = useSearchParams();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [requestedHostId, setRequestedHostId] = useState<string | null>(null);
  const [selectedHostId, setSelectedHostId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedHost = useMemo(
    () => hosts.find((host) => host.id === selectedHostId) ?? hosts[0] ?? null,
    [hosts, selectedHostId]
  );

  useEffect(() => {
    if (!isReady) return;

    const loadHosts = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await hostApi.getHosts();
        const nextHosts = data.hosts as Host[];
        setHosts(nextHosts);
        setSelectedHostId((prev) => prev ?? nextHosts[0]?.id ?? null);
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load hosts");
      } finally {
        setLoading(false);
      }
    };

    loadHosts();
  }, [isReady]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextHostId = new URLSearchParams(window.location.search).get("hostId");
    setRequestedHostId(nextHostId);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (searchParams.get("add") === "1") {
      setModalOpen(true);
    }
  }, [isReady, searchParams]);

  useEffect(() => {
    if (!requestedHostId || hosts.length === 0) {
      return;
    }

    if (hosts.some((host) => host.id === requestedHostId)) {
      setSelectedHostId(requestedHostId);
    }
  }, [requestedHostId, hosts]);

  if (!isReady) return null;

  const handleAddHost = async (data: HostFormData) => {
    setError(null);
    const { data: response } = await hostApi.createHost(data);
    const newHost = response.host as Host;
    setHosts((prev) => [newHost, ...prev]);
    setSelectedHostId(newHost.id);
    setModalOpen(false);
  };

  const handleDraftConnectionTest = async (data: HostFormData) => {
    const { data: response } = await hostApi.testDraftConnection({
      ip: data.ip,
      sshUser: data.sshUser,
      sshPrivateKeyName: data.sshPrivateKeyName,
    });
    return response.output as string[];
  };

  const handleTestConnection = async (hostId: string) => {
    setError(null);
    const { data } = await hostApi.testConnection(hostId);
    if (typeof window !== "undefined") {
      window.alert((data.output as string[]).join("\n"));
    }
  };

  const handleRemoveHost = async (hostId: string) => {
    setError(null);
    await hostApi.removeHost(hostId);
    setHosts((prev) => {
      const next = prev.filter((host) => host.id !== hostId);
      if (selectedHostId === hostId && next.length > 0) {
        setSelectedHostId(next[0].id);
      } else if (next.length === 0) {
        setSelectedHostId(null);
      }
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-[#030711]">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Navbar />
        <main className="relative flex-1 space-y-6 p-6 overflow-hidden">
          {/* Background */}
          <div className="pointer-events-none absolute inset-0 grid-pattern" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.06),transparent)]" />

          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20">
                <Server className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">{t(language, "hosts.pageTitle")}</h1>
                <p className="text-sm text-slate-500">{t(language, "hosts.pageSubtitle")}</p>
              </div>
            </div>
            <AddHostButton onClick={() => setModalOpen(true)} />
          </div>

          {error && (
            <div className="relative rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-300 backdrop-blur-sm">{error}</div>
          )}

          {loading ? (
            <div className="relative rounded-2xl border border-white/[0.06] bg-[#0a1628]/60 px-4 py-10 text-center text-sm text-slate-500">{t(language, "hosts.loading")}</div>
          ) : hosts.length === 0 ? (
            <div className="relative rounded-2xl border border-white/[0.06] bg-[#0a1628]/40 px-4 py-16 text-center">
              <Server className="mx-auto h-10 w-10 text-slate-600 mb-3" />
              <p className="text-sm text-slate-500">{t(language, "hosts.empty")}</p>
            </div>
          ) : (
            <div className="relative">
              <HostsList hosts={hosts} selectedHostId={selectedHost?.id ?? null} onSelect={(host) => setSelectedHostId(host.id)} />
            </div>
          )}

          {selectedHost && (
            <div className="relative">
              <HostDetailPanel host={selectedHost} onTest={handleTestConnection} onRemove={handleRemoveHost} />
            </div>
          )}
        </main>
      </div>

      <AddHostModal open={modalOpen} onClose={() => setModalOpen(false)} onTestConnection={handleDraftConnectionTest} onSubmit={handleAddHost} />
    </div>
  );
}
