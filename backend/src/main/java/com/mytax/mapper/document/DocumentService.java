package com.mytax.mapper.document;

import com.mytax.mapper.common.EntityNotFoundException;
import com.mytax.mapper.document.dto.DocumentResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final FileStorageService fileStorageService;

    public DocumentService(DocumentRepository documentRepository, FileStorageService fileStorageService) {
        this.documentRepository = documentRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional
    public DocumentResponse upload(Long userId, MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file is empty");
        }

        String storagePath = fileStorageService.store(file);
        String fileType = resolveFileType(file.getOriginalFilename(), file.getContentType());

        Document document = Document.builder()
                .userId(userId)
                .originalFilename(file.getOriginalFilename())
                .fileType(fileType)
                .storagePath(storagePath)
                .status(DocumentStatus.UPLOADED)
                .build();

        document = documentRepository.save(document);
        return toResponse(document);
    }

    public List<DocumentResponse> list(Long userId) {
        return documentRepository.findByUserIdOrderByUploadedAtDesc(userId).stream()
                .filter(d -> d.getStatus() != DocumentStatus.MANUAL)
                .map(this::toResponse)
                .toList();
    }

    /**
     * Creates a placeholder document that backs a manually keyed-in invoice or set of
     * transactions (there is no uploaded file). Lets manual entries reuse the document-scoped
     * ownership/edit/submit pipeline unchanged. Hidden from {@link #list(Long)}.
     */
    @Transactional
    public Document createManual(Long userId, String label) {
        Document document = Document.builder()
                .userId(userId)
                .originalFilename(label != null ? label : "Manual entry")
                .fileType("manual")
                .storagePath("manual")
                .status(DocumentStatus.MANUAL)
                .build();
        return documentRepository.save(document);
    }

    public Document getOwned(Long documentId, Long userId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new EntityNotFoundException("Document not found: " + documentId));
        if (!document.getUserId().equals(userId)) {
            throw new EntityNotFoundException("Document not found: " + documentId);
        }
        return document;
    }

    private String resolveFileType(String filename, String contentType) {
        if (filename != null && filename.contains(".")) {
            return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
        }
        return contentType != null ? contentType : "unknown";
    }

    private DocumentResponse toResponse(Document document) {
        return new DocumentResponse(document.getId(), document.getOriginalFilename(),
                document.getFileType(), document.getStatus(), document.getUploadedAt());
    }
}
