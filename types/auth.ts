import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { UserRole } from "./user";

export interface CustomUser {
  id: string;
  email: string;
  role: UserRole;
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