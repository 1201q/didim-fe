import { bufferToggle, filter, map, shareReplay, withLatestFrom } from 'rxjs';
import { answerStart$, answerEnd$ } from './raw';
import { stableGazeState$ } from './gaze';
import { stableEmotionState$ } from './emotion';
import { FaceFrameState } from '@/utils/types/analysis';

// 답변 프레임 상태 스트림
const faceFrameState$ = stableGazeState$.pipe(
  withLatestFrom(stableEmotionState$),
  map(
    ([gaze, emotion]): FaceFrameState => ({
      timestamp: Math.max(gaze.timestamp, emotion.timestamp),
      faceDetected: gaze.faceDetected,
      gaze,
      emotion,
    }),
  ),
  shareReplay(1),
);

export const recordedFaceData$ = faceFrameState$.pipe(
  bufferToggle(answerStart$, () => answerEnd$),
  filter((arr) => arr.length > 0),
);
