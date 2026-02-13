
export type UserRole = 'admin' | 'user' | 'mamdhoob';

export interface User {
  id: string;
  username: string;
  password?: string; // stored plainly for this demo requirement, usually hashed
  fullName: string;
  role: UserRole;
  email?: string;
}

export interface VoterRecord {
  id: string;
  idCardNumber: string; // Must start with A-
  fullName: string;
  address: string;
  island: string;
  phoneNumber?: string;
  hasVoted: boolean;
  registrarParty?: string;
  sheema?: boolean;
  sadiq?: boolean;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: number;
}

export type PageView = 'login' | 'dashboard' | 'admin-panel' | 'forgot-password' | 'profile' | 'voting-status' | 'chat';