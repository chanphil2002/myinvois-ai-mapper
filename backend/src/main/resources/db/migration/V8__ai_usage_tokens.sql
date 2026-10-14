-- Usage is now metered by what each Gemini call actually consumed (tokens -> cost), recorded per
-- call including failed retry attempts, instead of one flat credit per successful parse.
-- Rows written before this migration have NULL tokens and count as one "typical" parse.
ALTER TABLE ai_usage_events
    ADD COLUMN prompt_tokens   INT NULL,
    ADD COLUMN output_tokens   INT NULL,
    ADD COLUMN thought_tokens  INT NULL,
    ADD COLUMN cost_usd        DECIMAL(12, 6) NULL,
    ADD COLUMN success         BOOLEAN NULL;
