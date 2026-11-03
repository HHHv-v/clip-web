import type { ReviewResult } from "./types";
import { hoursBetween } from "./time";

/**
 * 샘플 모드 — UPSTAGE_API_KEY 가 없거나 MOCK_MODE=1 이면 실제 API 대신 이 결과를 돌려준다.
 * 값은 팀 데이터셋(최종_전체)을 설정 #5 워크플로우로 실제 돌린 결과를 바탕으로 했다.
 * Job id 에 샘플 키와 생성 시각을 넣어 두어 서버리스(인스턴스가 바뀌는 환경)에서도 상태가 유지된다.
 */

const FOOTER = "본 결과는 1차 검수이며 최종 판단은 개인정보 보호책임자(CPO)가 합니다.";

function build(
  r: Omit<ReviewResult, "timeline" | "timelineFromReason" | "source"> & {
    timeline: { recognized_at?: string; notified_at?: string; reported_at?: string };
  },
): ReviewResult {
  const { recognized_at, notified_at, reported_at } = r.timeline;
  return {
    ...r,
    timeline: {
      recognized_at,
      notified_at,
      reported_at,
      hoursToNotice: hoursBetween(recognized_at, notified_at),
      hoursToReport: hoursBetween(recognized_at, reported_at),
    },
    timelineFromReason: false,
    source: "followup",
  };
}

const ITEMS_5 = ["성명", "휴대전화번호", "이메일", "주소", "주문내역"];

export const SAMPLES: Record<string, ReviewResult> = {
  C01: build({
    judgment: {
      case_id: "C01",
      decision: "적정",
      report_required: true,
      missing_items: [],
      reason:
        "경위서의 최초 인지 시각은 2026-10-20 09:00이고, 고객 통지 시각은 2026-10-21 15:00, 개인정보위 신고 시각도 2026-10-21 15:00입니다. 인지→통지 30시간, 인지→신고 30시간으로 모두 72시간 이내입니다. 유출 인원 2,300명·외부의 불법적 접근으로 신고 대상이며, 세 서류의 유출 인원과 항목이 일치하고 통지문 필수 항목도 모두 갖춰져 있습니다.",
    },
    document: {
      document_title: "개인정보 유출 대응 서류 검수 확인서",
      document_lines: [
        "사고번호: LUM-SEC-2026-017 (케이스 ID C01)",
        "회사명: 루미마켓",
        "검수 결과: 적정",
        "",
        "1. 기한 준수",
        "- 최초 인지 2026-10-20 09:00 → 고객 통지 2026-10-21 15:00 (30시간, 72시간 이내)",
        "- 최초 인지 2026-10-20 09:00 → 개인정보위 신고 2026-10-21 15:00 (30시간, 72시간 이내)",
        "2. 신고 대상 여부: 해당 (유출 인원 2,300명, 외부의 불법적 접근)",
        "3. 통지문 필수 항목: 유출 항목 | 유출 시점과 경위 | 피해 최소화 방법 | 대응조치 및 구제절차 | 담당부서 연락처 | 법적 권리 안내 — 모두 확인",
        "4. 서류 간 대조: 유출 인원 2,300명, 유출 항목 5개 — 경위서·통지문·신고서 일치",
        "",
        FOOTER,
      ],
    },
    extracts: {
      incident: {
        case_id: "LUM-SEC-2026-017",
        org_name: "루미마켓",
        recognized_at: "2026-10-20 09:00",
        recognition_ambiguous: false,
        recognition_route: "보안관제 알림",
        leaked_at: "2026-10-19 23:40",
        leaked_count: 2300,
        leaked_items: ITEMS_5,
        has_sensitive_or_unique_id: false,
        external_access: true,
        report_date: "2026-10-21",
      },
      breach: {
        org_name: "루미마켓",
        reported_at: "2026-10-21 15:00",
        report_target: "개인정보보호위원회",
        leaked_at: "2026-10-19 23:40",
        leaked_count: 2300,
        leaked_items: ITEMS_5,
        has_timeline: true,
        has_self_protection: true,
        has_response: true,
        has_contact: true,
        cpo_name: "김보안",
      },
      notices: [
        {
          org_name: "루미마켓",
          notified_at: "2026-10-21 15:00",
          notice_channel: "이메일",
          leaked_count: 2300,
          leaked_items: ITEMS_5,
          has_items: true,
          has_timeline: true,
          has_self_protection: true,
          has_response: true,
          has_contact: true,
          has_legal_rights: true,
          notice_kind: "일반",
          is_possibility_notice: false,
        },
      ],
    },
    timeline: {
      recognized_at: "2026-10-20 09:00",
      notified_at: "2026-10-21 15:00",
      reported_at: "2026-10-21 15:00",
    },
  }),

  C05: build({
    judgment: {
      case_id: "C05",
      decision: "보완필요",
      report_required: true,
      missing_items: [],
      reason:
        "인지 시각은 2026-10-20 10:00이고 통지 시각은 2026-10-23 19:00이므로 81시간으로 72시간을 초과합니다. 신고 대상이며 신고 시각 2026-10-22 16:00까지는 54시간으로 기한 내입니다. 서류 간 유출 인원 5,600명과 유출 항목 5개는 일치합니다.",
    },
    document: {
      document_title: "보완 요청서 — 고객 통지 기한 초과",
      document_lines: [
        "사고번호: NUR-SEC-2026-057 (케이스 ID C05)",
        "회사명: 누리케어",
        "검수 결과: 보완필요",
        "",
        "[보완 요청 사항]",
        "1. 고객 통지가 최초 인지(2026-10-20 10:00) 후 81시간(2026-10-23 19:00)에 이루어져 72시간 기한을 9시간 초과했습니다.",
        "   - 지연 사유(긴급조치, 접속경로 차단 등)가 있으면 경위서에 사유와 조치 완료 시각을 추가 기재해 주십시오.",
        "   - 사유가 없으면 지연 경위를 별도 소명 문서로 작성해 주십시오.",
        "2. 개인정보위 신고(2026-10-22 16:00, 54시간)는 기한 내 완료되어 보완 대상이 아닙니다.",
        "",
        "[확인된 사항]",
        "- 신고 대상: 해당 (유출 인원 5,600명, 외부의 불법적 접근)",
        "- 통지문 필수 6항목: 모두 확인",
        "- 서류 간 유출 인원·항목: 일치",
        "",
        FOOTER,
      ],
    },
    extracts: {
      incident: {
        case_id: "NUR-SEC-2026-057",
        org_name: "누리케어",
        recognized_at: "2026-10-20 10:00",
        recognition_ambiguous: false,
        recognition_route: "고객 민원",
        leaked_at: "2026-10-18 02:10",
        leaked_count: 5600,
        leaked_items: ["성명", "생년월일", "휴대전화번호", "이메일", "예약 진료과"],
        has_sensitive_or_unique_id: false,
        external_access: true,
        urgent_measure_note: "",
        report_date: "2026-10-23",
      },
      breach: {
        org_name: "누리케어",
        reported_at: "2026-10-22 16:00",
        report_target: "개인정보보호위원회",
        leaked_at: "2026-10-18 02:10",
        leaked_count: 5600,
        leaked_items: ["성명", "생년월일", "휴대전화번호", "이메일", "예약 진료과"],
        has_timeline: true,
        has_self_protection: true,
        has_response: true,
        has_contact: true,
        cpo_name: "박지현",
      },
      notices: [
        {
          org_name: "누리케어",
          notified_at: "2026-10-23 19:00",
          notice_channel: "문자(SMS)",
          leaked_count: 5600,
          leaked_items: ["성명", "생년월일", "휴대전화번호", "이메일", "예약 진료과"],
          has_items: true,
          has_timeline: true,
          has_self_protection: true,
          has_response: true,
          has_contact: true,
          has_legal_rights: true,
          notice_kind: "일반",
          is_possibility_notice: false,
        },
      ],
    },
    timeline: {
      recognized_at: "2026-10-20 10:00",
      notified_at: "2026-10-23 19:00",
      reported_at: "2026-10-22 16:00",
    },
  }),

  C06: build({
    judgment: {
      case_id: "C06",
      decision: "보완필요",
      report_required: true,
      missing_items: ["법적 권리 안내"],
      reason:
        "인지 시각 2026-10-07 13:00, 통지 시각 2026-10-08 11:00(22시간), 신고 시각 2026-10-08 11:30(22시간 30분)으로 기한은 모두 지켰으나, 통지문에 정보주체의 법적 권리 안내(손해배상 청구·분쟁조정 신청 등)가 없어 보완필요입니다.",
    },
    document: {
      document_title: "보완 요청서 — 통지문 필수 항목 누락",
      document_lines: [
        "사고번호: MOV-SEC-2026-067 (케이스 ID C06)",
        "회사명: 무빙박스",
        "검수 결과: 보완필요",
        "",
        "[보완 요청 사항]",
        "1. 고객 통지문에 '법적 권리 안내' 항목이 없습니다. (2026.9.11 시행 개정 개인정보보호법 제34조에 따른 필수 통지 항목)",
        "   - 아래 문안을 통지문에 추가한 뒤 재발송(또는 추가 통지)해 주십시오.",
        "",
        "[수정 통지문 초안 — 추가 항목]",
        "7. 정보주체의 법적 권리 안내",
        "   고객님께서는 이번 유출로 입은 손해에 대해 손해배상을 청구하실 수 있으며, 개인정보보호법 제39조의2에 따른 법정손해배상 청구,",
        "   개인정보 분쟁조정위원회(국번 없이 1833-6972)에 분쟁조정 신청을 하실 수 있습니다.",
        "",
        "[확인된 사항]",
        "- 기한: 통지 22시간, 신고 22시간 30분 — 모두 72시간 이내",
        "- 신고 대상: 해당 (외부의 불법적 접근)",
        "- 서류 간 유출 인원·항목: 일치",
        "",
        FOOTER,
      ],
    },
    extracts: {
      incident: {
        case_id: "MOV-SEC-2026-067",
        org_name: "무빙박스",
        recognized_at: "2026-10-07 13:00",
        recognition_ambiguous: false,
        recognition_route: "외부 제보",
        leaked_at: "2026-10-06 21:00",
        leaked_count: 870,
        leaked_items: ["성명", "휴대전화번호", "이사 예정 주소"],
        has_sensitive_or_unique_id: false,
        external_access: true,
        report_date: "2026-10-08",
      },
      breach: {
        org_name: "무빙박스",
        reported_at: "2026-10-08 11:30",
        report_target: "개인정보보호위원회",
        leaked_at: "2026-10-06 21:00",
        leaked_count: 870,
        leaked_items: ["성명", "휴대전화번호", "이사 예정 주소"],
        has_timeline: true,
        has_self_protection: true,
        has_response: true,
        has_contact: true,
        cpo_name: "이정우",
      },
      notices: [
        {
          org_name: "무빙박스",
          notified_at: "2026-10-08 11:00",
          notice_channel: "이메일",
          leaked_count: 870,
          leaked_items: ["성명", "휴대전화번호", "이사 예정 주소"],
          has_items: true,
          has_timeline: true,
          has_self_protection: true,
          has_response: true,
          has_contact: true,
          has_legal_rights: false,
          notice_kind: "일반",
          is_possibility_notice: false,
        },
      ],
    },
    timeline: {
      recognized_at: "2026-10-07 13:00",
      notified_at: "2026-10-08 11:00",
      reported_at: "2026-10-08 11:30",
    },
  }),

  C07: build({
    judgment: {
      case_id: "C07",
      decision: "검토필요",
      report_required: true,
      missing_items: [],
      reason:
        "최초 인지 2026-10-22 16:00, 통지 2026-10-23 12:00(20시간), 신고 2026-10-23 14:00(22시간)으로 기한은 지켰으나, 유출 인원이 경위서 12,400명·신고서 1,240명으로 서로 달라 어느 값이 맞는지 서류만으로 확정할 수 없어 검토필요입니다.",
    },
    document: {
      document_title: "담당자 확인 요청서 — 서류 간 유출 인원 불일치",
      document_lines: [
        "사고번호: HAR-SEC-2026-077 (케이스 ID C07)",
        "회사명: 하루마켓",
        "검수 결과: 검토필요",
        "",
        "[확인 요청 사항]",
        "1. 유출 인원이 서류마다 다릅니다. 경위서 12,400명 / 통지문 12,400명 / 신고서 1,240명",
        "   - 신고서의 '1,240'이 오기인지, 경위서 집계가 바뀐 것인지 확인해 주십시오.",
        "   - 실제 인원이 12,400명이면 신고서를 정정 신고해야 합니다.",
        "2. 검수기는 어느 값이 맞는지 추측하지 않았습니다.",
        "",
        "[확인된 사항]",
        "- 기한: 통지 20시간, 신고 22시간 — 모두 72시간 이내",
        "- 통지문 필수 6항목: 모두 확인",
        "",
        FOOTER,
      ],
    },
    extracts: {
      incident: {
        case_id: "HAR-SEC-2026-077",
        org_name: "하루마켓",
        recognized_at: "2026-10-22 16:00",
        recognition_ambiguous: false,
        recognition_route: "보안관제 알림",
        leaked_at: "2026-10-22 03:15",
        leaked_count: 12400,
        leaked_items: ITEMS_5,
        has_sensitive_or_unique_id: false,
        external_access: true,
        report_date: "2026-10-23",
      },
      breach: {
        org_name: "하루마켓",
        reported_at: "2026-10-23 14:00",
        report_target: "개인정보보호위원회",
        leaked_at: "2026-10-22 03:15",
        leaked_count: 1240,
        leaked_items: ITEMS_5,
        has_timeline: true,
        has_self_protection: true,
        has_response: true,
        has_contact: true,
        cpo_name: "최민수",
      },
      notices: [
        {
          org_name: "하루마켓",
          notified_at: "2026-10-23 12:00",
          notice_channel: "이메일",
          leaked_count: 12400,
          leaked_items: ITEMS_5,
          has_items: true,
          has_timeline: true,
          has_self_protection: true,
          has_response: true,
          has_contact: true,
          has_legal_rights: true,
          notice_kind: "일반",
          is_possibility_notice: false,
        },
      ],
    },
    timeline: {
      recognized_at: "2026-10-22 16:00",
      notified_at: "2026-10-23 12:00",
      reported_at: "2026-10-23 14:00",
    },
  }),

  C10: build({
    judgment: {
      case_id: "C10",
      decision: "검토필요",
      report_required: true,
      missing_items: [],
      reason:
        "경위서에 '최초 인지' 시각이 없고 탐지 시각(2026-10-21 02:10)과 확인 시각(2026-10-21 09:30) 두 개만 있어 72시간 기준점을 확정할 수 없습니다. 유출 인원 2,700명·외부 접근으로 신고 대상이며 서류 간 인원·항목은 일치하지만, 기준점이 없어 경과시간은 계산하지 않았습니다.",
    },
    document: {
      document_title: "담당자 확인 요청서 — 최초 인지 시각 확정 필요",
      document_lines: [
        "사고번호: PAR-SEC-2026-107 (케이스 ID C10)",
        "회사명: 파란택배",
        "검수 결과: 검토필요",
        "",
        "[확인 요청 사항]",
        "1. 경위서에 '최초 인지 일시'가 명시되어 있지 않습니다.",
        "   - 보안관제 탐지 2026-10-21 02:10 과 담당자 확인 2026-10-21 09:30 중 어느 시각을 인지 시점으로 볼지 확정해 주십시오.",
        "   - 탐지 시각 기준이면 통지(2026-10-23 23:50)는 69시간 40분, 확인 시각 기준이면 62시간 20분입니다. 둘 다 72시간 이내이나 기준이 문서에 남아야 합니다.",
        "2. 확정한 시각을 경위서 '최초 인지 일시' 칸에 기재한 뒤 재검수를 요청해 주십시오.",
        "",
        "[확인된 사항]",
        "- 신고 대상: 해당 (유출 인원 2,700명, 외부의 불법적 접근)",
        "- 통지문 필수 6항목: 모두 확인",
        "- 서류 간 유출 인원·항목: 일치",
        "",
        FOOTER,
      ],
    },
    extracts: {
      incident: {
        case_id: "PAR-SEC-2026-107",
        org_name: "파란택배",
        recognized_at: "",
        recognition_ambiguous: true,
        detected_at: "2026-10-21 02:10",
        confirmed_at: "2026-10-21 09:30",
        recognition_route: "보안관제 알림",
        leaked_at: "2026-10-20 23:50",
        leaked_count: 2700,
        leaked_items: ["성명", "휴대전화번호", "배송지 주소"],
        has_sensitive_or_unique_id: false,
        external_access: true,
        report_date: "2026-10-24",
      },
      breach: {
        org_name: "파란택배",
        reported_at: "2026-10-23 17:00",
        report_target: "개인정보보호위원회",
        leaked_at: "2026-10-20 23:50",
        leaked_count: 2700,
        leaked_items: ["성명", "휴대전화번호", "배송지 주소"],
        has_timeline: true,
        has_self_protection: true,
        has_response: true,
        has_contact: true,
        cpo_name: "정하늘",
      },
      notices: [
        {
          org_name: "파란택배",
          notified_at: "2026-10-23 23:50",
          notice_channel: "앱 알림",
          leaked_count: 2700,
          leaked_items: ["성명", "휴대전화번호", "배송지 주소"],
          has_items: true,
          has_timeline: true,
          has_self_protection: true,
          has_response: true,
          has_contact: true,
          has_legal_rights: true,
          notice_kind: "일반",
          is_possibility_notice: false,
        },
      ],
    },
    timeline: {
      recognized_at: undefined,
      notified_at: "2026-10-23 23:50",
      reported_at: "2026-10-23 17:00",
    },
  }),
};

/** 파일 이름으로 샘플을 고른다 (set05·C05 → C05 …). 못 고르면 C01 */
export function pickSampleKey(fileName: string): string {
  const m = fileName.match(/(?:set|C)\s?(\d{2})/i);
  if (m) {
    const key = `C${m[1]}`;
    if (key in SAMPLES) return key;
  }
  return "C01";
}

const QUEUED_MS = 1200;
const RUN_MS = 6500;

export function makeMockJobId(fileName: string): string {
  return `mock-${pickSampleKey(fileName)}-${Date.now()}`;
}

export function readMockJob(id: string): { status: "queued" | "in_progress" | "completed"; result?: ReviewResult } | undefined {
  const m = id.match(/^mock-(C\d{2})-(\d+)$/);
  if (!m) return undefined;
  const sample = SAMPLES[m[1]] ?? SAMPLES.C01;
  const elapsed = Date.now() - Number(m[2]);
  if (elapsed < QUEUED_MS) return { status: "queued" };
  if (elapsed < RUN_MS) return { status: "in_progress" };
  return { status: "completed", result: sample };
}
