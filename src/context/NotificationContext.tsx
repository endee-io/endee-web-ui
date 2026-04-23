import { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { NotificationType } from '../components/Notification';

interface NotificationState {
    type: NotificationType;
    message: string;
}

interface NotificationContextType {
    notification: NotificationState | null;
    showNotification: (type: NotificationType, message: string) => void;
    clearNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notification, setNotification] = useState<NotificationState | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearNotification = useCallback(() => {
        setNotification(null);
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const showNotification = useCallback((type: NotificationType, message: string) => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        setNotification({ type, message });

        if (type === 'success' || type === 'info') {
            timerRef.current = setTimeout(() => {
                setNotification(null);
                timerRef.current = null;
            }, 4000);
        }
    }, []);

    return (
        <NotificationContext.Provider value={{ notification, showNotification, clearNotification }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
}
