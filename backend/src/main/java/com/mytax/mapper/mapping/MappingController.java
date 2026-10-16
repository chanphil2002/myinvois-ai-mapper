package com.mytax.mapper.mapping;

import com.mytax.mapper.auth.CurrentUser;
import com.mytax.mapper.common.ApiResponse;
import com.mytax.mapper.mapping.dto.MappedInvoiceResponse;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/documents/{documentId}/mapping")
public class MappingController {

    private final MappingService mappingService;
    private final ExtractionJobSupport extractionJobSupport;

    public MappingController(MappingService mappingService, ExtractionJobSupport extractionJobSupport) {
        this.mappingService = mappingService;
        this.extractionJobSupport = extractionJobSupport;
    }

    @PostMapping
    public ApiResponse<MappedInvoiceResponse> runMapping(@PathVariable Long documentId) {
        try {
            return ApiResponse.ok(mappingService.runMapping(documentId, CurrentUser.id()));
        } catch (IllegalStateException e) {
            // An AI parse failure (the service wraps those in IllegalStateException, and ownership /
            // quota errors are other types, so another user's document is never touched). The
            // service's transaction has rolled back by now; persist the failure separately.
            extractionJobSupport.recordFailure(documentId, e.getMessage());
            throw e;
        }
    }

    @GetMapping
    public ApiResponse<List<MappedInvoiceResponse>> list(@PathVariable Long documentId) {
        return ApiResponse.ok(mappingService.listForDocument(documentId, CurrentUser.id()));
    }
}
