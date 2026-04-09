// 질문 생성후 결과 타입

export type QuestionSection =
  | 'basic'
  | 'experience'
  | 'job_related'
  | 'expertise';

export interface GeneratedQuestionItem {
  id: string;
  text: string;
  based_on: string;
  section: QuestionSection;
}

// 실시간 필사 데이터 타입
export interface TranscriptionType {
  event_id: string;
  item_id: string;
  type: string;
}

export interface Transcript extends TranscriptionType {
  content_index: number;
  transcript: string;
  usage: any;
}

export interface Delta extends TranscriptionType {
  content_index: number;
  delta: string;
}
