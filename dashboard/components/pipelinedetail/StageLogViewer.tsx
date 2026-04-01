"use client";

import dynamic from "next/dynamic";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { t } from "@/lib/settingsI18n";
import type { PipelineStage } from "@/types";

const XTermViewer = dynamic(() => import("@/components/shared/XTermViewer"), { ssr: false });

interface StageLogViewerProps {
  stage: PipelineStage | null;
}

export default function StageLogViewer({ stage }: StageLogViewerProps) {
  const language = useLanguagePreference();

  if (!stage) {
    return (
      <div className="rounded-md border bg-[#0d1117] text-[#6e7681] font-mono text-xs min-h-[220px] p-4">
        {t(language, "pipeline.selectStage")}
      </div>
    );
  }

  const lines = stage.logs.length > 0
    ? [`\x1b[34m$ stage: ${stage.name}\x1b[0m`, ...stage.logs]
    : [`\x1b[34m$ stage: ${stage.name}\x1b[0m`, "\x1b[90m(no output)\x1b[0m"];

  return <XTermViewer lines={lines} height={340} />;
}
