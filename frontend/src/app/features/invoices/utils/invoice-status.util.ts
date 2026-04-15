export type InvoiceStatusLabel = 'Open' | 'Closed';
export type InvoiceStatusClass = 'invoice-status-open' | 'invoice-status-closed';

export function toInvoiceStatusLabel(status: number): InvoiceStatusLabel {
  return status === 2 ? 'Closed' : 'Open';
}

export function toInvoiceStatusClass(status: number): InvoiceStatusClass {
  return status === 2 ? 'invoice-status-closed' : 'invoice-status-open';
}