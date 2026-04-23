import { GoCheck, GoX, GoAlert, GoInfo } from 'react-icons/go';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationProps {
    type: NotificationType;
    message: string;
    onDismiss?: () => void;
    compact?: boolean;
    className?: string;
}

const config: Record<
    NotificationType,
    {
        icon: typeof GoCheck;
        classes: string;
    }
> = {
    success: {
        icon: GoCheck,
        classes:
            'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300',
    },
    error: {
        icon: GoAlert,
        classes:
            'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
    },
    warning: {
        icon: GoAlert,
        classes:
            'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300',
    },
    info: {
        icon: GoInfo,
        classes:
            'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
    },
};

export default function Notification({
    type,
    message,
    onDismiss,
    compact = false,
    className = '',
}: NotificationProps) {
    const { icon: Icon, classes } = config[type];

    return (
        <div
            className={`border rounded-md ${compact ? 'px-3 py-2' : 'px-4 py-3'} ${classes} flex items-center justify-between text-sm ${className}`}
        >
            <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{message}</span>
            </div>
            {onDismiss && (
                <button onClick={onDismiss} className="hover:opacity-70 ml-3 shrink-0">
                    <GoX className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}
