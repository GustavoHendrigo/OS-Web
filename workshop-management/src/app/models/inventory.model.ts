export interface InventoryItem {
  id: number;
  name: string;
  partNumber?: string;
  quantity: number;
  minimumStock?: number;
  unitPrice: number;
  location?: string;
  updatedAt: string;
}

export interface SaveInventoryItemRequest {
  name: string;
  partNumber?: string;
  quantity: number;
  minimumStock?: number;
  unitPrice: number;
  location?: string;
}
