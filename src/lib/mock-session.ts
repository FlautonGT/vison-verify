export type VerificationFlowType =
  | "ekyc_full"
  | "ocr_only"
  | "liveness_only"
  | "liveness_deepfake";

export type VerificationStageKey =
  | "welcome"
  | "document"
  | "review"
  | "liveness"
  | "processing"
  | "result";

export type VerificationRuntimeStage = {
  key: VerificationStageKey;
  title: string;
  eyebrow: string;
  description: string;
};

export type VerificationEngineCheck = {
  code: string;
  title: string;
  description: string;
};

export type MockVerificationSession = {
  sessionId: string;
  workflowId: string;
  referenceId: string;
  environment: "sandbox" | "production";
  flowType: VerificationFlowType;
  brandName: string;
  logoMonogram: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  showPoweredByVison: boolean;
  expiresAt: string;
  estimatedDuration: string;
  webhookUrl: string;
  webhookEvents: string[];
  resumeWindowMinutes: number;
  requestsPerMinute: number;
  burstLimit: number;
  livenessMode: "passive" | "active";
  detectDeepfake: boolean;
  maxRetries: number;
  extractedFields: string[];
  documentLabel: string;
  sampleData: Record<string, string>;
  preprocessing: {
    autoRotate: boolean;
    deskew: boolean;
    enhanceContrast: boolean;
    cropDocument: boolean;
  };
  stages: VerificationRuntimeStage[];
  engineChecks: VerificationEngineCheck[];
};

const fieldLabelMap: Record<string, string> = {
  nik: "NIK",
  fullName: "Nama Lengkap",
  gender: "Jenis Kelamin",
  birthDate: "Tanggal Lahir",
  address: "Alamat",
  religion: "Agama",
  occupation: "Pekerjaan",
};

const baseSampleData = {
  nik: "3174081203910007",
  fullName: "Nadia Pramesti",
  gender: "Perempuan",
  birthDate: "1991-03-12",
  address: "Jl. Prof. Dr. Satrio No. 18, Jakarta Selatan",
  religion: "Islam",
  occupation: "Product Manager",
};

type FlowTemplate = Omit<
  MockVerificationSession,
  "sessionId" | "referenceId" | "environment" | "expiresAt"
>;

const flowTemplates: Record<VerificationFlowType, FlowTemplate> = {
  ekyc_full: {
    workflowId: "wf_aster_full_kyc",
    flowType: "ekyc_full",
    brandName: "Aster Bank",
    logoMonogram: "AB",
    primaryColor: "#0E9F6E",
    secondaryColor: "#1456A5",
    showPoweredByVison: false,
    estimatedDuration: "2-3 minutes",
    webhookUrl: "https://merchant.example.com/hooks/aster/ekyc",
    webhookEvents: ["session.completed", "session.failed"],
    resumeWindowMinutes: 30,
    requestsPerMinute: 60,
    burstLimit: 12,
    livenessMode: "passive",
    detectDeepfake: true,
    maxRetries: 2,
    extractedFields: ["nik", "fullName", "gender", "birthDate", "address", "occupation"],
    documentLabel: "KTP",
    sampleData: baseSampleData,
    preprocessing: {
      autoRotate: true,
      deskew: true,
      enhanceContrast: true,
      cropDocument: true,
    },
    stages: [
      {
        key: "welcome",
        title: "Welcome",
        eyebrow: "Session verified",
        description: "Review the workflow, estimated duration, and brand instructions before starting.",
      },
      {
        key: "document",
        title: "Capture KTP",
        eyebrow: "Document intake",
        description: "Take a clear photo of the ID so preprocessing and OCR can run reliably.",
      },
      {
        key: "review",
        title: "Review Data",
        eyebrow: "OCR validation",
        description: "Confirm extracted KTP fields and correct any OCR mismatch before continuing.",
      },
      {
        key: "liveness",
        title: "Liveness",
        eyebrow: "Face proofing",
        description: "Capture a selfie for passive liveness, deepfake detection, and face comparison.",
      },
      {
        key: "processing",
        title: "Decisioning",
        eyebrow: "Risk engine",
        description: "Run OCR normalization, deepfake screening, face compare, and ID verification.",
      },
      {
        key: "result",
        title: "Result",
        eyebrow: "Webhook ready",
        description: "Show the final decision summary and webhook delivery outcome for the merchant.",
      },
    ],
    engineChecks: [
      {
        code: "ocr_preprocessing",
        title: "KTP Preprocessing",
        description: "Rotate, deskew, crop, and enhance the submitted ID frame before OCR.",
      },
      {
        code: "ocr_extraction",
        title: "OCR Extraction",
        description: "Read identity fields and normalize text into merchant-ready structured data.",
      },
      {
        code: "liveness_check",
        title: "Passive Liveness",
        description: "Assess face presence, micro-movements, and spoofing signals from the selfie.",
      },
      {
        code: "deepfake_check",
        title: "Deepfake Detection",
        description: "Inspect synthetic artifacts and frame inconsistencies across the selfie capture.",
      },
      {
        code: "face_compare",
        title: "Face Compare",
        description: "Compare the KTP portrait with the selfie to produce a similarity score.",
      },
      {
        code: "identity_verification",
        title: "Identity Verification",
        description: "Validate document integrity and consistency across OCR, face, and rule checks.",
      },
      {
        code: "webhook_dispatch",
        title: "Webhook Dispatch",
        description: "Send `session.completed` or `session.failed` with the final session summary.",
      },
    ],
  },
  ocr_only: {
    workflowId: "wf_nusa_ocr_only",
    flowType: "ocr_only",
    brandName: "Nusa Finance",
    logoMonogram: "NF",
    primaryColor: "#0C8F7A",
    secondaryColor: "#F18A2A",
    showPoweredByVison: true,
    estimatedDuration: "Under 90 seconds",
    webhookUrl: "https://merchant.example.com/hooks/nusa/ocr",
    webhookEvents: ["session.completed"],
    resumeWindowMinutes: 20,
    requestsPerMinute: 120,
    burstLimit: 25,
    livenessMode: "passive",
    detectDeepfake: false,
    maxRetries: 0,
    extractedFields: ["nik", "fullName", "gender", "birthDate", "address"],
    documentLabel: "KTP",
    sampleData: baseSampleData,
    preprocessing: {
      autoRotate: true,
      deskew: true,
      enhanceContrast: true,
      cropDocument: true,
    },
    stages: [
      {
        key: "welcome",
        title: "Welcome",
        eyebrow: "Fast OCR",
        description: "Quick document extraction optimized for merchant forms and customer onboarding.",
      },
      {
        key: "document",
        title: "Capture KTP",
        eyebrow: "Document intake",
        description: "Upload a readable KTP image so preprocessing can stabilize the frame.",
      },
      {
        key: "review",
        title: "Review Data",
        eyebrow: "OCR correction",
        description: "Allow the user to review and fix extracted OCR fields before submission.",
      },
      {
        key: "processing",
        title: "Processing",
        eyebrow: "Structured output",
        description: "Package the corrected OCR result and deliver it to the merchant webhook.",
      },
      {
        key: "result",
        title: "Result",
        eyebrow: "Ready to use",
        description: "Show extracted data quality and delivery status for downstream systems.",
      },
    ],
    engineChecks: [
      {
        code: "ocr_preprocessing",
        title: "KTP Preprocessing",
        description: "Prepare the ID image with rotation, deskewing, and crop enhancement.",
      },
      {
        code: "ocr_extraction",
        title: "OCR Extraction",
        description: "Detect and structure NIK, name, gender, birth date, and address fields.",
      },
      {
        code: "field_normalization",
        title: "Field Normalization",
        description: "Normalize OCR values into a consistent format for merchant systems.",
      },
      {
        code: "webhook_dispatch",
        title: "Webhook Dispatch",
        description: "Send the final OCR output to the configured merchant endpoint.",
      },
    ],
  },
  liveness_only: {
    workflowId: "wf_aurora_liveness",
    flowType: "liveness_only",
    brandName: "Aurora Pay",
    logoMonogram: "AP",
    primaryColor: "#315CF3",
    secondaryColor: "#18A66A",
    showPoweredByVison: false,
    estimatedDuration: "45-60 seconds",
    webhookUrl: "https://merchant.example.com/hooks/aurora/liveness",
    webhookEvents: ["session.completed", "session.failed"],
    resumeWindowMinutes: 15,
    requestsPerMinute: 240,
    burstLimit: 40,
    livenessMode: "active",
    detectDeepfake: false,
    maxRetries: 3,
    extractedFields: [],
    documentLabel: "KTP",
    sampleData: {},
    preprocessing: {
      autoRotate: false,
      deskew: false,
      enhanceContrast: false,
      cropDocument: false,
    },
    stages: [
      {
        key: "welcome",
        title: "Welcome",
        eyebrow: "Biometric proof",
        description: "Prepare the user for a short active liveness session with on-screen prompts.",
      },
      {
        key: "liveness",
        title: "Liveness",
        eyebrow: "Active challenge",
        description: "Guide the user through movement prompts to confirm real-time presence.",
      },
      {
        key: "processing",
        title: "Processing",
        eyebrow: "Biometric analysis",
        description: "Evaluate liveness signals and package the result for merchant consumption.",
      },
      {
        key: "result",
        title: "Result",
        eyebrow: "Session complete",
        description: "Return the liveness decision and webhook status to the merchant.",
      },
    ],
    engineChecks: [
      {
        code: "face_presence",
        title: "Face Presence",
        description: "Ensure a real face is centered, uncovered, and clearly visible.",
      },
      {
        code: "active_liveness",
        title: "Active Liveness",
        description: "Evaluate blink, slight turn, and timing cues from the challenge sequence.",
      },
      {
        code: "spoof_detection",
        title: "Spoof Detection",
        description: "Look for replay, screen, paper, or mask-based presentation attacks.",
      },
      {
        code: "webhook_dispatch",
        title: "Webhook Dispatch",
        description: "Deliver the session result to the merchant endpoint with final status.",
      },
    ],
  },
  liveness_deepfake: {
    workflowId: "wf_atlas_biometrics",
    flowType: "liveness_deepfake",
    brandName: "Atlas Exchange",
    logoMonogram: "AE",
    primaryColor: "#742DD2",
    secondaryColor: "#15A3B8",
    showPoweredByVison: true,
    estimatedDuration: "60-75 seconds",
    webhookUrl: "https://merchant.example.com/hooks/atlas/biometric",
    webhookEvents: ["session.completed", "session.failed"],
    resumeWindowMinutes: 20,
    requestsPerMinute: 180,
    burstLimit: 30,
    livenessMode: "passive",
    detectDeepfake: true,
    maxRetries: 2,
    extractedFields: [],
    documentLabel: "KTP",
    sampleData: {},
    preprocessing: {
      autoRotate: false,
      deskew: false,
      enhanceContrast: false,
      cropDocument: false,
    },
    stages: [
      {
        key: "welcome",
        title: "Welcome",
        eyebrow: "Risk-sensitive flow",
        description: "Run passive liveness with an extra deepfake defense layer before approval.",
      },
      {
        key: "liveness",
        title: "Liveness",
        eyebrow: "Selfie capture",
        description: "Take a well-lit selfie so the system can analyze liveness and deepfake risk.",
      },
      {
        key: "processing",
        title: "Processing",
        eyebrow: "Synthetic media defense",
        description: "Combine passive liveness and deepfake screening in a single workflow.",
      },
      {
        key: "result",
        title: "Result",
        eyebrow: "Decision ready",
        description: "Show pass/fail risk output together with webhook delivery status.",
      },
    ],
    engineChecks: [
      {
        code: "face_presence",
        title: "Face Presence",
        description: "Check that the subject is centered and present in the frame.",
      },
      {
        code: "passive_liveness",
        title: "Passive Liveness",
        description: "Use passive signals to confirm the capture is from a live person.",
      },
      {
        code: "deepfake_check",
        title: "Deepfake Detection",
        description: "Assess generative artifacts and manipulation signatures from the selfie.",
      },
      {
        code: "risk_scoring",
        title: "Risk Scoring",
        description: "Aggregate liveness and deepfake evidence into a merchant decision payload.",
      },
      {
        code: "webhook_dispatch",
        title: "Webhook Dispatch",
        description: "Deliver the biometric decision to the merchant webhook endpoint.",
      },
    ],
  },
};

function deriveFlowType(sessionId: string): VerificationFlowType {
  const normalized = sessionId.toLowerCase();

  if (normalized.includes("ocr")) {
    return "ocr_only";
  }
  if (normalized.includes("deepfake")) {
    return "liveness_deepfake";
  }
  if (normalized.includes("liveness")) {
    return "liveness_only";
  }

  return "ekyc_full";
}

export function buildMockSession(sessionId: string): MockVerificationSession {
  const flowType = deriveFlowType(sessionId);
  const template = flowTemplates[flowType];
  const now = Date.now();
  const suffix = sessionId.slice(-8).toUpperCase().padStart(8, "0");

  return {
    ...template,
    sessionId,
    referenceId: `REF-${suffix}`,
    environment: sessionId.includes("live") ? "production" : "sandbox",
    expiresAt: new Date(now + 25 * 60 * 1000).toISOString(),
  };
}

export function labelField(field: string): string {
  return fieldLabelMap[field] || field;
}
