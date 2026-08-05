import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Paperclip } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { I18nKey, SchatApiClient, SchatWsClient, ThemeMode } from 'shared';
import type { DirectConversation, UserIdentity } from '../types';
import AttachmentUpload from './AttachmentUpload';
import UtilityControls from './UtilityControls';

type ChatWindowProps = {
  apiClient: SchatApiClient;
  wsClient: SchatWsClient;
  conversation: DirectConversation;
  currentUser: UserIdentity;
  theme: ThemeMode;
  t: (key: I18nKey) => string;
  onToggleLanguage: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
};

type Attachment = {
  id: string;
  fileName: string;
  contentType: string;
  byteSize: number;
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
  attachments?: Attachment[];
};

export default function ChatWindow({
  apiClient,
  wsClient,
  conversation,
  currentUser,
  theme,
  t,
  onToggleLanguage,
  onToggleTheme,
  onLogout
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typedMessage, setTypedMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const allMessages = await apiClient.get<Message[]>('/user/messages');
        setMessages(allMessages.filter((message) => message.conversationId === conversation.id).reverse());
      } catch (error) {
        console.error(error);
      }
    };

    void loadMessages();
    const cleanupMessageCreated = wsClient.onMessageCreated((message: Message) => {
      if (message.conversationId === conversation.id) {
        setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      }
    });
    const cleanupMessageEdited = wsClient.onMessageEdited((edited: Message) => {
      if (edited.conversationId === conversation.id) {
        setMessages((current) => current.map((message) => message.id === edited.id
          ? { ...message, body: edited.body, editedAt: edited.editedAt }
          : message));
      }
    });
    const cleanupMessageDeleted = wsClient.onMessageDeleted((deleted: Message) => {
      if (deleted.conversationId === conversation.id) {
        setMessages((current) => current.map((message) => message.id === deleted.id
          ? { ...message, deletedAt: deleted.deletedAt, body: t('user.chat.deleted') }
          : message));
      }
    });
    const cleanupPresence = wsClient.onPresenceUpdated((status: { typing?: boolean; userId?: string }) => {
      if (status.userId && status.userId !== currentUser.id) {
        setTypingUsers((current) => ({ ...current, [status.userId!]: Boolean(status.typing) }));
      }
    });

    return () => {
      setTypingUsers({});
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      cleanupMessageCreated();
      cleanupMessageEdited();
      cleanupMessageDeleted();
      cleanupPresence();
    };
  }, [apiClient, conversation.id, currentUser.id, wsClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [messages, reducedMotion]);

  const handleSendMessage = (event: FormEvent) => {
    event.preventDefault();
    const body = typedMessage.trim();
    if (!body) return;

    wsClient.sendMessage(conversation.id, body);
    setTypedMessage('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    wsClient.sendTyping(conversation.id, false);
  };

  const handleKeyDown = () => {
    wsClient.sendTyping(conversation.id, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      wsClient.sendTyping(conversation.id, false);
    }, 2000);
  };

  const handleAttachmentClick = async (attachmentId: string) => {
    try {
      const data = await apiClient.get<{ url: string }>(`/attachments/${attachmentId}/signed-url`);
      window.open(data.url, '_blank');
    } catch {
      alert(t('user.chat.mediaLinkFailed'));
    }
  };

  const handleUploadComplete = (attachment: Attachment) => {
    wsClient.sendMessage(
      conversation.id,
      `${t('user.chat.uploadedFile')}: ${attachment.fileName} (${(attachment.byteSize / 1024).toFixed(1)} KB)`,
      [attachment.id]
    );
    setShowUploadPanel(false);
  };

  const activeTypingMembers = Object.keys(typingUsers)
    .filter((id) => typingUsers[id])
    .map((id) => id === conversation.peer.id
      ? conversation.peer.username
      : `${t('common.user')} (${id.substring(0, 5)})`);

  return (
    <section className="chat-window glass-panel" aria-label={conversation.peer.username}>
      <header className="chat-header">
        <div className="chat-heading">
          <h1>{conversation.peer.username}</h1>
          <span>{t('user.chat.channelActive')}</span>
        </div>
        <UtilityControls
          theme={theme}
          t={t}
          onToggleLanguage={onToggleLanguage}
          onToggleTheme={onToggleTheme}
          onLogout={onLogout}
        />
      </header>

      <div className="chat-body">
        <div className="chat-messages" aria-live="polite">
          {messages.map((message) => {
            const isMe = message.senderId === currentUser.id;
            const senderLabel = isMe
              ? currentUser.username
              : message.senderId === conversation.peer.id
                ? conversation.peer.username
                : `${t('common.user')} (${message.senderId.substring(0, 5)})`;

            return (
              <motion.article
                key={message.id}
                className={`message-node ${isMe ? 'me' : 'other'}`}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: isMe ? 12 : -12 }}
                animate={reducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                transition={{ duration: reducedMotion ? 0.1 : 0.18 }}
              >
                {!isMe && <div className="message-sender">{senderLabel}</div>}
                <div className="message-body">
                  {message.deletedAt
                    ? <span className="deleted-message">{t('user.chat.deleted')}</span>
                    : message.body}
                </div>

                {message.attachments && message.attachments.length > 0 && !message.deletedAt && (
                  <div className="message-attachments">
                    {message.attachments.map((attachment) => (
                      <button
                        type="button"
                        key={attachment.id}
                        className="attachment-link"
                        onClick={() => handleAttachmentClick(attachment.id)}
                      >
                        <u>{attachment.fileName}</u> ({(attachment.byteSize / 1024).toFixed(1)} KB)
                      </button>
                    ))}
                  </div>
                )}

                <div className="message-time">
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {message.editedAt && !message.deletedAt && (
                    <span className="edited-label">{t('user.chat.edited')}</span>
                  )}
                </div>
              </motion.article>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {activeTypingMembers.length > 0 && (
          <div className="typing-region">
            <div className="typing-indicator">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
              <span>{activeTypingMembers.join(', ')} {t('user.chat.isTyping')}</span>
            </div>
          </div>
        )}
      </div>

      <footer className="chat-footer">
        <form onSubmit={handleSendMessage} className="composer-form">
          <button
            type="button"
            className="icon-button composer-attachment"
            aria-label={t('user.chat.shareFile')}
            title={t('user.chat.shareFile')}
            onClick={() => setShowUploadPanel(true)}
          >
            <Paperclip aria-hidden="true" size={20} />
          </button>
          <input
            type="text"
            className="input-field composer-input"
            placeholder={t('user.chat.placeholder')}
            value={typedMessage}
            onChange={(event) => setTypedMessage(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button type="submit" className="btn btn-primary composer-send">
            {t('user.chat.send')}
          </button>
        </form>
      </footer>

      {showUploadPanel && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel upload-modal">
            <div className="modal-header">
              <h2>{t('user.chat.uploadTitle')}</h2>
              <button
                type="button"
                className="modal-close"
                aria-label={t('common.close')}
                onClick={() => setShowUploadPanel(false)}
              >
                &times;
              </button>
            </div>
            <AttachmentUpload
              apiClient={apiClient}
              conversationId={conversation.id}
              onComplete={handleUploadComplete}
              t={t}
            />
          </div>
        </div>
      )}
    </section>
  );
}
