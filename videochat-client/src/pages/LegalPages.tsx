import { Link } from "react-router-dom";
import { BuckyChatLogo } from "../components/BuckyChatLogo";
import type { ReactNode } from "react";

const effectiveDate = "June 8, 2026";

function LegalShell({
  title,
  eyebrow,
  children
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link className="login-brand" to="/" aria-label="BuckyChat home">
          <BuckyChatLogo markClassName="login-brand-mark" />
        </Link>
        <nav className="legal-nav" aria-label="Legal navigation">
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </nav>
      </header>

      <article className="legal-document">
        <p className="legal-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="legal-updated">Effective date: {effectiveDate}</p>
        <div className="legal-body">{children}</div>
      </article>
    </main>
  );
}

export function TermsPage() {
  return (
    <LegalShell title="Terms of Service" eyebrow="BuckyChat legal">
      <section>
        <h2>1. Agreement to these terms</h2>
        <p>
          These Terms of Service govern your access to and use of BuckyChat, a
          campus-focused live video chat service. By creating an account, signing
          in, joining a lobby, or using any part of BuckyChat, you agree to these
          terms. If you do not agree, do not use BuckyChat.
        </p>
      </section>

      <section>
        <h2>2. Eligibility</h2>
        <p>
          You must be at least 18 years old, legally able to enter into these
          terms, and use your own valid wisc.edu email address. You may not create
          an account for someone else, share your login, or use BuckyChat if your
          account has been suspended or banned.
        </p>
        <p>
          BuckyChat is an independent project and is not an official University of
          Wisconsin-Madison service unless we clearly say otherwise.
        </p>
      </section>

      <section>
        <h2>3. Your account</h2>
        <p>
          You are responsible for keeping your credentials secure and for activity
          that happens through your account. Tell us promptly if you believe your
          account has been compromised.
        </p>
      </section>

      <section>
        <h2>4. Video chat conduct</h2>
        <p>
          Use BuckyChat respectfully. You may not harass, threaten, impersonate,
          exploit, spam, dox, stalk, or abuse other users. You may not share
          unlawful, hateful, sexually explicit, violent, invasive, or otherwise
          harmful content. You may not record, screenshot, stream, or redistribute
          another user&apos;s video, audio, image, or messages without their clear
          permission.
        </p>
        <p>
          BuckyChat may review reports, restrict access, remove accounts, or ban
          users when we believe it is necessary for safety, legal compliance, or
          the integrity of the service.
        </p>
      </section>

      <section>
        <h2>5. No guarantee of private conversations</h2>
        <p>
          BuckyChat does not intentionally record or store live video calls.
          However, we cannot control other users, their devices, screen recording
          software, screenshots, or network behavior. Do not share anything on
          BuckyChat that you would not want another person to save or disclose.
        </p>
      </section>

      <section>
        <h2>6. Service availability</h2>
        <p>
          BuckyChat is provided as an early-stage service. It may be unavailable,
          interrupted, delayed, insecure, or changed at any time. We may modify,
          suspend, or discontinue the service without notice.
        </p>
      </section>

      <section>
        <h2>7. Prohibited technical conduct</h2>
        <p>
          You may not attempt to bypass access controls, scrape the service,
          overload our systems, interfere with calls, reverse engineer private
          systems, introduce malware, or use BuckyChat to violate any law,
          regulation, school policy, or third-party right.
        </p>
      </section>

      <section>
        <h2>8. Disclaimers</h2>
        <p>
          BuckyChat is provided &quot;as is&quot; and &quot;as available&quot;
          without warranties of any kind, whether express, implied, or statutory.
          We do not warrant that BuckyChat will be secure, error-free, always
          available, or meet your expectations.
        </p>
      </section>

      <section>
        <h2>9. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, BuckyChat and its operators will
          not be liable for indirect, incidental, special, consequential,
          exemplary, or punitive damages, or for lost profits, data, goodwill, or
          other intangible losses arising from or related to your use of
          BuckyChat.
        </p>
      </section>

      <section>
        <h2>10. Indemnity</h2>
        <p>
          You agree to defend, indemnify, and hold harmless BuckyChat and its
          operators from claims, liabilities, damages, losses, and expenses,
          including reasonable attorneys&apos; fees, arising from your misuse of
          BuckyChat, your content or conduct, or your violation of these terms.
        </p>
      </section>

      <section>
        <h2>11. Governing law</h2>
        <p>
          These terms are governed by the laws of the State of Wisconsin, without
          regard to conflict-of-law rules, except where another law must apply.
        </p>
      </section>

      <section>
        <h2>12. Changes</h2>
        <p>
          We may update these terms from time to time. If changes are material,
          we will try to provide reasonable notice. Your continued use of
          BuckyChat after changes become effective means you accept the updated
          terms.
        </p>
      </section>

      <section>
        <h2>13. Contact</h2>
        <p>
          For legal, safety, privacy, or account questions, contact the BuckyChat
          operator through the support channel or project owner contact provided
          with the service.
        </p>
      </section>
    </LegalShell>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" eyebrow="BuckyChat privacy">
      <section>
        <h2>1. Overview</h2>
        <p>
          This Privacy Policy explains how BuckyChat collects, uses, shares, and
          protects information when you use the service. If you do not agree with
          this policy, do not use BuckyChat.
        </p>
      </section>

      <section>
        <h2>2. Information we collect</h2>
        <p>We may collect the following information:</p>
        <ul>
          <li>Account information, such as your wisc.edu email address and user id.</li>
          <li>Authentication information handled by Supabase, including sessions and tokens.</li>
          <li>Profile, moderation, report, ban, and account-status information.</li>
          <li>Lobby, room, matchmaking, signaling, connection, and error metadata.</li>
          <li>Device, browser, IP address, log, and security information.</li>
          <li>Information you send to us when you request help or report abuse.</li>
        </ul>
        <p>
          BuckyChat does not intentionally record or store live video or audio
          call content. WebRTC calls may expose technical connection information,
          including IP address information, to infrastructure providers and, in
          some peer-to-peer cases, to call participants.
        </p>
      </section>

      <section>
        <h2>3. How we use information</h2>
        <p>We use information to:</p>
        <ul>
          <li>Create, authenticate, and secure accounts.</li>
          <li>Operate lobbies, matchmaking, calls, reports, bans, and admin tools.</li>
          <li>Debug, maintain, improve, and protect the service.</li>
          <li>Prevent abuse, fraud, spam, harassment, and security incidents.</li>
          <li>Comply with legal obligations and enforce our Terms of Service.</li>
        </ul>
      </section>

      <section>
        <h2>4. How we share information</h2>
        <p>
          We may share information with service providers that help us run
          BuckyChat, including authentication, hosting, database, logging, email,
          and infrastructure providers. We may also share information if required
          by law, to protect users or the service, to investigate abuse, or as
          part of a transfer of the project.
        </p>
        <p>We do not sell personal information.</p>
      </section>

      <section>
        <h2>5. Cookies and local storage</h2>
        <p>
          BuckyChat and its authentication providers may use cookies, local
          storage, or similar technologies to keep you signed in, maintain
          security, remember session state, and operate the service.
        </p>
      </section>

      <section>
        <h2>6. Retention</h2>
        <p>
          We keep account information while your account is active or as needed to
          operate the service. We may retain logs, reports, moderation records,
          and security records for a reasonable period to protect users, enforce
          rules, resolve disputes, and comply with legal obligations.
        </p>
      </section>

      <section>
        <h2>7. Your choices</h2>
        <p>
          You may stop using BuckyChat at any time. You may request access,
          correction, or deletion of your account information through the support
          channel or project owner contact provided with the service. Some
          information may be retained when necessary for safety, security, legal,
          or operational reasons.
        </p>
      </section>

      <section>
        <h2>8. Security</h2>
        <p>
          We use reasonable technical and organizational measures to protect
          information. No online service is perfectly secure, and we cannot
          guarantee that information will never be accessed, disclosed, altered,
          or destroyed.
        </p>
      </section>

      <section>
        <h2>9. Children and minors</h2>
        <p>
          BuckyChat is not directed to children or minors. You must be at least 18
          years old to use BuckyChat. If we learn that a person under 18 has
          created an account, we may delete or disable the account.
        </p>
      </section>

      <section>
        <h2>10. Other users</h2>
        <p>
          Other users may see, hear, record, screenshot, or disclose information
          that you choose to share during a call, even if our rules prohibit doing
          so. Use caution and do not share sensitive information in live video
          chats.
        </p>
      </section>

      <section>
        <h2>11. Changes</h2>
        <p>
          We may update this Privacy Policy from time to time. If changes are
          material, we will try to provide reasonable notice. Your continued use
          of BuckyChat after changes become effective means you accept the
          updated policy.
        </p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>
          For privacy, safety, or account questions, contact the BuckyChat
          operator through the support channel or project owner contact provided
          with the service.
        </p>
      </section>
    </LegalShell>
  );
}
