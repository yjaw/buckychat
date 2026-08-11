import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Copy, RefreshCw, Ticket } from "lucide-react";
import { apiFetch } from "../lib/api";

type Referral = {
  id: string;
  lotteryNumber: number;
  referredEmail: string;
  createdAt: string;
};

type ReferralsResponse = {
  referralCode: string;
  referrals: Referral[];
};

function formatTicketNumber(lotteryNumber: number) {
  return String(lotteryNumber).padStart(6, "0");
}

export function InviteModal() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const open = params.get("invite") === "1";

  const [data, setData] = useState<ReferralsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function loadReferrals() {
    setLoading(true);
    setError(null);
    try {
      const next = await apiFetch<ReferralsResponse>("/api/referrals");
      setData(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load referrals");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) loadReferrals();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  function close() {
    const next = new URLSearchParams(params);
    next.delete("invite");
    navigate({ search: next.toString() }, { replace: true });
  }

  const referralLink = data ? `${window.location.origin}/register?ref=${data.referralCode}` : "";

  async function copyLink() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="legal-modal-backdrop" onClick={close} aria-modal="true" role="dialog">
      <div className="legal-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="legal-modal-header">
          <h2 className="legal-modal-title">Invite friends</h2>
          <div className="legal-modal-header-actions">
            <button className="icon-button" onClick={loadReferrals} title="Refresh">
              <RefreshCw className={loading ? "spin" : ""} aria-hidden="true" />
            </button>
            <button className="legal-modal-close" onClick={close} aria-label="Close">
              ✕
            </button>
          </div>
        </div>
        <div className="legal-modal-body">
          {error && <p className="error">{error}</p>}

          {data && (
            <div className="legal-modal-content">
              <section className="promo-banner">
                <img
                  className="promo-banner-image"
                  src="https://fpstatic.cashstar.com/faceplates/DF83TGEK/MASTER-1.gif"
                  alt="$35 Chipotle gift card"
                />
                <p>
                  The first <strong>100 lottery tickets</strong> are entered to win a{" "}
                  <strong>$35 Chipotle gift card</strong>.
                </p>
              </section>

              <section>
                <h2>Your referral link</h2>
                <p>
                  Share this link. Once someone signs up through it and confirms their wisc.edu
                  email, you&apos;ll earn a lottery ticket.
                </p>
                <div className="referral-link-row">
                  <input
                    className="referral-link-input"
                    readOnly
                    value={referralLink}
                    onFocus={(e) => e.target.select()}
                  />
                  <button className="secondary" onClick={copyLink}>
                    {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </section>

              <section>
                <h2>
                  Referrals &amp; lottery tickets <span className="mono">({data.referrals.length})</span>
                </h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Ticket number</th>
                        <th>Referred user</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.referrals.map((referral) => (
                        <tr key={referral.id}>
                          <td className="mono">
                            <Ticket size={16} aria-hidden="true" /> {formatTicketNumber(referral.lotteryNumber)}
                          </td>
                          <td>{referral.referredEmail}</td>
                        </tr>
                      ))}
                      {data.referrals.length === 0 && (
                        <tr>
                          <td colSpan={2}>No referrals yet — invite a friend to earn your first ticket.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
