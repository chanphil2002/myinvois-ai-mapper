package com.mytax.mapper.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.myinvois")
public class MyInvoisProperties {

    private String idServerBaseUrl;
    private String apiBaseUrl;

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
