import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

import { Invoice } from '../models/invoice.model';

@Component({
  selector: 'app-invoice-summary-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="row g-3 mb-4" *ngIf="invoice() as invoice">
      <div class="col-md-4">
        <label class="form-label">Cliente</label>
        <ng-container *ngIf="mode() === 'editable'; else readonlyCustomerField">
          <ng-content select="[invoice-customer-field]"></ng-content>
        </ng-container>
        <ng-template #readonlyCustomerField>
          <p class="form-control-plaintext border rounded px-3 py-2 mb-0">{{ invoice.customerName }}</p>
        </ng-template>
      </div>

      <div class="col-md-4">
        <label class="form-label">Documento</label>
        <ng-container *ngIf="mode() === 'editable'; else readonlyDocumentField">
          <ng-content select="[invoice-document-field]"></ng-content>
        </ng-container>
        <ng-template #readonlyDocumentField>
          <p class="form-control-plaintext border rounded px-3 py-2 mb-0">{{ invoice.customerDocument }}</p>
        </ng-template>
      </div>

      <div class="col-md-4">
        <label class="form-label">Status</label>
        <p class="form-control-plaintext border rounded px-3 py-2 mb-0">{{ getStatusLabel(invoice.status) }}</p>
      </div>
      <div class="col-md-3">
        <label class="form-label">Emissão</label>
        <p class="form-control-plaintext border rounded px-3 py-2 mb-0">{{ formatDate(invoice.createdAt) }}</p>
      </div>
      <div class="col-md-3">
        <label class="form-label">Fechamento</label>
        <p class="form-control-plaintext border rounded px-3 py-2 mb-0">{{ formatDate(invoice.closedAt) }}</p>
      </div>
      <div class="col-md-3">
        <label class="form-label">Total</label>
        <p class="form-control-plaintext border rounded px-3 py-2 mb-0">{{ invoice.totalAmount | currency: 'BRL' }}</p>
      </div>
      <div class="col-md-3">
        <label class="form-label">Número</label>
        <p class="form-control-plaintext border rounded px-3 py-2 mb-0">NF-{{ invoice.number }}</p>
      </div>
    </div>
  `,
})
export class InvoiceSummaryCardComponent {
  readonly invoice = input.required<Invoice>();
  readonly mode = input<'readonly' | 'editable'>('readonly');

  protected getStatusLabel(status: number): 'Open' | 'Closed' {
    return status === 2 ? 'Closed' : 'Open';
  }

  protected formatDate(dateValue: string | null): string {
    if (!dateValue) {
      return '-';
    }

    const parsedDate = new Date(dateValue);

    if (Number.isNaN(parsedDate.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(parsedDate);
  }
}