package com.mytax.mapper.billing;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Subset of a Billplz v3 bill object (POST /v3/bills response). */
@JsonIgnoreProperties(ignoreUnknown = true)
public record BillplzBill(
        String id,
        String url,
        Boolean paid,
        String state
) {
}
