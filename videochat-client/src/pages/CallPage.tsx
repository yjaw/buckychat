import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Flag } from "lucide-react";
import { apiFetch } from "../lib/api";
import { CallControls } from "../components/CallControls";
import type { ServerMessage } from "../context/MatchContext";
import { useMatch } from "../context/MatchContext";

type IceConfig = {
  iceServers: RTCIceServer[];
};

type CandidateSummary = {
  type: string;
  protocol: string;
  address: string;
  port: string;
};

type DebugState = {
  stage: string;
  media: "pending" | "ok" | "error";
  iceServers: string[];
  signalingState: string;
  iceConnectionState: string;
  iceGatheringState: string;
  peerConnectionState: string;
  method: string;
  methodTone: "ok" | "warn" | "bad";
  localCandidate: CandidateSummary | null;
  remoteCandidate: CandidateSummary | null;
  localTracks: string[];
  remoteTracks: string[];
  localCandidatesSent: number;
  remoteCandidatesReceived: number;
  offersSent: number;
  answersSent: number;
  offersReceived: number;
  answersReceived: number;
  pendingSignals: number;
  pendingIceCandidates: number;
  bytesReceived: number;
  framesDecoded: number;
  lastEvent: string;
  updatedAt: string;
};

type StatsLike = {
  id?: string;
  type?: string;
  selectedCandidatePairId?: string;
  selected?: boolean;
  nominated?: boolean;
  state?: string;
  localCandidateId?: string;
  remoteCandidateId?: string;
  kind?: string;
  mediaType?: string;
  bytesReceived?: number;
  framesDecoded?: number;
};

const initialDebugState: DebugState = {
  stage: "Waiting for match",
  media: "pending",
  iceServers: [],
  signalingState: "none",
  iceConnectionState: "none",
  iceGatheringState: "none",
  peerConnectionState: "none",
  method: "Not connected",
  methodTone: "warn",
  localCandidate: null,
  remoteCandidate: null,
  localTracks: [],
  remoteTracks: [],
  localCandidatesSent: 0,
  remoteCandidatesReceived: 0,
  offersSent: 0,
  answersSent: 0,
  offersReceived: 0,
  answersReceived: 0,
  pendingSignals: 0,
  pendingIceCandidates: 0,
  bytesReceived: 0,
  framesDecoded: 0,
  lastEvent: "Idle",
  updatedAt: "-"
};

const WAITING_ROOM_ID = "waiting";
const DVD_COLORS = ["#ffffff", "#ef4444", "#facc15", "#22c55e", "#38bdf8", "#c084fc"];

function DvdScreensaver() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!stageRef.current || !logoRef.current) {
      return;
    }
    const stageElement = stageRef.current!;
    const logoElement = logoRef.current!;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let colorIndex = 0;
    let x = 24;
    let y = 136;
    let velocityX = 82;
    let velocityY = 61;
    let lastTime = performance.now();

    function setLogoColor() {
      logoElement.style.color = DVD_COLORS[colorIndex];
    }

    function clampPosition() {
      const maxX = Math.max(stageElement.clientWidth - logoElement.offsetWidth, 0);
      const maxY = Math.max(stageElement.clientHeight - logoElement.offsetHeight, 0);
      x = Math.min(Math.max(x, 0), maxX);
      y = Math.min(Math.max(y, 0), maxY);
      logoElement.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    setLogoColor();
    clampPosition();

    if (reducedMotion.matches) {
      x = Math.max((stageElement.clientWidth - logoElement.offsetWidth) / 2, 0);
      y = Math.max((stageElement.clientHeight - logoElement.offsetHeight) / 2, 0);
      logoElement.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      return;
    }

    function animate(time: number) {
      const deltaSeconds = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const maxX = Math.max(stageElement.clientWidth - logoElement.offsetWidth, 0);
      const maxY = Math.max(stageElement.clientHeight - logoElement.offsetHeight, 0);
      let hitWall = false;

      x += velocityX * deltaSeconds;
      y += velocityY * deltaSeconds;

      if (x >= maxX) {
        x = maxX;
        velocityX = -Math.abs(velocityX);
        hitWall = true;
      } else if (x <= 0) {
        x = 0;
        velocityX = Math.abs(velocityX);
        hitWall = true;
      }

      if (y >= maxY) {
        y = maxY;
        velocityY = -Math.abs(velocityY);
        hitWall = true;
      } else if (y <= 0) {
        y = 0;
        velocityY = Math.abs(velocityY);
        hitWall = true;
      }

      if (hitWall) {
        colorIndex = (colorIndex + 1) % DVD_COLORS.length;
        setLogoColor();
      }

      logoElement.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      animationFrame = window.requestAnimationFrame(animate);
    }

    const handleResize = () => {
      clampPosition();
    };

    window.addEventListener("resize", handleResize);
    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div ref={stageRef} className="dvd-screensaver" aria-hidden="true">
      <div ref={logoRef} className="dvd-logo">
        <span>DVD</span>
        <small>VIDEO</small>
      </div>
    </div>
  );
}

function nowLabel() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function summarizeIceServers(iceServers: RTCIceServer[]) {
  return iceServers.flatMap((server) => {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    return urls.map((url) => String(url));
  });
}

function summarizeTracks(stream: MediaStream | null) {
  if (!stream) {
    return [];
  }

  return stream.getTracks().map((track) => {
    const state = track.enabled ? "on" : "muted";
    return `${track.kind}: ${track.readyState}/${state}`;
  });
}

function candidateSummary(candidate: unknown): CandidateSummary | null {
  const stat = candidate as {
    candidateType?: string;
    protocol?: string;
    address?: string;
    ip?: string;
    port?: number;
    relayProtocol?: string;
  } | null;

  if (!stat) {
    return null;
  }

  return {
    type: stat.candidateType ?? "unknown",
    protocol: stat.relayProtocol ?? stat.protocol ?? "unknown",
    address: stat.address ?? stat.ip ?? "hidden",
    port: stat.port ? String(stat.port) : "-"
  };
}

function inferConnectionMethod(local: CandidateSummary | null, remote: CandidateSummary | null) {
  if (!local || !remote) {
    return { method: "Checking candidates", methodTone: "warn" as const };
  }

  if (local.type === "relay" || remote.type === "relay") {
    return { method: "TURN relay", methodTone: "ok" as const };
  }

  if (local.type === "srflx" || remote.type === "srflx" || local.type === "prflx" || remote.type === "prflx") {
    return { method: "P2P via STUN", methodTone: "ok" as const };
  }

  if (local.type === "host" && remote.type === "host") {
    return { method: "Direct P2P", methodTone: "ok" as const };
  }

  return { method: "P2P candidate pair", methodTone: "ok" as const };
}

async function collectConnectionStats(pc: RTCPeerConnection) {
  const stats = await pc.getStats();
  const reports: StatsLike[] = [];
  stats.forEach((report) => reports.push(report as StatsLike));

  const selectedCandidatePairId = reports.find(
    (stat) => stat.type === "transport" && stat.selectedCandidatePairId
  )?.selectedCandidatePairId;
  const selectedPair =
    (selectedCandidatePairId ? (stats.get(selectedCandidatePairId) as StatsLike | undefined) : undefined) ??
    reports.find(
      (stat) =>
        stat.type === "candidate-pair" &&
        (stat.selected || (stat.nominated && stat.state === "succeeded"))
    ) ??
    null;
  const inboundVideo =
    reports.find((stat) => stat.type === "inbound-rtp" && (stat.kind === "video" || stat.mediaType === "video")) ??
    null;

  const localCandidate = selectedPair?.localCandidateId
    ? candidateSummary(stats.get(selectedPair.localCandidateId))
    : null;
  const remoteCandidate = selectedPair?.remoteCandidateId
    ? candidateSummary(stats.get(selectedPair.remoteCandidateId))
    : null;
  const method = inferConnectionMethod(localCandidate, remoteCandidate);

  return {
    ...method,
    localCandidate,
    remoteCandidate,
    bytesReceived: inboundVideo?.bytesReceived ?? selectedPair?.bytesReceived ?? 0,
    framesDecoded: inboundVideo?.framesDecoded ?? selectedPair?.framesDecoded ?? 0
  };
}

function formatCandidate(candidate: CandidateSummary | null) {
  if (!candidate) {
    return "waiting";
  }

  return `${candidate.type} / ${candidate.protocol} / ${candidate.address}:${candidate.port}`;
}

function formatBytes(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${value} B`;
}

export function CallPage() {
  const navigate = useNavigate();
  const { roomID } = useParams();
  const {
    connectionState,
    queueState,
    activeMatch,
    messages,
    joinQueue,
    send,
    leaveQueue,
    clearMatch,
    clearRoomMessages
  } = useMatch();
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingSignalsRef = useRef<ServerMessage[]>([]);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const processedMessageSeqRef = useRef(0);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [splitView, setSplitView] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showControls() {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
  }
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Inappropriate behavior");
  const [reportDetails, setReportDetails] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<DebugState>(initialDebugState);

  const match = activeMatch?.roomID === roomID ? activeMatch : null;
  const waitingForMatch = roomID === WAITING_ROOM_ID && !match;

  const updateDebug = useCallback((patch: Partial<DebugState>) => {
    setDebug((current) => ({
      ...current,
      ...patch,
      updatedAt: nowLabel()
    }));
  }, []);

  const flushPendingIceCandidates = useCallback(async (pc: RTCPeerConnection) => {
    if (!pc.remoteDescription) {
      return;
    }

    for (const candidate of pendingIceCandidatesRef.current.splice(0)) {
      await pc.addIceCandidate(candidate);
    }
    updateDebug({
      pendingIceCandidates: pendingIceCandidatesRef.current.length,
      lastEvent: "Flushed queued ICE candidates"
    });
  }, [updateDebug]);

  const processSignal = useCallback(
    async (msg: ServerMessage) => {
      const pc = pcRef.current;
      if (!pc) {
        pendingSignalsRef.current.push(msg);
        updateDebug({
          pendingSignals: pendingSignalsRef.current.length,
          lastEvent: `Queued ${msg.type} before peer connection`
        });
        return;
      }

      if (msg.type === "offer") {
        setDebug((current) => ({
          ...current,
          offersReceived: current.offersReceived + 1,
          lastEvent: "Received offer",
          updatedAt: nowLabel()
        }));
        await pc.setRemoteDescription(msg.payload as RTCSessionDescriptionInit);
        await flushPendingIceCandidates(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send({ type: "answer", roomID, payload: pc.localDescription });
        setDebug((current) => ({
          ...current,
          answersSent: current.answersSent + 1,
          signalingState: pc.signalingState,
          lastEvent: "Sent answer",
          updatedAt: nowLabel()
        }));
      }

      if (msg.type === "answer") {
        setDebug((current) => ({
          ...current,
          answersReceived: current.answersReceived + 1,
          lastEvent: "Received answer",
          updatedAt: nowLabel()
        }));
        await pc.setRemoteDescription(msg.payload as RTCSessionDescriptionInit);
        await flushPendingIceCandidates(pc);
      }

      if (msg.type === "ice-candidate" && msg.payload) {
        const candidate = msg.payload as RTCIceCandidateInit;
        setDebug((current) => ({
          ...current,
          remoteCandidatesReceived: current.remoteCandidatesReceived + 1,
          lastEvent: "Received ICE candidate",
          updatedAt: nowLabel()
        }));
        if (!pc.remoteDescription) {
          pendingIceCandidatesRef.current.push(candidate);
          updateDebug({
            pendingIceCandidates: pendingIceCandidatesRef.current.length,
            lastEvent: "Queued ICE candidate until remote description"
          });
          return;
        }
        await pc.addIceCandidate(candidate);
      }
    },
    [flushPendingIceCandidates, roomID, send, updateDebug]
  );

  useEffect(() => {
    if (waitingForMatch && activeMatch) {
      navigate(`/call/${activeMatch.roomID}`, { replace: true, state: activeMatch });
    }
  }, [activeMatch, navigate, waitingForMatch]);

  useEffect(() => {
    if (!match || !roomID) {
      return;
    }

    const currentMatch = match;
    let cancelled = false;

    async function startCall() {
      try {
        updateDebug({
          ...initialDebugState,
          stage: "Requesting camera/mic and ICE config",
          lastEvent: "Starting call setup"
        });
        const [{ iceServers }, localStream] = await Promise.all([
          apiFetch<IceConfig>("/api/ice-config"),
          navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        ]);
        if (cancelled) {
          localStream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = localStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        updateDebug({
          stage: "Local media ready",
          media: "ok",
          iceServers: summarizeIceServers(iceServers),
          localTracks: summarizeTracks(localStream),
          lastEvent: "Camera/mic ready"
        });

        const pc = new RTCPeerConnection({ iceServers });
        pcRef.current = pc;
        updateDebug({
          stage: "Peer connection created",
          signalingState: pc.signalingState,
          iceConnectionState: pc.iceConnectionState,
          iceGatheringState: pc.iceGatheringState,
          peerConnectionState: pc.connectionState,
          lastEvent: "RTCPeerConnection created"
        });

        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
        pc.ontrack = (event) => {
          const [remoteStream] = event.streams;
          if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          updateDebug({
            stage: "Remote track received",
            remoteTracks: summarizeTracks(remoteStream ?? null),
            lastEvent: "Remote media track arrived"
          });
        };
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            send({ type: "ice-candidate", roomID, payload: event.candidate.toJSON() });
            setDebug((current) => ({
              ...current,
              localCandidatesSent: current.localCandidatesSent + 1,
              lastEvent: "Sent ICE candidate",
              updatedAt: nowLabel()
            }));
          } else {
            updateDebug({
              lastEvent: "ICE gathering complete",
              iceGatheringState: pc.iceGatheringState
            });
          }
        };
        pc.onsignalingstatechange = () => {
          updateDebug({
            signalingState: pc.signalingState,
            lastEvent: `Signaling ${pc.signalingState}`
          });
        };
        pc.onicegatheringstatechange = () => {
          updateDebug({
            iceGatheringState: pc.iceGatheringState,
            lastEvent: `ICE gathering ${pc.iceGatheringState}`
          });
        };
        pc.oniceconnectionstatechange = () => {
          const failed = pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected";
          updateDebug({
            iceConnectionState: pc.iceConnectionState,
            ...(failed ? { method: "ICE failed", methodTone: "bad" as const } : {}),
            lastEvent: `ICE connection ${pc.iceConnectionState}`
          });
        };
        pc.onconnectionstatechange = () => {
          const failed = pc.connectionState === "failed" || pc.connectionState === "disconnected";
          updateDebug({
            peerConnectionState: pc.connectionState,
            ...(failed ? { method: "Peer connection failed", methodTone: "bad" as const } : {}),
            lastEvent: `Peer connection ${pc.connectionState}`
          });
          if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
            setError("Could not connect. Please try another match.");
          }
        };

        for (const pending of pendingSignalsRef.current.splice(0)) {
          await processSignal(pending);
        }

        if (currentMatch.role === "initiator") {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          send({ type: "offer", roomID, payload: pc.localDescription });
          setDebug((current) => ({
            ...current,
            offersSent: current.offersSent + 1,
            signalingState: pc.signalingState,
            stage: "Offer sent",
            lastEvent: "Sent offer",
            updatedAt: nowLabel()
          }));
        }
      } catch (caught) {
        updateDebug({
          stage: "Call setup failed",
          media: "error",
          method: "Setup failed",
          methodTone: "bad",
          lastEvent: caught instanceof Error ? caught.message : "Could not start the call"
        });
        setError(caught instanceof Error ? caught.message : "Could not start the call");
      }
    }

    startCall();

    return () => {
      cancelled = true;
      pcRef.current?.close();
      pcRef.current = null;
      pendingIceCandidatesRef.current = [];
      pendingSignalsRef.current = [];
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      clearRoomMessages(roomID);
    };
  }, [clearRoomMessages, match, processSignal, roomID, send, updateDebug]);

  useEffect(() => {
    if (!match) {
      return;
    }

    const timer = window.setInterval(() => {
      const pc = pcRef.current;
      if (!pc) {
        return;
      }

      collectConnectionStats(pc)
        .then((stats) => {
          const failed =
            pc.connectionState === "failed" ||
            pc.connectionState === "disconnected" ||
            pc.iceConnectionState === "failed" ||
            pc.iceConnectionState === "disconnected";
          setDebug((current) => ({
            ...current,
            ...(failed
              ? {
                  localCandidate: stats.localCandidate,
                  remoteCandidate: stats.remoteCandidate,
                  bytesReceived: stats.bytesReceived,
                  framesDecoded: stats.framesDecoded
                }
              : stats),
            signalingState: pc.signalingState,
            iceConnectionState: pc.iceConnectionState,
            iceGatheringState: pc.iceGatheringState,
            peerConnectionState: pc.connectionState,
            localTracks: summarizeTracks(localStreamRef.current),
            remoteTracks: summarizeTracks(remoteVideoRef.current?.srcObject as MediaStream | null),
            pendingSignals: pendingSignalsRef.current.length,
            pendingIceCandidates: pendingIceCandidatesRef.current.length,
            updatedAt: nowLabel()
          }));
        })
        .catch((caught) => {
          setDebug((current) => ({
            ...current,
            lastEvent: caught instanceof Error ? caught.message : "Could not read WebRTC stats",
            updatedAt: nowLabel()
          }));
        });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [match]);

  useEffect(() => {
    if (!roomID) {
      return;
    }

    const roomMessages = messages.filter(
      (msg) => msg.seq > processedMessageSeqRef.current && msg.roomID === roomID
    );

    for (const msg of roomMessages) {
      processedMessageSeqRef.current = Math.max(processedMessageSeqRef.current, msg.seq);

      if (msg.type === "partner_left") {
        setNotice("Your partner left.");
        clearMatch();
        navigate("/call/waiting", { replace: true });
        return;
      }
      if (["offer", "answer", "ice-candidate"].includes(msg.type)) {
        processSignal(msg).catch((caught) => {
          setError(caught instanceof Error ? caught.message : "Could not process WebRTC signal");
        });
      }
    }
  }, [clearMatch, messages, navigate, processSignal, roomID]);

  if (waitingForMatch) {
    function leaveWaitingRoom() {
      leaveQueue();
      navigate("/lobby", { replace: true });
    }

    return (
      <main className="call-screen waiting-call-screen" onMouseMove={showControls} onTouchStart={showControls}>
        <section className="waiting-room-stage" aria-label="Waiting for a match">
          <DvdScreensaver />
          <div className="waiting-room-overlay" aria-live="polite">
            <p>{queueState === "waiting" ? "Finding your match" : "Entering the room"}</p>
            <h1>Enjoy the DVD logo while BuckyChat looks around.</h1>
          </div>
        </section>

        <CallControls onLeave={leaveWaitingRoom} hidden={!controlsVisible} />
      </main>
    );
  }

  if (!match && roomID !== WAITING_ROOM_ID && queueState === "waiting") {
    return <Navigate to="/call/waiting" replace />;
  }

  if (!match || !roomID) {
    return <Navigate to="/lobby" replace />;
  }

  function toggleMic() {
    const next = !micEnabled;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicEnabled(next);
    updateDebug({
      localTracks: summarizeTracks(localStreamRef.current),
      lastEvent: next ? "Microphone unmuted" : "Microphone muted"
    });
  }

  function toggleCamera() {
    const next = !cameraEnabled;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setCameraEnabled(next);
    updateDebug({
      localTracks: summarizeTracks(localStreamRef.current),
      lastEvent: next ? "Camera on" : "Camera off"
    });
  }

  function skipCall() {
    send({ type: "skip", roomID });
    clearMatch();
    joinQueue();
    navigate("/call/waiting", { replace: true });
  }

  function leaveCall() {
    send({ type: "hangup", roomID });
    clearMatch();
    navigate("/lobby", { replace: true });
  }

  async function submitReport() {
    if (!match) {
      return;
    }
    setError(null);
    await apiFetch("/api/reports", {
      method: "POST",
      body: JSON.stringify({
        reportedUserID: match.partnerID,
        roomID,
        reason: reportReason,
        details: reportDetails
      })
    });
    setReportOpen(false);
    setNotice("Report submitted.");
  }

  const debugRows = [
    ["Setup", `${debug.stage} (${debug.media})`],
    ["Socket", connectionState],
    ["Signaling", debug.signalingState],
    ["Peer", debug.peerConnectionState],
    ["ICE", `${debug.iceConnectionState} / gathering ${debug.iceGatheringState}`],
    ["Local", formatCandidate(debug.localCandidate)],
    ["Remote", formatCandidate(debug.remoteCandidate)],
    ["Tracks", `local ${debug.localTracks.length || 0} / remote ${debug.remoteTracks.length || 0}`],
    ["Data", `${formatBytes(debug.bytesReceived)} recv / ${debug.framesDecoded} frames`],
    [
      "Signals",
      `offer ${debug.offersSent}/${debug.offersReceived}, answer ${debug.answersSent}/${debug.answersReceived}`
    ],
    ["Candidates", `sent ${debug.localCandidatesSent}, received ${debug.remoteCandidatesReceived}`],
    ["Queued", `signals ${debug.pendingSignals}, ICE ${debug.pendingIceCandidates}`],
    ["Updated", debug.updatedAt]
  ];

  return (
    <main className="call-screen" onMouseMove={showControls} onTouchStart={showControls}>
      <section className={`video-stage${splitView ? " video-stage--split" : ""}`}>
        <video ref={remoteVideoRef} className="remote-video" autoPlay playsInline />
        <video
          ref={localVideoRef}
          className={`local-video${splitView ? " local-video--split" : ""}`}
          autoPlay
          playsInline
          muted
          onClick={() => setSplitView((v) => !v)}
          title={splitView ? "Exit split view" : "Expand to split view"}
        />
      </section>

      <aside className="call-debug" aria-label="WebRTC debug state">
        <div className="call-debug-header">
          <div>
            <p>WebRTC debug</p>
            <h2>{debug.method}</h2>
          </div>
          <span className={`call-debug-badge ${debug.methodTone}`}>{debug.methodTone}</span>
        </div>
        <dl className="call-debug-grid">
          {debugRows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="call-debug-foot">
          <span>ICE servers</span>
          <p>{debug.iceServers.length > 0 ? debug.iceServers.join(", ") : "none loaded"}</p>
          <span>Last event</span>
          <p>{debug.lastEvent}</p>
        </div>
      </aside>

      <CallControls
        hidden={!controlsVisible}
        micEnabled={micEnabled}
        cameraEnabled={cameraEnabled}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onReport={() => setReportOpen(true)}
        onSkip={skipCall}
        onLeave={leaveCall}
      />

      {(error || notice) && (
        <div className="toast" role="status">
          {error ?? notice}
        </div>
      )}

      {reportOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal" role="dialog" aria-modal="true" aria-label="Report user">
            <h2>Report user</h2>
            <label>
              Reason
              <select value={reportReason} onChange={(event) => setReportReason(event.target.value)}>
                <option>Inappropriate behavior</option>
                <option>Harassment</option>
                <option>Spam or scam</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Details
              <textarea
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                maxLength={1000}
                rows={4}
              />
            </label>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setReportOpen(false)}>
                Cancel
              </button>
              <button className="primary" onClick={submitReport}>
                <Flag aria-hidden="true" />
                Submit
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
