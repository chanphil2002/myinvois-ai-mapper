package com.mytax.mapper.billing.dto;

/** Where to send the browser next (Stripe Checkout or Customer Portal); null when nothing to do. */
public record RedirectResponse(String url) {
}
