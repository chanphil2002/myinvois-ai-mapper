package com.mytax.mapper.stats;

import com.mytax.mapper.document.DocumentStatus;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class StatsService {

    /** Display order; anything else is folded into "other". */
    private static final List<String> TYPES = List.of("pdf", "png", "jpeg", "csv", "xlsx", "other");

    private final EntityManager em;

    public StatsService(EntityManager em) {
        this.em = em;
    }

    public DocumentStatsResponse documentStats(Long userId) {
        Map<String, long[]> byType = new LinkedHashMap<>();
        TYPES.forEach(t -> byType.put(t, new long[2])); // [parsed, failed]

        List<Object[]> rows = em.createQuery("""
                select lower(d.fileType), d.status, count(d) from Document d
                where d.userId = :u and d.status in (:parsed, :failed)
                group by lower(d.fileType), d.status""", Object[].class)
                .setParameter("u", userId)
                .setParameter("parsed", DocumentStatus.PARSED)
                .setParameter("failed", DocumentStatus.FAILED)
                .getResultList();
        long parsed = 0;
        long failed = 0;
        for (Object[] r : rows) {
            long n = (Long) r[2];
            boolean ok = r[1] == DocumentStatus.PARSED;
            byType.get(bucket((String) r[0]))[ok ? 0 : 1] += n;
            if (ok) parsed += n; else failed += n;
        }

        return new DocumentStatsResponse(
                parsed,
                failed,
                byType.entrySet().stream()
                        .map(e -> new DocumentStatsResponse.TypeCount(e.getKey(), e.getValue()[0], e.getValue()[1]))
                        .toList(),
                count("select count(m) from MappedInvoice m, Document d where m.documentId = d.id and d.userId = :u and d.status <> :manual", userId),
                count("select count(t) from SalesTransaction t, Document d where t.documentId = d.id and d.userId = :u and t.extractionJobId is not null", userId),
                count("select count(m) from MappedInvoice m, Document d where m.documentId = d.id and d.userId = :u and d.status = :manual", userId),
                count("select count(t) from SalesTransaction t, Document d where t.documentId = d.id and d.userId = :u and d.status = :manual", userId));
    }

    private long count(String jpql, Long userId) {
        var q = em.createQuery(jpql, Long.class).setParameter("u", userId);
        if (jpql.contains(":manual")) {
            q.setParameter("manual", DocumentStatus.MANUAL);
        }
        return q.getSingleResult();
    }

    private static String bucket(String fileType) {
        if (fileType == null) return "other";
        return switch (fileType) {
            case "pdf" -> "pdf";
            case "png" -> "png";
            case "jpg", "jpeg" -> "jpeg";
            case "csv", "tsv", "txt" -> "csv";
            case "xlsx", "xls" -> "xlsx";
            default -> "other";
        };
    }
}
