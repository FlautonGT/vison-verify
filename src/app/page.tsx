import Link from "next/link";
import { ArrowRight, BadgeCheck, ShieldCheck, Workflow } from "lucide-react";

const sampleSessions = [
  {
    href: "/verify/session-ekyc-full-live",
    title: "Full e-KYC",
    eyebrow: "OCR + Liveness + Deepfake + Compare",
    copy: "End-to-end hosted verification for merchants that need a final decision payload and webhook callback.",
  },
  {
    href: "/verify/session-ocr-only",
    title: "OCR Only",
    eyebrow: "Document Extraction",
    copy: "Capture KTP, preprocess image, review OCR result, and deliver structured fields into merchant systems.",
  },
  {
    href: "/verify/session-liveness-only",
    title: "Liveness Only",
    eyebrow: "Biometric Proof",
    copy: "A short active challenge flow for proof-of-presence checks when no ID capture is required.",
  },
  {
    href: "/verify/session-liveness-deepfake",
    title: "Liveness + Deepfake",
    eyebrow: "Synthetic Media Defense",
    copy: "Passive selfie flow that adds deepfake screening before the merchant receives the session outcome.",
  },
];

export default function HomePage() {
  return (
    <main className="landing-shell">
      <section className="landing-hero">
        <div className="landing-copy">
          <span className="eyebrow">Hosted Verify</span>
          <h1>verify.vison.id for branded e-KYC sessions</h1>
          <p>
            A hosted verification surface for document capture, OCR review, liveness, deepfake defense, face comparison,
            and final webhook-ready session results.
          </p>
          <div className="landing-actions">
            <Link className="button button--primary" href="/verify/session-ekyc-full-live">
              Open Sample Session
              <ArrowRight size={18} />
            </Link>
            <div className="meta-row">
              <span className="meta-chip">
                <BadgeCheck size={16} />
                Session resume
              </span>
              <span className="meta-chip">
                <ShieldCheck size={16} />
                Workflow rate-limit ready
              </span>
              <span className="meta-chip">
                <Workflow size={16} />
                White-label capable
              </span>
            </div>
          </div>
        </div>

        <div className="landing-highlight">
          <div className="highlight-card">
            <div className="card-badge">Workflow surface</div>
            <h2>Designed for session-based verification</h2>
            <p>
              Each hosted session reflects a published workflow version with its own branding, steps, OCR preprocessing,
              liveness mode, webhook target, and resume window.
            </p>
            <div className="workflow-preview">
              <span>Document Capture</span>
              <span>OCR Review</span>
              <span>Liveness</span>
              <span>Deepfake</span>
              <span>Decision</span>
            </div>
          </div>
        </div>
      </section>

      <section className="sample-grid">
        {sampleSessions.map((session) => (
          <article className="sample-card" key={session.href}>
            <span className="eyebrow">{session.eyebrow}</span>
            <h2>{session.title}</h2>
            <p>{session.copy}</p>
            <Link className="button button--ghost" href={session.href}>
              Launch Session
              <ArrowRight size={18} />
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
