package com.mytax.mapper.billing.dto;

import jakarta.validation.constraints.NotBlank;

/** Which plan the user wants to subscribe to (plan id: beginner / heavy / elite). */
public record SubscribeRequest(@NotBlank String plan) {
}
