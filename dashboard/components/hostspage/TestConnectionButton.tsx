"use client";

import { useState } from "react";
import { Loader2, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TestConnectionButtonProps {
  hostId: string;
  onTest: (hostId: string) => Promise<void>;
}

export default function TestConnectionButton({ hostId, onTest }: TestConnectionButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onTest(hostId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <PlugZap className="mr-1.5 h-3.5 w-3.5" />}
      {loading ? "Testing..." : "Test Connection"}
    </Button>
  );
}
