export interface LoginPayload {
  username: string;
  password: string;
}

export interface AuthUser {
  id: number;
  name: string;
  role: 'admin' | 'mecanico';
  token: string;
}
