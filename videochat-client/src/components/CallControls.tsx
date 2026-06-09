import { Camera, CameraOff, Flag, Mic, MicOff, PhoneOff, SkipForward } from "lucide-react";

interface CallControlsProps {
  onLeave: () => void;
  hidden?: boolean;
  // Optional — only shown in active call
  micEnabled?: boolean;
  cameraEnabled?: boolean;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  onReport?: () => void;
  onSkip?: () => void;
}

export function CallControls({
  onLeave,
  hidden = false,
  micEnabled,
  cameraEnabled,
  onToggleMic,
  onToggleCamera,
  onReport,
  onSkip,
}: CallControlsProps) {
  const isActiveCall = onToggleMic !== undefined;

  return (
    <footer className={`call-controls${hidden ? " call-controls--hidden" : ""}`}>
      {isActiveCall && (
        <>
          <button className="icon-button control" onClick={onToggleMic} title={micEnabled ? "Mute" : "Unmute"}>
            {micEnabled ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}
          </button>
          <button
            className="icon-button control"
            onClick={onToggleCamera}
            title={cameraEnabled ? "Turn camera off" : "Turn camera on"}
          >
            {cameraEnabled ? <Camera aria-hidden="true" /> : <CameraOff aria-hidden="true" />}
          </button>
          <button className="icon-button control" onClick={onReport} title="Report">
            <Flag aria-hidden="true" />
          </button>
          <button className="icon-button control" onClick={onSkip} title="Skip">
            <SkipForward aria-hidden="true" />
          </button>
        </>
      )}
      <button className="icon-button danger control" onClick={onLeave} title="Leave">
        <PhoneOff aria-hidden="true" />
      </button>
    </footer>
  );
}
