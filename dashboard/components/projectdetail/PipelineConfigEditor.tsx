"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { t } from "@/lib/settingsI18n";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface PipelineConfigEditorProps {
  config: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}

export default function PipelineConfigEditor({
  config,
  readOnly = true,
  onChange,
}: PipelineConfigEditorProps) {
  const language = useLanguagePreference();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>.innodeploy.yml</span>
          <span className="text-xs font-normal text-muted-foreground">
            {readOnly ? t(language, "projectDetail.readOnly") : t(language, "projectDetail.editable")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden" style={{ minHeight: 300 }}>
          <MonacoEditor
            height="300px"
            language="yaml"
            theme="vs-dark"
            value={config}
            onChange={(val) => onChange?.(val ?? "")}
            options={{
              readOnly,
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              tabSize: 2,
              automaticLayout: true,
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
