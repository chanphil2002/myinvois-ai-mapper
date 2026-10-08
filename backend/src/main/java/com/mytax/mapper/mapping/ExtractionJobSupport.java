package com.mytax.mapper.mapping;

import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Shared {@link ExtractionJob} lifecycle bookkeeping used by both {@link MappingService}
 * (individual-invoice extraction) and {@code TransactionExtractionService} (consolidated-mode
 * transaction extraction) — both AI extraction flows create a RUNNING job, then mark it
 * COMPLETED or FAILED the same way.
 */
@Component
public class ExtractionJobSupport {

    private final ExtractionJobRepository extractionJobRepository;

    public ExtractionJobSupport(ExtractionJobRepository extractionJobRepository) {
        this.extractionJobRepository = extractionJobRepository;
    }

    public ExtractionJob start(Long documentId) {
        ExtractionJob job = ExtractionJob.builder()
                .documentId(documentId)
                .status(ExtractionJobStatus.RUNNING)
                .startedAt(Instant.now())
                .build();
        return extractionJobRepository.save(job);
    }

    public void complete(ExtractionJob job, String aiModel, String rawResponseJson) {
        job.setStatus(ExtractionJobStatus.COMPLETED);
        job.setAiModel(aiModel);
        job.setRawAiResponse(rawResponseJson);
        job.setCompletedAt(Instant.now());
        extractionJobRepository.save(job);
    }

    public void fail(ExtractionJob job, String errorMessage) {
        job.setStatus(ExtractionJobStatus.FAILED);
        job.setErrorMessage(errorMessage);
        job.setCompletedAt(Instant.now());
        extractionJobRepository.save(job);
    }

    /**
     * unit_code columns are VARCHAR(10) (short UN/ECE-style unit codes/abbreviations). Defends
     * against any AI provider returning an oversized value that would otherwise fail the insert
     * with a SQL truncation error.
     */
    public String normalizeUnitCode(String unitCode) {
        if (unitCode == null || unitCode.isBlank() || unitCode.length() > 10) {
            return "C62";
        }
        return unitCode;
    }
}
