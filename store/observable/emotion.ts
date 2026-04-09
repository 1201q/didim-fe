import { bufferTime, filter, map, shareReplay } from 'rxjs';
import { detectedFaceResult$ } from './raw';
import { Emotion, FaceResult } from '@vladmandic/human';
import { EmotionState } from '@/utils/types/analysis';

// parameters
const WINDOW_MS = 500; // 0.5초 단위로 묶어서 봄
const SLIDE_MS = 200;
const EMOTION_THRESHOLD = 0.4;
const POSITIVE_EMOTIONS: Emotion[] = ['happy', 'surprise', 'neutral'];

// types
type EMOTION_TYPE = 'positive' | 'negative';

const emotionBuffer$ = detectedFaceResult$.pipe(
  filter(
    (face): face is FaceResult =>
      !!face && !!face.emotion && face.emotion.length > 0,
  ),
  map((face) => face.emotion),
  bufferTime(WINDOW_MS, SLIDE_MS),
  filter((arr) => arr.length > 0),
);

// 메인 스트림
const stableEmotionVotes$ = emotionBuffer$.pipe(
  map((window) => {
    const votes: Record<EMOTION_TYPE, number> = {
      positive: 0,
      negative: 0,
    };

    for (const e of window) {
      if (!e) continue;

      const positiveScore = e.reduce((acc, cur) => {
        if (POSITIVE_EMOTIONS.includes(cur.emotion)) {
          acc += cur.score;
        }
        return acc;
      }, 0);

      if (positiveScore >= EMOTION_THRESHOLD) {
        votes.positive += 1;
      } else {
        votes.negative += 1;
      }
    }

    return votes;
  }),
);

export const stableEmotionState$ = stableEmotionVotes$.pipe(
  map(
    (votes): EmotionState => ({
      timestamp: Date.now(),
      votes,
    }),
  ),
  shareReplay(1),
);
