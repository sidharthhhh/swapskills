// src/types/express.d.ts
export interface AuthUser {
  id: number;
  uid: string;
  username: string;
  status: string;
}

export interface AdminUser {
  id: number;
  username: string;
  role: 'super_admin' | 'moderator' | 'analyst';
}
