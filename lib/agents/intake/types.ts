export type IntakeManifestEntry = {
  source_id: string;
  field: string;
  value: string;
};

export type IntakeClassifierInput = {
  case_id: string;
  evidence_count: number;
  intake_json: Record<string, unknown>;
  manifest: IntakeManifestEntry[];
  evidence_types?: string[];
};