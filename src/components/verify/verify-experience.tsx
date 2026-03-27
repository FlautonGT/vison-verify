"use client";

import Link from "next/link";
import { startTransition, useEffect, useEffectEvent, useId, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Camera,
  Check,
  CheckCircle2,
  ChevronsRight,
  Circle,
  Clock3,
  Cpu,
  FileCheck2,
  Fingerprint,
  Home,
  IdCard,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Webhook,
  Workflow,
  Zap,
} from "lucide-react";
import {
  labelField,
  type MockVerificationSession,
  type VerificationStageKey,
} from "@/lib/mock-session";

type VerifyExperienceProps = {
  session: MockVerificationSession;
  apiBaseUrl?: string;
  sessionToken?: string;
  initialCurrentStage?: string;
  initialProgressData?: Record<string, unknown>;
  initialResultData?: Record<string, unknown>;
};

type SessionState = {
  currentStage: number;
  documentCaptured: boolean;
  documentFileName: string;
  reviewConfirmed: boolean;
  livenessCaptured: boolean;
  processingIndex: number;
  formData: Record<string, string>;
  checkpointAt: string | null;
  completedAt: string | null;
};

const resultStageStatus = "approved";

function toRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const normalized =
    value.length === 3
      ? value
          .split("")
          .map((segment) => `${segment}${segment}`)
          .join("")
      : value;

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function readBoolean(value: unknown) {
  return value === true;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readStringMap(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const next: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") {
      next[key] = entry;
    }
  }
  return next;
}

function stageIndexFromKey(session: MockVerificationSession, currentStage?: string) {
  if (!currentStage) {
    return 0;
  }
  const nextIndex = session.stages.findIndex((item) => item.key === currentStage);
  return nextIndex >= 0 ? nextIndex : 0;
}

function buildProgressPayload(state: SessionState, session: MockVerificationSession) {
  return {
    currentStage: session.stages[state.currentStage]?.key || "welcome",
    documentCaptured: state.documentCaptured,
    documentFileName: state.documentFileName,
    reviewConfirmed: state.reviewConfirmed,
    livenessCaptured: state.livenessCaptured,
    processingIndex: state.processingIndex,
    formData: state.formData,
    checkpointAt: state.checkpointAt,
    completedAt: state.completedAt,
  };
}

function buildInitialState(
  session: MockVerificationSession,
  initialCurrentStage?: string,
  initialProgressData?: Record<string, unknown>,
  initialResultData?: Record<string, unknown>,
): SessionState {
  const formData = {
    ...session.sampleData,
    ...readStringMap(initialProgressData?.formData),
  };
  return {
    currentStage: stageIndexFromKey(session, initialCurrentStage),
    documentCaptured: readBoolean(initialProgressData?.documentCaptured),
    documentFileName:
      typeof initialProgressData?.documentFileName === "string"
        ? initialProgressData.documentFileName
        : `${session.documentLabel.toLowerCase()}-capture.jpg`,
    reviewConfirmed: readBoolean(initialProgressData?.reviewConfirmed),
    livenessCaptured: readBoolean(initialProgressData?.livenessCaptured),
    processingIndex: readNumber(initialProgressData?.processingIndex),
    formData,
    checkpointAt: typeof initialProgressData?.checkpointAt === "string" ? initialProgressData.checkpointAt : null,
    completedAt:
      typeof initialResultData?.completedAt === "string"
        ? initialResultData.completedAt
        : typeof initialProgressData?.completedAt === "string"
          ? initialProgressData.completedAt
          : null,
  };
}

function formatTimeLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function stageIcon(step: VerificationStageKey) {
  if (step === "document") return <IdCard size={18} />;
  if (step === "review") return <FileCheck2 size={18} />;
  if (step === "liveness") return <Camera size={18} />;
  if (step === "processing") return <Cpu size={18} />;
  if (step === "result") return <BadgeCheck size={18} />;
  return <ShieldCheck size={18} />;
}

export function VerifyExperience({
  session,
  apiBaseUrl,
  sessionToken,
  initialCurrentStage,
  initialProgressData,
  initialResultData,
}: VerifyExperienceProps) {
  const stages = session.stages;
  const fileInputId = useId();
  const storageKey = useMemo(() => `vison.verify.session.${session.sessionId}`, [session.sessionId]);
  const themeStyle = useMemo(
    () =>
      ({
        "--brand-primary": session.primaryColor,
        "--brand-secondary": session.secondaryColor,
      }) as React.CSSProperties,
    [session.primaryColor, session.secondaryColor],
  );

  const storageReadyRef = useRef(false);
  const completePostedRef = useRef(initialCurrentStage === "result");
  const [resumedNotice, setResumedNotice] = useState(false);
  const [state, setState] = useState<SessionState>(() =>
    buildInitialState(session, initialCurrentStage, initialProgressData, initialResultData),
  );

  const currentStage = stages[state.currentStage] ?? stages[0];
  const resultStageIndex = stages.findIndex((item) => item.key === "result");

  function updateSession(next: Partial<SessionState>) {
    setState((previous) => ({
      ...previous,
      ...next,
      checkpointAt: new Date().toISOString(),
    }));
  }

  function moveToNextStage() {
    startTransition(() => {
      setState((previous) => ({
        ...previous,
        currentStage: Math.min(previous.currentStage + 1, stages.length - 1),
        checkpointAt: new Date().toISOString(),
      }));
    });
  }

  function restartSession() {
    window.localStorage.removeItem(storageKey);
    setResumedNotice(false);
    completePostedRef.current = false;
    setState(buildInitialState(session, initialCurrentStage, initialProgressData, initialResultData));
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const rawValue = window.localStorage.getItem(storageKey);
      if (!rawValue) {
        storageReadyRef.current = true;
        return;
      }

      try {
        const stored = JSON.parse(rawValue) as SessionState & { checkpointAt?: string | null };
        const checkpointAt = stored.checkpointAt ? new Date(stored.checkpointAt).getTime() : 0;
        const isFresh =
          session.resumeWindowMinutes > 0 &&
          checkpointAt > 0 &&
          Date.now() - checkpointAt <= session.resumeWindowMinutes * 60 * 1000;

        if (isFresh) {
          storageReadyRef.current = true;
          setState({
            ...buildInitialState(session, initialCurrentStage, initialProgressData, initialResultData),
            ...stored,
            formData: {
              ...session.sampleData,
              ...(stored.formData || {}),
            },
          });
          setResumedNotice(true);
        } else {
          window.localStorage.removeItem(storageKey);
          storageReadyRef.current = true;
        }
      } catch {
        window.localStorage.removeItem(storageKey);
        storageReadyRef.current = true;
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [initialCurrentStage, initialProgressData, initialResultData, session, storageKey]);

  useEffect(() => {
    if (!storageReadyRef.current) {
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...state,
        checkpointAt: new Date().toISOString(),
      }),
    );
  }, [state, storageKey]);

  const syncProgress = useEffectEvent(async (snapshot: SessionState) => {
    if (!apiBaseUrl || !sessionToken) {
      return;
    }

    await fetch(`${apiBaseUrl}/v1/public/verification/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: session.sessionId,
        sessionToken,
        status:
          stages[snapshot.currentStage]?.key === "processing"
            ? "processing"
            : stages[snapshot.currentStage]?.key === "result"
              ? "completed"
              : "in_progress",
        currentStage: stages[snapshot.currentStage]?.key || "welcome",
        progressData: buildProgressPayload(snapshot, session),
      }),
    });
  });

  useEffect(() => {
    if (!apiBaseUrl || !sessionToken || !storageReadyRef.current) {
      return;
    }

    if (currentStage?.key === "processing" || currentStage?.key === "result") {
      return;
    }

    const timeout = window.setTimeout(() => {
      void syncProgress(state);
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [apiBaseUrl, currentStage?.key, sessionToken, state]);

  const syncCompletion = useEffectEvent(async (snapshot: SessionState) => {
    if (!apiBaseUrl || !sessionToken) {
      return;
    }

    const resultPayload = {
      completedAt: snapshot.completedAt || new Date().toISOString(),
      formData: snapshot.formData,
      documentCaptured: snapshot.documentCaptured,
      livenessCaptured: snapshot.livenessCaptured,
      detectDeepfake: session.detectDeepfake,
    };

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
        progressData: buildProgressPayload(snapshot, session),
        resultData: resultPayload,
      }),
    });
  });

  const advanceProcessing = useEffectEvent(() => {
    setState((previous) => {
      const nextIndex = Math.min(previous.processingIndex + 1, session.engineChecks.length);
      const isDone = nextIndex >= session.engineChecks.length;

      return {
        ...previous,
        processingIndex: nextIndex,
        currentStage: isDone && resultStageIndex >= 0 ? resultStageIndex : previous.currentStage,
        checkpointAt: new Date().toISOString(),
        completedAt: isDone ? new Date().toISOString() : previous.completedAt,
      };
    });
  });

  useEffect(() => {
    if (currentStage?.key !== "processing") {
      return;
    }

    if (state.processingIndex >= session.engineChecks.length) {
      return;
    }

    const timeout = window.setTimeout(
      () => advanceProcessing(),
      state.processingIndex === session.engineChecks.length - 1 ? 900 : 700,
    );

    return () => window.clearTimeout(timeout);
  }, [
    currentStage?.key,
    session.engineChecks.length,
    state.processingIndex,
  ]);

  useEffect(() => {
    if (!apiBaseUrl || !sessionToken || currentStage?.key !== "result") {
      return;
    }

    if (completePostedRef.current) {
      return;
    }

    completePostedRef.current = true;
    void syncCompletion(state);
  }, [apiBaseUrl, currentStage?.key, sessionToken, state]);

  const progressValue = ((state.currentStage + 1) / stages.length) * 100;
  const ocrConfidence =
    session.flowType === "liveness_only" || session.flowType === "liveness_deepfake" ? null : "96.8%";
  const faceScore = session.flowType === "ekyc_full" ? "98.4%" : null;
  const deepfakeScore = session.detectDeepfake ? "Low risk" : null;

  const pageTitle =
    session.flowType === "ekyc_full"
      ? "Verify your identity"
      : session.flowType === "ocr_only"
        ? "Capture and confirm document data"
        : session.flowType === "liveness_only"
          ? "Prove real-time presence"
          : "Run biometric anti-spoofing checks";

  return (
    <main className="verify-shell" style={themeStyle}>
      <div className="verify-backdrop" />

      <section className="verify-topbar">
        <Link className="button button--ghost button--compact" href="/">
          <ArrowLeft size={16} />
          All templates
        </Link>

        <div className="brand-badge">
          <div
            className="brand-mark"
            style={{ background: `linear-gradient(135deg, ${session.primaryColor}, ${session.secondaryColor})` }}
          >
            {session.logoMonogram}
          </div>
          <div>
            <strong>{session.brandName}</strong>
            <span>{session.showPoweredByVison ? "Powered by Vison" : "White-label session"}</span>
          </div>
        </div>

        <div className="status-row">
          <span className="meta-chip">
            <Clock3 size={16} />
            Expires {formatTimeLabel(session.expiresAt)}
          </span>
          <span className="meta-chip">
            <Workflow size={16} />
            {session.workflowId}
          </span>
        </div>
      </section>

      <section className="verify-layout">
        <div className="stage-panel">
          <div
            className="hero-panel"
            style={{
              background: `linear-gradient(135deg, ${toRgba(session.primaryColor, 0.18)}, ${toRgba(session.secondaryColor, 0.18)})`,
              borderColor: toRgba(session.primaryColor, 0.18),
            }}
          >
            <div className="hero-copy">
              <span className="eyebrow">{session.referenceId}</span>
              <h1>{pageTitle}</h1>
              <p>
                Hosted verification for <strong>{session.brandName}</strong> using workflow-based steps, resumable
                progress, webhook callbacks, and merchant-safe decision output.
              </p>
            </div>
            <div className="hero-grid">
              <div className="hero-metric">
                <span>Flow</span>
                <strong>{session.flowType}</strong>
              </div>
              <div className="hero-metric">
                <span>Duration</span>
                <strong>{session.estimatedDuration}</strong>
              </div>
              <div className="hero-metric">
                <span>Resume</span>
                <strong>{session.resumeWindowMinutes} mins</strong>
              </div>
            </div>
          </div>

          {resumedNotice ? (
            <div className="notice-banner">
              <RefreshCw size={16} />
              Session resumed from your latest checkpoint. Progress stays available for {session.resumeWindowMinutes} minutes.
            </div>
          ) : null}

          <div className="stepper-card panel">
            <div className="section-head">
              <div>
                <span className="eyebrow">{currentStage.eyebrow}</span>
                <h2>{currentStage.title}</h2>
              </div>
              <span className="step-count">
                Step {Math.min(state.currentStage + 1, stages.length)} / {stages.length}
              </span>
            </div>

            <div className="progress-line">
              <div className="progress-fill" style={{ width: `${progressValue}%` }} />
            </div>

            <div className="stepper-grid">
              {stages.map((item, index) => {
                const isActive = index === state.currentStage;
                const isCompleted = index < state.currentStage;

                return (
                  <div
                    className={`step-pill ${isActive ? "is-active" : ""} ${isCompleted ? "is-complete" : ""}`}
                    key={item.key}
                  >
                    <span className="step-pill__icon">{isCompleted ? <Check size={14} /> : stageIcon(item.key)}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel stage-content">
            {currentStage.key === "welcome" ? (
              <>
                <div className="section-head">
                  <div>
                    <span className="eyebrow">Session overview</span>
                    <h2>Ready to begin verification</h2>
                  </div>
                </div>

                <div className="information-grid">
                  <article className="info-card">
                    <ShieldCheck size={18} />
                    <div>
                      <h3>Secure workflow session</h3>
                      <p>
                        This session is attached to <strong>{session.workflowId}</strong> and will expire automatically if left idle.
                      </p>
                    </div>
                  </article>
                  <article className="info-card">
                    <Sparkles size={18} />
                    <div>
                      <h3>Adaptive brand surface</h3>
                      <p>
                        UI colors and copy are driven by merchant branding, with optional hidden Vison branding for white-label flows.
                      </p>
                    </div>
                  </article>
                  <article className="info-card">
                    <Webhook size={18} />
                    <div>
                      <h3>Webhook notification</h3>
                      <p>
                        Session status is delivered to the merchant once the final checks complete, so polling is not required.
                      </p>
                    </div>
                  </article>
                </div>

                <div className="cta-row">
                  <button className="button button--primary" onClick={moveToNextStage} type="button">
                    Start verification
                    <ArrowRight size={18} />
                  </button>
                  <Link className="button button--ghost" href="/">
                    <Home size={18} />
                    Back to overview
                  </Link>
                </div>
              </>
            ) : null}

            {currentStage.key === "document" ? (
              <>
                <div className="section-head">
                  <div>
                    <span className="eyebrow">Document capture</span>
                    <h2>Capture a readable {session.documentLabel}</h2>
                  </div>
                  <span className="support-pill">
                    <Sparkles size={16} />
                    Preprocessing ready
                  </span>
                </div>

                <div className="capture-grid">
                  <div className="capture-stage">
                    <div className={`document-frame ${state.documentCaptured ? "is-filled" : ""}`}>
                      <div className="document-frame__scan" />
                      <div className="document-frame__card">
                        <span>{session.documentLabel}</span>
                        <strong>{state.documentCaptured ? state.documentFileName : "Align the full card inside the frame"}</strong>
                        <p>Good lighting, no glare, all corners visible.</p>
                      </div>
                    </div>
                  </div>

                  <div className="capture-controls">
                    <div className="upload-card">
                      <UploadCloud size={24} />
                      <h3>Upload or use a sample capture</h3>
                      <p>Hosted verify can accept camera, SDK capture, or uploaded images before OCR preprocessing runs.</p>
                      <div className="cta-row">
                        <label className="button button--ghost" htmlFor={fileInputId}>
                          <UploadCloud size={18} />
                          Upload image
                        </label>
                        <button
                          className="button button--secondary"
                          onClick={() =>
                            updateSession({
                              documentCaptured: true,
                              documentFileName: "ktp-jakarta-front.jpg",
                            })
                          }
                          type="button"
                        >
                          <Sparkles size={18} />
                          Use sample KTP
                        </button>
                      </div>
                      <input
                        accept="image/*"
                        className="visually-hidden"
                        id={fileInputId}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) {
                            return;
                          }
                          updateSession({
                            documentCaptured: true,
                            documentFileName: file.name,
                          });
                        }}
                        type="file"
                      />
                    </div>

                    <div className="checklist-card">
                      <h3>What happens next</h3>
                      <div className="bullet-row">
                        <CheckCircle2 size={16} />
                        <span>Rotate and deskew the KTP frame before OCR.</span>
                      </div>
                      <div className="bullet-row">
                        <CheckCircle2 size={16} />
                        <span>Improve contrast and crop the document for better field detection.</span>
                      </div>
                      <div className="bullet-row">
                        <CheckCircle2 size={16} />
                        <span>Open manual correction so the user can fix OCR mistakes.</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="cta-row">
                  <button
                    className="button button--primary"
                    disabled={!state.documentCaptured}
                    onClick={moveToNextStage}
                    type="button"
                  >
                    Continue to OCR review
                    <ChevronsRight size={18} />
                  </button>
                </div>
              </>
            ) : null}

            {currentStage.key === "review" ? (
              <>
                <div className="section-head">
                  <div>
                    <span className="eyebrow">OCR review</span>
                    <h2>Validate extracted KTP data</h2>
                  </div>
                  {ocrConfidence ? <span className="support-pill">OCR confidence {ocrConfidence}</span> : null}
                </div>

                <div className="review-grid">
                  <div className="review-form">
                    {session.extractedFields.map((field) => (
                      <label className="form-field" key={field}>
                        <span>{labelField(field)}</span>
                        <input
                          onChange={(event) =>
                            setState((previous) => ({
                              ...previous,
                              formData: {
                                ...previous.formData,
                                [field]: event.target.value,
                              },
                              checkpointAt: new Date().toISOString(),
                            }))
                          }
                          type="text"
                          value={state.formData[field] || ""}
                        />
                      </label>
                    ))}
                  </div>

                  <div className="review-sidebar">
                    <article className="mini-panel">
                      <h3>Preprocessing profile</h3>
                      <div className="workflow-preview workflow-preview--stacked">
                        {session.preprocessing.autoRotate ? <span>Auto rotate</span> : null}
                        {session.preprocessing.deskew ? <span>Deskew</span> : null}
                        {session.preprocessing.enhanceContrast ? <span>Enhance contrast</span> : null}
                        {session.preprocessing.cropDocument ? <span>Crop document</span> : null}
                      </div>
                    </article>

                    <article className="mini-panel">
                      <h3>Captured fields</h3>
                      <p>{session.extractedFields.length} fields available for merchant payload output.</p>
                    </article>
                  </div>
                </div>

                <div className="cta-row">
                  <button
                    className="button button--secondary"
                    onClick={() => updateSession({ reviewConfirmed: true })}
                    type="button"
                  >
                    <CheckCircle2 size={18} />
                    Confirm reviewed data
                  </button>
                  <button
                    className="button button--primary"
                    disabled={!state.reviewConfirmed}
                    onClick={moveToNextStage}
                    type="button"
                  >
                    Continue
                    <ArrowRight size={18} />
                  </button>
                </div>
              </>
            ) : null}

            {currentStage.key === "liveness" ? (
              <>
                <div className="section-head">
                  <div>
                    <span className="eyebrow">Liveness capture</span>
                    <h2>{session.livenessMode === "active" ? "Complete the short movement challenge" : "Take a stable selfie"}</h2>
                  </div>
                  <span className="support-pill">
                    <Fingerprint size={16} />
                    {session.livenessMode} mode
                  </span>
                </div>

                <div className="liveness-grid">
                  <div className="liveness-visual">
                    <div className={`face-orbit ${state.livenessCaptured ? "is-verified" : ""}`}>
                      <div className="face-orbit__ring face-orbit__ring--outer" />
                      <div className="face-orbit__ring face-orbit__ring--inner" />
                      <div className="face-orbit__core">
                        <Camera size={32} />
                        <strong>{state.livenessCaptured ? "Capture complete" : "Center your face"}</strong>
                        <span>{session.detectDeepfake ? "Liveness + deepfake screening enabled" : "Real-time presence check"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="liveness-copy">
                    <article className="mini-panel">
                      <h3>Capture guidance</h3>
                      <div className="bullet-row">
                        <CheckCircle2 size={16} />
                        <span>Look straight at the camera with neutral expression.</span>
                      </div>
                      <div className="bullet-row">
                        <CheckCircle2 size={16} />
                        <span>Keep your face inside the frame and avoid heavy backlight.</span>
                      </div>
                      {session.livenessMode === "active" ? (
                        <div className="bullet-row">
                          <CheckCircle2 size={16} />
                          <span>Follow prompts such as blink once and turn slightly left.</span>
                        </div>
                      ) : null}
                    </article>

                    <article className="mini-panel">
                      <h3>Risk controls</h3>
                      <p>
                        {session.detectDeepfake
                          ? "Deepfake signals will be analyzed together with liveness indicators before webhook delivery."
                          : "Presentation attack and spoofing signals will be evaluated before the session result is finalized."}
                      </p>
                    </article>
                  </div>
                </div>

                <div className="cta-row">
                  <button
                    className="button button--secondary"
                    onClick={() => updateSession({ livenessCaptured: true })}
                    type="button"
                  >
                    <Camera size={18} />
                    {session.livenessMode === "active" ? "Complete active challenge" : "Run passive capture"}
                  </button>
                  <button
                    className="button button--primary"
                    disabled={!state.livenessCaptured}
                    onClick={() => {
                      updateSession({
                        processingIndex: 0,
                      });
                      moveToNextStage();
                    }}
                    type="button"
                  >
                    Continue to processing
                    <ArrowRight size={18} />
                  </button>
                </div>
              </>
            ) : null}

            {currentStage.key === "processing" ? (
              <>
                <div className="section-head">
                  <div>
                    <span className="eyebrow">Verification engine</span>
                    <h2>Running workflow checks</h2>
                  </div>
                  <span className="support-pill">
                    <LoaderCircle className="spin" size={16} />
                    Processing
                  </span>
                </div>

                <div className="processing-hero">
                  <div className="processing-hero__copy">
                    <strong>
                      {state.processingIndex}/{session.engineChecks.length} checks completed
                    </strong>
                    <p>
                      OCR preprocessing, decisioning, deepfake defense, and webhook delivery are processed in sequence to
                      produce a consistent merchant payload.
                    </p>
                  </div>
                  <div className="progress-line progress-line--large">
                    <div
                      className="progress-fill"
                      style={{ width: `${(state.processingIndex / session.engineChecks.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="engine-list">
                  {session.engineChecks.map((checkItem, index) => {
                    const status =
                      index < state.processingIndex
                        ? "done"
                        : index === state.processingIndex
                          ? "active"
                          : "pending";

                    return (
                      <article className={`engine-card engine-card--${status}`} key={checkItem.code}>
                        <div className="engine-card__icon">
                          {status === "done" ? (
                            <CheckCircle2 size={18} />
                          ) : status === "active" ? (
                            <LoaderCircle className="spin" size={18} />
                          ) : (
                            <Circle size={18} />
                          )}
                        </div>
                        <div>
                          <h3>{checkItem.title}</h3>
                          <p>{checkItem.description}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : null}
            {currentStage.key === "result" ? (
              <>
                <div className="section-head">
                  <div>
                    <span className="eyebrow">Final output</span>
                    <h2>Session completed successfully</h2>
                  </div>
                  <span className="result-pill">
                    <BadgeCheck size={16} />
                    {resultStageStatus}
                  </span>
                </div>

                <div className="result-banner">
                  <div>
                    <strong>Merchant notification queued</strong>
                    <p>
                      Final status has been prepared for <code>{session.webhookUrl}</code> with events{" "}
                      {session.webhookEvents.join(", ")}.
                    </p>
                  </div>
                  <Webhook size={20} />
                </div>

                <div className="result-metrics">
                  {ocrConfidence ? (
                    <article className="metric-card">
                      <span>OCR confidence</span>
                      <strong>{ocrConfidence}</strong>
                    </article>
                  ) : null}
                  {faceScore ? (
                    <article className="metric-card">
                      <span>Face compare</span>
                      <strong>{faceScore}</strong>
                    </article>
                  ) : null}
                  {deepfakeScore ? (
                    <article className="metric-card">
                      <span>Deepfake risk</span>
                      <strong>{deepfakeScore}</strong>
                    </article>
                  ) : null}
                  <article className="metric-card">
                    <span>Completed at</span>
                    <strong>{state.completedAt ? formatTimeLabel(state.completedAt) : "Pending"}</strong>
                  </article>
                </div>

                {session.extractedFields.length ? (
                  <div className="result-table">
                    {session.extractedFields.map((field) => (
                      <div className="result-row" key={field}>
                        <span>{labelField(field)}</span>
                        <strong>{state.formData[field]}</strong>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="cta-row">
                  <button className="button button--primary" onClick={restartSession} type="button">
                    <RefreshCw size={18} />
                    Restart demo
                  </button>
                  <Link className="button button--ghost" href="/">
                    <Home size={18} />
                    Open another workflow
                  </Link>
                </div>
              </>
            ) : null}
          </div>
        </div>

        <aside className="rail-panel">
          <div className="panel rail-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Workflow system</span>
                <h2>Session controls</h2>
              </div>
            </div>

            <div className="rail-list">
              <div className="rail-item">
                <span className="rail-item__label">Session ID</span>
                <strong>{session.sessionId}</strong>
              </div>
              <div className="rail-item">
                <span className="rail-item__label">Environment</span>
                <strong>{session.environment}</strong>
              </div>
              <div className="rail-item">
                <span className="rail-item__label">Rate limit</span>
                <strong>
                  {session.requestsPerMinute} rpm / {session.burstLimit} burst
                </strong>
              </div>
              <div className="rail-item">
                <span className="rail-item__label">Resume window</span>
                <strong>{session.resumeWindowMinutes} minutes</strong>
              </div>
            </div>
          </div>

          <div className="panel rail-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Workflow graph</span>
                <h2>Operational steps</h2>
              </div>
            </div>

            <div className="workflow-stack">
              {stages.map((item, index) => {
                const stateLabel = index < state.currentStage ? "done" : index === state.currentStage ? "live" : "queued";

                return (
                  <div className={`workflow-node workflow-node--${stateLabel}`} key={item.key}>
                    <div className="workflow-node__icon">{stageIcon(item.key)}</div>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel rail-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Merchant delivery</span>
                <h2>Callbacks and payloads</h2>
              </div>
            </div>

            <div className="mini-panel">
              <h3>Webhook target</h3>
              <p>{session.webhookUrl}</p>
            </div>

            <div className="workflow-preview workflow-preview--stacked">
              {session.webhookEvents.map((eventName) => (
                <span key={eventName}>{eventName}</span>
              ))}
            </div>
          </div>

          <div className="panel rail-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Signals</span>
                <h2>Runtime protections</h2>
              </div>
            </div>

            <div className="signal-list">
              <div className="signal-item">
                <Zap size={17} />
                <span>Per-workflow throttling to slow abuse and scripted attempts.</span>
              </div>
              {session.preprocessing.autoRotate ? (
                <div className="signal-item">
                  <Sparkles size={17} />
                  <span>KTP image preprocessing improves OCR on skewed or low-contrast photos.</span>
                </div>
              ) : null}
              <div className="signal-item">
                <RefreshCw size={17} />
                <span>Resume checkpoints allow the user to continue the session without restarting.</span>
              </div>
              {session.detectDeepfake ? (
                <div className="signal-item">
                  <Fingerprint size={17} />
                  <span>Deepfake detection runs in the same workflow before the decision payload is emitted.</span>
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
