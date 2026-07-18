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

    public SubmitDocumentsResponse submitDocuments(String accessToken, SubmitDocumentsRequest request) {
        return restClient.post()
                .uri(properties.getApiBaseUrl() + "/api/v1.0/documentsubmissions")
                .headers(h -> h.setBearerAuth(accessToken))
                .body(request)
                .retrieve()
                .body(SubmitDocumentsResponse.class);
    }

    public SubmissionStatusResponse getSubmissionStatus(String accessToken, String submissionUid) {
        return restClient.get()
                .uri(properties.getApiBaseUrl() + "/api/v1.0/documentsubmissions/{submissionUid}", submissionUid)
                .headers(h -> h.setBearerAuth(accessToken))
                .retrieve()
                .body(SubmissionStatusResponse.class);
    }
}
