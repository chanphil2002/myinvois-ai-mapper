// LHDN e-Invoice state codes (CountrySubentityCode).
export const MALAYSIA_STATE_CODES = [
  { value: '01', label: 'Johor' },
  { value: '02', label: 'Kedah' },
  { value: '03', label: 'Kelantan' },
  { value: '04', label: 'Melaka' },
  { value: '05', label: 'Negeri Sembilan' },
  { value: '06', label: 'Pahang' },
  { value: '07', label: 'Pulau Pinang' },
  { value: '08', label: 'Perak' },
  { value: '09', label: 'Perlis' },
  { value: '10', label: 'Selangor' },
  { value: '11', label: 'Terengganu' },
  { value: '12', label: 'Sabah' },
  { value: '13', label: 'Sarawak' },
  { value: '14', label: 'WP Kuala Lumpur' },
  { value: '15', label: 'WP Labuan' },
  { value: '16', label: 'WP Putrajaya' },
  { value: '17', label: 'Not Applicable' },
];

// The AI extracts the buyer's state as a free-text name (it's not allowed to guess a numeric
// code) — this maps that text back to an LHDN state code so the review Select can preselect it.
// Falls through to null (user picks manually) if there's no match, e.g. AI returned nothing.
export function matchStateCode(text: string | null | undefined): string | null {
  if (!text) return null;
  const normalized = text.trim().toLowerCase();
  const match = MALAYSIA_STATE_CODES.find(
    (s) => s.label.toLowerCase() === normalized || s.value === normalized,
  );
  return match ? match.value : null;
}
