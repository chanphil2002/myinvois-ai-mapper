package com.mytax.mapper.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.myinvois")
public class MyInvoisProperties {

    // Sandbox (preprod) URLs — the original single-environment settings.
    private String idServerBaseUrl;
    private String apiBaseUrl;
    // Production URLs.
    private String prodIdServerBaseUrl;
    private String prodApiBaseUrl;

    public String idServerBaseUrl(com.mytax.mapper.myinvois.MyInvoisEnvironment environment) {
        return environment == com.mytax.mapper.myinvois.MyInvoisEnvironment.PRODUCTION ? prodIdServerBaseUrl : idServerBaseUrl;
    }

    public String apiBaseUrl(com.mytax.mapper.myinvois.MyInvoisEnvironment environment) {
        return environment == com.mytax.mapper.myinvois.MyInvoisEnvironment.PRODUCTION ? prodApiBaseUrl : apiBaseUrl;
    }

    public String getProdIdServerBaseUrl() {
        return prodIdServerBaseUrl;
    }

    public void setProdIdServerBaseUrl(String prodIdServerBaseUrl) {
        this.prodIdServerBaseUrl = prodIdServerBaseUrl;
    }

    public String getProdApiBaseUrl() {
        return prodApiBaseUrl;
    }

    public void setProdApiBaseUrl(String prodApiBaseUrl) {
        this.prodApiBaseUrl = prodApiBaseUrl;
    }

    public String getIdServerBaseUrl() {
        return idServerBaseUrl;
    }

    public void setIdServerBaseUrl(String idServerBaseUrl) {
        this.idServerBaseUrl = idServerBaseUrl;
    }

    public String getApiBaseUrl() {
        return apiBaseUrl;
    }

    public void setApiBaseUrl(String apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
    }
}
