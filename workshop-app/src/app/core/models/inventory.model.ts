export interface InventoryItem {
  id: number;
  code: string;
  description: string;
  quantity: number;
  minQuantity: number;
  unitCost: number;
  location: string;
  supplier: string;
}
