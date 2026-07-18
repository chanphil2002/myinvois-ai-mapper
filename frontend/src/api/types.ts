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

export type DocumentStatus = 'UPLOADED' | 'PARSING' | 'PARSED' | 'FAILED';

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
  subtotal: number | null;
  taxTotal: number | null;
  grandTotal: number | null;
  status: InvoiceStatus;
  confidenceScore: number | null;
  lineItems: LineItem[];
}

export type SubmissionStatus = 'PENDING' | 'IN_PROGRESS' | 'VALID' | 'INVALID' | 'PARTIALLY_VALID';

export interface SubmissionResponse {
  id: number;
  mappedInvoiceId: number;
  myInvoisSubmissionUid: string | null;
  myInvoisDocumentUuid: string | null;
  status: SubmissionStatus;
  submittedAt: string | null;
  statusUpdatedAt: string | null;
}
