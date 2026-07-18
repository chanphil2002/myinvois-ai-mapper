package com.mytax.mapper.myinvois.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SubmissionStatusResponse(
        String submissionUid,
        String documentCount,
        String overallStatus,
        List<DocumentSummary> documentSummary
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DocumentSummary(String uuid, String invoiceCodeNumber, String status) {
    }
}
