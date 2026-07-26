/** sessionStorage key for one-time recovery bootstrap after case create. */
export const SAVE_CASE_STORAGE_KEY = 'unhold:lastCaseBootstrap';

export type CaseBootstrap = {
  caseId: string;
  publicId: string;
  recoveryCode?: string;
};
