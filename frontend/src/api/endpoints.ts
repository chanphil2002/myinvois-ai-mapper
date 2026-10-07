import { apiClient, unwrap, ApiResponse } from './client';
import type {
  AuthResponse,
  BusinessProfile,
  ConsolidatedInvoiceResponse,
  CreateManualConsolidatedInvoicePayload,
  CredentialResponse,
  DocumentResponse,
  MappedInvoiceResponse,
  MyInvoisEnvironment,
  RevealedCredentialResponse,
  SalesTransactionResponse,
  SubmissionResponse,
  SubscribeResponse,
  SubscriptionResponse,
} from './types';

export function register(payload: {
  email: string;
  password: string;
  companyName: string;
  tin?: string;
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
}): Promise<CredentialResponse> {
  return unwrap(apiClient.put<ApiResponse<CredentialResponse>>('/api/myinvois/credentials', payload));
}

export function getCredentials(): Promise<CredentialResponse> {
  return unwrap(apiClient.get<ApiResponse<CredentialResponse>>('/api/myinvois/credentials'));
}

export function revealCredentials(payload: { password: string }): Promise<RevealedCredentialResponse> {
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

export function subscribePlan(plan: string): Promise<SubscribeResponse> {
  return unwrap(apiClient.post<ApiResponse<SubscribeResponse>>('/api/billing/subscribe', { plan }));
}
