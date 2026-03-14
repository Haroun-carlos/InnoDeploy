"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Bell, BellRing, Siren } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AlertSeverity, ProjectAlert } from "@/types";

const severityIcon: Record<AlertSeverity, React.ReactNode> = {
  critical: <Siren className="h-4 w-4 text-red-600" />,
  warning: <BellRing className="h-4 w-4 text-amber-500" />,
  info: <Bell className="h-4 w-4 text-blue-600" />,
};

type SortKey = "severity" | "project" | "ruleType" | "timestamp" | "status";
type SortDirection = "asc" | "desc";

interface AlertsTableProps {
  alerts: ProjectAlert[];
  selectedAlertId: string | null;
  onSelect: (alert: ProjectAlert) => void;
}

export default function AlertsTable({ alerts, selectedAlertId, onSelect }: AlertsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((left, right) => {
      const leftValue = String(left[sortKey]);
      const rightValue = String(right[sortKey]);
      const result = leftValue.localeCompare(rightValue);
      return sortDirection === "asc" ? result : -result;
    });
  }, [alerts, sortDirection, sortKey]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
    return sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Alerts</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="cursor-pointer pb-2 font-medium" onClick={() => toggleSort("severity")}><span className="flex items-center gap-1">Severity {sortIcon("severity")}</span></th>
              <th className="cursor-pointer pb-2 font-medium" onClick={() => toggleSort("project")}><span className="flex items-center gap-1">Project {sortIcon("project")}</span></th>
              <th className="cursor-pointer pb-2 font-medium" onClick={() => toggleSort("ruleType")}><span className="flex items-center gap-1">Rule {sortIcon("ruleType")}</span></th>
              <th className="pb-2 font-medium">Message</th>
              <th className="cursor-pointer pb-2 font-medium" onClick={() => toggleSort("timestamp")}><span className="flex items-center gap-1">Timestamp {sortIcon("timestamp")}</span></th>
              <th className="cursor-pointer pb-2 font-medium" onClick={() => toggleSort("status")}><span className="flex items-center gap-1">Status {sortIcon("status")}</span></th>
            </tr>
          </thead>
          <tbody>
            {sortedAlerts.map((alert) => (
              <tr
                key={alert.id}
                onClick={() => onSelect(alert)}
                className={cn(
                  "cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/50",
                  selectedAlertId === alert.id && "bg-primary/5"
                )}
              >
                <td className="py-3">
                  <div className="flex items-center gap-2 capitalize">{severityIcon[alert.severity]} {alert.severity}</div>
                </td>
                <td className="py-3">{alert.project}</td>
                <td className="py-3 capitalize">{alert.ruleType}</td>
                <td className="max-w-md py-3 text-muted-foreground">{alert.message}</td>
                <td className="py-3 whitespace-nowrap text-xs text-muted-foreground">{new Date(alert.timestamp).toLocaleString()}</td>
                <td className="py-3 capitalize">{alert.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
