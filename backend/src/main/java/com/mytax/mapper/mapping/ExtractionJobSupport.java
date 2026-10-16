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
    private final com.mytax.mapper.document.DocumentRepository documentRepository;

    public ExtractionJobSupport(ExtractionJobRepository extractionJobRepository,
                                com.mytax.mapper.document.DocumentRepository documentRepository) {
        this.extractionJobRepository = extractionJobRepository;
        this.documentRepository = documentRepository;
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
     * Records a failed parse <i>after</i> the extraction transaction has rolled back. The in-transaction
     * {@link #fail} call is undone by that same rollback, which left failed documents stuck as
     * UPLOADED with no job row; callers (the controllers) invoke this once the service has thrown.
     */
    @org.springframework.transaction.annotation.Transactional
    public void recordFailure(Long documentId, String errorMessage) {
        extractionJobRepository.save(ExtractionJob.builder()
                .documentId(documentId)
                .status(ExtractionJobStatus.FAILED)
                .startedAt(Instant.now())
                .build());
        extractionJobRepository.findTopByDocumentIdOrderByIdDesc(documentId).ifPresent(job -> {
            job.setErrorMessage(errorMessage == null ? null
                    : errorMessage.length() > 2000 ? errorMessage.substring(0, 2000) : errorMessage);
            job.setCompletedAt(Instant.now());
            extractionJobRepository.save(job);
        });
        documentRepository.findById(documentId).ifPresent(doc -> {
            doc.setStatus(com.mytax.mapper.document.DocumentStatus.FAILED);
            documentRepository.save(doc);
        });
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
