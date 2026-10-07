package com.mytax.mapper.document;

import com.mytax.mapper.auth.CurrentUser;
import com.mytax.mapper.common.ApiResponse;
import com.mytax.mapper.document.dto.DocumentResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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

    /** Streams the stored file (image/pdf/xlsx) for inline preview or download. */
    @GetMapping("/{id}/file")
    public ResponseEntity<byte[]> file(@PathVariable Long id) {
        DocumentService.DocumentFile f = documentService.loadFile(id, CurrentUser.id());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(f.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + f.filename() + "\"")
                .body(f.bytes());
    }
}
