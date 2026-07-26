/** Client-side shape of a Freeze Notice Analyzer result (mirrors NoticeAnalysisOutput). */
export type NoticeSeverity = 'low' | 'medium' | 'high' | 'critical';

export type NoticeAnalysisResult = {
  freeze_reason: string;
  severity: NoticeSeverity;
  confidence: number;
  plain_english: string;
  what_this_means: string;
  suggested_next: string[];
  extracted: {
    bank_name?: string;
    amount_paise?: number;
    reference?: string;
    date_detected?: string;
  };
  human_review_required: boolean;
};
