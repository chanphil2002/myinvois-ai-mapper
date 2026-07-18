package com.mytax.mapper.mapping;

import com.mytax.mapper.document.Document;
import com.mytax.mapper.mapping.dto.MappedInvoiceDraft;

public interface MappingEngine {

    /**
     * @return the extracted/mapped invoice draft plus the raw model response (stored for audit/debugging).
     */
    MappingResult map(Document document, byte[] fileBytes);

    record MappingResult(MappedInvoiceDraft draft, String rawResponseJson, String modelName) {
    }
}
