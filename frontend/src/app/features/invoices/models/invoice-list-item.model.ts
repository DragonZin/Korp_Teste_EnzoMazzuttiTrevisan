export interface InvoiceListItem {
  id: string;
  number: number;
  status: number;
  totalAmount: number;
  customerName: string;
  customerDocument: string;
  createdAt: string;
  closedAt: string | null;
  itemsCount: number;
}