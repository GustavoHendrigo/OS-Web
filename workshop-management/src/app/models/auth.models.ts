export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthenticatedUser {
  id: number;
  username: string;
  role: 'admin' | 'mecanico';
  token: string;
}
