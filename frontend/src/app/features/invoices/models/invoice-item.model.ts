export interface InvoiceItem {
  id: string;
  productId: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  isDeleted?: boolean | null;
}