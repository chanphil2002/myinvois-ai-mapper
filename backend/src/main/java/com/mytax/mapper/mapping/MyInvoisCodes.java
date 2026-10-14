package com.mytax.mapper.mapping;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.IntStream;

/**
 * The MyInvois code lists the AI may assign to a line item. Kept in step with the frontend's
 * {@code constants/myinvoisCodes.ts} (which drives the review-screen selects).
 *
 * <p>Used two ways: as {@code enum} constraints in the Gemini response_schema, so the model can only
 * emit a listed code, and to salvage a malformed value if one still slips through (see
 * docs/AI_PARSING_ERRORS.md, 2026-10-15 incident).
 */
public final class MyInvoisCodes {

    public static final String DEFAULT_UNIT_CODE = "C62";
    public static final String DEFAULT_CLASSIFICATION_CODE = "022";

    /** UN/ECE Rec.20 units of measurement offered in the app. */
    public static final List<String> UNIT_CODES = List.of(
            "C62", "H87", "EA", "SET", "NPR", "DZN", "KGM", "GRM", "MGM", "TNE", "LTR", "MLT", "MTR", "CMT",
            "MMT", "KMT", "MTK", "MTQ", "HUR", "DAY", "WEE", "MON", "ANN", "MIN", "XBX", "XCT", "XPK", "XBG",
            "XBO", "XRO", "XPX");

    /** LHDN e-Invoice classification codes 001–045. */
    public static final List<String> CLASSIFICATION_CODES = IntStream.rangeClosed(1, 45)
            .mapToObj(i -> String.format("%03d", i))
            .toList();

    // Longest codes first so e.g. "MTK…" isn't read as a shorter code that happens to prefix it.
    private static final List<String> UNIT_CODES_LONGEST_FIRST = UNIT_CODES.stream()
            .sorted((a, b) -> b.length() - a.length())
            .toList();
    private static final Pattern LEADING_CLASSIFICATION = Pattern.compile("^\\s*(\\d{3})");

    private MyInvoisCodes() {
    }

    /**
     * Returns a valid unit code for whatever the model produced: the value itself if valid, else
     * the valid code it starts with (the observed failure is "C62" followed by rambling text),
     * else the default.
     */
    public static String salvageUnitCode(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String value = raw.trim().toUpperCase();
        if (UNIT_CODES.contains(value)) {
            return value;
        }
        for (String code : UNIT_CODES_LONGEST_FIRST) {
            if (value.startsWith(code)) {
                return code;
            }
        }
        return DEFAULT_UNIT_CODE;
    }

    /** Same idea for classification: keep a valid leading 3-digit code, else the "Others" default. */
    public static String salvageClassificationCode(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String value = raw.trim();
        if (CLASSIFICATION_CODES.contains(value)) {
            return value;
        }
        Matcher m = LEADING_CLASSIFICATION.matcher(value);
        if (m.find() && CLASSIFICATION_CODES.contains(m.group(1))) {
            return m.group(1);
        }
        return DEFAULT_CLASSIFICATION_CODE;
    }
}
