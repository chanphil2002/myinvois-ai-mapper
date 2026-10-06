package com.mytax.mapper.myinvois.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SubmitDocumentsResponse(
        String submissionUid,
        List<AcceptedDocument> acceptedDocuments,
        List<RejectedDocument> rejectedDocuments
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AcceptedDocument(String uuid, String invoiceCodeNumber) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RejectedDocument(String invoiceCodeNumber, Error error) {
        @JsonIgnoreProperties(ignoreUnknown = true)
        public record Error(String code, String message, String target, List<ErrorDetail> details) {
        }

        /** One field-level validation failure nested under {@code error.details[]} in LHDN's response. */
        @JsonIgnoreProperties(ignoreUnknown = true)
        public record ErrorDetail(String code, String message, String target, String propertyPath) {
        }
    }
}
