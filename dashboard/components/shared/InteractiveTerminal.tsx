"use client";

import { useEffect, useRef, useState } from "react";

interface InteractiveTerminalProps {
  height?: number;
}

type ConnState = "connecting" | "connected" | "disconnected" | "reconnecting";

const WELCOME_BANNER = [
  "",
  "\x1b[36m╔══════════════════════════════════════════════════════════╗\x1b[0m",
  "\x1b[36m║\x1b[0m  \x1b[1;33mInnoDeploy CLI Terminal\x1b[0m                                \x1b[36m║\x1b[0m",
  "\x1b[36m╠══════════════════════════════════════════════════════════╣\x1b[0m",
  "\x1b[36m║\x1b[0m                                                          \x1b[36m║\x1b[0m",
  "\x1b[36m║\x1b[0m  \x1b[32minnodeploy projects list\x1b[0m      List all projects         \x1b[36m║\x1b[0m",
  "\x1b[36m║\x1b[0m  \x1b[32minnodeploy projects create\x1b[0m    Create a new project      \x1b[36m║\x1b[0m",
  "\x1b[36m║\x1b[0m  \x1b[32minnodeploy deploy <project>\x1b[0m   Trigger deployment        \x1b[36m║\x1b[0m",
  "\x1b[36m║\x1b[0m  \x1b[32minnodeploy pipeline trigger\x1b[0m   Run a pipeline            \x1b[36m║\x1b[0m",
  "\x1b[36m║\x1b[0m  \x1b[32minnodeploy logs <project>\x1b[0m     Stream logs               \x1b[36m║\x1b[0m",
  "\x1b[36m║\x1b[0m  \x1b[32minnodeploy status <project>\x1b[0m   Health & metrics          \x1b[36m║\x1b[0m",
  "\x1b[36m║\x1b[0m  \x1b[32minnodeploy hosts list\x1b[0m         Registered hosts          \x1b[36m║\x1b[0m",
  "\x1b[36m║\x1b[0m  \x1b[32minnodeploy --help\x1b[0m             All commands              \x1b[36m║\x1b[0m",
  "\x1b[36m║\x1b[0m                                                          \x1b[36m║\x1b[0m",
  "\x1b[36m║\x1b[0m  \x1b[90mYou are pre-authenticated. No login required.\x1b[0m           \x1b[36m║\x1b[0m",
  "\x1b[36m╚══════════════════════════════════════════════════════════╝\x1b[0m",
  "",
];

export default function InteractiveTerminal({ height = 260 }: InteractiveTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<any>(null);
  const fitRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [connState, setConnState] = useState<ConnState>("connecting");

  useEffect(() => {
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;

    const setup = async () => {
      const { Terminal } = await import("xterm");
      const { FitAddon } = await import("@xterm/addon-fit");

      if (disposed || !containerRef.current) return;

      const term = new Terminal({
        theme: {
          background: "#0d1117",
          foreground: "#e6edf3",
          cursor: "#58a6ff",
          selectionBackground: "#264f78",
        },
        fontSize: 13,
        fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
        cursorBlink: true,
        disableStdin: false,
        convertEol: true,
        scrollback: 5000,
      });

      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current);
      fit.fit();

      termRef.current = term;
      fitRef.current = fit;

      const connect = () => {
        if (disposed) return;

        const accessToken = localStorage.getItem("accessToken");
        if (!accessToken) {
          term.writeln("\r\n\x1b[31m[Error] Not authenticated. Please log in.\x1b[0m");
          setConnState("disconnected");
          return;
        }

        const configuredBase = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:7070";
        const wsHttpBase = configuredBase.replace(/^ws/i, "http").replace(/\/+$/, "");
        const wsUrl = `${wsHttpBase}/ws?token=${encodeURIComponent(accessToken)}`.replace(/^http/i, "ws");

        setConnState(reconnectAttempts === 0 ? "connecting" : "reconnecting");
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          reconnectAttempts = 0;
          setConnState("connected");
          // Send tokens so the backend can pre-authenticate the CLI
          const dims = fit.proposeDimensions();
          ws.send(
            JSON.stringify({
              type: "terminal.start",
              cols: dims?.cols || 80,
              rows: dims?.rows || 24,
              accessToken,
              refreshToken: localStorage.getItem("refreshToken") || "",
            })
          );
          // Show welcome banner
          for (const line of WELCOME_BANNER) {
            term.writeln(line);
          }
        };

        ws.onmessage = (event: MessageEvent<string>) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "terminal.output") {
              term.write(msg.data);
            } else if (msg.type === "terminal.exit") {
              term.writeln(`\r\n\x1b[33m[Process exited with code ${msg.code}]\x1b[0m`);
            }
          } catch {
            // ignore non-JSON
          }
        };

        ws.onclose = () => {
          if (disposed) return;
          setConnState("reconnecting");
          reconnectAttempts += 1;
          const delay = Math.min(500 * 2 ** Math.min(reconnectAttempts, 6), 15000);
          reconnectTimer = setTimeout(connect, delay);
        };

        ws.onerror = () => {
          ws.close();
        };
      };

      // Send keystrokes to the backend
      term.onData((data: string) => {
        const ws = wsRef.current;
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "terminal.data", data }));
        }
      });

      // Handle resize
      const handleResize = () => {
        fit.fit();
        const dims = fit.proposeDimensions();
        const ws = wsRef.current;
        if (ws?.readyState === WebSocket.OPEN && dims) {
          ws.send(JSON.stringify({ type: "terminal.resize", cols: dims.cols, rows: dims.rows }));
        }
      };
      window.addEventListener("resize", handleResize);

      connect();

      // Cleanup
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    };

    const cleanupPromise = setup();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
      termRef.current?.dispose();
      termRef.current = null;
      cleanupPromise?.then((cleanup) => cleanup?.());
    };
  }, []);

  const stateColors: Record<ConnState, string> = {
    connecting: "text-yellow-300 bg-yellow-500/10 border-yellow-500/20",
    connected: "text-green-300 bg-green-500/10 border-green-500/20",
    disconnected: "text-red-300 bg-red-500/10 border-red-500/20",
    reconnecting: "text-yellow-300 bg-yellow-500/10 border-yellow-500/20",
  };

  return (
    <div className="space-y-2">
      <span
        className={`text-xs rounded-full border px-3 py-1 ${stateColors[connState]}`}
      >
        {connState}
      </span>
      <div
        ref={containerRef}
        className="rounded-md border border-[#30363d] overflow-hidden"
        style={{ height, background: "#0d1117" }}
      />
    </div>
  );
}
