package com.mytax.mapper.myinvois;

import com.mytax.mapper.config.MyInvoisProperties;
import com.mytax.mapper.myinvois.dto.SubmissionStatusResponse;
import com.mytax.mapper.myinvois.dto.SubmitDocumentsRequest;
import com.mytax.mapper.myinvois.dto.SubmitDocumentsResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/**
 * Thin client over the LHDN MyInvois e-Invoicing REST API, built directly against
 * the request/response shapes captured in the "LHDN MyInvois SDK" Postman collection.
 */
@Service
public class MyInvoisSubmissionClient {

    private final MyInvoisProperties properties;
    private final RestClient restClient;

    public MyInvoisSubmissionClient(MyInvoisProperties properties) {
        this.properties = properties;
        this.restClient = RestClient.create();
    }

    public SubmitDocumentsResponse submitDocuments(MyInvoisEnvironment environment, String accessToken, SubmitDocumentsRequest request) {
        return restClient.post()
                .uri(properties.apiBaseUrl(environment) + "/api/v1.0/documentsubmissions")
                .headers(h -> h.setBearerAuth(accessToken))
                .body(request)
                .retrieve()
                .body(SubmitDocumentsResponse.class);
    }

    public SubmissionStatusResponse getSubmissionStatus(MyInvoisEnvironment environment, String accessToken, String submissionUid) {
        return restClient.get()
                .uri(properties.apiBaseUrl(environment) + "/api/v1.0/documentsubmissions/{submissionUid}", submissionUid)
                .headers(h -> h.setBearerAuth(accessToken))
                .retrieve()
                .body(SubmissionStatusResponse.class);
    }

    /**
     * Cancels an issued document (issuer only, within 72 hours of validation):
     * PUT /api/v1.0/documents/state/{uuid}/state with {"status":"cancelled","reason":...}.
     */
    public void cancelDocument(MyInvoisEnvironment environment, String accessToken, String documentUuid, String reason) {
        restClient.put()
                .uri(properties.apiBaseUrl(environment) + "/api/v1.0/documents/state/{uuid}/state", documentUuid)
                .headers(h -> h.setBearerAuth(accessToken))
                .body(java.util.Map.of("status", "cancelled", "reason", reason))
                .retrieve()
                .toBodilessEntity();
    }

    /** Per-document details including {@code validationResults} — the only endpoint that exposes
     *  the step-level reason (e.g. ERR406) behind an Invalid document. Returns the raw JSON body so
     *  no nested error fields (innerError/details) are lost to DTO mapping before they can be read. */
    public String getDocumentDetails(MyInvoisEnvironment environment, String accessToken, String documentUuid) {
        return restClient.get()
                .uri(properties.apiBaseUrl(environment) + "/api/v1.0/documents/{documentUuid}/details", documentUuid)
                .headers(h -> h.setBearerAuth(accessToken))
                .retrieve()
                .body(String.class);
    }
}
