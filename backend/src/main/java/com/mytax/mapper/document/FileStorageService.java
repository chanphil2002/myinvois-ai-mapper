package com.mytax.mapper.document;

import com.mytax.mapper.config.StorageProperties;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * Local-disk file storage. Swap this out for an S3-backed implementation of the
 * same two methods when moving beyond a single-instance deployment.
 */
@Service
public class FileStorageService {

    private final Path uploadRoot;

    public FileStorageService(StorageProperties storageProperties) {
        this.uploadRoot = Paths.get(storageProperties.getUploadDir()).toAbsolutePath().normalize();
        try {
            Files.createDirectories(uploadRoot);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create upload directory: " + uploadRoot, e);
        }
    }

    public String store(MultipartFile file) {
        String originalName = StringUtils.cleanPath(file.getOriginalFilename() == null ? "file" : file.getOriginalFilename());
        String extension = originalName.contains(".") ? originalName.substring(originalName.lastIndexOf('.')) : "";
        String storedName = UUID.randomUUID() + extension;

        Path target = uploadRoot.resolve(storedName);
        try {
            Files.copy(file.getInputStream(), target);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to store uploaded file", e);
        }
        return target.toString();
    }

    public byte[] load(String storagePath) {
        try {
            return Files.readAllBytes(Paths.get(storagePath));
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read stored file: " + storagePath, e);
        }
    }
}
