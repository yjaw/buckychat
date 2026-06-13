import { useState } from "react";
import { VideoOff, X } from "lucide-react";

export function VirtualCameraBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="cam-banner" role="alert">
      <div className="cam-banner-row">
        <VideoOff className="cam-banner-icon" aria-hidden="true" />
        <span className="cam-banner-msg">
          A virtual camera (e.g. OBS) is detected. Other users may report your video as fake.
        </span>
        <button
          className="cam-banner-dismiss"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
