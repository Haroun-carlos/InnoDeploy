"use client";

import { useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RetryButtonProps {
  runId: string;
  onRetry: (runId: string) => Promise<void>;
}

export default function RetryButton({ runId, onRetry }: RetryButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onRetry(runId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
      ) : (
        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
      )}
      {loading ? "Retrying…" : "Retry from Failed Stage"}
    </Button>
  );
}
