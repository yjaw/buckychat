import { VideoOff } from "lucide-react";

const STEPS = ['Set Camera and Microphone to "Allow"', "Reload the page"];

export function CameraPermissionBanner() {
  return (
    <div className="cam-banner" role="alert">
      <div className="cam-banner-row">
        <VideoOff className="cam-banner-icon" aria-hidden="true" />
        <span className="cam-banner-msg">
          Camera &amp; microphone access is blocked — BuckyChat needs them to connect you.
        </span>
      </div>
      <ol className="cam-banner-steps">
        {STEPS.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
