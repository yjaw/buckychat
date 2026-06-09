import { Link } from "react-router-dom";

export function PageFooter() {
  return (
    <footer className="landing-legal">
      <span className="landing-legal-copy">&copy; 2026 Madisoft LLC</span>
      <Link to="/terms">Terms</Link>
      <Link to="/privacy">Privacy</Link>
    </footer>
  );
}
