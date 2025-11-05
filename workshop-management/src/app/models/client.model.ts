export interface Client {
  id: number;
  name: string;
  phone: string;
  email: string;
  vehicleInfo?: string;
  notes?: string;
  createdAt: string;
}

export interface SaveClientRequest {
  name: string;
  phone: string;
  email: string;
  vehicleInfo?: string;
  notes?: string;
}
