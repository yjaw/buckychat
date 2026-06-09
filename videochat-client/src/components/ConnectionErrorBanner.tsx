interface Props {
  /** "error" = ws.onerror fired; "offline" = disconnected after connect */
  kind: "error" | "offline";
}

export function ConnectionErrorBanner({ kind }: Props) {
  return (
    <div className="conn-error-banner" role="alert">
      <p className="conn-error-title">
        {kind === "error" ? "Couldn't connect to server" : "Connection lost"}
      </p>
      <p className="conn-error-hint">Try reloading the page.</p>
      <ul className="conn-error-reasons">
        {kind === "error" ? (
          <>
            <li>The server may be temporarily down</li>
            <li>Your network may be blocking WebSocket connections</li>
            <li>A VPN or firewall may be interfering</li>
          </>
        ) : (
          <>
            <li>Your network connection dropped</li>
            <li>The server restarted</li>
          </>
        )}
      </ul>
      <button
        className="conn-error-reload"
        onClick={() => window.location.reload()}
      >
        Reload
      </button>
    </div>
  );
}
