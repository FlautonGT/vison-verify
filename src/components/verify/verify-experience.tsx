"use client";
/* eslint-disable @next/next/no-img-element */

import { startTransition, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  ChevronRight,
  LockKeyhole,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import { CameraCapture } from "@/components/verify/camera-capture";
import { DesktopGate } from "@/components/verify/desktop-gate";
import { labelField, type MockVerificationSession } from "@/lib/mock-session";

type VerifyExperienceProps = {
  session: MockVerificationSession;
  apiBaseUrl?: string;
  sessionToken?: string;
  initialCurrentStage?: string;
  initialProgressData?: Record<string, unknown>;
  initialResultData?: Record<string, unknown>;
};

type VerifyStage = "welcome" | "document" | "liveness" | "processing" | "result";

type RuntimeState = {
  consentAccepted: boolean;
  currentStageIndex: number;
  documentCaptured: boolean;
  documentImage: string;
  selfieCaptured: boolean;
  selfieImage: string;
  processingIndex: number;
  completedAt: string | null;
};

function buildJourney(session: MockVerificationSession): VerifyStage[] {
  if (session.flowType === "ocr_only") {
    return ["welcome", "document", "processing", "result"];
  }
  if (session.flowType === "liveness_only" || session.flowType === "liveness_deepfake") {
    return ["welcome", "liveness", "processing", "result"];
  }
  return ["welcome", "document", "liveness", "processing", "result"];
}

function stageMeta(stage: VerifyStage, session: MockVerificationSession) {
  switch (stage) {
    case "welcome":
      return {
        title: "Verifikasi identitas aman",
        description: "Lanjutkan verifikasi sesuai workflow yang sudah disiapkan.",
      };
    case "document":
      return {
        title: `Foto ${session.documentLabel}`,
        description: `Pastikan ${session.documentLabel} berada di dalam frame dan terbaca jelas.`,
      };
    case "liveness":
      return {
        title: "Liveness check",
        description: "Ambil selfie langsung dari kamera depan untuk memastikan kehadiran pengguna.",
      };
    case "processing":
      return {
        title: "Memproses verifikasi",
        description: "Dokumen dan selfie sedang dianalisis oleh sistem verifikasi.",
      };
    case "result":
      return {
        title: "Verifikasi selesai",
        description: "Data sudah diterima dan hasil sedang atau sudah dikirim ke sistem partner.",
      };
  }
}

function stageLabels(session: MockVerificationSession) {
  return buildJourney(session).map((stage) => {
    if (stage === "welcome") return "Mulai";
    if (stage === "document") return session.documentLabel;
    if (stage === "liveness") return "Liveness";
    if (stage === "processing") return "Proses";
    return "Selesai";
  });
}

function iconForStep(stage: VerifyStage) {
  if (stage === "document") return <ScanLine size={16} />;
  if (stage === "liveness") return <Camera size={16} />;
  if (stage === "processing") return <Sparkles size={16} />;
  if (stage === "result") return <BadgeCheck size={16} />;
  return <ShieldCheck size={16} />;
}

function buildInitialState(session: MockVerificationSession, currentStage?: string, progress?: Record<string, unknown>, result?: Record<string, unknown>): RuntimeState {
  const stages = buildJourney(session);
  const nextStageIndex = stages.findIndex((stage) => stage === currentStage);
  return {
    consentAccepted: progress?.consentAccepted === true,
    currentStageIndex: nextStageIndex >= 0 ? nextStageIndex : 0,
    documentCaptured: progress?.documentCaptured === true,
    documentImage: typeof progress?.documentImage === "string" ? progress.documentImage : "",
    selfieCaptured: progress?.selfieCaptured === true,
    selfieImage: typeof progress?.selfieImage === "string" ? progress.selfieImage : "",
    processingIndex: typeof progress?.processingIndex === "number" ? progress.processingIndex : 0,
    completedAt:
      typeof result?.completedAt === "string"
        ? result.completedAt
        : typeof progress?.completedAt === "string"
          ? progress.completedAt
          : null,
  };
}

function buildProgressPayload(session: MockVerificationSession, state: RuntimeState) {
  const stages = buildJourney(session);
  return {
    consentAccepted: state.consentAccepted,
    currentStage: stages[state.currentStageIndex] || "welcome",
    documentCaptured: state.documentCaptured,
    selfieCaptured: state.selfieCaptured,
    processingIndex: state.processingIndex,
    completedAt: state.completedAt,
    formData: Object.fromEntries(session.extractedFields.map((field) => [field, labelField(field)])),
  };
}

function isMobileViewport() {
  if (typeof window === "undefined") {
    return true;
  }
  const mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
  return mobileUa || window.innerWidth <= 960;
}

function formatCompletedAt(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function VerifyExperience({
  session,
  apiBaseUrl,
  sessionToken,
  initialCurrentStage,
  initialProgressData,
  initialResultData,
}: VerifyExperienceProps) {
  const journey = useMemo(() => buildJourney(session), [session]);
  const [mobileOnly, setMobileOnly] = useState<boolean | null>(null);
  const [state, setState] = useState<RuntimeState>(() =>
    buildInitialState(session, initialCurrentStage, initialProgressData, initialResultData),
  );
  const completedSyncRef = useRef(initialCurrentStage === "result");

  useEffect(() => {
    const updateViewport = () => setMobileOnly(isMobileViewport());
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const currentStage = journey[state.currentStageIndex] || "welcome";
  const activeMeta = stageMeta(currentStage, session);
  const progressPercent = ((state.currentStageIndex + 1) / journey.length) * 100;

  function moveToStage(stage: VerifyStage) {
    const nextIndex = journey.findIndex((item) => item === stage);
    if (nextIndex < 0) {
      return;
    }
    startTransition(() => {
      setState((previous) => ({
        ...previous,
        currentStageIndex: nextIndex,
      }));
    });
  }

  const syncProgress = useEffectEvent(async (snapshot: RuntimeState) => {
    if (!apiBaseUrl || !sessionToken) {
      return;
    }

    const stage = journey[snapshot.currentStageIndex] || "welcome";
    await fetch(`${apiBaseUrl}/v1/public/verification/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: session.sessionId,
        sessionToken,
        status: stage === "processing" ? "processing" : stage === "result" ? "completed" : "in_progress",
        currentStage: stage,
        progressData: buildProgressPayload(session, snapshot),
      }),
    });
  });

  useEffect(() => {
    if (!apiBaseUrl || !sessionToken) {
      return;
    }
    if (currentStage === "processing" || currentStage === "result") {
      return;
    }

    const timeout = window.setTimeout(() => {
      void syncProgress(state);
    }, 240);

    return () => window.clearTimeout(timeout);
  }, [apiBaseUrl, currentStage, sessionToken, state]);

  const syncCompletion = useEffectEvent(async (snapshot: RuntimeState) => {
    if (!apiBaseUrl || !sessionToken) {
      return;
    }
    await fetch(`${apiBaseUrl}/v1/public/verification/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: session.sessionId,
        sessionToken,
        status: "completed",
        currentStage: "result",
        progressData: buildProgressPayload(session, snapshot),
        resultData: {
          completedAt: snapshot.completedAt || new Date().toISOString(),
          documentCaptured: snapshot.documentCaptured,
          selfieCaptured: snapshot.selfieCaptured,
          detectDeepfake: session.detectDeepfake,
        },
      }),
    });
  });

  useEffect(() => {
    if (currentStage !== "processing") {
      return;
    }
    if (state.processingIndex >= session.engineChecks.length) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setState((previous) => {
        const nextIndex = Math.min(previous.processingIndex + 1, session.engineChecks.length);
        if (nextIndex >= session.engineChecks.length) {
          return {
            ...previous,
            processingIndex: nextIndex,
            currentStageIndex: journey.findIndex((stage) => stage === "result"),
            completedAt: new Date().toISOString(),
          };
        }
        return {
          ...previous,
          processingIndex: nextIndex,
        };
      });
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [currentStage, journey, session.engineChecks.length, state.processingIndex]);

  useEffect(() => {
    if (currentStage !== "result" || completedSyncRef.current) {
      return;
    }
    completedSyncRef.current = true;
    void syncCompletion(state);
  }, [currentStage, state]);

  if (mobileOnly === null) {
    return (
      <main className="verify-loading-shell">
        <div className="verify-loading-card">
          <span className="verify-loading-dot" />
          <p>Menyiapkan tampilan verifikasi...</p>
        </div>
      </main>
    );
  }

  if (!mobileOnly) {
    return (
      <DesktopGate
        brandName={session.showPoweredByVison ? "Vison" : session.brandName}
        logoMonogram={session.showPoweredByVison ? "VS" : session.logoMonogram}
        logoUrl={session.showPoweredByVison ? "/vison-mark.svg" : session.logoUrl}
      />
    );
  }

  return (
    <main className="verify-mobile-shell">
      <section className="verify-mobile-card">
        <header className="verify-mobile-header">
          <div className="verify-mobile-brand">
            {session.showPoweredByVison ? (
              <img alt="Vison" className="brand-logo-image brand-logo-image--vison" src="/vison-mark.svg" />
            ) : session.logoUrl ? (
              <img alt={session.brandName} className="brand-logo-image" src={session.logoUrl} />
            ) : (
              <div className="brand-logo-fallback">{session.logoMonogram}</div>
            )}
            <div>
              <strong>{session.showPoweredByVison ? "Vison Verify" : session.brandName}</strong>
              <span>{activeMeta.description}</span>
            </div>
          </div>

          <div className="verify-mobile-progress">
            <div className="verify-mobile-progress__bar">
              <span style={{ width: `${progressPercent}%` }} />
            </div>
            <div
              className="verify-mobile-progress__steps"
              style={{ gridTemplateColumns: `repeat(${journey.length}, minmax(0, 1fr))` }}
            >
              {stageLabels(session).map((label, index) => (
                <div
                  className={`verify-mobile-progress__step ${index === state.currentStageIndex ? "is-active" : ""} ${index < state.currentStageIndex ? "is-done" : ""}`}
                  key={label}
                >
                  <span>{iconForStep(journey[index])}</span>
                  <small>{label}</small>
                </div>
              ))}
            </div>
          </div>
        </header>

        <section className="verify-stage-panel">
          {currentStage === "welcome" ? (
            <>
              <div className="verify-hero">
                <div className="verify-hero__icon">
                  <LockKeyhole size={24} />
                </div>
                <div>
                  <span className="verify-eyebrow">Sesi aman</span>
                  <h1>{activeMeta.title}</h1>
                  <p>
                    Anda akan melanjutkan sesi verifikasi untuk <strong>{session.brandName}</strong>. Pastikan berada
                    di tempat terang dan siapkan {session.documentLabel}.
                  </p>
                </div>
              </div>

              <div className="verify-step-list">
                {journey
                  .filter((stage) => stage !== "welcome" && stage !== "result")
                  .map((stage) => (
                    <article className="verify-step-list__item" key={stage}>
                      <span>{iconForStep(stage)}</span>
                      <div>
                        <strong>{stageMeta(stage, session).title}</strong>
                        <p>{stageMeta(stage, session).description}</p>
                      </div>
                    </article>
                  ))}
              </div>

              <label className="verify-consent">
                <input
                  checked={state.consentAccepted}
                  onChange={(event) =>
                    setState((previous) => ({
                      ...previous,
                      consentAccepted: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>Saya menyetujui kebijakan privasi dan proses verifikasi identitas ini.</span>
              </label>

              <button
                className="verify-button verify-button--primary"
                disabled={!state.consentAccepted}
                onClick={() => moveToStage(journey[1])}
                type="button"
              >
                Lanjutkan
                <ChevronRight size={18} />
              </button>
            </>
          ) : null}

          {currentStage === "document" ? (
            <>
              <CameraCapture
                description="Gunakan kamera belakang. Posisi kartu harus berada di dalam frame agar sistem dapat memotong area dokumen secara otomatis."
                mode="document"
                onCapture={(imageDataUrl) =>
                  setState((previous) => ({
                    ...previous,
                    documentCaptured: true,
                    documentImage: imageDataUrl,
                  }))
                }
                title={`Ambil foto ${session.documentLabel}`}
              />

              <button
                className="verify-button verify-button--primary"
                disabled={!state.documentCaptured}
                onClick={() => moveToStage(journey[state.currentStageIndex + 1])}
                type="button"
              >
                Lanjutkan
                <ChevronRight size={18} />
              </button>
            </>
          ) : null}

          {currentStage === "liveness" ? (
            <>
              <CameraCapture
                description="Gunakan kamera depan dan pastikan wajah berada di dalam lingkaran. Foto harus diambil langsung dari kamera."
                mode="selfie"
                onCapture={(imageDataUrl) =>
                  setState((previous) => ({
                    ...previous,
                    selfieCaptured: true,
                    selfieImage: imageDataUrl,
                  }))
                }
                title="Ambil selfie liveness"
              />

              <div className="verify-inline-note">
                <UserRoundCheck size={18} />
                <span>
                  {session.detectDeepfake
                    ? "Selfie ini akan digunakan untuk liveness dan deepfake detection."
                    : "Selfie ini akan digunakan untuk liveness verification."}
                </span>
              </div>

              <button
                className="verify-button verify-button--primary"
                disabled={!state.selfieCaptured}
                onClick={() => moveToStage(journey[state.currentStageIndex + 1])}
                type="button"
              >
                Lanjutkan
                <ChevronRight size={18} />
              </button>
            </>
          ) : null}

          {currentStage === "processing" ? (
            <>
              <div className="verify-processing-head">
                <span className="verify-processing-spinner" />
                <div>
                  <h1>{activeMeta.title}</h1>
                  <p>{activeMeta.description}</p>
                </div>
              </div>

              <div className="verify-check-list">
                {session.engineChecks.map((check, index) => {
                  const status =
                    index < state.processingIndex
                      ? "done"
                      : index === state.processingIndex
                        ? "active"
                        : "pending";

                  return (
                    <article className={`verify-check-list__item verify-check-list__item--${status}`} key={check.code}>
                      <span>{status === "done" ? <CheckCircle2 size={18} /> : <Sparkles size={18} />}</span>
                      <div>
                        <strong>{check.title}</strong>
                        <p>{check.description}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : null}

          {currentStage === "result" ? (
            <>
              <div className="verify-result">
                <div className="verify-result__badge">
                  <BadgeCheck size={22} />
                </div>
                <h1>Verifikasi berhasil dikirim</h1>
                <p>Dokumen dan selfie Anda sudah diterima. Sistem partner akan menerima hasil sesi ini secara aman.</p>
              </div>

              <div className="verify-summary-grid">
                <article className="verify-summary-card">
                  <span>Status</span>
                  <strong>Completed</strong>
                </article>
                <article className="verify-summary-card">
                  <span>Workflow</span>
                  <strong>{session.workflowId}</strong>
                </article>
                <article className="verify-summary-card">
                  <span>Selesai pada</span>
                  <strong>{formatCompletedAt(state.completedAt)}</strong>
                </article>
              </div>

              {session.extractedFields.length ? (
                <div className="verify-tag-list">
                  {session.extractedFields.map((field) => (
                    <span key={field}>{labelField(field)}</span>
                  ))}
                </div>
              ) : null}

              <button
                className="verify-button verify-button--secondary"
                onClick={() => {
                  completedSyncRef.current = false;
                  setState(buildInitialState(session, "welcome", {}, {}));
                }}
                type="button"
              >
                <RefreshCw size={18} />
                Ulangi tampilan
              </button>
            </>
          ) : null}
        </section>

        <footer className="verify-footer">
          <div className="verify-footer__brand">
            {session.showPoweredByVison ? (
              <>
                <img alt="Vison" className="verify-footer__logo" src="/vison-mark.svg" />
                <span>Secured by Vison</span>
              </>
            ) : session.logoUrl ? (
              <>
                <img alt={session.brandName} className="verify-footer__logo verify-footer__logo--merchant" src={session.logoUrl} />
                <span>Secured session for {session.brandName}</span>
              </>
            ) : (
              <>
                <div className="verify-footer__logo-fallback">{session.logoMonogram}</div>
                <span>Secured session for {session.brandName}</span>
              </>
            )}
          </div>
          <small>Sesi ini hanya dapat digunakan pada perangkat mobile yang memiliki akses kamera.</small>
        </footer>
      </section>
    </main>
  );
}
