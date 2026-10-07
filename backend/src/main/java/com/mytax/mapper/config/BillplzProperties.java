package com.mytax.mapper.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.billplz")
public class BillplzProperties {

    private String apiKey;
    private String xSignatureKey;
    private String collectionId;
    private String baseUrl;
    private String callbackUrl;
    private String redirectUrl;

    /** Billing is only live once an API key + collection are configured. */
    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank() && collectionId != null && !collectionId.isBlank();
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getXSignatureKey() {
        return xSignatureKey;
    }

    public void setXSignatureKey(String xSignatureKey) {
        this.xSignatureKey = xSignatureKey;
    }

    public String getCollectionId() {
        return collectionId;
    }

    public void setCollectionId(String collectionId) {
        this.collectionId = collectionId;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getCallbackUrl() {
        return callbackUrl;
    }

    public void setCallbackUrl(String callbackUrl) {
        this.callbackUrl = callbackUrl;
    }

    public String getRedirectUrl() {
        return redirectUrl;
    }

    public void setRedirectUrl(String redirectUrl) {
        this.redirectUrl = redirectUrl;
    }
}
