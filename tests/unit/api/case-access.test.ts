import { describe, expect, it } from 'vitest';
import { serializeCase } from '@/lib/api/case-access';

const row = {
  id: 'case-1',
  public_id: 'LL-10001',
  status: 'new',
  bank_id: null,
  freeze_reason: null,
  freeze_type: null,
  victim_role: null,
  frozen_amount_paise: null,
  intake_json: {
    user_name: 'Asha',
    user_phone: '+919999999999',
    user_address: 'Private address',
    narrative: 'Private incident details',
    reminder_email: 'asha@example.com',
  },
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('serializeCase', () => {
  it('does not expose raw intake data to read-only collaborators', () => {
    const serialized = serializeCase(row, true);

    expect(serialized.intake_json).toEqual({});
    expect(JSON.stringify(serialized)).not.toContain('Asha');
    expect(JSON.stringify(serialized)).not.toContain('Private incident');
  });

  it('keeps owner data but removes reminder contact fields', () => {
    const serialized = serializeCase(row);

    expect(serialized.intake_json).toMatchObject({ user_name: 'Asha' });
    expect(serialized.intake_json).not.toHaveProperty('reminder_email');
  });
});
