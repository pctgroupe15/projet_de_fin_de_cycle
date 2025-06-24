import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { UserRole } from '@/types/user';


export interface CustomUser {
  id: string;
  email: string;
  role: string;
  hashedPassword: string;
}

export interface CustomToken extends JWT {
  role: UserRole;
  id: string;
}

export interface CustomSession extends Session {
  user: {
    id: string;
    role: UserRole;
    email?: string;
    name?: string;
  };
}