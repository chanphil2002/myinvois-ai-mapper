package com.mytax.mapper.myinvois;

import com.mytax.mapper.auth.CurrentUser;
import com.mytax.mapper.common.ApiResponse;
import com.mytax.mapper.myinvois.dto.CredentialRequest;
import com.mytax.mapper.myinvois.dto.CredentialsOverviewResponse;
import com.mytax.mapper.myinvois.dto.SetActiveEnvironmentRequest;
import com.mytax.mapper.myinvois.dto.RevealCredentialRequest;
import com.mytax.mapper.myinvois.dto.RevealedCredentialResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/myinvois/credentials")
public class MyInvoisCredentialController {

    private final MyInvoisCredentialService credentialService;

    public MyInvoisCredentialController(MyInvoisCredentialService credentialService) {
        this.credentialService = credentialService;
    }

    @PutMapping
    public ApiResponse<CredentialsOverviewResponse> save(@Valid @RequestBody CredentialRequest request) {
        return ApiResponse.ok(credentialService.save(CurrentUser.id(), request));
    }

    @GetMapping
    public ApiResponse<CredentialsOverviewResponse> get() {
        return ApiResponse.ok(credentialService.overview(CurrentUser.id()));
    }

    @PutMapping("/active")
    public ApiResponse<CredentialsOverviewResponse> setActive(@Valid @RequestBody SetActiveEnvironmentRequest request) {
        return ApiResponse.ok(credentialService.setActive(CurrentUser.id(), request.environment()));
    }

    @PostMapping("/reveal")
    public ApiResponse<RevealedCredentialResponse> reveal(@Valid @RequestBody RevealCredentialRequest request) {
        return ApiResponse.ok(credentialService.reveal(CurrentUser.id(), request.password(), request.environment()));
    }
}
