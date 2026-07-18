package com.mytax.mapper.myinvois.dto;

import java.util.List;

public record SubmitDocumentsRequest(List<DocumentSubmissionItem> documents) {
}
