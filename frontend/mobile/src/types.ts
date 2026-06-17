export type UserIdentity = {
  id: string;
  username: string;
  role: 'MASTER' | 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'DISABLED';
  permissions: string[];
};

export type Conversation = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  members: { id: string; userId: string; conversationId: string }[];
};

export type Message = {
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
