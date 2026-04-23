import { useState, useEffect } from 'react';
import { GoX, GoKey } from 'react-icons/go';
import { useAuth } from '../context/AuthContext';
import Notification from './Notification';

export default function AuthModal() {
    const { showAuthModal, closeAuthModal, setToken, token } = useAuth();
    const [inputValue, setInputValue] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (showAuthModal) {
            setInputValue(token || '');
            setError(null);
        }
    }, [showAuthModal, token]);

    const handleClose = () => {
        setError(null);
        closeAuthModal();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedToken = inputValue.trim();
        if (!trimmedToken) {
            setError('Please enter an auth token');
            return;
        }

        setToken(trimmedToken);
        setError(null);
        window.location.reload();
    };

    if (!showAuthModal) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <GoKey className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                            Authentication Required
                        </h3>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        <GoX className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    The server requires authentication. Please enter your API token to continue.
                </p>

                {error && <Notification type="error" message={error} compact className="mb-4" />}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            API Token
                        </label>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Enter your auth token"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Save Token
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
