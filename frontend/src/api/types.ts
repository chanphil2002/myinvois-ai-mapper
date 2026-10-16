export interface AuthResponse {
  token: string;
  userId: number;
  email: string;
  companyName: string;
  role: 'OWNER' | 'ADMIN';
}

export type MyInvoisEnvironment = 'SANDBOX' | 'PRODUCTION';

export interface CredentialResponse {
  id: number;
  clientId: string;
  environment: MyInvoisEnvironment;
  configured: boolean;
}

/** Both environments' credentials plus where submissions currently go. */
export interface CredentialsOverview {
  activeEnvironment: MyInvoisEnvironment;
  sandbox: CredentialResponse | null;
  production: CredentialResponse | null;
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

export type BillingSubscriptionStatus = 'PENDING' | 'ACTIVE' | 'CANCELLED';

export interface SubscriptionResponse {
  plan: string;
  planName: string;
  status: BillingSubscriptionStatus;
  amountCents: number;
  paidAt: string | null;
}

export interface SubscribeResponse {
  paymentUrl: string;
  billId: string;
}

export interface UsageResponse {
  plan: string;
  planName: string;
  free: boolean;
  /** Share of the period's AI allowance used (metered by actual token cost), e.g. 37.5. */
  usedPercent: number;
  /** Roughly how many more typical documents fit in what's left. */
  typicalDocumentsLeft: number;
  /** The allowance expressed in typical documents. */
  allowanceTypicalDocuments: number;
  periodLabel: string;
}

export interface ManualConsolidatedLineItem {
  transactionDate?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  unitCode?: string | null;
  classificationCode?: string | null;
  /** Reviewed AI row: update this extracted transaction instead of creating a new one. */
  sourceTransactionId?: number | null;
}

export interface CreateManualConsolidatedInvoicePayload {
  invoiceName?: string | null;
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
  createdAt: string | null;
  invoiceName: string | null;
  /** Credit notes: the invoice being corrected and its LHDN document ID. */
  originalInvoiceId: number | null;
  originalInternalId: string | null;
}

export type SubmissionStatus = 'PENDING' | 'IN_PROGRESS' | 'VALID' | 'INVALID' | 'PARTIALLY_VALID' | 'CANCELLED';

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
  environment: MyInvoisEnvironment;
  /** Document ID sent to LHDN, e.g. INV-12 or INV-12-R2. */
  internalId: string | null;
  validatedAt: string | null;
  /** Last moment it can be cancelled at LHDN (validated + 72h). */
  cancellableUntil: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
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
  /** True when the sale was read by AI (vs. typed in or imported from a CSV). */
  aiExtracted: boolean;
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
  createdAt: string | null;
  invoiceName: string | null;
}

export type NotificationType = 'SUBMISSION_ACCEPTED' | 'SUBMISSION_REJECTED' | 'SUBSCRIPTION_EXPIRING' | 'CONSOLIDATED_DUE';

export interface NotificationItem {
  id: number;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationList {
  unreadCount: number;
  items: NotificationItem[];
}

export interface Me {
  userId: number;
  email: string;
  companyName: string;
  role: 'OWNER' | 'ADMIN';
  referralCode: string | null;
}

// --- Admin console ---

export interface AdminOverview {
  totalUsers: number;
  activeUsers: number;
  newUsers30d: number;
  payingUsers: number;
  usersByPlan: Record<string, number>;
  monthlyRevenueCents: number;
  pendingCommissionCents: number;
  paidCommissionCents: number;
  aiCostThisMonthUsd: number;
}

export interface AdminUserRow {
  id: number;
  email: string;
  companyName: string;
  role: 'OWNER' | 'ADMIN';
  active: boolean;
  plan: string;
  planEndsAt: string | null;
  autoRenew: boolean;
  referralCode: string | null;
  salesperson: string | null;
  createdAt: string | null;
}

export interface SalespersonRow {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  commissionPercent: number;
  active: boolean;
  codes: string[];
  referredUsers: number;
  payingUsers: number;
  pendingCents: number;
  paidCents: number;
  createdAt: string | null;
}

export interface SaveSalespersonPayload {
  name?: string;
  email?: string;
  phone?: string;
  commissionPercent?: number;
  active?: boolean;
}

export interface ReferralCodeRow {
  id: number;
  code: string;
  salespersonId: number;
  salesperson: string | null;
  active: boolean;
  signups: number;
  createdAt: string | null;
}

export interface CommissionRow {
  id: number;
  salesperson: string | null;
  userEmail: string | null;
  paymentAmountCents: number;
  percent: number;
  amountCents: number;
  status: 'PENDING' | 'PAID';
  createdAt: string | null;
  paidAt: string | null;
}
