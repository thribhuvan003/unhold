import { describe, expect, it } from 'vitest';
import {
  normalizePlaceholderValue,
  PLACEHOLDER_FIELDS,
} from '@/components/letters/placeholder-labels';
import { validateUploadFile } from '@/lib/evidence/validate-file';

function fileOf(type: string, name: string, size = 1000): File {
  const f = new File([new Uint8Array(size)], name, { type });
  return f;
}

describe('normalizePlaceholderValue — accept how real users type', () => {
  it('phone: strips +91 / 0-prefix / spaces to a bare 10-digit mobile', () => {
    const p = PLACEHOLDER_FIELDS.USER_PHONE.pattern!;
    for (const raw of ['+91 98765 43210', '098765 43210', '98765-43210', ' 9876543210 ', '+919876543210']) {
      const norm = normalizePlaceholderValue('USER_PHONE', raw);
      expect(norm, raw).toBe('9876543210');
      expect(p.test(norm), raw).toBe(true);
    }
  });

  it('phone: still rejects all-same and short numbers', () => {
    const p = PLACEHOLDER_FIELDS.USER_PHONE.pattern!;
    expect(p.test(normalizePlaceholderValue('USER_PHONE', '0000000000'))).toBe(false);
    expect(p.test(normalizePlaceholderValue('USER_PHONE', '12345'))).toBe(false);
  });

  it('amount: keeps the integer rupee part of a pasted ₹1,00,000.50', () => {
    expect(normalizePlaceholderValue('AMOUNT_INR', '₹1,00,000.50')).toBe('100000');
    expect(normalizePlaceholderValue('AMOUNT_INR', '25,000')).toBe('25000');
  });

  it('name: accepts non-Latin Indian scripts (Tamil, Telugu), blocks junk', () => {
    const p = PLACEHOLDER_FIELDS.USER_NAME.pattern!;
    expect(p.test('ரவி குமார்')).toBe(true); // Tamil
    expect(p.test('రవి')).toBe(true); // Telugu
    expect(p.test('A. R. Rahman')).toBe(true);
    expect(p.test('.')).toBe(false);
    expect(p.test('0')).toBe(false);
  });

  it('nodal email: validates the recipient address', () => {
    const p = PLACEHOLDER_FIELDS.NODAL_EMAIL.pattern!;
    expect(p.test('agmcustomer.lhoban@sbi.co.in')).toBe(true);
    expect(p.test('the manager')).toBe(false);
    expect(p.test('idk')).toBe(false);
  });
});

describe('validateUploadFile — phone photos are the core evidence', () => {
  it('accepts iPhone HEIC and Android WebP', () => {
    expect(validateUploadFile(fileOf('image/heic', 'notice.heic'))).toBeNull();
    expect(validateUploadFile(fileOf('image/webp', 'screenshot.webp'))).toBeNull();
    expect(validateUploadFile(fileOf('image/jpeg', 'a.jpg'))).toBeNull();
    expect(validateUploadFile(fileOf('application/pdf', 'a.pdf'))).toBeNull();
  });

  it('falls back to the extension when the browser reports an empty type', () => {
    expect(validateUploadFile(fileOf('', 'freeze.jpg'))).toBeNull();
  });

  it('rejects a truly unsupported type and an empty file', () => {
    expect(validateUploadFile(fileOf('application/msword', 'letter.doc'))).not.toBeNull();
    expect(validateUploadFile(fileOf('image/jpeg', 'empty.jpg', 0))).not.toBeNull();
  });
});
