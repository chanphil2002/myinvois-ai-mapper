package com.mytax.mapper.consolidation;

import jakarta.persistence.*;

/**
 * Join row linking a {@code SalesTransaction} to the {@link ConsolidatedInvoice} it was grouped
 * into — the audit trail the spec asks for, queryable in either direction. The unique constraint
 * on sales_transaction_id (see V3 migration) guarantees a transaction can only ever belong to one
 * consolidated invoice at a time.
 */
@Entity
@Table(name = "consolidated_invoice_transactions")
public class ConsolidatedInvoiceTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "consolidated_invoice_id", nullable = false)
    private Long consolidatedInvoiceId;

    @Column(name = "sales_transaction_id", nullable = false)
    private Long salesTransactionId;

    public ConsolidatedInvoiceTransaction() {
    }

    public ConsolidatedInvoiceTransaction(Long consolidatedInvoiceId, Long salesTransactionId) {
        this.consolidatedInvoiceId = consolidatedInvoiceId;
        this.salesTransactionId = salesTransactionId;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getConsolidatedInvoiceId() {
        return consolidatedInvoiceId;
    }

    public void setConsolidatedInvoiceId(Long consolidatedInvoiceId) {
        this.consolidatedInvoiceId = consolidatedInvoiceId;
    }

    public Long getSalesTransactionId() {
        return salesTransactionId;
    }

    public void setSalesTransactionId(Long salesTransactionId) {
        this.salesTransactionId = salesTransactionId;
    }
}
