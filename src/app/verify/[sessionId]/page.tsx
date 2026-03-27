import { VerificationSessionClient } from "@/components/verify/verification-session-client";

export default async function VerifySessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <VerificationSessionClient sessionId={sessionId} />;
}
