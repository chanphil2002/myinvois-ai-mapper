export interface AuthResponse {
  token: string;
  userId: number;
  email: string;
  companyName: string;
}

export type MyInvoisEnvironment = 'SANDBOX' | 'PRODUCTION';

export interface CredentialResponse {
  id: number;
  clientId: string;
  environment: MyInvoisEnvironment;
  configured: boolean;
}

export type SubmissionMode = 'INDIVIDUAL' | 'CONSOLIDATED';

export interface BusinessProfile {
  id?: number;
  registrationName: string;
  tin: string;
  idType: string;
  idValue: string;
  sstRegistration: string | null;
  ttxRegistration: string | null;
  msicCode: string | null;
  msicDescription: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalZone: string | null;
  stateCode: string | null;
  countryCode: string;
  phone: string | null;
  email: string | null;
  defaultSubmissionMode: SubmissionMode;
}

export type DocumentStatus = 'UPLOADED' | 'PARSING' | 'PARSED' | 'FAILED' | 'MANUAL';

export interface RevealedCredentialResponse {
  clientId: string;
  clientSecret: string;
  environment: MyInvoisEnvironment;
}

export interface ManualConsolidatedLineItem {
  transactionDate?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  unitCode?: string | null;
}

export interface CreateManualConsolidatedInvoicePayload {
  periodStart: string;
  periodEnd: string;
  lineItems: ManualConsolidatedLineItem[];
}

export interface DocumentResponse {
  id: number;
  originalFilename: string;
  fileType: string;
  status: DocumentStatus;
  uploadedAt: string;
}

export type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';

export interface LineItem {
  id: number;
  lineNo: number;
  description: string | null;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  classificationCode: string | null;
  unitCode: string | null;
  confidenceScore: number | null;
}

export interface MappedInvoiceResponse {
  id: number;
  documentId: number;
  invoiceTypeCode: string;
  issueDate: string | null;
  currencyCode: string;
  supplierTin: string | null;
  supplierName: string | null;
  buyerTin: string | null;
  buyerName: string | null;
  buyerIdType: string | null;
  buyerIdValue: string | null;
  buyerSst: string | null;
  buyerAddressLine1: string | null;
  buyerAddressLine2: string | null;
  buyerCity: string | null;
  buyerPostalZone: string | null;
  buyerStateCode: string | null;
  buyerCountryCode: string | null;
  buyerPhone: string | null;
  buyerEmail: string | null;
  subtotal: number | null;
  taxTotal: number | null;
  grandTotal: number | null;
  discountTotal: number | null;
  status: InvoiceStatus;
  confidenceScore: number | null;
  lineItems: LineItem[];
}

export type SubmissionStatus = 'PENDING' | 'IN_PROGRESS' | 'VALID' | 'INVALID' | 'PARTIALLY_VALID';

export interface SubmissionResponse {
  id: number;
  mappedInvoiceId: number | null;
  consolidatedInvoiceId: number | null;
  myInvoisSubmissionUid: string | null;
  myInvoisDocumentUuid: string | null;
  status: SubmissionStatus;
  submittedAt: string | null;
  statusUpdatedAt: string | null;
  errorMessage: string | null;
}

export type SalesTransactionStatus = 'PENDING' | 'GROUPED' | 'EXCLUDED';

export interface SalesTransactionResponse {
  id: number;
  documentId: number;
  transactionDate: string | null;
  description: string | null;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  classificationCode: string | null;
  unitCode: string | null;
  buyerName: string | null;
  buyerTin: string | null;
  eligibleForConsolidation: boolean;
  status: SalesTransactionStatus;
  confidenceScore: number | null;
}

export type ConsolidatedInvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';

export interface ConsolidatedInvoiceResponse {
  id: number;
  periodStart: string;
  periodEnd: string;
  invoiceTypeCode: string;
  currencyCode: string;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  status: ConsolidatedInvoiceStatus;
  transactions: SalesTransactionResponse[];
}
