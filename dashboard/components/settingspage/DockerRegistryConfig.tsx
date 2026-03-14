"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DockerRegistrySettings } from "@/types";

interface DockerRegistryConfigProps {
  value: DockerRegistrySettings;
  onChange: (value: DockerRegistrySettings) => void;
  onSubmit: () => Promise<void>;
  saving: boolean;
  disabled?: boolean;
}

export default function DockerRegistryConfig({ value, onChange, onSubmit, saving, disabled }: DockerRegistryConfigProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Docker Registry</CardTitle>
        <CardDescription>Store registry credentials for private image pulls and pushes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="registry-url">Registry URL</Label>
            <Input id="registry-url" value={value.registryUrl} disabled={disabled} onChange={(event) => onChange({ ...value, registryUrl: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registry-namespace">Namespace</Label>
            <Input id="registry-namespace" value={value.namespace} disabled={disabled} onChange={(event) => onChange({ ...value, namespace: event.target.value })} />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="registry-username">Username</Label>
            <Input id="registry-username" value={value.username} disabled={disabled} onChange={(event) => onChange({ ...value, username: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registry-password">Password</Label>
            <Input id="registry-password" type="password" value={value.password} disabled={disabled} onChange={(event) => onChange({ ...value, password: event.target.value })} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => void onSubmit()} disabled={disabled || saving}>
            {saving ? "Saving..." : "Save registry"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}