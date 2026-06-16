import React, { useEffect, useRef, useState } from 'react';
import { I18nKey, SchatApiClient, SchatWsClient } from 'shared';
import { UserIdentity } from '../App';

interface ConversationsPanelProps {
  apiClient: SchatApiClient;
  wsClient: SchatWsClient;
  currentUser: UserIdentity;
  t: (key: I18nKey) => string;
}

type Conversation = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  members: { id: string; userId: string; conversationId: string }[];
};

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  kind: 'TEXT' | 'ATTACHMENT' | 'SYSTEM';
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
};

export default function ConversationsPanel({ apiClient, wsClient, currentUser, t }: ConversationsPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [typedMessage, setTypedMessage] = useState('');
  const [users, setUsers] = useState<{ id: string; username: string }[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([currentUser.id]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [typingUsers, setTypingUsers] = useState<{ [userId: string]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = async () => {
    try {
      const convs = await apiClient.get<Conversation[]>('/admin/conversations');
      setConversations(convs);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAllMessages = async () => {
    try {
      const msgs = await apiClient.get<Message[]>('/admin/messages');
      setMessages(msgs.reverse());
    } catch (e) {
      console.error(e);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await apiClient.get<{ id: string; username: string }[]>('/admin/users');
      setUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadConversations();
    loadAllMessages();
    loadUsers();

    const cleanupMessageCreated = wsClient.onMessageCreated((msg: Message) => {
      setMessages(prev => prev.some(existing => existing.id === msg.id) ? prev : [...prev, msg]);
      scrollToBottom();
    });

    const cleanupMessageEdited = wsClient.onMessageEdited((edited: Message) => {
      setMessages(prev => prev.map(m => m.id === edited.id ? { ...m, body: edited.body, editedAt: edited.editedAt } : m));
    });

    const cleanupMessageDeleted = wsClient.onMessageDeleted((deleted: Message) => {
      setMessages(prev => prev.map(m => m.id === deleted.id ? { ...m, deletedAt: deleted.deletedAt, body: t('admin.chat.deleted') } : m));
    });

    const cleanupPresence = wsClient.onPresenceUpdated((status: { socketId: string; typing?: boolean; userId?: string }) => {
      if (status.userId) {
        setTypingUsers(prev => ({ ...prev, [status.userId!]: !!status.typing }));
      }
    });

    return () => {
      if (activeConv) {
        wsClient.leaveConversation(activeConv.id);
      }
      cleanupMessageCreated();
      cleanupMessageEdited();
      cleanupMessageDeleted();
      cleanupPresence();
    };
  }, [wsClient]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeConv]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectConversation = (conv: Conversation) => {
    if (activeConv) {
      wsClient.leaveConversation(activeConv.id);
    }
    setActiveConv(conv);
    wsClient.joinConversation(conv.id);
    setTypingUsers({});
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !activeConv) return;
    wsClient.sendMessage(activeConv.id, typedMessage.trim());
    setTypedMessage('');
  };

  const handleCreateConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/admin/conversations', {
        title: newTitle || undefined,
        memberIds: selectedMembers
      });
      setShowCreateModal(false);
      setNewTitle('');
      setSelectedMembers([currentUser.id]);
      loadConversations();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || t('admin.chat.createFailed'));
    }
  };

  const handleToggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleStartEdit = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.body);
  };

  const handleSaveEdit = async (msgId: string) => {
    try {
      await apiClient.patch(`/admin/messages/${msgId}`, { body: editingText });
      setEditingMessageId(null);
      loadAllMessages();
    } catch (err: any) {
      alert(t('admin.chat.editFailed') + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm(t('admin.chat.confirmDelete'))) return;
    try {
      await apiClient.delete(`/admin/messages/${msgId}`);
      loadAllMessages();
    } catch (err: any) {
      alert(t('admin.chat.deleteFailed') + (err.response?.data?.message || err.message));
    }
  };

  const activeMessages = messages.filter(m => m.conversationId === activeConv?.id);
  const isAdminMember = activeConv?.members.some(m => m.userId === currentUser.id);

  const getUserName = (senderId: string) => {
    const found = users.find(u => u.id === senderId);
    return found ? found.username : `${t('common.user')} (${senderId.substring(0, 5)})`;
  };

  return (
    <div className="chat-dashboard glass-panel" style={{ height: 'calc(100vh - 170px)' }}>
      <div className="chat-rooms">
        <div className="chat-rooms-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '1rem' }}>{t('admin.chat.rooms')}</h4>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
            + {t('admin.chat.create')}
          </button>
        </div>
        <ul className="rooms-list">
          {conversations.map(c => {
            const memberNames = c.members.map(m => getUserName(m.userId)).join(', ');
            return (
              <li
                key={c.id}
                className={`room-item ${activeConv?.id === c.id ? 'active' : ''}`}
                onClick={() => handleSelectConversation(c)}
              >
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.title || `${t('admin.chat.rooms')}: ${c.id.substring(0, 8)}`}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {memberNames}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="chat-window-panel">
        {activeConv ? (
          <>
            <div className="chat-window-header">
              <div>
                <span style={{ fontWeight: 600 }}>{activeConv.title || `${t('admin.chat.rooms')}: ${activeConv.id}`}</span>
                <span style={{ marginLeft: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {activeConv.members.length} {t('admin.chat.members')}
                </span>
              </div>
              <div>
                {!isAdminMember && <span className="badge badge-warning">{t('admin.chat.monitorOnly')}</span>}
              </div>
            </div>

            <div className="messages-list-wrapper">
              {activeMessages.map(m => {
                const isMe = m.senderId === currentUser.id;
                const senderLabel = getUserName(m.senderId);

                return (
                  <div key={m.id} className={`message-bubble ${isMe ? 'sent' : 'received'}`}>
                    <div style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: '2px', fontWeight: 600 }}>
                      {senderLabel}
                    </div>

                    {editingMessageId === m.id ? (
                      <div>
                        <input
                          type="text"
                          className="input-field"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          style={{ padding: '6px 12px', fontSize: '0.9rem', width: '100%', marginBottom: '8px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditingMessageId(null)}>{t('common.cancel')}</button>
                          <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(m.id)}>{t('common.save')}</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ wordBreak: 'break-word' }}>
                        {m.deletedAt ? <span style={{ fontStyle: 'italic', opacity: 0.6 }}>{t('admin.chat.deleted')}</span> : m.body}
                      </div>
                    )}

                    <div className="message-meta">
                      <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {m.editedAt && !m.deletedAt && <span style={{ fontSize: '0.65rem', fontStyle: 'italic' }}>{t('admin.chat.edited')}</span>}

                      {!m.deletedAt && editingMessageId !== m.id && (
                        <div className="msg-actions" style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
                          <span style={{ cursor: 'pointer', opacity: 0.7 }} title={t('admin.chat.editMessage')} onClick={() => handleStartEdit(m)}>
                            Edit
                          </span>
                          <span style={{ cursor: 'pointer', opacity: 0.7 }} title={t('admin.chat.deleteMessage')} onClick={() => handleDeleteMessage(m.id)}>
                            Delete
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {Object.keys(typingUsers).some(id => typingUsers[id] && id !== currentUser.id) && (
              <div style={{ padding: '0 24px', marginBottom: '8px' }}>
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <span style={{ marginLeft: '8px' }}>
                    {Object.keys(typingUsers)
                      .filter(id => typingUsers[id] && id !== currentUser.id)
                      .map(id => getUserName(id))
                      .join(', ')} {t('user.chat.isTyping')}
                  </span>
                </div>
              </div>
            )}

            <div className="chat-input-area">
              {isAdminMember ? (
                <form onSubmit={handleSendMessage} style={{ display: 'flex', width: '100%', gap: '12px' }}>
                  <input
                    type="text"
                    className="input-field chat-input-field"
                    placeholder={t('admin.chat.broadcastPlaceholder')}
                    value={typedMessage}
                    onChange={(e) => setTypedMessage(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary">{t('admin.chat.send')}</button>
                </form>
              ) : (
                <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {t('admin.chat.writeRestricted')}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            {t('admin.chat.selectRoom')}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ width: '400px' }}>
            <div className="modal-header">
              <h3>{t('admin.chat.createTitle')}</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateConversation}>
              <div className="input-group">
                <label className="input-label">{t('admin.chat.roomTitle')}</label>
                <input
                  type="text"
                  className="input-field"
                  value={newTitle}
                  placeholder={t('admin.chat.roomTitlePlaceholder')}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label" style={{ marginBottom: '8px' }}>{t('admin.chat.assignMembers')}</label>
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {users.map(u => (
                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px', background: 'rgba(255,255,255,0.01)', borderRadius: '4px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(u.id)}
                        onChange={() => handleToggleMember(u.id)}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <span>{u.username} {u.id === currentUser.id ? `(${t('admin.chat.you')})` : ''}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('admin.chat.initializeRoom')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
