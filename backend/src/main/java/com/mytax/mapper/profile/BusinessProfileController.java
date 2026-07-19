package com.mytax.mapper.profile;

import com.mytax.mapper.auth.CurrentUser;
import com.mytax.mapper.common.ApiResponse;
import com.mytax.mapper.profile.dto.BusinessProfileRequest;
import com.mytax.mapper.profile.dto.BusinessProfileResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/business-profile")
public class BusinessProfileController {

    private final BusinessProfileService businessProfileService;

    public BusinessProfileController(BusinessProfileService businessProfileService) {
        this.businessProfileService = businessProfileService;
    }

    @PutMapping
    public ApiResponse<BusinessProfileResponse> save(@Valid @RequestBody BusinessProfileRequest request) {
        return ApiResponse.ok(businessProfileService.save(CurrentUser.id(), request));
    }

    @GetMapping
    public ApiResponse<BusinessProfileResponse> get() {
        return ApiResponse.ok(businessProfileService.getResponse(CurrentUser.id()));
    }
}
