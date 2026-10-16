package com.mytax.mapper.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Background jobs (status polling, reminders) and async email sending. */
@Configuration
@EnableScheduling
@EnableAsync
public class SchedulingConfig {
}
