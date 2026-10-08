package com.mytax.mapper.profile;

/** Per-account default submission mode — "configurable ... per customer/business rule" from the spec;
 *  this app has no separate "customer" entity, so the rule lives on the account's own BusinessProfile.
 *  It's only a UI default: nothing in the backend hard-gates which mode a given upload uses. */
public enum SubmissionMode {
    INDIVIDUAL,
    CONSOLIDATED
}
