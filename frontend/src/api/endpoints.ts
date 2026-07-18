import { apiClient, unwrap, ApiResponse } from './client';
import type {
  AuthResponse,
  CredentialResponse,
  DocumentResponse,
  MappedInvoiceResponse,
  MyInvoisEnvironment,
  SubmissionResponse,
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
