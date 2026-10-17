import type { BusinessProfile, LineItem, MappedInvoiceResponse } from '../api/types';

/**
 * LHDN-mandatory fields an individual e-invoice needs before it can move to "Reviewing".
 * Mirrors the server's InvoiceReadiness (which enforces it) — keep the two in sync.
 */
export function missingForReview(inv: MappedInvoiceResponse, supplier: BusinessProfile | null | undefined): string[] {
  const m: string[] = [];
  const req = (v: string | null | undefined, label: string) => {
    if (!v || !String(v).trim()) m.push(label);
  };
  req(inv.invoiceTypeCode, 'Invoice type code');
  req(inv.currencyCode, 'Currency');
  req(inv.buyerName, 'Buyer name');
  req(inv.buyerTin, 'Buyer TIN');
  req(inv.buyerIdType, 'Buyer ID type');
  req(inv.buyerIdValue, 'Buyer ID number');
  req(inv.buyerSst, 'Buyer SST no. (enter NA if not registered)');
  req(inv.buyerAddressLine1, 'Buyer address');
  req(inv.buyerCity, 'Buyer city');
  req(inv.buyerStateCode, 'Buyer state');
  req(inv.buyerCountryCode, 'Buyer country');
  req(inv.buyerPhone, 'Buyer phone');
  if (inv.lineItems.length === 0) m.push('At least one line item');
  inv.lineItems.forEach((li: LineItem, i) => {
    const n = `Line ${i + 1} `;
    req(li.description, `${n}description`);
    if (!(Number(li.quantity) > 0)) m.push(`${n}quantity above 0`);
    if (li.unitPrice == null || Number(li.unitPrice) < 0) m.push(`${n}unit price`);
    req(li.classificationCode, `${n}classification`);
  });
  if (!(invoiceTotals(inv).grand > 0)) m.push('A grand total above RM 0 (add line items with prices)');
  if (!supplier) {
    m.push('Your business profile (Settings)');
  } else {
    req(supplier.registrationName, 'Supplier registration name (Settings)');
    req(supplier.tin, 'Supplier TIN (Settings)');
    req(supplier.idValue, 'Supplier ID number (Settings)');
    req(supplier.msicCode, 'Supplier MSIC code (Settings)');
    req(supplier.msicDescription, 'Supplier business activity (Settings)');
    req(supplier.addressLine1, 'Supplier address (Settings)');
    req(supplier.city, 'Supplier city (Settings)');
    req(supplier.stateCode, 'Supplier state (Settings)');
    req(supplier.phone, 'Supplier phone (Settings)');
  }
  return m;
}

/** Totals exactly as the server derives them from the line items. */
export function invoiceTotals(inv: Pick<MappedInvoiceResponse, 'lineItems' | 'discountTotal'>) {
  const round = (n: number) => Math.round(n * 100) / 100;
  const subtotal = round(inv.lineItems.reduce((s, li) => s + Number(li.quantity || 0) * Number(li.unitPrice || 0), 0));
  const tax = round(inv.lineItems.reduce((s, li) => s + Number(li.taxAmount || 0), 0));
  const discount = Number(inv.discountTotal || 0);
  return { subtotal, tax, discount, grand: round(subtotal - discount + tax) };
}
