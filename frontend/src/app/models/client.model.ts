export interface Client {
  id: number;
  name: string;
  phone: string;
  email: string;
  document: string;
  vehicle: string;
}

export type ClientPayload = Omit<Client, 'id'>;
