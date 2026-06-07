import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Camera, CameraOff, Flag, Mic, MicOff, PhoneOff, SkipForward } from "lucide-react";
import { apiFetch } from "../lib/api";
import type { ServerMessage } from "../context/MatchContext";
import { useMatch } from "../context/MatchContext";

type IceConfig = {
  iceServers: RTCIceServer[];
};

export function CallPage() {
  const navigate = useNavigate();
  const { roomID } = useParams();
  const { activeMatch, lastMessage, send, clearMatch } = useMatch();
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingSignalsRef = useRef<ServerMessage[]>([]);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Inappropriate behavior");
  const [reportDetails, setReportDetails] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const match = activeMatch?.roomID === roomID ? activeMatch : null;

  const flushPendingIceCandidates = useCallback(async (pc: RTCPeerConnection) => {
    if (!pc.remoteDescription) {
      return;
    }

    for (const candidate of pendingIceCandidatesRef.current.splice(0)) {
      await pc.addIceCandidate(candidate);
    }
  }, []);

  const processSignal = useCallback(
    async (msg: ServerMessage) => {
      const pc = pcRef.current;
      if (!pc) {
        pendingSignalsRef.current.push(msg);
        return;
      }

      if (msg.type === "offer") {
        await pc.setRemoteDescription(msg.payload as RTCSessionDescriptionInit);
        await flushPendingIceCandidates(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send({ type: "answer", roomID, payload: pc.localDescription });
      }

      if (msg.type === "answer") {
        await pc.setRemoteDescription(msg.payload as RTCSessionDescriptionInit);
        await flushPendingIceCandidates(pc);
      }

      if (msg.type === "ice-candidate" && msg.payload) {
        const candidate = msg.payload as RTCIceCandidateInit;
        if (!pc.remoteDescription) {
          pendingIceCandidatesRef.current.push(candidate);
          return;
        }
        await pc.addIceCandidate(candidate);
      }
    },
    [flushPendingIceCandidates, roomID, send]
  );

  useEffect(() => {
    if (!match || !roomID) {
      return;
    }

    const currentMatch = match;
    let cancelled = false;

    async function startCall() {
      try {
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

        const pc = new RTCPeerConnection({ iceServers });
        pcRef.current = pc;

        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
        pc.ontrack = (event) => {
          const [remoteStream] = event.streams;
          if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        };
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            send({ type: "ice-candidate", roomID, payload: event.candidate.toJSON() });
          }
        };
        pc.onconnectionstatechange = () => {
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
        }
      } catch (caught) {
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
    };
  }, [match, processSignal, roomID, send]);

  useEffect(() => {
    if (!lastMessage || lastMessage.roomID !== roomID) {
      return;
    }
    if (lastMessage.type === "partner_left") {
      setNotice("Your partner left.");
      clearMatch();
      navigate("/lobby", { replace: true });
      return;
    }
    if (["offer", "answer", "ice-candidate"].includes(lastMessage.type)) {
      processSignal(lastMessage).catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Could not process WebRTC signal");
      });
    }
  }, [clearMatch, lastMessage, navigate, processSignal, roomID]);

  if (!match || !roomID) {
    return <Navigate to="/lobby" replace />;
  }

  function toggleMic() {
    const next = !micEnabled;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicEnabled(next);
  }

  function toggleCamera() {
    const next = !cameraEnabled;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setCameraEnabled(next);
  }

  function endCall(type: "hangup" | "skip") {
    send({ type, roomID });
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

  return (
    <main className="call-screen">
      <section className="video-stage">
        <video ref={remoteVideoRef} className="remote-video" autoPlay playsInline />
        <video ref={localVideoRef} className="local-video" autoPlay playsInline muted />
      </section>

      <footer className="call-controls">
        <button className="icon-button control" onClick={toggleMic} title={micEnabled ? "Mute" : "Unmute"}>
          {micEnabled ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}
        </button>
        <button
          className="icon-button control"
          onClick={toggleCamera}
          title={cameraEnabled ? "Turn camera off" : "Turn camera on"}
        >
          {cameraEnabled ? <Camera aria-hidden="true" /> : <CameraOff aria-hidden="true" />}
        </button>
        <button className="icon-button control" onClick={() => setReportOpen(true)} title="Report">
          <Flag aria-hidden="true" />
        </button>
        <button className="icon-button control" onClick={() => endCall("skip")} title="Skip">
          <SkipForward aria-hidden="true" />
        </button>
        <button className="icon-button danger control" onClick={() => endCall("hangup")} title="Hang up">
          <PhoneOff aria-hidden="true" />
        </button>
      </footer>

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
