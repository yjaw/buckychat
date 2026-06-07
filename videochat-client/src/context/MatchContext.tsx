import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { WS_BASE_URL } from "../lib/api";
import { useAuth } from "./AuthContext";

export type MatchInfo = {
  roomID: string;
  partnerID: string;
  role: "initiator" | "receiver";
};

export type ServerMessage = {
  type: string;
  message?: string;
  userID?: string;
  roomID?: string;
  partnerID?: string;
  role?: MatchInfo["role"];
  from?: string;
  payload?: unknown;
};

type ClientMessage = {
  type: string;
  roomID?: string;
  payload?: unknown;
};

type MatchContextValue = {
  connectionState: "offline" | "connecting" | "connected" | "error";
  queueState: "idle" | "waiting" | "matched";
  activeMatch: MatchInfo | null;
  lastMessage: ServerMessage | null;
  error: string | null;
  joinQueue: () => void;
  leaveQueue: () => void;
  send: (message: ClientMessage) => void;
  clearMatch: () => void;
};

const MatchContext = createContext<MatchContextValue | null>(null);

export function MatchProvider({ children }: { children: ReactNode }) {
  const { session, profile } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<MatchContextValue["connectionState"]>("offline");
  const [queueState, setQueueState] = useState<MatchContextValue["queueState"]>("idle");
  const [activeMatch, setActiveMatch] = useState<MatchInfo | null>(null);
  const [lastMessage, setLastMessage] = useState<ServerMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.access_token || profile?.status !== "active") {
      wsRef.current?.close();
      wsRef.current = null;
      setConnectionState("offline");
      setQueueState("idle");
      return;
    }

    const ws = new WebSocket(`${WS_BASE_URL}/ws/match`);
    wsRef.current = ws;
    setConnectionState("connecting");
    setError(null);

    ws.onopen = () => {
      setConnectionState("connected");
      ws.send(JSON.stringify({ type: "auth", token: session.access_token }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as ServerMessage;
      setLastMessage(msg);

      if (msg.type === "waiting") {
        setQueueState("waiting");
      }
      if (msg.type === "idle") {
        setQueueState("idle");
      }
      if (msg.type === "matched" && msg.roomID && msg.partnerID && msg.role) {
        setActiveMatch({ roomID: msg.roomID, partnerID: msg.partnerID, role: msg.role });
        setQueueState("matched");
      }
      if (msg.type === "partner_left" || msg.type === "banned") {
        setActiveMatch(null);
        setQueueState("idle");
      }
      if (msg.type === "error") {
        setError(msg.message ?? "WebSocket error");
      }
    };

    ws.onerror = () => {
      setConnectionState("error");
      setError("WebSocket connection failed");
    };

    ws.onclose = () => {
      if (wsRef.current === ws) {
        setConnectionState("offline");
        setQueueState("idle");
      }
    };

    return () => {
      ws.close();
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };
  }, [session?.access_token, profile?.status]);

  const send = useCallback((message: ClientMessage) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setError("WebSocket is not connected");
      return;
    }
    ws.send(JSON.stringify(message));
  }, []);

  const value = useMemo<MatchContextValue>(
    () => ({
      connectionState,
      queueState,
      activeMatch,
      lastMessage,
      error,
      joinQueue: () => send({ type: "join" }),
      leaveQueue: () => send({ type: "leave" }),
      send,
      clearMatch: () => {
        setActiveMatch(null);
        setQueueState("idle");
      }
    }),
    [connectionState, queueState, activeMatch, lastMessage, error, send]
  );

  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>;
}

export function useMatch() {
  const value = useContext(MatchContext);
  if (!value) {
    throw new Error("useMatch must be used inside MatchProvider");
  }
  return value;
}

