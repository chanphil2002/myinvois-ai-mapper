package com.mytax.mapper.myinvois;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MyInvoisCredentialRepository extends JpaRepository<MyInvoisCredential, Long> {

    Optional<MyInvoisCredential> findByUserIdAndEnvironment(Long userId, MyInvoisEnvironment environment);

    List<MyInvoisCredential> findByUserId(Long userId);
}
