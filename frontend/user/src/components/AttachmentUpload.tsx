import React, { useState } from 'react';
import axios from 'axios';
import { I18nKey, SchatApiClient } from 'shared';

interface AttachmentUploadProps {
  apiClient: SchatApiClient;
  conversationId: string;
  onComplete: (attachment: any) => void;
  t: (key: I18nKey) => string;
}

export default function AttachmentUpload({ apiClient, conversationId, onComplete, t }: AttachmentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(10);

    try {
      const intent = await apiClient.post<{ id: string; uploadUrl: string; fileName: string; byteSize: number }>('/attachments/upload-intent', {
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        byteSize: file.size,
        conversationId
      });

      setProgress(40);

      await axios.put(intent.uploadUrl, file, {
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentage = Math.round((progressEvent.loaded * 50) / progressEvent.total);
            setProgress(40 + percentage);
          }
        }
      });

      setProgress(100);
      onComplete(intent);
    } catch (e: any) {
      console.error(e);
      alert(t('user.attachment.failed') + (e.response?.data?.message || e.message || t('user.attachment.unknownError')));
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div>
      <div className="upload-dropzone">
        <input type="file" id="fileInput" style={{ display: 'none' }} onChange={handleFileChange} disabled={uploading} />
        <label htmlFor="fileInput" style={{ cursor: 'pointer', display: 'block' }}>
          {file ? (
            <div style={{ color: 'var(--text-main)' }}>
              <strong>{file.name}</strong>
              <div style={{ fontSize: '0.75rem', marginTop: '6px', color: 'var(--text-muted)' }}>
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </div>
          ) : (
            <div>
              <span style={{ fontSize: '2rem' }}>File</span>
              <p style={{ marginTop: '8px' }}>{t('user.attachment.selectFile')}</p>
            </div>
          )}
        </label>
      </div>

      {uploading && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
            <div style={{ background: 'var(--accent)', height: '100%', width: `${progress}%`, transition: 'width 0.2s' }}></div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '6px' }}>
            {t('user.attachment.transmitting')}: {progress}%
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
        <button className="btn btn-secondary" onClick={() => { if (!uploading) setFile(null); }} disabled={uploading}>
          {t('user.attachment.clear')}
        </button>
        <button className="btn btn-primary" onClick={handleUpload} disabled={!file || uploading}>
          {uploading ? t('user.attachment.uploading') : t('user.attachment.upload')}
        </button>
      </div>
    </div>
  );
}
