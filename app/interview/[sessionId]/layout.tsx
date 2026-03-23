import InterviewProvider, {
  InterviewInitial,
} from '@/components/interview-progress/core/InterviewProvider';
import InterviewInProgressOverlay from '@/components/interview-progress/overlays/InterviewInProgressOverlay';
import InterviewCompletedOverlay from '@/components/interview-progress/overlays/InterviewCompletedOverlay';
import InterviewNotFoundOverlay from '@/components/interview-progress/overlays/InterviewNotFoundOverlay';
import { getInterviewSessionDetail } from '@/utils/services/interview-session';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const data = await getInterviewSessionDetail(sessionId);

  if (!data) {
    return <InterviewNotFoundOverlay />;
  }

  if (data.status === 'in_progress') {
    return <InterviewInProgressOverlay sessionId={sessionId} />;
  }

  if (data.status === 'completed') {
    return <InterviewCompletedOverlay sessionId={sessionId} />;
  }

  const initialData: InterviewInitial = {
    sessionId: data.session_id,
    status: data.status,
    questions: data.questions,
  };

  return (
    <InterviewProvider initialData={initialData}>{children}</InterviewProvider>
  );
}
