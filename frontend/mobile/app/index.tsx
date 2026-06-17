import * as DocumentPicker from 'expo-document-picker';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SchatMobileApiClient } from '../src/api';
import { deleteNativePush, registerNativePush } from '../src/notifications';
import { preventScreenCapture } from '../src/screen-capture';
import { Conversation, Message, UserIdentity } from '../src/types';
import { SchatMobileWsClient } from '../src/ws';

const defaultApiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3000';

export default function Index() {
  const [apiUrl, setApiUrl] = useState(defaultApiUrl);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [pushSubscriptionId, setPushSubscriptionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const apiClient = useMemo(() => new SchatMobileApiClient(apiUrl.replace(/\/$/, '')), [apiUrl]);
  const wsClientRef = useRef<SchatMobileWsClient | null>(null);

  useEffect(() => {
    preventScreenCapture().catch(() => undefined);
    return () => wsClientRef.current?.disconnect();
  }, []);

  useEffect(() => {
    if (!activeConversation || !wsClientRef.current) {
      return;
    }

    wsClientRef.current.joinConversation(activeConversation.id);
    loadMessages(activeConversation.id);
    const cleanup = wsClientRef.current.onMessageCreated((message) => {
      if (message.conversationId === activeConversation.id) {
        setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      }
    });

    return () => {
      cleanup();
      wsClientRef.current?.leaveConversation(activeConversation.id);
    };
  }, [activeConversation?.id]);

  async function handleLogin() {
    setBusy(true);
    setError(null);
    try {
      const tokens = await apiClient.login(username.trim(), password);
      const profile = await apiClient.get<UserIdentity>('/auth/me');
      const rooms = await apiClient.get<Conversation[]>('/user/conversations');
      const ws = new SchatMobileWsClient(apiUrl.replace(/\/$/, ''));
      ws.connect(tokens.accessToken);
      ws.onUserBanned((data) => {
        if (data.userId === profile.id) {
          Alert.alert('Access revoked', 'Your account has been banned.');
          handleLocalLogout();
        }
      });
      wsClientRef.current = ws;
      setUser(profile);
      setConversations(rooms);
      registerNativePush(apiClient).then(setPushSubscriptionId).catch(() => undefined);
    } catch (loginError: any) {
      setError(loginError.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  async function loadMessages(conversationId: string) {
    const allMessages = await apiClient.get<Message[]>('/user/messages');
    setMessages(allMessages.filter((message) => message.conversationId === conversationId).reverse());
  }

  async function handleSend() {
    if (!draft.trim() || !activeConversation) {
      return;
    }
    wsClientRef.current?.sendMessage(activeConversation.id, draft.trim());
    setDraft('');
  }

  async function handleAttachment() {
    if (!activeConversation) {
      return;
    }

    const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (picked.canceled || !picked.assets[0]) {
      return;
    }

    const file = picked.assets[0];
    const intent = await apiClient.post<{
      id: string;
      uploadUrl: string;
      fileName: string;
      byteSize: number;
      uploadHeaders?: Record<string, string>;
    }>('/attachments/upload-intent', {
      conversationId: activeConversation.id,
      fileName: file.name,
      contentType: file.mimeType || 'application/octet-stream',
      byteSize: file.size || 0
    });
    const blob = await fetch(file.uri).then((response) => response.blob());
    await fetch(intent.uploadUrl, {
      method: 'PUT',
      headers: intent.uploadHeaders || { 'Content-Type': file.mimeType || 'application/octet-stream', 'Cache-Control': 'no-store' },
      body: blob
    });
    wsClientRef.current?.sendMessage(activeConversation.id, `Uploaded file: ${intent.fileName} (${Math.round(intent.byteSize / 1024)} KB)`, [intent.id]);
  }

  async function handleOpenAttachment(attachmentId: string) {
    const signed = await apiClient.get<{ url: string }>(`/attachments/${attachmentId}/signed-url`);
    await Linking.openURL(signed.url);
  }

  async function handleVoiceToken() {
    if (!activeConversation) {
      return;
    }
    const token = await apiClient.post<{ token: string }>('/voice/token', {
      room: activeConversation.id
    });
    Alert.alert('Voice token issued', token.token.slice(0, 32));
  }

  async function handleLogout() {
    await deleteNativePush(apiClient, pushSubscriptionId).catch(() => undefined);
    const refreshToken = apiClient.getRefreshToken();
    if (refreshToken) {
      await apiClient.post('/auth/logout', { refreshToken }).catch(() => undefined);
    }
    handleLocalLogout();
  }

  function handleLocalLogout() {
    wsClientRef.current?.disconnect();
    wsClientRef.current = null;
    apiClient.clearTokens();
    setUser(null);
    setConversations([]);
    setActiveConversation(null);
    setMessages([]);
    setDraft('');
    setPushSubscriptionId(null);
  }

  if (!user) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, gap: 14 }}>
        <StatusBar style="auto" />
        <Text selectable style={{ fontSize: 34, fontWeight: '800' }}>schat</Text>
        <Text selectable style={{ color: '#53606f' }}>Memory-only native client</Text>
        <TextInput style={styles.input} value={apiUrl} onChangeText={setApiUrl} autoCapitalize="none" placeholder="API URL" />
        <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="Username" />
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" />
        {error && <Text selectable style={{ color: '#b42318' }}>{error}</Text>}
        <Pressable style={styles.primaryButton} onPress={handleLogin} disabled={busy}>
          <Text style={styles.primaryButtonText}>{busy ? 'Connecting...' : 'Login'}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f7f8fa' }}>
      <StatusBar style="auto" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 12, gap: 10 }}>
        {conversations.map((conversation) => (
          <Pressable
            key={conversation.id}
            style={[styles.roomButton, activeConversation?.id === conversation.id && styles.roomButtonActive]}
            onPress={() => setActiveConversation(conversation)}
          >
            <Text selectable style={{ fontWeight: '700' }}>{conversation.title || 'Chat room'}</Text>
            <Text selectable style={{ color: '#64748b', fontSize: 12 }}>{conversation.members.length} members</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 14, gap: 10, flexGrow: 1 }}>
        {!activeConversation && <Text selectable style={{ color: '#64748b' }}>Select a conversation.</Text>}
        {messages.map((message) => (
          <View key={message.id} style={[styles.message, message.senderId === user.id && styles.messageMine]}>
            <Text selectable style={{ color: message.deletedAt ? '#94a3b8' : '#111827' }}>
              {message.deletedAt ? '[Message deleted]' : message.body}
            </Text>
            {message.attachments?.map((attachment) => (
              <Pressable key={attachment.id} onPress={() => handleOpenAttachment(attachment.id)}>
                <Text selectable style={{ color: '#0369a1', marginTop: 8 }}>{attachment.fileName}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>

      {activeConversation && (
        <View style={{ padding: 12, gap: 8, borderTopWidth: 1, borderColor: '#e5e7eb', backgroundColor: 'white' }}>
          <TextInput style={styles.input} value={draft} onChangeText={setDraft} placeholder="Type a message" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={styles.secondaryButton} onPress={handleAttachment}>
              <Text>Attach</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={handleVoiceToken}>
              <Text>Voice</Text>
            </Pressable>
            <Pressable style={[styles.primaryButton, { flex: 1 }]} onPress={handleSend}>
              <Text style={styles.primaryButtonText}>Send</Text>
            </Pressable>
          </View>
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={{ color: '#b42318', textAlign: 'center', fontWeight: '700' }}>Logout</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = {
  input: {
    borderWidth: 1,
    borderColor: '#d0d5dd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white'
  },
  primaryButton: {
    backgroundColor: '#155eef',
    borderRadius: 8,
    padding: 13,
    alignItems: 'center' as const
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '700' as const
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#d0d5dd',
    borderRadius: 8,
    padding: 13,
    backgroundColor: 'white'
  },
  logoutButton: {
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fef3f2'
  },
  roomButton: {
    width: 180,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white'
  },
  roomButtonActive: {
    borderColor: '#155eef',
    backgroundColor: '#eff4ff'
  },
  message: {
    maxWidth: '85%' as const,
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  messageMine: {
    alignSelf: 'flex-end' as const,
    backgroundColor: '#dbeafe'
  }
};
