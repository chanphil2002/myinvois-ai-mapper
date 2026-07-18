package com.mytax.mapper.myinvois;

import com.mytax.mapper.config.MyInvoisProperties;
import com.mytax.mapper.myinvois.dto.TokenResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Fetches and caches MyInvois OAuth2 client_credentials bearer tokens, one per user
 * (each SME has their own client_id/client_secret registered with LHDN).
 * Contract: POST {idServerBaseUrl}/connect/token, grant_type=client_credentials, scope=InvoicingAPI.
 */
@Service
public class MyInvoisAuthService {

    private final MyInvoisProperties properties;
    private final MyInvoisCredentialService credentialService;
    private final RestClient restClient;
    private final Map<Long, CachedToken> tokenCache = new ConcurrentHashMap<>();

    public MyInvoisAuthService(MyInvoisProperties properties, MyInvoisCredentialService credentialService) {
        this.properties = properties;
        this.credentialService = credentialService;
        this.restClient = RestClient.create();
    }

    public String getAccessToken(Long userId) {
        CachedToken cached = tokenCache.get(userId);
        if (cached != null && cached.expiresAt().isAfter(Instant.now().plusSeconds(30))) {
            return cached.accessToken();
        }
        return fetchAndCacheToken(userId);
    }

    private String fetchAndCacheToken(Long userId) {
        MyInvoisCredential credential = credentialService.getDecryptedForUse(userId);
        String clientSecret = credentialService.decryptSecret(credential);

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", credential.getClientId());
        form.add("client_secret", clientSecret);
        form.add("grant_type", "client_credentials");
        form.add("scope", "InvoicingAPI");

        TokenResponse response = restClient.post()
                .uri(properties.getIdServerBaseUrl() + "/connect/token")
                .headers(h -> h.setContentType(MediaType.APPLICATION_FORM_URLENCODED))
                .body(form)
                .retrieve()
                .body(TokenResponse.class);

        if (response == null || response.accessToken() == null) {
            throw new IllegalStateException("MyInvois did not return an access token");
        }

        Instant expiresAt = Instant.now().plusSeconds(response.expiresInSeconds());
        tokenCache.put(userId, new CachedToken(response.accessToken(), expiresAt));
        return response.accessToken();
    }

    private record CachedToken(String accessToken, Instant expiresAt) {
    }
}
