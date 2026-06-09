import { VideoOff } from "lucide-react";

const BROWSER_STEPS: { name: string; match: () => boolean; steps: string[] }[] = [
  {
    name: "Chrome",
    match: () => /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent),
    steps: [
      "Click the info icon ⓘ in the address bar",
      'Set Camera and Microphone to "Allow"',
      "Reload the page",
    ],
  },
  {
    name: "Firefox",
    match: () => /Firefox/.test(navigator.userAgent),
    steps: [
      "Click the lock icon in the address bar",
      'Click "Connection secure" → "More information"',
      'Go to "Permissions" and clear Camera and Microphone blocks',
      "Reload the page",
    ],
  },
  {
    name: "Safari",
    match: () => /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
    steps: [
      'Open Safari → "Settings for This Website…" from the Safari menu',
      'Set Camera and Microphone to "Allow"',
      "Reload the page",
    ],
  },
  {
    name: "Edge",
    match: () => /Edg/.test(navigator.userAgent),
    steps: [
      "Click the lock icon in the address bar",
      'Set Camera and Microphone to "Allow"',
      "Reload the page",
    ],
  },
];

function detectBrowser() {
  return BROWSER_STEPS.find((b) => b.match()) ?? BROWSER_STEPS[0];
}

export function CameraPermissionBanner() {
  const browser = detectBrowser();

  return (
    <div className="cam-banner" role="alert">
      <div className="cam-banner-row">
        <VideoOff className="cam-banner-icon" aria-hidden="true" />
        <span className="cam-banner-msg">
          Camera &amp; microphone access is blocked — BuckyChat needs them to connect you.
        </span>
      </div>
      <ol className="cam-banner-steps">
        {browser.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
