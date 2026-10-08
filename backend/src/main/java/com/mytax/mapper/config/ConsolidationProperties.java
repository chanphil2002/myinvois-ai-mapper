package com.mytax.mapper.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Placeholder values for the generic "buyer" LHDN's consolidated e-invoice convention requires.
 * The exact LHDN-mandated TIN/name isn't available in this codebase or the reference Postman
 * collection — these are documented placeholders, not verified policy. Confirm against LHDN's
 * actual published SDK/guideline before relying on them for a real submission.
 */
@Component
@ConfigurationProperties(prefix = "app.consolidation")
public class ConsolidationProperties {

    private String genericBuyerName = "General Public";
    private String genericBuyerTin = "EI00000000010";

    public String getGenericBuyerName() {
        return genericBuyerName;
    }

    public void setGenericBuyerName(String genericBuyerName) {
        this.genericBuyerName = genericBuyerName;
    }

    public String getGenericBuyerTin() {
        return genericBuyerTin;
    }

    public void setGenericBuyerTin(String genericBuyerTin) {
        this.genericBuyerTin = genericBuyerTin;
    }
}
