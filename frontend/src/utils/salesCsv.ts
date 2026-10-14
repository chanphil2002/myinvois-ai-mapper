import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { CLASSIFICATION_CODES, UOM_CODES } from '../constants/myinvoisCodes';

dayjs.extend(customParseFormat);

export interface ParsedSale {
  date: string | null; // YYYY-MM-DD
  description: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  unitCode: string | null;
  classificationCode: string | null;
}

export interface ParseResult {
  sales: ParsedSale[];
  /** Human-readable notes about rows that were skipped or values that were ignored. */
  warnings: string[];
  /** True when a header row named the columns — the import can then be trusted without AI. */
  headerMatched: boolean;
}

/** Splits delimited text into rows, honouring "quoted, fields" and "" escapes. */
function splitRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  rows.push(row);
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

const FIELD_ALIASES: Record<string, keyof ParsedSale> = {
  date: 'date',
  'sale date': 'date',
  'transaction date': 'date',
  description: 'description',
  item: 'description',
  'item name': 'description',
  'product name': 'description',
  product: 'description',
  'order date': 'date',
  'order creation date': 'date',
  'deal price': 'unitPrice',
  'unit price (rm)': 'unitPrice',
  'price (rm)': 'unitPrice',
  'sst': 'taxAmount',
  qty: 'quantity',
  quantity: 'quantity',
  'unit price': 'unitPrice',
  price: 'unitPrice',
  unitprice: 'unitPrice',
  tax: 'taxAmount',
  'tax amount': 'taxAmount',
  unit: 'unitCode',
  uom: 'unitCode',
  'unit code': 'unitCode',
  classification: 'classificationCode',
  'classification code': 'classificationCode',
};
const DEFAULT_ORDER: (keyof ParsedSale)[] = [
  'date',
  'description',
  'quantity',
  'unitPrice',
  'taxAmount',
  'unitCode',
  'classificationCode',
];

const num = (v: string | undefined): number | null => {
  if (v === undefined || v.trim() === '') return null;
  const n = Number(v.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : NaN;
};

const parseDate = (v: string): string | null => {
  const t = v.trim().split(/[ T]/)[0]; // exports often append a time
  if (!t) return null;
  for (const f of ['YYYY-MM-DD', 'D/M/YYYY', 'DD/MM/YYYY', 'D-M-YYYY', 'DD-MM-YYYY']) {
    const d = dayjs(t, f, true);
    if (d.isValid()) return d.format('YYYY-MM-DD');
  }
  return undefined as unknown as null; // signals "unparseable" to the caller
};

/**
 * Parses pasted/imported sales. Accepts comma, tab or semicolon separated text (Excel pastes as tabs).
 * With a header row, columns are matched by name; without one the order is
 * date, description, qty, unit price, tax, unit, classification (trailing columns optional).
 */
export function parseSalesText(text: string): ParseResult {
  const warnings: string[] = [];
  const firstLine = text.split(/\r?\n/).find((l) => l.trim() !== '') ?? '';
  const delimiter = ['\t', ';', ','].reduce((best, d) =>
    firstLine.split(d).length > firstLine.split(best).length ? d : best,
  );
  const rows = splitRows(text, delimiter);
  if (rows.length === 0) return { sales: [], warnings: ['Nothing to import.'], headerMatched: false };

  let order = DEFAULT_ORDER;
  let headerMatched = false;
  const header = rows[0].map((h) => h.trim().toLowerCase());
  if (header.some((h) => FIELD_ALIASES[h] === 'description')) {
    order = header.map((h) => FIELD_ALIASES[h]);
    rows.shift();
    headerMatched = true;
  }

  const validUnits = new Set(UOM_CODES.map((u) => u.value));
  const validClass = new Set(CLASSIFICATION_CODES.map((c) => c.value));

  const sales: ParsedSale[] = [];
  rows.forEach((cells, idx) => {
    const line = idx + 1;
    const get = (field: keyof ParsedSale) => {
      const i = order.indexOf(field);
      return i >= 0 ? cells[i]?.trim() : undefined;
    };
    const description = get('description') ?? '';
    if (!description) {
      warnings.push(`Row ${line}: no description — skipped.`);
      return;
    }
    const q = num(get('quantity'));
    const p = num(get('unitPrice'));
    const t = num(get('taxAmount'));
    if ([q, p, t].some((n) => n !== null && Number.isNaN(n))) {
      warnings.push(`Row ${line} (${description}): a number could not be read — skipped.`);
      return;
    }
    const rawDate = get('date') ?? '';
    const date = parseDate(rawDate);
    if (rawDate && date === undefined) {
      warnings.push(`Row ${line} (${description}): date “${rawDate}” not understood — use YYYY-MM-DD or DD/MM/YYYY; period end used.`);
    }
    const unit = (get('unitCode') ?? '').toUpperCase();
    const cls = get('classificationCode') ?? '';
    if (unit && !validUnits.has(unit)) warnings.push(`Row ${line}: unit “${unit}” isn’t in the supported list — ignored.`);
    if (cls && !validClass.has(cls)) warnings.push(`Row ${line}: classification “${cls}” isn’t a MyInvois code — ignored.`);
    sales.push({
      date: date ?? null,
      description,
      quantity: q ?? 1,
      unitPrice: p ?? 0,
      taxAmount: t ?? 0,
      unitCode: validUnits.has(unit) ? unit : null,
      classificationCode: validClass.has(cls) ? cls : null,
    });
  });
  return { sales, warnings, headerMatched };
}
