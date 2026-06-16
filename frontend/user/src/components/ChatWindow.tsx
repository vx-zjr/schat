import React, { useEffect, useRef, useState } from 'react';
import { I18nKey, SchatApiClient, SchatWsClient } from 'shared';
import { UserIdentity } from '../App';
import AttachmentUpload from './AttachmentUpload';

interface ChatWindowProps {
  apiClient: SchatApiClient;
  wsClient: SchatWsClient;
  activeConv: {
    id: string;
    title: string | null;
    members: { userId: string }[];
  };
  currentUser: UserIdentity;
  usersList: { [userId: string]: string };
  t: (key: I18nKey) => string;
}

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  kind: 'TEXT' | 'ATTACHMENT' | 'SYSTEM';
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  attachments?: { id: string; fileName: string; contentType: string; byteSize: number }[];
};

export default function ChatWindow({ apiClient, wsClient, activeConv, currentUser, usersList, t }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typedMessage, setTypedMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<{ [userId: string]: boolean }>({});
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const loadMessages = async () => {
    try {
      const allMsgs = await apiClient.get<Message[]>('/user/messages');
      const filtered = allMsgs.filter(m => m.conversationId === activeConv.id).reverse();
      setMessages(filtered);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadMessages();

    const cleanupMessageCreated = wsClient.onMessageCreated((msg: Message) => {
      if (msg.conversationId === activeConv.id) {
        setMessages(prev => prev.some(existing => existing.id === msg.id) ? prev : [...prev, msg]);
      }
    });

    const cleanupMessageEdited = wsClient.onMessageEdited((edited: Message) => {
      if (edited.conversationId === activeConv.id) {
        setMessages(prev => prev.map(m => m.id === edited.id ? { ...m, body: edited.body, editedAt: edited.editedAt } : m));
      }
    });

    const cleanupMessageDeleted = wsClient.onMessageDeleted((deleted: Message) => {
      if (deleted.conversationId === activeConv.id) {
        setMessages(prev => prev.map(m => m.id === deleted.id ? { ...m, deletedAt: deleted.deletedAt, body: t('user.chat.deleted') } : m));
      }
    });

    const cleanupPresence = wsClient.onPresenceUpdated((status: { socketId: string; typing?: boolean; userId?: string }) => {
      if (status.userId && status.userId !== currentUser.id) {
        setTypingUsers(prev => ({ ...prev, [status.userId!]: !!status.typing }));
      }
    });

    return () => {
      setTypingUsers({});
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      cleanupMessageCreated();
      cleanupMessageEdited();
      cleanupMessageDeleted();
      cleanupPresence();
    };
  }, [activeConv.id, currentUser.id, wsClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;

    wsClient.sendMessage(activeConv.id, typedMessage.trim());
    setTypedMessage('');

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    wsClient.sendTyping(activeConv.id, false);
  };

  const handleKeyDown = () => {
    wsClient.sendTyping(activeConv.id, true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      wsClient.sendTyping(activeConv.id, false);
    }, 2000);
  };

  const handleAttachmentClick = async (attachmentId: string) => {
    try {
      const data = await apiClient.get<{ url: string }>(`/attachments/${attachmentId}/signed-url`);
      window.open(data.url, '_blank');
    } catch (e) {
      alert(t('user.chat.mediaLinkFailed'));
    }
  };

  const handleUploadComplete = (attachment: any) => {
    wsClient.sendMessage(activeConv.id, `${t('user.chat.uploadedFile')}: ${attachment.fileName} (${(attachment.byteSize / 1024).toFixed(1)} KB)`, [attachment.id]);
    setShowUploadPanel(false);
  };

  const activeTypingMembers = Object.keys(typingUsers)
    .filter(id => typingUsers[id])
    .map(id => usersList[id] || `${t('common.user')} (${id.substring(0, 5)})`);

  return (
    <div className="chat-window glass-panel">
      <div className="chat-header">
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{activeConv.title || t('user.roomFallback')}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('user.chat.channelActive')}</span>
        </div>
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowUploadPanel(true)}>
            {t('user.chat.shareFile')}
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map(m => {
          const isMe = m.senderId === currentUser.id;
          const senderLabel = usersList[m.senderId] || `${t('common.user')} (${m.senderId.substring(0, 5)})`;

          return (
            <div key={m.id} className={`message-node ${isMe ? 'me' : 'other'}`}>
              {!isMe && (
                <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '4px' }}>
                  {senderLabel}
                </div>
              )}

              <div style={{ wordBreak: 'break-word' }}>
                {m.deletedAt ? <span style={{ fontStyle: 'italic', opacity: 0.6 }}>{t('user.chat.deleted')}</span> : m.body}
              </div>

              {m.attachments && m.attachments.length > 0 && !m.deletedAt && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {m.attachments.map(att => (
                    <div
                      key={att.id}
                      onClick={() => handleAttachmentClick(att.id)}
                      style={{
                        background: isMe ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-color)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <u>{att.fileName}</u> ({(att.byteSize / 1024).toFixed(1)} KB)
                    </div>
                  ))}
                </div>
              )}

              <div className="message-time">
                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {m.editedAt && !m.deletedAt && <span style={{ marginLeft: '6px', fontSize: '0.65rem', fontStyle: 'italic' }}>{t('user.chat.edited')}</span>}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '0 28px' }}>
        {activeTypingMembers.length > 0 && (
          <div className="typing-indicator" style={{ marginBottom: '12px' }}>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <span style={{ marginLeft: '8px' }}>{activeTypingMembers.join(', ')} {t('user.chat.isTyping')}</span>
          </div>
        )}
      </div>

      <div className="chat-footer">
        <form onSubmit={handleSendMessage} style={{ display: 'flex', width: '100%', gap: '16px' }}>
          <input
            type="text"
            className="input-field"
            style={{ flexGrow: 1, padding: '16px' }}
            placeholder={t('user.chat.placeholder')}
            value={typedMessage}
            onChange={(e) => setTypedMessage(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0 32px' }}>
            {t('user.chat.send')}
          </button>
        </form>
      </div>

      {showUploadPanel && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ width: '400px' }}>
            <div className="modal-header">
              <h3>{t('user.chat.uploadTitle')}</h3>
              <button className="modal-close" onClick={() => setShowUploadPanel(false)}>&times;</button>
            </div>
            <AttachmentUpload apiClient={apiClient} conversationId={activeConv.id} onComplete={handleUploadComplete} t={t} />
          </div>
        </div>
      )}
    </div>
  );
}
