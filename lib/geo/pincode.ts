/**
 * India PIN code → state/UT resolver (deterministic, offline).
 *
 * Source: India Post postal-circle structure — the first digits of a PIN code
 * map to postal circles, which align with states closely enough for state-level
 * resolution. This never guesses below state level; city/branch stays with the
 * user. UI must always show the detected state as editable, because a few
 * border ranges are approximate.
 *
 * Output keys are lowercase state names matching SBI_CIRCLE_MAP keys in
 * lib/banks/official-contacts.ts where a circle exists; other states still
 * resolve (the contact finder then falls back to the official circle list).
 */

type Range = { from: number; to: number; state: string };

// Checked against the India Post first-3-digit allocation. Order matters:
// specific carve-outs (Goa, Chandigarh, Uttarakhand, Jharkhand, NE) come
// before the broad ranges that surround them.
const CARVE_OUTS: Range[] = [
  { from: 160, to: 160, state: 'chandigarh' },
  { from: 248, to: 249, state: 'uttarakhand' },
  { from: 263, to: 263, state: 'uttarakhand' },
  { from: 403, to: 403, state: 'goa' },
  { from: 605, to: 605, state: 'puducherry' },
  { from: 737, to: 737, state: 'sikkim' },
  { from: 744, to: 744, state: 'andaman and nicobar islands' },
  // Jharkhand ranges interleaved inside the Bihar 800–855 block
  { from: 813, to: 816, state: 'jharkhand' },
  { from: 822, to: 829, state: 'jharkhand' },
  { from: 831, to: 835, state: 'jharkhand' },
  // North-East (SBI serves these via the Guwahati circle)
  { from: 790, to: 792, state: 'arunachal pradesh' },
  { from: 793, to: 794, state: 'meghalaya' },
  { from: 795, to: 795, state: 'manipur' },
  { from: 796, to: 796, state: 'mizoram' },
  { from: 797, to: 798, state: 'nagaland' },
  { from: 799, to: 799, state: 'tripura' },
];

const BROAD_RANGES: Range[] = [
  { from: 110, to: 110, state: 'delhi' },
  { from: 121, to: 136, state: 'haryana' },
  { from: 140, to: 152, state: 'punjab' },
  { from: 171, to: 177, state: 'himachal pradesh' },
  { from: 180, to: 194, state: 'jammu and kashmir' },
  { from: 201, to: 285, state: 'uttar pradesh' },
  { from: 301, to: 345, state: 'rajasthan' },
  { from: 360, to: 396, state: 'gujarat' },
  { from: 400, to: 401, state: 'mumbai' }, // Mumbai Metro (MMR) → SBI Mumbai circle
  { from: 402, to: 445, state: 'maharashtra' }, // rest of Maharashtra → SBI Maharashtra circle
  { from: 450, to: 488, state: 'madhya pradesh' },
  { from: 490, to: 497, state: 'chhattisgarh' },
  { from: 500, to: 509, state: 'telangana' },
  { from: 510, to: 535, state: 'andhra pradesh' },
  { from: 560, to: 591, state: 'karnataka' },
  { from: 600, to: 643, state: 'tamil nadu' },
  { from: 670, to: 695, state: 'kerala' },
  { from: 700, to: 743, state: 'west bengal' },
  { from: 751, to: 770, state: 'odisha' },
  { from: 781, to: 788, state: 'assam' },
  { from: 800, to: 855, state: 'bihar' },
];

/**
 * Resolves a 6-digit Indian PIN code to a lowercase state/UT name, or null
 * when the input is not a valid PIN or the prefix is unallocated.
 */
export function resolvePincodeToState(pincode: string): string | null {
  const cleaned = pincode.trim();
  if (!/^[1-8]\d{5}$/.test(cleaned)) return null;
  const prefix = Number(cleaned.slice(0, 3));
  for (const r of CARVE_OUTS) {
    if (prefix >= r.from && prefix <= r.to) return r.state;
  }
  for (const r of BROAD_RANGES) {
    if (prefix >= r.from && prefix <= r.to) return r.state;
  }
  return null;
}
