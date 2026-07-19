package com.mytax.mapper.profile;

import com.mytax.mapper.common.EntityNotFoundException;
import com.mytax.mapper.profile.dto.BusinessProfileRequest;
import com.mytax.mapper.profile.dto.BusinessProfileResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BusinessProfileService {

    private final BusinessProfileRepository businessProfileRepository;

    public BusinessProfileService(BusinessProfileRepository businessProfileRepository) {
        this.businessProfileRepository = businessProfileRepository;
    }

    @Transactional
    public BusinessProfileResponse save(Long userId, BusinessProfileRequest request) {
        BusinessProfile profile = businessProfileRepository.findByUserId(userId)
                .orElseGet(() -> BusinessProfile.builder().userId(userId).build());

        profile.setRegistrationName(request.registrationName());
        profile.setTin(request.tin());
        profile.setIdType(request.idType());
        profile.setIdValue(request.idValue());
        profile.setSstRegistration(request.sstRegistration());
        profile.setTtxRegistration(request.ttxRegistration());
        profile.setMsicCode(request.msicCode());
        profile.setMsicDescription(request.msicDescription());
        profile.setAddressLine1(request.addressLine1());
        profile.setAddressLine2(request.addressLine2());
        profile.setCity(request.city());
        profile.setPostalZone(request.postalZone());
        profile.setStateCode(request.stateCode());
        profile.setCountryCode(request.countryCode() != null ? request.countryCode() : "MYS");
        profile.setPhone(request.phone());
        profile.setEmail(request.email());

        profile = businessProfileRepository.save(profile);
        return toResponse(profile);
    }

    public BusinessProfileResponse getResponse(Long userId) {
        return toResponse(getOwned(userId));
    }

    /** Used internally by {@code SubmissionService} to build the real submission document. */
    public BusinessProfile getOwned(Long userId) {
        return businessProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Business profile not configured — set it up in Settings before submitting invoices"));
    }

    private BusinessProfileResponse toResponse(BusinessProfile profile) {
        return new BusinessProfileResponse(profile.getId(), profile.getRegistrationName(), profile.getTin(),
                profile.getIdType(), profile.getIdValue(), profile.getSstRegistration(), profile.getTtxRegistration(),
                profile.getMsicCode(), profile.getMsicDescription(), profile.getAddressLine1(), profile.getAddressLine2(),
                profile.getCity(), profile.getPostalZone(), profile.getStateCode(), profile.getCountryCode(),
                profile.getPhone(), profile.getEmail());
    }
}
