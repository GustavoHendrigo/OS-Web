export interface Client {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  vehicles: string | null;
  notes?: string | null;
}
