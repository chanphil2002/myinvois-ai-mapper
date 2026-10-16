import { apiClient, unwrap, ApiResponse } from './client';
import type {
  AuthResponse,
  BusinessProfile,
  ConsolidatedInvoiceResponse,
  CreateManualConsolidatedInvoicePayload,
  ManualConsolidatedLineItem,
  CredentialsOverview,
  DocumentResponse,
  MappedInvoiceResponse,
  MyInvoisEnvironment,
  RevealedCredentialResponse,
  SalesTransactionResponse,
  SubmissionResponse,
  RedirectResponse,
  PaymentRecord,
  SubscriptionResponse,
  UsageResponse,
  NotificationList,
  Me,
  AdminOverview,
  AdminUserRow,
  SalespersonRow,
  SaveSalespersonPayload,
  ReferralCodeRow,
  CommissionRow,
} from './types';

export function register(payload: {
  email: string;
  password: string;
  companyName: string;
  tin?: string;
  referralCode?: string;
}): Promise<AuthResponse> {
  return unwrap(apiClient.post<ApiResponse<AuthResponse>>('/api/auth/register', payload));
}

export function login(payload: { email: string; password: string }): Promise<AuthResponse> {
  return unwrap(apiClient.post<ApiResponse<AuthResponse>>('/api/auth/login', payload));
}

export function saveCredentials(payload: {
  clientId: string;
  clientSecret: string;
  environment: MyInvoisEnvironment;
}): Promise<CredentialsOverview> {
  return unwrap(apiClient.put<ApiResponse<CredentialsOverview>>('/api/myinvois/credentials', payload));
}

export function getCredentials(): Promise<CredentialsOverview> {
  return unwrap(apiClient.get<ApiResponse<CredentialsOverview>>('/api/myinvois/credentials'));
}

export function setActiveEnvironment(environment: MyInvoisEnvironment): Promise<CredentialsOverview> {
  return unwrap(apiClient.put<ApiResponse<CredentialsOverview>>('/api/myinvois/credentials/active', { environment }));
}

export function revealCredentials(payload: {
  password: string;
  environment: MyInvoisEnvironment;
}): Promise<RevealedCredentialResponse> {
  return unwrap(
    apiClient.post<ApiResponse<RevealedCredentialResponse>>('/api/myinvois/credentials/reveal', payload),
  );
}

export function saveBusinessProfile(payload: BusinessProfile): Promise<BusinessProfile> {
  return unwrap(apiClient.put<ApiResponse<BusinessProfile>>('/api/business-profile', payload));
}

export function getBusinessProfile(): Promise<BusinessProfile> {
  return unwrap(apiClient.get<ApiResponse<BusinessProfile>>('/api/business-profile'));
}

export function uploadDocument(file: File): Promise<DocumentResponse> {
  const form = new FormData();
  form.append('file', file);
  return unwrap(
    apiClient.post<ApiResponse<DocumentResponse>>('/api/documents', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  );
}

export function listDocuments(): Promise<DocumentResponse[]> {
  return unwrap(apiClient.get<ApiResponse<DocumentResponse[]>>('/api/documents'));
}

export function getUsage(): Promise<UsageResponse> {
  return unwrap(apiClient.get<ApiResponse<UsageResponse>>('/api/usage'));
}

export function submitSupport(payload: { subject: string; body: string }): Promise<boolean> {
  return unwrap(apiClient.post<ApiResponse<boolean>>('/api/support', payload));
}

export function getDocument(id: number): Promise<DocumentResponse> {
  return unwrap(apiClient.get<ApiResponse<DocumentResponse>>(`/api/documents/${id}`));
}

export function deleteDocument(id: number): Promise<boolean> {
  return unwrap(apiClient.delete<ApiResponse<boolean>>(`/api/documents/${id}`));
}

export function runMapping(documentId: number): Promise<MappedInvoiceResponse> {
  return unwrap(apiClient.post<ApiResponse<MappedInvoiceResponse>>(`/api/documents/${documentId}/mapping`));
}

export function listMappingsForDocument(documentId: number): Promise<MappedInvoiceResponse[]> {
  return unwrap(apiClient.get<ApiResponse<MappedInvoiceResponse[]>>(`/api/documents/${documentId}/mapping`));
}

export function getMappedInvoice(id: number): Promise<MappedInvoiceResponse> {
  return unwrap(apiClient.get<ApiResponse<MappedInvoiceResponse>>(`/api/mapped-invoices/${id}`));
}

export function updateMappedInvoice(
  id: number,
  payload: Partial<MappedInvoiceResponse>,
): Promise<MappedInvoiceResponse> {
  return unwrap(apiClient.patch<ApiResponse<MappedInvoiceResponse>>(`/api/mapped-invoices/${id}`, payload));
}

export function createManualInvoice(payload: Partial<MappedInvoiceResponse>): Promise<MappedInvoiceResponse> {
  return unwrap(apiClient.post<ApiResponse<MappedInvoiceResponse>>('/api/mapped-invoices', payload));
}

export function listMappedInvoices(): Promise<MappedInvoiceResponse[]> {
  return unwrap(apiClient.get<ApiResponse<MappedInvoiceResponse[]>>('/api/mapped-invoices'));
}

export function confirmMappedInvoice(id: number): Promise<MappedInvoiceResponse> {
  return unwrap(apiClient.post<ApiResponse<MappedInvoiceResponse>>(`/api/mapped-invoices/${id}/confirm`));
}

export function submitMappedInvoice(id: number): Promise<SubmissionResponse> {
  return unwrap(apiClient.post<ApiResponse<SubmissionResponse>>(`/api/mapped-invoices/${id}/submit`));
}

export function listSubmissions(mappedInvoiceId: number): Promise<SubmissionResponse[]> {
  return unwrap(
    apiClient.get<ApiResponse<SubmissionResponse[]>>(`/api/mapped-invoices/${mappedInvoiceId}/submissions`),
  );
}

export function refreshSubmission(id: number): Promise<SubmissionResponse> {
  return unwrap(apiClient.post<ApiResponse<SubmissionResponse>>(`/api/submissions/${id}/refresh`));
}

// --- Consolidated e-invoice ---

export function extractTransactions(documentId: number): Promise<SalesTransactionResponse[]> {
  return unwrap(apiClient.post<ApiResponse<SalesTransactionResponse[]>>(`/api/documents/${documentId}/transactions`));
}

export function listTransactionsForDocument(documentId: number): Promise<SalesTransactionResponse[]> {
  return unwrap(apiClient.get<ApiResponse<SalesTransactionResponse[]>>(`/api/documents/${documentId}/transactions`));
}

export function listEligibleTransactions(): Promise<SalesTransactionResponse[]> {
  return unwrap(apiClient.get<ApiResponse<SalesTransactionResponse[]>>('/api/transactions/eligible'));
}

export function createConsolidatedInvoice(payload: {
  transactionIds: number[];
  periodStart: string;
  periodEnd: string;
}): Promise<ConsolidatedInvoiceResponse> {
  return unwrap(apiClient.post<ApiResponse<ConsolidatedInvoiceResponse>>('/api/consolidated-invoices', payload));
}

export function createManualConsolidatedInvoice(
  payload: CreateManualConsolidatedInvoicePayload,
): Promise<ConsolidatedInvoiceResponse> {
  return unwrap(
    apiClient.post<ApiResponse<ConsolidatedInvoiceResponse>>('/api/consolidated-invoices/manual', payload),
  );
}

export function createConsolidatedDraft(payload: {
  invoiceName?: string | null;
  periodStart: string;
  periodEnd: string;
}): Promise<ConsolidatedInvoiceResponse> {
  return unwrap(apiClient.post<ApiResponse<ConsolidatedInvoiceResponse>>('/api/consolidated-invoices/draft', payload));
}

export function updateConsolidatedDetails(
  id: number,
  payload: { invoiceName?: string | null; periodStart: string; periodEnd: string },
): Promise<ConsolidatedInvoiceResponse> {
  return unwrap(apiClient.patch<ApiResponse<ConsolidatedInvoiceResponse>>(`/api/consolidated-invoices/${id}/details`, payload));
}

export function attachTransactions(id: number, transactionIds: number[]): Promise<ConsolidatedInvoiceResponse> {
  return unwrap(
    apiClient.post<ApiResponse<ConsolidatedInvoiceResponse>>(`/api/consolidated-invoices/${id}/attach`, { transactionIds }),
  );
}

export function addConsolidatedLines(
  id: number,
  lineItems: ManualConsolidatedLineItem[],
): Promise<ConsolidatedInvoiceResponse> {
  return unwrap(
    apiClient.post<ApiResponse<ConsolidatedInvoiceResponse>>(`/api/consolidated-invoices/${id}/lines`, { lineItems }),
  );
}

export function removeConsolidatedTransaction(id: number, transactionId: number): Promise<ConsolidatedInvoiceResponse> {
  return unwrap(
    apiClient.delete<ApiResponse<ConsolidatedInvoiceResponse>>(`/api/consolidated-invoices/${id}/transactions/${transactionId}`),
  );
}

export function listConsolidatedInvoices(): Promise<ConsolidatedInvoiceResponse[]> {
  return unwrap(apiClient.get<ApiResponse<ConsolidatedInvoiceResponse[]>>('/api/consolidated-invoices'));
}

export function getConsolidatedInvoice(id: number): Promise<ConsolidatedInvoiceResponse> {
  return unwrap(apiClient.get<ApiResponse<ConsolidatedInvoiceResponse>>(`/api/consolidated-invoices/${id}`));
}

export function updateConsolidatedInvoice(
  id: number,
  payload: { transactionIds: number[]; periodStart: string; periodEnd: string },
): Promise<ConsolidatedInvoiceResponse> {
  return unwrap(apiClient.patch<ApiResponse<ConsolidatedInvoiceResponse>>(`/api/consolidated-invoices/${id}`, payload));
}

export function confirmConsolidatedInvoice(id: number): Promise<ConsolidatedInvoiceResponse> {
  return unwrap(apiClient.post<ApiResponse<ConsolidatedInvoiceResponse>>(`/api/consolidated-invoices/${id}/confirm`));
}

export function submitConsolidatedInvoice(id: number): Promise<SubmissionResponse> {
  return unwrap(apiClient.post<ApiResponse<SubmissionResponse>>(`/api/consolidated-invoices/${id}/submit`));
}

export function listConsolidatedSubmissions(consolidatedInvoiceId: number): Promise<SubmissionResponse[]> {
  return unwrap(
    apiClient.get<ApiResponse<SubmissionResponse[]>>(`/api/consolidated-invoices/${consolidatedInvoiceId}/submissions`),
  );
}

// --- Billing (Billplz) ---

export async function getSubscription(): Promise<SubscriptionResponse | null> {
  // Returns null when the user has no active subscription, so don't use unwrap (which rejects null).
  const res = await apiClient.get<ApiResponse<SubscriptionResponse | null>>('/api/billing/subscription');
  return res.data.data;
}

/** Stripe Checkout for a plan. autoRenew = monthly card / Apple Pay subscription; otherwise pay once (FPX too). */
export function startCheckout(plan: string, autoRenew: boolean): Promise<RedirectResponse> {
  return unwrap(apiClient.post<ApiResponse<RedirectResponse>>('/api/billing/checkout', { plan, autoRenew }));
}

export function setAutoRenew(enabled: boolean): Promise<RedirectResponse> {
  return unwrap(apiClient.post<ApiResponse<RedirectResponse>>('/api/billing/auto-renew', { enabled }));
}

export function openBillingPortal(): Promise<RedirectResponse> {
  return unwrap(apiClient.post<ApiResponse<RedirectResponse>>('/api/billing/portal'));
}

export function listPayments(): Promise<PaymentRecord[]> {
  return unwrap(apiClient.get<ApiResponse<PaymentRecord[]>>('/api/billing/payments'));
}

export async function getDocumentFile(id: number): Promise<Blob> {
  const res = await apiClient.get(`/api/documents/${id}/file`, { responseType: 'blob' });
  return res.data as Blob;
}

// --- Notifications ---

export function listNotifications(): Promise<NotificationList> {
  return unwrap(apiClient.get<ApiResponse<NotificationList>>('/api/notifications'));
}

export function markNotificationRead(id: number): Promise<void> {
  return unwrap(apiClient.post<ApiResponse<void>>(`/api/notifications/${id}/read`));
}

export function markAllNotificationsRead(): Promise<void> {
  return unwrap(apiClient.post<ApiResponse<void>>('/api/notifications/read-all'));
}

// --- Corrections after submission ---

/** Cancel an issued e-invoice at LHDN (within 72 hours of validation) and reopen it for correction. */
export function cancelSubmission(id: number, reason: string): Promise<SubmissionResponse> {
  return unwrap(apiClient.post<ApiResponse<SubmissionResponse>>(`/api/submissions/${id}/cancel`, { reason }));
}

/** Start a credit note (type 02) correcting an accepted invoice. */
export function createCreditNote(mappedInvoiceId: number): Promise<MappedInvoiceResponse> {
  return unwrap(apiClient.post<ApiResponse<MappedInvoiceResponse>>(`/api/mapped-invoices/${mappedInvoiceId}/credit-note`));
}

// --- Account ---

export function getMe(): Promise<Me> {
  return unwrap(apiClient.get<ApiResponse<Me>>('/api/account/me'));
}

export function applyReferralCode(code: string): Promise<{ referralCode: string }> {
  return unwrap(apiClient.post<ApiResponse<{ referralCode: string }>>('/api/account/referral', { code }));
}

// --- Admin console (role ADMIN) ---

export const adminApi = {
  overview: () => unwrap(apiClient.get<ApiResponse<AdminOverview>>('/api/admin/overview')),
  users: (q?: string) => unwrap(apiClient.get<ApiResponse<AdminUserRow[]>>('/api/admin/users', { params: { q } })),
  updateUser: (id: number, body: { active?: boolean; role?: 'OWNER' | 'ADMIN' }) =>
    unwrap(apiClient.patch<ApiResponse<void>>(`/api/admin/users/${id}`, body)),
  salespeople: () => unwrap(apiClient.get<ApiResponse<SalespersonRow[]>>('/api/admin/salespersons')),
  createSalesperson: (body: SaveSalespersonPayload) =>
    unwrap(apiClient.post<ApiResponse<{ id: number }>>('/api/admin/salespersons', body)),
  updateSalesperson: (id: number, body: SaveSalespersonPayload) =>
    unwrap(apiClient.patch<ApiResponse<{ id: number }>>(`/api/admin/salespersons/${id}`, body)),
  codes: () => unwrap(apiClient.get<ApiResponse<ReferralCodeRow[]>>('/api/admin/referral-codes')),
  createCode: (body: { salespersonId: number; code?: string }) =>
    unwrap(apiClient.post<ApiResponse<{ code: string }>>('/api/admin/referral-codes', body)),
  updateCode: (id: number, body: { active: boolean }) =>
    unwrap(apiClient.patch<ApiResponse<void>>(`/api/admin/referral-codes/${id}`, body)),
  commissions: (status?: string) =>
    unwrap(apiClient.get<ApiResponse<CommissionRow[]>>('/api/admin/commissions', { params: { status } })),
  markCommissionPaid: (id: number) => unwrap(apiClient.post<ApiResponse<void>>(`/api/admin/commissions/${id}/pay`)),
};
