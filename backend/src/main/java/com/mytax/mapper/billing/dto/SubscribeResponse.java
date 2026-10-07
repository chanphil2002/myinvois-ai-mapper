package com.mytax.mapper.billing.dto;

/** Where to send the user to pay (the Billplz hosted bill URL) plus the created bill id. */
public record SubscribeResponse(String paymentUrl, String billId) {
}
