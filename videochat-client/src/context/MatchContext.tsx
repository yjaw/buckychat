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

export type ReceivedMessage = ServerMessage & {
  seq: number;
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
  lastMessage: ReceivedMessage | null;
  messages: ReceivedMessage[];
  error: string | null;
  joinQueue: () => void;
  leaveQueue: () => void;
  send: (message: ClientMessage) => void;
  clearMatch: () => void;
  clearRoomMessages: (roomID: string) => void;
};

const MatchContext = createContext<MatchContextValue | null>(null);

export function MatchProvider({ children }: { children: ReactNode }) {
  const { session, profile } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const messageSeqRef = useRef(0);
  const pendingJoinRef = useRef(false);
  const [connectionState, setConnectionState] = useState<MatchContextValue["connectionState"]>("offline");
  const [queueState, setQueueState] = useState<MatchContextValue["queueState"]>("idle");
  const [activeMatch, setActiveMatch] = useState<MatchInfo | null>(null);
  const [lastMessage, setLastMessage] = useState<ReceivedMessage | null>(null);
  const [messages, setMessages] = useState<ReceivedMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.access_token || profile?.status !== "active") {
      wsRef.current?.close();
      wsRef.current = null;
      setConnectionState("offline");
      setQueueState("idle");
      setActiveMatch(null);
      setMessages([]);
      setLastMessage(null);
      return;
    }

    const ws = new WebSocket(`${WS_BASE_URL}/ws/match`);
    wsRef.current = ws;
    setConnectionState("connecting");
    setError(null);

    ws.onopen = () => {
      setConnectionState("connected");
      ws.send(JSON.stringify({ type: "auth", token: session.access_token }));
      if (pendingJoinRef.current) {
        ws.send(JSON.stringify({ type: "join" }));
        setQueueState("waiting");
      }
    };

    ws.onmessage = (event) => {
      const raw = JSON.parse(event.data) as ServerMessage;
      const msg: ReceivedMessage = { ...raw, seq: ++messageSeqRef.current };
      setLastMessage(msg);
      setMessages((current) => [...current, msg].slice(-100));

      if (msg.type === "waiting") {
        setQueueState("waiting");
      }
      if (msg.type === "idle") {
        pendingJoinRef.current = false;
        setQueueState("idle");
      }
      if (msg.type === "matched" && msg.roomID && msg.partnerID && msg.role) {
        pendingJoinRef.current = false;
        setActiveMatch({ roomID: msg.roomID, partnerID: msg.partnerID, role: msg.role });
        setQueueState("matched");
      }
      if (msg.type === "skipped") {
        setActiveMatch(null);
        setQueueState("waiting");
        ws.send(JSON.stringify({ type: "join" }));
      }
      if (msg.type === "partner_left" || msg.type === "banned") {
        pendingJoinRef.current = false;
        setActiveMatch(null);
        setQueueState("idle");
      }
      if (msg.type === "duplicate_session") {
        pendingJoinRef.current = false;
        setActiveMatch(null);
        setQueueState("idle");
        setError("duplicate_session");
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

  const clearRoomMessages = useCallback((roomID: string) => {
    setMessages((current) => current.filter((msg) => msg.roomID !== roomID));
    setLastMessage((current) => (current?.roomID === roomID ? null : current));
  }, []);

  const value = useMemo<MatchContextValue>(
    () => ({
      connectionState,
      queueState,
      activeMatch,
      lastMessage,
      messages,
      error,
      joinQueue: () => {
        pendingJoinRef.current = true;
        setQueueState("waiting");
        send({ type: "join" });
      },
      leaveQueue: () => {
        pendingJoinRef.current = false;
        setQueueState("idle");
        send({ type: "leave" });
      },
      send,
      clearMatch: () => {
        setActiveMatch(null);
        setQueueState("idle");
      },
      clearRoomMessages
    }),
    [connectionState, queueState, activeMatch, lastMessage, messages, error, send, clearRoomMessages]
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
