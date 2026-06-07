import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Ban, RefreshCw } from "lucide-react";
import { apiFetch } from "../lib/api";

type Report = {
  id: string;
  reporterID: string;
  reportedUserID?: string;
  roomID?: string;
  reason: string;
  details?: string;
  createdAt: string;
};

export function AdminPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadReports() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ reports: Report[] }>("/api/admin/reports");
      setReports(data.reports);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load reports");
    } finally {
      setLoading(false);
    }
  }

  async function banUser(userID: string) {
    setError(null);
    try {
      await apiFetch(`/api/admin/users/${userID}/ban`, {
        method: "POST",
        body: JSON.stringify({ reason: "Banned from report review" })
      });
      await loadReports();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not ban user");
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">BuckyChat</p>
          <h1>Reports</h1>
        </div>
        <div className="topbar-actions">
          <Link className="text-link" to="/lobby">
            Lobby
          </Link>
          <button className="icon-button" onClick={loadReports} title="Refresh reports">
            <RefreshCw className={loading ? "spin" : ""} aria-hidden="true" />
          </button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Created</th>
              <th>Reason</th>
              <th>Reported user</th>
              <th>Room</th>
              <th>Details</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td>{new Date(report.createdAt).toLocaleString()}</td>
                <td>{report.reason}</td>
                <td className="mono">{report.reportedUserID ?? "Unknown"}</td>
                <td className="mono">{report.roomID ?? "None"}</td>
                <td>{report.details ?? ""}</td>
                <td>
                  {report.reportedUserID && (
                    <button className="danger small" onClick={() => banUser(report.reportedUserID!)}>
                      <Ban aria-hidden="true" />
                      Ban
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr>
                <td colSpan={6}>No reports yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
