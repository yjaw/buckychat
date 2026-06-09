import { Camera, CameraOff, Flag, Mic, MicOff, PhoneOff, SkipForward } from "lucide-react";

interface CallControlsProps {
  onLeave: () => void;
  hidden?: boolean;
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
          <div className="ctrl-wrap" data-tooltip={micEnabled ? "Mute" : "Unmute"}>
            <button className="icon-button control" onClick={onToggleMic}>
              {micEnabled ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}
            </button>
          </div>
          <div className="ctrl-wrap" data-tooltip={cameraEnabled ? "Camera off" : "Camera on"}>
            <button className="icon-button control" onClick={onToggleCamera}>
              {cameraEnabled ? <Camera aria-hidden="true" /> : <CameraOff aria-hidden="true" />}
            </button>
          </div>
          <div className="ctrl-wrap" data-tooltip="Report">
            <button className="icon-button control" onClick={onReport}>
              <Flag aria-hidden="true" />
            </button>
          </div>
          <div className="ctrl-wrap" data-tooltip="Skip">
            <button className="icon-button control" onClick={onSkip}>
              <SkipForward aria-hidden="true" />
            </button>
          </div>
        </>
      )}
      <div className="ctrl-wrap" data-tooltip="Leave">
        <button className="icon-button danger control" onClick={onLeave}>
          <PhoneOff aria-hidden="true" />
        </button>
      </div>
    </footer>
  );
}
