package com.mytax.mapper.myinvois;

import com.mytax.mapper.auth.CurrentUser;
import com.mytax.mapper.common.ApiResponse;
import com.mytax.mapper.myinvois.dto.CredentialRequest;
import com.mytax.mapper.myinvois.dto.CredentialResponse;
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
    public ApiResponse<CredentialResponse> save(@Valid @RequestBody CredentialRequest request) {
        return ApiResponse.ok(credentialService.save(CurrentUser.id(), request));
    }

    @GetMapping
    public ApiResponse<CredentialResponse> get() {
        return ApiResponse.ok(credentialService.get(CurrentUser.id()));
    }
}
