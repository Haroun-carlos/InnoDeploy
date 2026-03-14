"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NotificationChannelsConfig } from "@/types";

interface NotificationChannelsProps {
  value: NotificationChannelsConfig;
  onChange: (value: NotificationChannelsConfig) => void;
  onSubmit: () => Promise<void>;
  saving: boolean;
  disabled?: boolean;
}

export default function NotificationChannels({ value, onChange, onSubmit, saving, disabled }: NotificationChannelsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Notification Channels</CardTitle>
        <CardDescription>Configure outbound Slack, Discord, and SMTP delivery for operational alerts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="slack-webhook">Slack webhook</Label>
            <Input id="slack-webhook" value={value.slackWebhook} disabled={disabled} onChange={(event) => onChange({ ...value, slackWebhook: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="discord-webhook">Discord webhook</Label>
            <Input id="discord-webhook" value={value.discordWebhook} disabled={disabled} onChange={(event) => onChange({ ...value, discordWebhook: event.target.value })} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="smtp-host">SMTP host</Label>
            <Input id="smtp-host" value={value.smtpHost} disabled={disabled} onChange={(event) => onChange({ ...value, smtpHost: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-port">SMTP port</Label>
            <Input id="smtp-port" type="number" value={String(value.smtpPort)} disabled={disabled} onChange={(event) => onChange({ ...value, smtpPort: Number(event.target.value) || 0 })} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="smtp-user">SMTP username</Label>
            <Input id="smtp-user" value={value.smtpUsername} disabled={disabled} onChange={(event) => onChange({ ...value, smtpUsername: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-password">SMTP password</Label>
            <Input id="smtp-password" type="password" value={value.smtpPassword} disabled={disabled} onChange={(event) => onChange({ ...value, smtpPassword: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-from">SMTP from</Label>
            <Input id="smtp-from" type="email" value={value.smtpFromEmail} disabled={disabled} onChange={(event) => onChange({ ...value, smtpFromEmail: event.target.value })} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => void onSubmit()} disabled={disabled || saving}>
            {saving ? "Saving..." : "Save channels"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}