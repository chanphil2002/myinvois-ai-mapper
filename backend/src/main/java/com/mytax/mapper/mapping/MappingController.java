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

    public MappingController(MappingService mappingService) {
        this.mappingService = mappingService;
    }

    @PostMapping
    public ApiResponse<MappedInvoiceResponse> runMapping(@PathVariable Long documentId) {
        return ApiResponse.ok(mappingService.runMapping(documentId, CurrentUser.id()));
    }

    @GetMapping
    public ApiResponse<List<MappedInvoiceResponse>> list(@PathVariable Long documentId) {
        return ApiResponse.ok(mappingService.listForDocument(documentId, CurrentUser.id()));
    }
}
