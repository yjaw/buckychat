import { useEffect, useState, useCallback } from "react";

export type CameraPermissionState = "unknown" | "granted" | "denied" | "prompt";

export function useCameraPermission(): {
  state: CameraPermissionState;
  request: () => Promise<void>;
} {
  const [state, setState] = useState<CameraPermissionState>("unknown");

  useEffect(() => {
    let cameraStatus: PermissionStatus | null = null;
    let micStatus: PermissionStatus | null = null;

    function resolve() {
      if (!cameraStatus || !micStatus) return;
      if (cameraStatus.state === "denied" || micStatus.state === "denied") {
        setState("denied");
      } else if (cameraStatus.state === "granted" && micStatus.state === "granted") {
        setState("granted");
      } else {
        setState("prompt");
      }
    }

    function onChange() { resolve(); }

    async function init() {
      try {
        const [cam, mic] = await Promise.all([
          navigator.permissions.query({ name: "camera" as PermissionName }),
          navigator.permissions.query({ name: "microphone" as PermissionName }),
        ]);

        cameraStatus = cam;
        micStatus = mic;
        cam.addEventListener("change", onChange);
        mic.addEventListener("change", onChange);
        resolve();

        if (cam.state === "prompt" || mic.state === "prompt") {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          stream.getTracks().forEach((t) => t.stop());
        }
      } catch {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          stream.getTracks().forEach((t) => t.stop());
          setState("granted");
        } catch {
          setState("denied");
        }
      }
    }

    init();

    return () => {
      cameraStatus?.removeEventListener("change", onChange);
      micStatus?.removeEventListener("change", onChange);
    };
  }, []);

  const request = useCallback(async () => {
    setState("prompt");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setState("granted");
    } catch {
      setState("denied");
    }
  }, []);

  return { state, request };
}
