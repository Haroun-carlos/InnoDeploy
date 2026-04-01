"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";

/**
 * Connect to Socket.IO on mount, disconnect on unmount.
 * Returns the socket instance and connection status.
 */
export function useSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    if (socket.connected) setConnected(true);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return { socket: socketRef.current, connected };
}

/**
 * Subscribe to a specific Socket.IO event.
 * Automatically cleans up the listener on unmount.
 */
export function useSocketEvent<T = unknown>(
  event: string,
  handler: (data: T) => void
) {
  const savedHandler = useRef(handler);
  savedHandler.current = handler;

  useEffect(() => {
    const socket = getSocket();
    const listener = (data: T) => savedHandler.current(data);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [event]);
}

/**
 * Subscribe to a project's real-time events (metrics, logs, pipeline status).
 */
export function useProjectSubscription(projectId: string | null) {
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (!socket || !connected || !projectId) return;

    socket.emit("subscribe", { projectId });

    return () => {
      socket.emit("unsubscribe", { projectId });
    };
  }, [socket, connected, projectId]);

  return { socket, connected };
}

/**
 * Subscribe to a specific pipeline run's SSE-style events.
 */
export function usePipelineSubscription(runId: string | null) {
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (!socket || !connected || !runId) return;

    socket.emit("subscribe", { pipelineRunId: runId });

    return () => {
      socket.emit("unsubscribe", { pipelineRunId: runId });
    };
  }, [socket, connected, runId]);

  return { socket, connected };
}
