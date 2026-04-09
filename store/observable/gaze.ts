import { GazeState } from '@/utils/types/analysis';
import {
  answerEnd$,
  answerStart$,
  detectedFaceResult$,
  detectedGestureResults$,
} from './raw';
import { GestureResult } from '@vladmandic/human';
import {
  bufferTime,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  withLatestFrom,
  startWith,
} from 'rxjs';

// parameters
const WINDOW_MS = 500;
const SLIDE_MS = 200;

// types
type GazeDirection = 'left' | 'right' | 'up' | 'down' | 'center';

const gestureBuffer$ = detectedGestureResults$.pipe(
  bufferTime(WINDOW_MS, SLIDE_MS),
  map((results: GestureResult[][]) => results.flat()),
  filter((arr) => arr.length > 0),
);

const stableGazeVotes$ = gestureBuffer$.pipe(
  map((flat) => {
    const facingVotes: Record<GazeDirection, number> = {
      left: 0,
      right: 0,
      center: 0,
      up: 0,
      down: 0,
    };

    const irisVotes: Record<GazeDirection, number> = {
      left: 0,
      right: 0,
      center: 0,
      up: 0,
      down: 0,
    };

    let blink = false;

    for (const g of flat) {
      if ('face' in g) {
        const gesture = g.gesture;

        // facing
        if (gesture.startsWith('facing ')) {
          const dir = gesture.split(' ')[1] as 'left' | 'right' | 'center';

          facingVotes[dir]++;
        }

        // head
        if (gesture.startsWith('head ')) {
          const dir = gesture.split(' ')[1] as 'up' | 'down';
          facingVotes[dir]++;
        }

        // mouth
        if (gesture.startsWith('mouth ')) {
          const match = gesture.match(/^mouth (\d+)% open$/);

          if (match) {
            const percent = Number(match[1]);

            if (percent > 30) {
              facingVotes['down']--;
            }
          }
        }

        if (gesture === 'blink left eye' || gesture === 'blink right eye') {
          blink = true;
        }
      }

      if ('iris' in g) {
        const gesture = g.gesture;

        if (gesture.startsWith('looking ')) {
          const dir = gesture.split(' ')[1] as
            | 'left'
            | 'right'
            | 'center'
            | 'up'
            | 'down';

          irisVotes[dir] += 1;
        }
      }
    }

    return { facingVotes, irisVotes, blink };
  }),
);

const stableGazeDirection$ = stableGazeVotes$.pipe(
  map(({ facingVotes, irisVotes, blink }) => {
    const combined: Record<GazeDirection, number> = {
      left: facingVotes.left + irisVotes.left,
      right: facingVotes.right + irisVotes.right,
      up: facingVotes.up + (blink ? 0 : irisVotes.up * 2),
      down: facingVotes.down + (blink ? 0 : irisVotes.down),
      center: (facingVotes.center + irisVotes.center) / 2,
    };

    let bestDir: GazeDirection = 'center';
    let bestScore = -Infinity;
    (Object.keys(combined) as GazeDirection[]).forEach((dir) => {
      if (combined[dir] > bestScore) {
        bestScore = combined[dir];
        bestDir = dir;
      }
    });

    return bestDir;
  }),
  distinctUntilChanged(),
);

export const stableGazeState$ = stableGazeVotes$.pipe(
  withLatestFrom(
    stableGazeDirection$,
    detectedFaceResult$.pipe(startWith(false)),
  ),
  map(
    ([votes, direction, faceDetected]): GazeState => ({
      timestamp: Date.now(),
      direction,
      facingVotes: votes.facingVotes,
      irisVotes: votes.irisVotes,
      blink: votes.blink,
      faceDetected: !!faceDetected,
    }),
  ),

  shareReplay(1),
);
