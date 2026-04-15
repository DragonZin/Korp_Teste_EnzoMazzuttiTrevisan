import { CommonModule } from '@angular/common';
import { Component, Input, TemplateRef } from '@angular/core';

import { InvoiceListItem } from '../models/invoice-list-item.model';
import { getRelevantInvoiceDate } from '../utils/invoice-date.util';
import { toInvoiceStatusClass, toInvoiceStatusLabel } from '../utils/invoice-status.util';

export interface InvoicesTableCellContext {
  $implicit: InvoiceListItem;
  invoice: InvoiceListItem;
}

@Component({
  selector: 'app-invoices-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoices-table.component.html',
  styleUrl: './invoices-table.component.scss',
})
export class InvoicesTableComponent {
  @Input({ required: true }) invoices: InvoiceListItem[] = [];
  @Input() isLoading = false;
  @Input() emptyMessage = 'Nenhuma nota encontrada.';

  @Input() statusTemplate?: TemplateRef<InvoicesTableCellContext>;
  @Input() dateTemplate?: TemplateRef<InvoicesTableCellContext>;
  @Input() actionsTemplate?: TemplateRef<InvoicesTableCellContext>;

  protected readonly toInvoiceStatusLabel = toInvoiceStatusLabel;
  protected readonly toInvoiceStatusClass = toInvoiceStatusClass;
  protected readonly getRelevantInvoiceDate = getRelevantInvoiceDate;

  protected trackByInvoiceId(_: number, invoice: InvoiceListItem): string {
    return invoice.id;
  }
}