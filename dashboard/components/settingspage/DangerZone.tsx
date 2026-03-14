"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DangerZoneProps {
  slug: string;
  deleting: boolean;
  disabled?: boolean;
  onDelete: (confirmation: string) => Promise<void>;
}

export default function DangerZone({ slug, deleting, disabled, onDelete }: DangerZoneProps) {
  const [confirmation, setConfirmation] = useState("");

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl text-red-700">
          <AlertTriangle className="h-5 w-5" />
          Danger Zone
        </CardTitle>
        <CardDescription>Delete the organisation and all related projects, hosts, and alerts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Type <span className="font-semibold">{slug}</span> to confirm. This operation cannot be undone.
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-72 flex-1 space-y-2">
            <Label htmlFor="delete-confirmation">Confirmation</Label>
            <Input id="delete-confirmation" value={confirmation} disabled={disabled} onChange={(event) => setConfirmation(event.target.value)} />
          </div>
          <Button variant="destructive" disabled={disabled || deleting || confirmation !== slug} onClick={() => void onDelete(confirmation)}>
            {deleting ? "Deleting..." : "Delete organisation"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}