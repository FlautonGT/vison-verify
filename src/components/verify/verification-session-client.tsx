"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { VerifyExperience } from "@/components/verify/verify-experience";
import {
  buildMockSession,
  type MockVerificationSession,
  type VerificationEngineCheck,
  type VerificationFlowType,
  type VerificationRuntimeStage,
} from "@/lib/mock-session";

type HostedVerificationSession = {
  sessionId: string;
  workflowId: string;
  referenceId?: string;
  environment: "sandbox" | "production";
  flowType: VerificationFlowType;
  status: string;
  currentStage: string;
  brandName: string;
  logoMonogram: string;
  primaryColor: string;
  secondaryColor: string;
  showPoweredByVison: boolean;
  expiresAt: string;
  estimatedDuration: string;
  verificationUrl?: string;
  webhookUrl?: string;
  webhookEvents: string[];
  resumeWindowMinutes: number;
  requestsPerMinute: number;
  burstLimit: number;
  livenessMode: "passive" | "active";
  detectDeepfake: boolean;
  maxRetries: number;
  extractedFields: string[];
  documentLabel: string;
  preprocessing: {
    autoRotate: boolean;
    deskew: boolean;
    enhanceContrast: boolean;
    cropDocument: boolean;
  };
  stages: VerificationRuntimeStage[];
  engineChecks: VerificationEngineCheck[];
  progressData?: Record<string, unknown>;
  resultData?: Record<string, unknown>;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.vison.id";

function toStringRecord(value: unknown, fallback: Record<string, string>) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") {
      result[key] = entry;
    }
  }
  return Object.keys(result).length ? result : fallback;
}

function adaptHostedSession(sessionId: string, hosted: HostedVerificationSession): MockVerificationSession {
  const fallback = buildMockSession(sessionId);
  return {
    ...fallback,
    sessionId: hosted.sessionId,
    workflowId: hosted.workflowId,
    referenceId: hosted.referenceId || fallback.referenceId,
    environment: hosted.environment,
    flowType: hosted.flowType,
    brandName: hosted.brandName,
    logoMonogram: hosted.logoMonogram,
    primaryColor: hosted.primaryColor,
    secondaryColor: hosted.secondaryColor,
    showPoweredByVison: hosted.showPoweredByVison,
    expiresAt: hosted.expiresAt,
    estimatedDuration: hosted.estimatedDuration,
    webhookUrl: hosted.webhookUrl || fallback.webhookUrl,
    webhookEvents: hosted.webhookEvents?.length ? hosted.webhookEvents : fallback.webhookEvents,
    resumeWindowMinutes: hosted.resumeWindowMinutes,
    requestsPerMinute: hosted.requestsPerMinute,
    burstLimit: hosted.burstLimit,
    livenessMode: hosted.livenessMode,
    detectDeepfake: hosted.detectDeepfake,
    maxRetries: hosted.maxRetries,
    extractedFields: hosted.extractedFields,
    documentLabel: hosted.documentLabel,
    sampleData: toStringRecord(hosted.progressData?.formData, fallback.sampleData),
    preprocessing: hosted.preprocessing,
    stages: hosted.stages,
    engineChecks: hosted.engineChecks,
  };
}

export function VerificationSessionClient({ sessionId }: { sessionId: string }) {
  const searchParams = useSearchParams();
  const sessionToken = searchParams.get("token");
  const fallbackSession = useMemo(() => buildMockSession(sessionId), [sessionId]);
  const [session, setSession] = useState<MockVerificationSession>(fallbackSession);
  const [progressData, setProgressData] = useState<Record<string, unknown>>({});
  const [resultData, setResultData] = useState<Record<string, unknown>>({});
  const [currentStage, setCurrentStage] = useState<string>("welcome");
  const [loading, setLoading] = useState(Boolean(sessionToken));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSession(fallbackSession);
  }, [fallbackSession]);

  useEffect(() => {
    if (!sessionToken) {
      setLoading(false);
      return;
    }

    let active = true;

    async function bootstrap() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${apiBaseUrl}/v1/public/verification/verify-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            sessionToken,
          }),
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`bootstrap failed with status ${response.status}`);
        }

        const payload = (await response.json()) as { data?: HostedVerificationSession };
        if (!active || !payload.data) {
          return;
        }

        setSession(adaptHostedSession(sessionId, payload.data));
        setProgressData(payload.data.progressData || {});
        setResultData(payload.data.resultData || {});
        setCurrentStage(payload.data.currentStage || "welcome");
      } catch (bootstrapError) {
        if (!active) {
          return;
        }
        setError(bootstrapError instanceof Error ? bootstrapError.message : "Failed to load verification session");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [sessionId, sessionToken]);

  if (loading) {
    return (
      <main className="verify-shell">
        <section className="verify-layout">
          <div className="panel stage-content">
            <span className="eyebrow">Connecting session</span>
            <h1 style={{ margin: 0 }}>Preparing verification workspace</h1>
            <p>Fetching the latest workflow snapshot and session checkpoint from api.vison.id.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      {error ? (
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "1rem 1rem 0", color: "#ffd6d6" }}>
          Session bootstrap fallback active: {error}
        </div>
      ) : null}
      <VerifyExperience
        apiBaseUrl={sessionToken ? apiBaseUrl : undefined}
        initialCurrentStage={currentStage}
        initialProgressData={progressData}
        initialResultData={resultData}
        session={session}
        sessionToken={sessionToken || undefined}
      />
    </>
  );
}
