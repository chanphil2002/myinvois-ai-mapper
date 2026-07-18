package com.mytax.mapper.myinvois;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MyInvoisCredentialRepository extends JpaRepository<MyInvoisCredential, Long> {

    Optional<MyInvoisCredential> findByUserId(Long userId);
}
