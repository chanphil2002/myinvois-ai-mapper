package com.mytax.mapper.billing.dto;

import jakarta.validation.constraints.NotBlank;

/** Start Stripe Checkout for a plan; autoRenew = monthly subscription (card / Apple Pay). */
public record CheckoutRequest(@NotBlank String plan, boolean autoRenew) {
}
