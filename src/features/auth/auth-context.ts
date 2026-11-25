import { createContext } from "react";

import type { AuthUser } from "./auth.service";

export interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    isAuthenticated: boolean;
    /** True only for the business owner (full access). */
    isOwner: boolean;
    login: (mobile: string, pin: string) => Promise<void>;
    logout: () => Promise<void>;
    /** Re-reads the current session (used after first-time setup). */
    refresh: () => Promise<void>;
}

export const AuthContext =
    createContext<AuthContextType | undefined>(undefined);
