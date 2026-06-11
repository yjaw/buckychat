import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TermsContent, PrivacyContent } from "../pages/LegalPages";

export function LegalModal() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const panel = params.get("legal") as "terms" | "privacy" | null;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panel) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [panel]);

  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  if (!panel) return null;

  function close() {
    const next = new URLSearchParams(params);
    next.delete("legal");
    navigate({ search: next.toString() }, { replace: true });
  }

  function switchTab(tab: "terms" | "privacy") {
    const next = new URLSearchParams(params);
    next.set("legal", tab);
    setParams(next, { replace: true });
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }

  return (
    <div className="legal-modal-backdrop" onClick={close} aria-modal="true" role="dialog">
      <div className="legal-modal-panel" onClick={e => e.stopPropagation()}>
        <div className="legal-modal-header">
          <div className="legal-modal-tabs">
            <button
              className={`legal-modal-tab${panel === "terms" ? " active" : ""}`}
              onClick={() => switchTab("terms")}
            >
              Terms
            </button>
            <button
              className={`legal-modal-tab${panel === "privacy" ? " active" : ""}`}
              onClick={() => switchTab("privacy")}
            >
              Privacy
            </button>
          </div>
          <button className="legal-modal-close" onClick={close} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="legal-modal-body" ref={scrollRef}>
          {panel === "terms" ? <TermsContent /> : <PrivacyContent />}
        </div>
      </div>
    </div>
  );
}
