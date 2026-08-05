import React, { useState } from 'react';
import { I18nKey, SchatApiClient } from 'shared';

type GeoipResult = {
  ip: string;
  country: string;
  region: string;
  city: string;
};

interface GeoIpPanelProps {
  apiClient: SchatApiClient;
  t: (key: I18nKey) => string;
}

export default function GeoIpPanel({ apiClient, t }: GeoIpPanelProps) {
  const [ip, setIp] = useState('');
  const [result, setResult] = useState<GeoipResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ip.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await apiClient.get<GeoipResult>(`/admin/geoip/${ip.trim()}`);
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t('admin.geoip.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '32px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>{t('admin.geoip.title')}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
          {t('admin.geoip.description')}
        </p>

        <form className="geoip-lookup-form" onSubmit={handleLookup} style={{ display: 'flex', gap: '12px' }}>
          <div className="input-group" style={{ flexGrow: 1, marginBottom: 0 }}>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. 8.8.8.8"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0 24px' }} disabled={loading}>
            {loading ? t('admin.geoip.searching') : t('admin.geoip.lookup')}
          </button>
        </form>
      </div>

      {error && (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {result && (
        <div className="glass-panel" style={{ padding: '32px', animation: 'fadeIn 0.3s ease-in-out' }}>
          <h4 className="text-gradient-cyan" style={{ fontSize: '1.1rem', marginBottom: '20px' }}>{t('admin.geoip.results')}</h4>

          <div className="geoip-results-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('admin.geoip.ip')}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{result.ip}</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('admin.geoip.country')}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{result.country}</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('admin.geoip.region')}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{result.region}</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('admin.geoip.city')}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{result.city}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
