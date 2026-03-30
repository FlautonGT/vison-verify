"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NotFoundScreen } from "@/components/verify/not-found-screen";
import { VerifyExperience } from "@/components/verify/verify-experience";
import type {
  MockVerificationSession,
  VerificationEngineCheck,
  VerificationFlowType,
  VerificationRuntimeStage,
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
  logoUrl?: string;
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

function toStringRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") {
      result[key] = entry;
    }
  }
  return result;
}

function adaptHostedSession(hosted: HostedVerificationSession): MockVerificationSession & { logoUrl?: string } {
  return {
    sessionId: hosted.sessionId,
    workflowId: hosted.workflowId,
    referenceId: hosted.referenceId || hosted.sessionId.slice(-8).toUpperCase(),
    environment: hosted.environment,
    flowType: hosted.flowType,
    brandName: hosted.brandName,
    logoMonogram: hosted.logoMonogram,
    logoUrl: hosted.logoUrl,
    primaryColor: hosted.primaryColor,
    secondaryColor: hosted.secondaryColor,
    showPoweredByVison: hosted.showPoweredByVison,
    expiresAt: hosted.expiresAt,
    estimatedDuration: hosted.estimatedDuration,
    webhookUrl: hosted.webhookUrl || "",
    webhookEvents: hosted.webhookEvents || [],
    resumeWindowMinutes: hosted.resumeWindowMinutes,
    requestsPerMinute: hosted.requestsPerMinute,
    burstLimit: hosted.burstLimit,
    livenessMode: hosted.livenessMode,
    detectDeepfake: hosted.detectDeepfake,
    maxRetries: hosted.maxRetries,
    extractedFields: hosted.extractedFields || [],
    documentLabel: hosted.documentLabel || "KTP",
    sampleData: toStringRecord(hosted.progressData?.formData),
    preprocessing: hosted.preprocessing,
    stages: hosted.stages,
    engineChecks: hosted.engineChecks,
  };
}

export function VerificationSessionClient({ sessionId }: { sessionId: string }) {
  const searchParams = useSearchParams();
  const sessionToken = searchParams.get("token");
  const [session, setSession] = useState<(MockVerificationSession & { logoUrl?: string }) | null>(null);
  const [progressData, setProgressData] = useState<Record<string, unknown>>({});
  const [resultData, setResultData] = useState<Record<string, unknown>>({});
  const [currentStage, setCurrentStage] = useState<string>("welcome");
  const [loading, setLoading] = useState(true);
  const [isInvalid, setIsInvalid] = useState(false);

  useEffect(() => {
    if (!sessionToken) {
      setIsInvalid(true);
      setLoading(false);
      return;
    }

    let active = true;

    async function bootstrap() {
      try {
        setLoading(true);
        setIsInvalid(false);

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
          throw new Error("invalid-session");
        }

        const payload = (await response.json()) as { data?: HostedVerificationSession };
        if (!active || !payload.data) {
          throw new Error("invalid-session");
        }

        setSession(adaptHostedSession(payload.data));
        setProgressData(payload.data.progressData || {});
        setResultData(payload.data.resultData || {});
        setCurrentStage(payload.data.currentStage || "welcome");
      } catch {
        if (active) {
          setIsInvalid(true);
        }
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
      <main className="verify-loading-shell">
        <div className="verify-loading-card">
          <span className="verify-loading-dot" />
          <p>Menyiapkan sesi verifikasi...</p>
        </div>
      </main>
    );
  }

  if (isInvalid || !session || !sessionToken) {
    return <NotFoundScreen />;
  }

  return (
    <VerifyExperience
      apiBaseUrl={apiBaseUrl}
      initialCurrentStage={currentStage}
      initialProgressData={progressData}
      initialResultData={resultData}
      session={session}
      sessionToken={sessionToken}
    />
  );
}
