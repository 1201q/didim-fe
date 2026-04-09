'use client';

import { FaceFrameState } from '@/utils/types/analysis';
import styles from './styles/r.client.module.css';

import { ScanFaceIcon } from 'lucide-react';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

type FaceTimelinePoint = {
  timestamp: number; // ms
  centerRatio: number; // 0~1 : 시선이 center인 비율
  positiveRatio: number; // 0~1 : 긍정 표정 비율
  negativeRatio: number; // 0~1 : 부정 표정 비율
};

type FaceSummary = {
  gazeCenterRatio: number;
  positiveEmotionRatio: number;

  blinkCount: number;
};

function buildFaceTimeline(
  frames: FaceFrameState[],
  windowMs: number = 0,
): FaceTimelinePoint[] {
  if (!frames || frames.length === 0) return [];

  // 시간순 정렬 + 얼굴 인식된 프레임만 사용
  const sorted = frames
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)
    .filter((f) => f.faceDetected && f.gaze?.faceDetected);

  if (sorted.length === 0) return [];

  const result: FaceTimelinePoint[] = [];
  let startIdx = 0;

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const t = current.timestamp;
    const windowStart = t - windowMs;

    while (startIdx < i && sorted[startIdx].timestamp < windowStart) {
      startIdx++;
    }

    const windowFrames = sorted.slice(startIdx, i + 1);
    if (windowFrames.length === 0) continue;

    // 1) center 비율
    const centerCount = windowFrames.reduce(
      (acc, f) => acc + (f.gaze.direction === 'center' ? 1 : 0),
      0,
    );
    const centerRatio = centerCount / windowFrames.length;

    // 2) 표정 긍정/부정 비율
    let sumPosRatio = 0;
    let emotionFrames = 0;

    for (const f of windowFrames) {
      const votes = f.emotion?.votes;
      if (!votes) continue;

      const pos = votes.positive ?? 0;
      const neg = votes.negative ?? 0;
      const total = pos + neg;
      if (total <= 0) continue;

      const posRatio = pos / total; // 0~1
      sumPosRatio += posRatio;
      emotionFrames += 1;
    }

    let positiveRatio = 0;
    if (emotionFrames > 0) {
      positiveRatio = sumPosRatio / emotionFrames;
    }

    const negativeRatio = 1 - positiveRatio;

    result.push({
      timestamp: t,
      centerRatio,
      positiveRatio,
      negativeRatio,
    });
  }

  return result;
}

const FaceResult = ({ data }: { data: FaceFrameState[] }) => {
  return (
    <div className={styles.container}>
      <div className={styles.voiceHeader}>
        {/* 왼쪽 */}
        <div className={styles.voiceHeaderLeft}>
          <ScanFaceIcon style={{ marginLeft: '2px' }} />
          <div className={styles.voiceHeaderLeftInfo}>
            <p className={styles.title}>시선 / 표정 분석</p>
            <p className={styles.desc}>
              답변하는 동안의 시선과 표정 변화를 분석한 결과입니다.
            </p>
          </div>
        </div>
      </div>
      <div className={styles.voiceContent}>
        <div className={styles.voiceFlex}>
          <div className={styles.voiceContentTitle}>
            <h4>시선 집중도와 표정 분석</h4>
            <span>
              시선이 화면 중앙(면접관)으로 향한 비율과 긍정적인 표정을 짓고 있는
              비율을 함께 나타낸 그래프입니다.
            </span>
          </div>
          <div className={styles.faceChart}>
            <FaceTimeChart frames={data} />
          </div>
        </div>
      </div>
    </div>
  );
};

const FaceTimeChart = ({ frames }: { frames: FaceFrameState[] }) => {
  const raw = buildFaceTimeline(frames, 1500);

  if (!raw.length) {
    return (
      <div style={{ fontSize: 13, color: 'var(--neutral-5)' }}>
        얼굴이 인식된 구간이 없어 그래프를 표시할 수 없습니다.
      </div>
    );
  }

  const t0 = raw[0].timestamp;
  const data = raw.map((p) => ({
    ...p,
    elapsedSec: (p.timestamp - t0) / 1000,
  }));

  const CustomTooltip = ({ label, payload }: any) => {
    if (!payload || !payload.length) return null;

    const sec = Number(label ?? 0);
    const center = Number(payload[0].value || 0);
    const positive = Number(payload[1].value || 0);

    return (
      <div
        style={{
          background: 'rgba(255,255,255,0.95)',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: '6px 8px',
          fontSize: 12,
        }}
      >
        <div style={{ fontWeight: 600, color: 'var(--neutral-7)' }}>
          {sec.toFixed(1)}s
        </div>
        <div style={{ color: 'var(--neutral-6)' }}>
          시선이 중앙: {(center * 100).toFixed(1)}%
        </div>
        <div style={{ color: 'var(--neutral-6)' }}>
          표정이 긍정적: {(positive * 100).toFixed(1)}%
        </div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 5, right: 10, bottom: 0, left: -25 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--neutral-3)"
        />
        <XAxis
          dataKey="elapsedSec"
          tickFormatter={(v) => `${v.toFixed(1)}s`}
          stroke="#cbd5e1"
          tick={{ fontSize: 11, fill: 'var(--neutral-5)' }}
          axisLine={{ stroke: 'var(--neutral-4)' }}
          tickLine={false}
        />
        <YAxis
          dataKey="value"
          width={70}
          tickLine={false}
          tick={{ fontSize: 12, fill: 'var(--neutral-6)' }}
          axisLine={{ stroke: 'var(--neutral-4)' }}
          domain={[0, 1]}
          ticks={[0, 0.25, 0.5, 0.75, 1]}
          stroke="#cbd5e1"
          tickFormatter={(v) => `${Math.round(v * 100)}%`}
        />

        {/* 시선 center 비율 (파랑) */}
        <Area
          type="monotone"
          dataKey="centerRatio"
          name="시선 center"
          fill="#ddecff"
          stroke="#60a5fa"
          strokeWidth={2}
          opacity={0.8}
        />

        {/* 긍정 표정 비율 (초록) */}
        <Area
          type="monotone"
          dataKey="positiveRatio"
          name="긍정 표정"
          fill="#dffbe9"
          stroke="#22c55e"
          strokeWidth={1}
          opacity={0.6}
        />

        <Tooltip content={<CustomTooltip />} />
      </AreaChart>
    </ResponsiveContainer>
  );
};
export default FaceResult;
