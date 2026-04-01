"use client";

import { useEffect, useRef } from "react";

interface XTermViewerProps {
  /** Lines of text to display */
  lines: string[];
  /** Height of the terminal container */
  height?: number;
}

/**
 * xterm.js-based terminal viewer.
 * Dynamically imports xterm to avoid SSR issues.
 */
export default function XTermViewer({ lines, height = 400 }: XTermViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<any>(null);
  const fitRef = useRef<any>(null);
  const writtenCountRef = useRef(0);

  useEffect(() => {
    let disposed = false;

    (async () => {
      const { Terminal } = await import("xterm");
      const { FitAddon } = await import("@xterm/addon-fit");

      // dynamically add xterm CSS
      if (!document.getElementById("xterm-css")) {
        const link = document.createElement("link");
        link.id = "xterm-css";
        link.rel = "stylesheet";
        link.href = "https://cdn.jsdelivr.net/npm/xterm@5.5.0/css/xterm.min.css";
        document.head.appendChild(link);
      }

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
        disableStdin: true,
        convertEol: true,
        scrollback: 5000,
        cursorBlink: false,
      });

      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current);
      fit.fit();

      termRef.current = term;
      fitRef.current = fit;

      // Write initial lines
      for (const line of lines) {
        term.writeln(line);
      }
      writtenCountRef.current = lines.length;
    })();

    return () => {
      disposed = true;
      termRef.current?.dispose();
      termRef.current = null;
    };
  }, []);

  // Write new lines as they arrive
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;

    const newLines = lines.slice(writtenCountRef.current);
    for (const line of newLines) {
      term.writeln(line);
    }
    writtenCountRef.current = lines.length;
  }, [lines]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => fitRef.current?.fit();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      ref={containerRef}
      className="rounded-md border border-[#30363d] overflow-hidden"
      style={{ height, background: "#0d1117" }}
    />
  );
}
