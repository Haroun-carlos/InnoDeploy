"use client";

import { RotateCcw, Loader2, ChevronDown, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { t } from "@/lib/settingsI18n";
import type { Deployment } from "@/types";

interface RollbackButtonProps {
  onRollback: (version: string) => Promise<void>;
  deployments: Deployment[];
  rollbackStatus?: "idle" | "rolling-back" | "checking-health" | "complete";
  rollbackMessage?: string | null;
}

export default function RollbackButton({ onRollback, deployments, rollbackStatus = "idle", rollbackMessage = null }: RollbackButtonProps) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const language = useLanguagePreference();
  const containerRef = useRef<HTMLDivElement>(null);

  // Get previous versions (exclude current/latest)
  const availableVersions = deployments.slice(1).slice(0, 10);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowVersions(false);
      }
    };

    if (showVersions) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showVersions]);

  const handleVersionSelect = (version: string) => {
    setSelectedVersion(version);
    setShowVersions(false);
    setConfirming(true);
  };

  const handleClick = () => {
    // If menu is open, close it
    if (showVersions) {
      setShowVersions(false);
      return;
    }
    
    // If not confirming, open menu
    if (!confirming) {
      setShowVersions(true);
      return;
    }
    
    // If confirming, perform rollback
    performRollback();
  };

  const performRollback = async () => {
    if (!selectedVersion) return;
    setLoading(true);
    try {
      await onRollback(selectedVersion);
      setSelectedVersion("");
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 relative" ref={containerRef}>
        <div className="relative w-full">
          <Button
            variant={confirming || rollbackStatus !== "idle" ? "destructive" : "outline"}
            onClick={handleClick}
            disabled={loading || availableVersions.length === 0 || rollbackStatus !== "idle"}
            className="justify-between w-full"
          >
            {loading || rollbackStatus !== "idle" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            <span className="flex-1 text-left">
              {rollbackStatus === "rolling-back" || rollbackStatus === "checking-health"
                ? t(language, "projectDetail.rollingBack")
                : loading
                ? t(language, "projectDetail.rollingBack")
                : confirming
                  ? t(language, "projectDetail.confirmRollback")
                  : t(language, "projectDetail.rollback")}
            </span>
            {showVersions ? (
              <X className="h-4 w-4 ml-2" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-2" />
            )}
          </Button>

          {showVersions && availableVersions.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-background border rounded-md shadow-lg z-50">
              <div className="max-h-64 overflow-y-auto">
                {availableVersions.map((deployment) => (
                  <button
                    key={deployment.id}
                    onClick={() => handleVersionSelect(deployment.version)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors border-b last:border-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs">{deployment.version}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        deployment.status === "success"
                          ? "bg-green-500/20 text-green-600"
                          : deployment.status === "failed"
                            ? "bg-red-500/20 text-red-600"
                            : "bg-blue-500/20 text-blue-600"
                      }`}>
                        {deployment.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {deployment.strategy} · {deployment.triggeredBy}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {confirming && !loading && (
          <Button variant="ghost" size="sm" onClick={() => {
            setConfirming(false);
            setSelectedVersion("");
            setShowVersions(false);
          }}>
            {t(language, "actions.cancel")}
          </Button>
        )}
      </div>

      {/* Status Message Below Rollback Button */}
      {rollbackMessage && (
        <div className={`px-3 py-3 rounded-md border text-sm font-medium flex items-center gap-2 ${
          rollbackStatus === "complete"
            ? "bg-green-500/30 border-green-400/60 text-green-200"
            : "bg-blue-500/30 border-blue-400/60 text-blue-200"
        }`}>
          {rollbackStatus === "rolling-back" && (
            <div className="w-4 h-4 rounded-full border-2 border-blue-200/40 border-t-blue-200 animate-spin flex-shrink-0" />
          )}
          {rollbackStatus === "checking-health" && (
            <div className="w-4 h-4 rounded-full border-2 border-blue-200/40 border-t-blue-200 animate-spin flex-shrink-0" />
          )}
          {rollbackStatus === "complete" && (
            <span className="flex-shrink-0 text-lg">✅</span>
          )}
          <span className="flex-1">{rollbackMessage}</span>
        </div>
      )}

      {availableVersions.length === 0 && (
        <span className="text-xs text-muted-foreground">{t(language, "projectDetail.noVersionsAvailable")}</span>
      )}
    </div>
  );
}
