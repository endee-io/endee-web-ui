import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';

const AUTH_TOKEN_KEY = 'endee_auth_token';

interface AuthContextType {
    token: string | null;
    isAuthenticated: boolean;
    showAuthModal: boolean;
    setToken: (token: string | null) => void;
    openAuthModal: () => void;
    closeAuthModal: () => void;
    clearToken: () => void;
    handleUnauthorized: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setTokenState] = useState<string | null>(() => {
        return localStorage.getItem(AUTH_TOKEN_KEY);
    });
    const [showAuthModal, setShowAuthModal] = useState(false);

    const isAuthenticated = token !== null && token.trim() !== '';

    useEffect(() => {
        if (token) {
            localStorage.setItem(AUTH_TOKEN_KEY, token);
        } else {
            localStorage.removeItem(AUTH_TOKEN_KEY);
        }
    }, [token]);

    const setToken = useCallback((newToken: string | null) => {
        setTokenState(newToken);
        if (newToken) {
            setShowAuthModal(false);
        }
    }, []);

    const clearToken = useCallback(() => {
        setTokenState(null);
    }, []);

    const openAuthModal = useCallback(() => {
        setShowAuthModal(true);
    }, []);

    const closeAuthModal = useCallback(() => {
        setShowAuthModal(false);
    }, []);

    const handleUnauthorized = useCallback(() => {
        setTokenState(null);
        setShowAuthModal(true);
    }, []);

    const value: AuthContextType = {
        token,
        isAuthenticated,
        showAuthModal,
        setToken,
        openAuthModal,
        closeAuthModal,
        clearToken,
        handleUnauthorized,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
