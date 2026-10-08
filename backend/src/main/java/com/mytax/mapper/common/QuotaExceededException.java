package com.mytax.mapper.common;

/** Thrown when a plan's usage allowance (e.g. the free tier's daily document limit) is exceeded. */
public class QuotaExceededException extends RuntimeException {
    public QuotaExceededException(String message) {
        super(message);
    }
}
