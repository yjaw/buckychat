import { useEffect, useState } from "react";

const VIRTUAL_CAM_KEYWORDS = [
  "obs", "virtual", "snap camera", "manycam", "droidcam",
  "epoccam", "mmhmm", "iriun", "camo", "xsplit",
];

export function useVirtualCamera(): boolean {
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVirtual = devices
          .filter((d) => d.kind === "videoinput")
          .some((d) =>
            VIRTUAL_CAM_KEYWORDS.some((k) => d.label.toLowerCase().includes(k))
          );
        setDetected(hasVirtual);
      } catch {
        // enumerateDevices failed — can't determine, assume ok
      }
    }

    check();
    navigator.mediaDevices.addEventListener("devicechange", check);
    return () => navigator.mediaDevices.removeEventListener("devicechange", check);
  }, []);

  return detected;
}
