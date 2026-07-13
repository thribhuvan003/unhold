import { describe, expect, it } from 'vitest';
import { isDirectCaseOwner, serializeCase } from '@/lib/api/case-access';

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

describe('isDirectCaseOwner', () => {
  it('allows the signed-in owner and the guest session directly bound to a guest case', () => {
    expect(
      isDirectCaseOwner(
        { userId: 'user-1', guestSessionId: null },
        { user_id: 'user-1', guest_session_id: null },
      ),
    ).toBe(true);
    expect(
      isDirectCaseOwner(
        { userId: null, guestSessionId: 'guest-1' },
        { user_id: null, guest_session_id: 'guest-1' },
      ),
    ).toBe(true);
  });

  it('rejects a collaborator or a guest session not bound to the case', () => {
    expect(
      isDirectCaseOwner(
        { userId: 'collaborator', guestSessionId: null },
        { user_id: 'owner', guest_session_id: null },
      ),
    ).toBe(false);
    expect(
      isDirectCaseOwner(
        { userId: null, guestSessionId: 'guest-2' },
        { user_id: null, guest_session_id: 'guest-1' },
      ),
    ).toBe(false);
  });
});
