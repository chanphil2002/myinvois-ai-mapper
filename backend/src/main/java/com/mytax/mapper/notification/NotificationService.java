package com.mytax.mapper.notification;

import com.mytax.mapper.auth.UserRepository;
import com.mytax.mapper.common.EntityNotFoundException;
import com.mytax.mapper.notification.dto.NotificationListResponse;
import com.mytax.mapper.notification.dto.NotificationResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/** Creates in-app notifications (and mirrors each to email) and serves the user's notification list. */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository repository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    public NotificationService(NotificationRepository repository, UserRepository userRepository,
                               EmailService emailService) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    /**
     * Records a notification and emails it. {@code dedupeKey} makes it idempotent per user (e.g.
     * "sub-12-expiring-3d"), so scheduled jobs can re-run safely. Runs in its own transaction so a
     * duplicate (or any failure here) never rolls back the caller's work.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notify(Long userId, NotificationType type, String title, String body, String link, String dedupeKey) {
        if (dedupeKey != null && repository.existsByUserIdAndDedupeKey(userId, dedupeKey)) {
            return;
        }
        Notification saved;
        try {
            saved = repository.saveAndFlush(new Notification(userId, type, title, body, link, dedupeKey));
        } catch (DataIntegrityViolationException duplicate) {
            return; // raced with another run creating the same notification
        }
        Long id = saved.getId();
        userRepository.findById(userId).ifPresent(user -> emailService.send(user.getEmail(), title, body, link,
                () -> markEmailed(id)));
        log.info("Notification {} ({}) for user {}: {}", id, type, userId, title);
    }

    /** Same alert to every admin (e.g. the shared Gemini balance ran out). */
    public void notifyAdmins(NotificationType type, String title, String body, String link, String dedupeKey) {
        userRepository.findByRole("ADMIN").forEach(admin -> notify(admin.getId(), type, title, body, link, dedupeKey));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markEmailed(Long id) {
        repository.findById(id).ifPresent(n -> {
            n.setEmailedAt(Instant.now());
            repository.save(n);
        });
    }

    public NotificationListResponse list(Long userId, int limit) {
        var items = repository.findByUserIdOrderByCreatedAtDescIdDesc(userId, PageRequest.of(0, Math.min(limit, 100)))
                .stream()
                .map(n -> new NotificationResponse(n.getId(), n.getType(), n.getTitle(), n.getBody(), n.getLink(),
                        n.getReadAt() != null, n.getCreatedAt()))
                .toList();
        return new NotificationListResponse(repository.countByUserIdAndReadAtIsNull(userId), items);
    }

    @Transactional
    public void markRead(Long userId, Long id) {
        Notification n = repository.findById(id)
                .filter(x -> x.getUserId().equals(userId))
                .orElseThrow(() -> new EntityNotFoundException("Notification not found: " + id));
        if (n.getReadAt() == null) {
            n.setReadAt(Instant.now());
            repository.save(n);
        }
    }

    @Transactional
    public void markAllRead(Long userId) {
        repository.markAllRead(userId, Instant.now());
    }
}
