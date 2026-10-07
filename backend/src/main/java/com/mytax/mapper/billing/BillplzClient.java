package com.mytax.mapper.billing;

import com.mytax.mapper.config.BillplzProperties;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

/**
 * Thin client over the Billplz v3 REST API (https://www.billplz.com/api). Auth is HTTP Basic with
 * the secret API key as the username and a blank password. Amounts are in cents (sen).
 */
@Service
public class BillplzClient {

    private final BillplzProperties properties;
    private final RestClient restClient;

    public BillplzClient(BillplzProperties properties) {
        this.properties = properties;
        this.restClient = RestClient.create();
    }

    /** Creates a bill in the configured collection and returns it (including the hosted payment URL). */
    public BillplzBill createBill(int amountCents, String name, String email, String description) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("collection_id", properties.getCollectionId());
        form.add("email", email);
        form.add("name", name);
        form.add("amount", String.valueOf(amountCents));
        form.add("callback_url", properties.getCallbackUrl());
        form.add("redirect_url", properties.getRedirectUrl());
        form.add("description", description);

        return restClient.post()
                .uri(properties.getBaseUrl() + "/bills")
                .headers(h -> {
                    h.setBasicAuth(properties.getApiKey(), "");
                    h.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
                })
                .body(form)
                .retrieve()
                .body(BillplzBill.class);
    }
}
