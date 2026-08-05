import React, { useEffect, useState } from 'react';
import { I18nKey, SchatApiClient } from 'shared';
import { UserIdentity } from '../App';

interface UsersPanelProps {
  apiClient: SchatApiClient;
  currentUser: UserIdentity;
  t: (key: I18nKey) => string;
}

export default function UsersPanel({ apiClient, currentUser, t }: UsersPanelProps) {
  const [users, setUsers] = useState<UserIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPermsModal, setShowPermsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserIdentity | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [permissionList, setPermissionList] = useState<string[]>([]);
  const [availablePermissions] = useState([
    'users.read',
    'users.write',
    'bans.read',
    'bans.write',
    'conversations.read',
    'conversations.write',
    'messages.read',
    'messages.write',
    'geoip.read'
  ]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<UserIdentity[]>('/admin/users');
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t('admin.users.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/admin/users', {
        username: newUsername,
        password: newPassword
      });
      setShowCreateModal(false);
      setNewUsername('');
      setNewPassword('');
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || t('admin.users.createFailed'));
    }
  };

  const handleUpdateUser = async (userId: string, status: 'ACTIVE' | 'DISABLED') => {
    try {
      await apiClient.patch(`/admin/users/${userId}`, { status });
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || t('admin.users.updateFailed'));
    }
  };

  const openPermissionsModal = (user: UserIdentity) => {
    setSelectedUser(user);
    setPermissionList(user.permissions || []);
    setShowPermsModal(true);
  };

  const handleTogglePermission = (permission: string) => {
    setPermissionList(prev =>
      prev.includes(permission) ? prev.filter(p => p !== permission) : [...prev, permission]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    try {
      await apiClient.patch(`/admin/users/${selectedUser.id}/permissions`, {
        permissions: permissionList
      });
      setShowPermsModal(false);
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || t('admin.users.permissionsFailed'));
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>{t('admin.users.loading')}</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.25rem' }}>{t('admin.users.title')}</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
          + {t('admin.users.add')}
        </button>
      </div>

      {error && (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <div className="table-container glass-panel">
        <table className="data-table responsive-table">
          <thead>
            <tr>
              <th>{t('common.username')}</th>
              <th>{t('common.role')}</th>
              <th>{t('common.status')}</th>
              <th>{t('admin.users.permissions')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td data-label={t('common.username')} style={{ fontWeight: 600 }}>{u.username}</td>
                <td data-label={t('common.role')}>
                  <span className={`badge ${u.role === 'MASTER' ? 'badge-danger' : 'badge-primary'}`}>
                    {u.role}
                  </span>
                </td>
                <td data-label={t('common.status')}>
                  <select
                    value={u.status}
                    className="input-field"
                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                    onChange={(e) => handleUpdateUser(u.id, e.target.value as any)}
                    disabled={u.id === currentUser.id}
                  >
                    <option value="ACTIVE">{t('common.active')}</option>
                    <option value="DISABLED">{t('common.disabled')}</option>
                  </select>
                </td>
                <td data-label={t('admin.users.permissions')} style={{ maxWidth: '300px', flexWrap: 'wrap', gap: '4px' }}>
                  {u.permissions && u.permissions.length > 0 ? (
                    u.permissions.map(p => (
                      <span key={p} className="badge badge-success" style={{ margin: '2px', textTransform: 'none', fontSize: '0.7rem' }}>
                        {p}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t('common.none')}</span>
                  )}
                </td>
                <td data-label={t('common.actions')}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => openPermissionsModal(u)}
                      disabled={u.role === 'MASTER'}
                    >
                      {t('admin.users.editPermissions')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>{t('admin.users.createTitle')}</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="input-group">
                <label className="input-label">{t('common.username')}</label>
                <input
                  type="text"
                  className="input-field"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">{t('admin.users.initialPassword')}</label>
                <input
                  type="password"
                  className="input-field"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('admin.users.create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPermsModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ width: '450px' }}>
            <div className="modal-header">
              <h3>{t('admin.users.grantPermissions')}: {selectedUser.username}</h3>
              <button className="modal-close" onClick={() => setShowPermsModal(false)}>&times;</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {availablePermissions.map(p => (
                <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '8px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)' }}>
                  <input
                    type="checkbox"
                    checked={permissionList.includes(p)}
                    onChange={() => handleTogglePermission(p)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                  />
                  <span>{p}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setShowPermsModal(false)}>{t('common.cancel')}</button>
              <button className="btn btn-primary" onClick={handleSavePermissions}>{t('admin.users.saveRuleSet')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
