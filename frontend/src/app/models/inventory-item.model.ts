export interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  minimumQuantity?: number;
  unitPrice?: number;
  location?: string;
  supplier?: string;
}

export type InventoryItemPayload = Omit<InventoryItem, 'id'>;
