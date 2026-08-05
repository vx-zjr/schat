import React, { useEffect, useState } from 'react';
import { I18nKey, SchatApiClient } from 'shared';

export type BanRecord = {
  id: string;
  userId: string | null;
  ip: string | null;
  reason: string | null;
  createdBy: string;
  createdAt: string;
  liftedAt: string | null;
  user?: { username: string } | null;
};

interface BansPanelProps {
  apiClient: SchatApiClient;
  t: (key: I18nKey) => string;
}

export default function BansPanel({ apiClient, t }: BansPanelProps) {
  const [bans, setBans] = useState<BanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banType, setBanType] = useState<'USER' | 'IP'>('USER');
  const [targetUserId, setTargetUserId] = useState('');
  const [targetIp, setTargetIp] = useState('');
  const [reason, setReason] = useState('');
  const [availableUsers, setAvailableUsers] = useState<{ id: string; username: string }[]>([]);

  const loadBans = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<BanRecord[]>('/admin/bans');
      setBans(data.filter(b => !b.liftedAt));
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t('admin.bans.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await apiClient.get<{ id: string; username: string }[]>('/admin/users');
      setAvailableUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadBans();
    loadUsers();
  }, []);

  const handleCreateBan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: { reason: string; userId?: string; ip?: string } = { reason };
      if (banType === 'USER') {
        payload.userId = targetUserId;
      } else {
        payload.ip = targetIp;
      }

      await apiClient.post('/admin/bans', payload);
      setTargetUserId('');
      setTargetIp('');
      setReason('');
      loadBans();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || t('admin.bans.applyFailed'));
    }
  };

  const handleLiftBan = async (banId: string) => {
    if (!confirm(t('admin.bans.confirmLift'))) return;
    try {
      await apiClient.delete(`/admin/bans/${banId}`);
      loadBans();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || t('admin.bans.liftFailed'));
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>{t('admin.bans.loading')}</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '32px' }}>
      <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
        <h4 style={{ marginBottom: '20px', fontSize: '1.1rem' }}>{t('admin.bans.createTitle')}</h4>
        <form onSubmit={handleCreateBan}>
          <div className="input-group">
            <label className="input-label">{t('admin.bans.targetScope')}</label>
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="banType"
                  checked={banType === 'USER'}
                  onChange={() => setBanType('USER')}
                  style={{ accentColor: 'var(--accent)' }}
                />
                {t('admin.bans.userAccount')}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="banType"
                  checked={banType === 'IP'}
                  onChange={() => setBanType('IP')}
                  style={{ accentColor: 'var(--accent)' }}
                />
                {t('admin.bans.ipAddress')}
              </label>
            </div>
          </div>

          {banType === 'USER' ? (
            <div className="input-group">
              <label className="input-label">{t('admin.bans.userTarget')}</label>
              <select className="input-field" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} required>
                <option value="">{t('admin.bans.selectAccount')}</option>
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="input-group">
              <label className="input-label">{t('admin.bans.ipAddress')}</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. 192.168.1.100"
                value={targetIp}
                onChange={(e) => setTargetIp(e.target.value)}
                required
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">{t('admin.bans.reason')}</label>
            <textarea
              className="input-field"
              placeholder={t('admin.bans.reasonPlaceholder')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              style={{ resize: 'none' }}
              required
            />
          </div>

          <button type="submit" className="btn btn-danger" style={{ width: '100%', marginTop: '10px' }}>
            {t('admin.bans.enforce')}
          </button>
        </form>
      </div>

      <div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>{t('admin.bans.title')}</h3>
        {error && (
          <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <div className="table-container glass-panel">
          {bans.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              {t('admin.bans.noActive')}
            </div>
          ) : (
            <table className="data-table responsive-table">
              <thead>
                <tr>
                  <th>{t('admin.bans.target')}</th>
                  <th>{t('admin.bans.scope')}</th>
                  <th>{t('admin.bans.reason')}</th>
                  <th>{t('admin.bans.enforcedBy')}</th>
                  <th>{t('admin.bans.enforcedAt')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {bans.map(b => (
                  <tr key={b.id}>
                    <td data-label={t('admin.bans.target')} style={{ fontWeight: 600 }}>{b.user?.username || b.ip || `ID: ${b.userId}`}</td>
                    <td data-label={t('admin.bans.scope')}>
                      <span className={`badge ${b.ip ? 'badge-danger' : 'badge-warning'}`}>
                        {b.ip ? t('admin.bans.ipBan') : t('admin.bans.userBan')}
                      </span>
                    </td>
                    <td data-label={t('admin.bans.reason')} style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.reason || t('admin.bans.noneStated')}
                    </td>
                    <td data-label={t('admin.bans.enforcedBy')}>{b.createdBy}</td>
                    <td data-label={t('admin.bans.enforcedAt')}>{new Date(b.createdAt).toLocaleDateString()}</td>
                    <td data-label={t('common.actions')}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleLiftBan(b.id)}>
                        {t('admin.bans.lift')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
