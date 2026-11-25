import {
    useCallback,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import {
    getCurrentUser,
    login as loginService,
    logout as logoutService,
    type AuthUser,
} from "./auth.service";

import { AuthContext } from "./auth-context";
import { SESSION_EXPIRED_EVENT } from "../../services/api";

export function AuthProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        async function initializeAuth() {
            try {
                const currentUser = await getCurrentUser();

                if (active) {
                    setUser(currentUser);
                }
            } catch {
                if (active) {
                    setUser(null);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        void initializeAuth();

        return () => {
            active = false;
        };
    }, []);

    // Any API call that comes back 401 means the session has ended.
    useEffect(() => {
        const handleExpired = () => setUser(null);

        window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);

        return () =>
            window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    }, []);

    const refresh = useCallback(async () => {
        try {
            setUser(await getCurrentUser());
        } catch {
            setUser(null);
        }
    }, []);

    async function handleLogin(mobile: string, pin: string) {
        const response = await loginService(mobile, pin);
        setUser(response.user);
    }

    async function handleLogout() {
        try {
            await logoutService();
        } finally {
            setUser(null);
        }
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                isAuthenticated: user !== null,
                isOwner: user?.role === "owner",
                login: handleLogin,
                logout: handleLogout,
                refresh,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
