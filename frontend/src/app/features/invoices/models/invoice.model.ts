import { InvoiceItem } from './invoice-item.model';

export interface Invoice {
  id: string;
  number: number;
  status: number;
  totalAmount: number;
  customerName: string;
  customerDocument: string;
  createdAt: string;
  closedAt: string | null;
  products: InvoiceItem[];
}