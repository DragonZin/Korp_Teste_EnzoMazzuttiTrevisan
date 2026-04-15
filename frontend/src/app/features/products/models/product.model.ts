export interface Product {
  id: string;
  code: string;
  name: string;
  stock: number;
  availableQuantity: number;
  price: number;
  isDeleted?: boolean;
}

export interface ProductApiResponse {
  id: string;
  code: string;
  name: string;
  stock: number;
  availableQuantity?: number | null;
  price?: number | string | null;
  isDeleted?: boolean | null;
}