export interface ManageInvoiceItemsRequest {
  products: ManageInvoiceItemRequest[];
}

export interface ManageInvoiceItemRequest {
  productId: string;
  quantity: number;
}