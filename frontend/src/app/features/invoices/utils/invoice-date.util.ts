import { InvoiceListItem } from '../models/invoice-list-item.model';
import { Invoice } from '../models/invoice.model';

type InvoiceWithDate = Pick<Invoice, 'status' | 'closedAt' | 'createdAt'> | Pick<InvoiceListItem, 'status' | 'closedAt' | 'createdAt'>;

export function getRelevantInvoiceDate(invoice: InvoiceWithDate): Date {
  const dateValue = invoice.status === 2 && invoice.closedAt ? invoice.closedAt : invoice.createdAt;
  return new Date(dateValue);
}