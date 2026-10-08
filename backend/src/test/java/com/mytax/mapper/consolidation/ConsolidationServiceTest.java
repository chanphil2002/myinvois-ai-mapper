package com.mytax.mapper.consolidation;

import com.mytax.mapper.common.EntityNotFoundException;
import com.mytax.mapper.consolidation.dto.CreateConsolidatedInvoiceRequest;
import com.mytax.mapper.document.DocumentService;
import com.mytax.mapper.mapping.SalesTransaction;
import com.mytax.mapper.mapping.SalesTransactionRepository;
import com.mytax.mapper.mapping.SalesTransactionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConsolidationServiceTest {

    @Mock
    private ConsolidatedInvoiceRepository consolidatedInvoiceRepository;
    @Mock
    private ConsolidatedInvoiceTransactionRepository linkRepository;
    @Mock
    private SalesTransactionRepository salesTransactionRepository;
    @Mock
    private DocumentService documentService;

    private ConsolidationService service;

    @BeforeEach
    void setUp() {
        service = new ConsolidationService(consolidatedInvoiceRepository, linkRepository, salesTransactionRepository, documentService);
    }

    @Test
    void generateRejectsAnAlreadyGroupedTransaction() {
        SalesTransaction grouped = transaction(1L, SalesTransactionStatus.GROUPED);
        when(salesTransactionRepository.findByIdIn(List.of(1L))).thenReturn(List.of(grouped));

        CreateConsolidatedInvoiceRequest request = new CreateConsolidatedInvoiceRequest(
                List.of(1L), LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31));

        assertThatThrownBy(() -> service.generate(10L, request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already grouped");
    }

    @Test
    void generateRejectsAMissingTransactionId() {
        when(salesTransactionRepository.findByIdIn(List.of(1L, 2L)))
                .thenReturn(List.of(transaction(1L, SalesTransactionStatus.PENDING)));

        CreateConsolidatedInvoiceRequest request = new CreateConsolidatedInvoiceRequest(
                List.of(1L, 2L), LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31));

        assertThatThrownBy(() -> service.generate(10L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not found");
    }

    @Test
    void confirmRejectsANonDraftInvoice() {
        ConsolidatedInvoice invoice = ConsolidatedInvoice.builder()
                .userId(10L)
                .status(ConsolidatedInvoiceStatus.CONFIRMED)
                .build();
        invoice.setId(100L);
        when(consolidatedInvoiceRepository.findById(100L)).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() -> service.confirm(100L, 10L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DRAFT");
    }

    @Test
    void getOwnedRejectsAnInvoiceBelongingToAnotherUser() {
        ConsolidatedInvoice invoice = ConsolidatedInvoice.builder().userId(10L).build();
        invoice.setId(100L);
        when(consolidatedInvoiceRepository.findById(100L)).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() -> service.getOwned(100L, 999L))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void listEligibleTransactionsDelegatesToRepository() {
        when(salesTransactionRepository.findEligibleForUser(eq(10L)))
                .thenReturn(List.of(transaction(1L, SalesTransactionStatus.PENDING)));

        assertThat(service.listEligibleTransactions(10L)).hasSize(1);
    }

    private SalesTransaction transaction(Long id, SalesTransactionStatus status) {
        SalesTransaction transaction = SalesTransaction.builder()
                .documentId(1L)
                .quantity(BigDecimal.ONE)
                .unitPrice(BigDecimal.TEN)
                .taxAmount(BigDecimal.ZERO)
                .status(status)
                .build();
        transaction.setId(id);
        return transaction;
    }
}
