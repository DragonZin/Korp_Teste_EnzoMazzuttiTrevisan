import { Invoice } from '../models/invoice.model';

export function getRelevantInvoiceDate(invoice: Invoice): Date {
  const dateValue = invoice.status === 2 && invoice.closedAt ? invoice.closedAt : invoice.createdAt;
  return new Date(dateValue);
}