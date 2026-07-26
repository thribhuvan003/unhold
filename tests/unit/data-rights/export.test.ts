import { describe, expect, it } from 'vitest';
import {
  assertWithinExportLimit,
  buildCaseExportFilename,
  CaseDataExportError,
  evidenceExportPath,
  MAX_EXPORT_SOURCE_BYTES,
} from '@/lib/data-rights/export';

describe('case-data export helpers', () => {
  it('uses a harmless, non-internal evidence filename', () => {
    expect(evidenceExportPath(0, '../../statement June.pdf')).toBe('evidence/001-statement_June.pdf');
  });

  it('names the download from the public case ID only', () => {
    expect(buildCaseExportFilename('LL-12345')).toBe('unhold-LL-12345-data.zip');
  });

  it('fails before download when source files exceed the beta limit', () => {
    expect(() => assertWithinExportLimit(MAX_EXPORT_SOURCE_BYTES + 1)).toThrow(CaseDataExportError);
  });
});
