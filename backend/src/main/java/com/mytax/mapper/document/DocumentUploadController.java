package com.mytax.mapper.document;

import com.mytax.mapper.auth.CurrentUser;
import com.mytax.mapper.common.ApiResponse;
import com.mytax.mapper.document.dto.DocumentResponse;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/documents")
public class DocumentUploadController {

    private final DocumentService documentService;

    public DocumentUploadController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping(consumes = "multipart/form-data")
    public ApiResponse<DocumentResponse> upload(@RequestParam("file") MultipartFile file) {
        return ApiResponse.ok(documentService.upload(CurrentUser.id(), file));
    }

    @GetMapping
    public ApiResponse<List<DocumentResponse>> list() {
        return ApiResponse.ok(documentService.list(CurrentUser.id()));
    }
}
