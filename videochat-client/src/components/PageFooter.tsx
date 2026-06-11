import { Link } from "react-router-dom";

export function PageFooter() {
  return (
    <footer className="landing-legal">
      <span className="landing-legal-copy">&copy; 2026 Madisoft LLC</span>
      <Link to="?legal=terms">Terms</Link>
      <Link to="?legal=privacy">Privacy</Link>
      <a href="https://tally.so" target="_blank" rel="noreferrer">Feedback</a>
    </footer>
  );
}
