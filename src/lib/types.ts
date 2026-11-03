/** 워크플로우가 내는 1차 판정 (정답지와 같은 5개 키) */
export type Decision = "적정" | "보완필요" | "검토필요";

export interface Judgment {
  case_id: string;
  decision: Decision;
  report_required: boolean;
  missing_items: string[];
  reason: string;
}

/** 설정 #5부터 후속 문서 노드가 판정 5키 + 문서 본문을 함께 낸다 */
export interface FollowupDocument {
  document_title: string;
  document_lines: string[];
}

/** 경위서_추출 */
export interface IncidentExtract {
  case_id?: string;
  org_name?: string;
  recognized_at?: string;
  recognition_ambiguous?: boolean;
  detected_at?: string;
  confirmed_at?: string;
  recognition_route?: string;
  leaked_at?: string;
  leaked_count?: number;
  leaked_items?: string[];
  has_sensitive_or_unique_id?: boolean;
  external_access?: boolean;
  urgent_measure_note?: string;
  report_date?: string;
}

/** 신고서_추출 */
export interface BreachReportExtract {
  org_name?: string;
  reported_at?: string;
  report_target?: string;
  leaked_at?: string;
  leaked_count?: number;
  leaked_items?: string[];
  has_timeline?: boolean;
  has_self_protection?: boolean;
  has_response?: boolean;
  has_contact?: boolean;
  cpo_name?: string;
}

/** 통지문_추출 */
export interface NoticeExtract {
  org_name?: string;
  notified_at?: string;
  notice_channel?: string;
  leaked_count?: number;
  leaked_items?: string[];
  has_items?: boolean;
  has_timeline?: boolean;
  has_self_protection?: boolean;
  has_response?: boolean;
  has_contact?: boolean;
  has_legal_rights?: boolean;
  notice_kind?: string;
  is_possibility_notice?: boolean;
}

export interface Extracts {
  incident?: IncidentExtract;
  breach?: BreachReportExtract;
  /** 통지문은 2부(가능성·확정)일 수 있어 배열 */
  notices: NoticeExtract[];
}

/** 화면이 쓰는 정규화 결과 */
export interface ReviewResult {
  judgment: Judgment;
  document?: FollowupDocument;
  extracts: Extracts;
  /** 타임라인 기준점·경과시간 (시간 단위, 소수 가능) */
  timeline: {
    recognized_at?: string;
    notified_at?: string;
    reported_at?: string;
    hoursToNotice?: number;
    hoursToReport?: number;
  };
  /** 추출값이 없어 reason 문장에서 시각을 읽어 온 경우 true */
  timelineFromReason: boolean;
  /** 어떤 노드가 결과를 냈는지 (판정 노드 / 후속 문서 노드) */
  source: "followup" | "judgment" | "unknown";
}

export type JobStatus = "queued" | "in_progress" | "completed" | "failed";

export interface JobStatusResponse {
  id: string;
  status: JobStatus;
  mock?: boolean;
  result?: ReviewResult;
  raw?: unknown;
  error?: string;
}

export interface CreateJobResponse {
  id: string;
  status: JobStatus;
  mock?: boolean;
}

/** 화면에서 추적하는 검수 1건 */
export interface CaseRun {
  localId: string;
  fileName: string;
  jobId?: string;
  status: "uploading" | JobStatus;
  mock?: boolean;
  startedAt: number;
  finishedAt?: number;
  result?: ReviewResult;
  raw?: unknown;
  error?: string;
}
