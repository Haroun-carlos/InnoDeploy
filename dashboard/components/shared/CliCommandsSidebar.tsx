"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Rocket,
  GitBranch,
  ScrollText,
  Activity,
  Server,
  Lock,
  FolderPlus,
  LogIn,
  Copy,
  Check,
} from "lucide-react";

type CommandItem = {
  cmd: string;
  desc: string;
};

type CommandGroup = {
  label: string;
  icon: React.ReactNode;
  commands: CommandItem[];
};

const COMMAND_GROUPS: CommandGroup[] = [
  {
    label: "Auth",
    icon: <LogIn className="h-3.5 w-3.5" />,
    commands: [
      { cmd: "innodeploy login", desc: "Authenticate & store JWT" },
      { cmd: "innodeploy logout", desc: "Clear credentials" },
    ],
  },
  {
    label: "Projects",
    icon: <FolderPlus className="h-3.5 w-3.5" />,
    commands: [
      { cmd: "innodeploy projects list", desc: "List all projects" },
      { cmd: "innodeploy projects create <name>", desc: "Create a project" },
    ],
  },
  {
    label: "Deploy",
    icon: <Rocket className="h-3.5 w-3.5" />,
    commands: [
      { cmd: "innodeploy deploy <project>", desc: "Trigger deployment" },
      { cmd: "innodeploy rollback <project>", desc: "Rollback to previous" },
    ],
  },
  {
    label: "Pipelines",
    icon: <GitBranch className="h-3.5 w-3.5" />,
    commands: [
      { cmd: "innodeploy pipeline trigger <project>", desc: "Run a pipeline" },
      { cmd: "innodeploy pipeline status <runId>", desc: "Check run status" },
    ],
  },
  {
    label: "Logs & Status",
    icon: <ScrollText className="h-3.5 w-3.5" />,
    commands: [
      { cmd: "innodeploy logs <project>", desc: "Stream or tail logs" },
      { cmd: "innodeploy logs <project> --follow", desc: "Live follow mode" },
      { cmd: "innodeploy status <project>", desc: "Health & metrics" },
    ],
  },
  {
    label: "Hosts",
    icon: <Server className="h-3.5 w-3.5" />,
    commands: [
      { cmd: "innodeploy hosts list", desc: "List registered hosts" },
      { cmd: "innodeploy hosts add", desc: "Add new host" },
    ],
  },
  {
    label: "Secrets",
    icon: <Lock className="h-3.5 w-3.5" />,
    commands: [
      { cmd: "innodeploy secrets set <project> <key> <value>", desc: "Set env secret" },
    ],
  },
  {
    label: "Monitoring",
    icon: <Activity className="h-3.5 w-3.5" />,
    commands: [
      { cmd: "innodeploy alerts:list", desc: "List alerts" },
      { cmd: "innodeploy env:list <projectId>", desc: "List environments" },
    ],
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover/cmd:opacity-100 transition-opacity ml-auto shrink-0 p-0.5 rounded hover:bg-white/10"
      title="Copy command"
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-400" />
      ) : (
        <Copy className="h-3 w-3 text-slate-500" />
      )}
    </button>
  );
}

interface CliCommandsSidebarProps {
  compact?: boolean;
}

export default function CliCommandsSidebar({ compact = false }: CliCommandsSidebarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    COMMAND_GROUPS.forEach((g) => (init[g.label] = !compact));
    return init;
  });

  const toggle = (label: string) => {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-1">
      <div className="mb-2 px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
          CLI Commands
        </h3>
        <p className="text-[10px] text-slate-500 mt-0.5">Click to copy, paste in terminal</p>
      </div>

      <div className="space-y-0.5">
        {COMMAND_GROUPS.map((group) => (
          <div key={group.label}>
            <button
              onClick={() => toggle(group.label)}
              className="w-full flex items-center gap-1.5 px-1.5 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:bg-white/[0.05] transition-colors"
            >
              {expanded[group.label] ? (
                <ChevronDown className="h-3 w-3 text-slate-500 shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 text-slate-500 shrink-0" />
              )}
              <span className="text-cyan-400/80">{group.icon}</span>
              {group.label}
            </button>

            {expanded[group.label] && (
              <div className="ml-3 border-l border-white/[0.06] pl-2 space-y-px mb-1">
                {group.commands.map((c) => (
                  <div
                    key={c.cmd}
                    className="group/cmd flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-white/[0.04] cursor-default"
                  >
                    <div className="min-w-0 flex-1">
                      <code className="text-[11px] text-emerald-400/90 font-mono leading-tight block truncate">
                        {c.cmd}
                      </code>
                      <span className="text-[10px] text-slate-500 leading-tight block">
                        {c.desc}
                      </span>
                    </div>
                    <CopyButton text={c.cmd} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-auto pt-3 px-1 border-t border-white/[0.06]">
        <code className="text-[10px] text-slate-500 font-mono">innodeploy --help</code>
        <span className="text-[10px] text-slate-600 block">for all options</span>
      </div>
    </div>
  );
}
