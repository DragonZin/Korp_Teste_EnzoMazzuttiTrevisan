import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

import { Invoice } from '../models/invoice.model';

@Component({
  selector: 'app-invoice-summary-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoice-summary-card.component.html',
  styleUrl: './invoice-summary-card.component.scss',
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