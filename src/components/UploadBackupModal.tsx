import { useState } from 'react';
import { BarLoader } from 'react-spinners';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Notification from './Notification';

type UploadBackupParams = {
    closeUploadModal: () => void;
};

export default function UploadBackupModal(params: UploadBackupParams) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const { token, handleUnauthorized } = useAuth();
    const { showNotification } = useNotification();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file extension
            if (!file.name.endsWith('.tar')) {
                setUploadError('Please select a .tar file');
                setSelectedFile(null);
                return;
            }
            setSelectedFile(file);
            setUploadError(null);
        }
    };

    const handleUploadBackup = async () => {
        if (!selectedFile) return;

        setUploading(true);
        setUploadError(null);
        try {
            const formData = new FormData();
            formData.append('backup', selectedFile);

            const response = await fetch('/api/v1/backups/upload', {
                method: 'POST',
                headers: {
                    ...(token && { Authorization: token }),
                },
                body: formData,
            });

            if (!response.ok) {
                if (response.status === 401) {
                    handleUnauthorized();
                    throw new Error('Authentication Token Required.');
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to upload backup');
            }

            params.closeUploadModal();
            const backupName = selectedFile.name.replace('.tar', '');
            showNotification('success', `Backup "${backupName}" uploaded successfully`);
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : 'Failed to upload backup');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                    Upload Backup
                </h3>

                <div className="space-y-4">
                    {uploadError && <Notification type="error" message={uploadError} compact />}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Select Backup File
                        </label>
                        <input
                            type="file"
                            accept=".tar"
                            onChange={handleFileChange}
                            disabled={uploading}
                            className="w-full text-sm text-slate-500 dark:text-slate-400
                                border-slate-200 dark:border-slate-700
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-medium
                                file:bg-slate-50 dark:file:bg-slate-900/30 file:text-slate-700 dark:file:text-slate-300
                                hover:file:bg-slate-100 dark:hover:file:bg-slate-900/50
                                file:cursor-pointer
                                disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        {selectedFile && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                Selected: {selectedFile.name} (
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                            </p>
                        )}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 px-3 py-2 rounded-md text-xs">
                        <strong>Note:</strong> The backup file must be a .tar file. If a backup with
                        the same name already exists, the upload will fail.
                    </div>
                </div>

                <div className="flex justify-end mt-6">
                    {uploading ? (
                        <BarLoader color="#155dfc" />
                    ) : (
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={params.closeUploadModal}
                                disabled={uploading}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUploadBackup}
                                disabled={uploading || !selectedFile}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                            >
                                Upload Backup
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
