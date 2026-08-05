export type UserIdentity = {
  id: string;
  username: string;
  role: 'MASTER' | 'USER';
  status: 'ACTIVE' | 'DISABLED';
  permissions: string[];
};

export type DirectConversation = {
  id: string;
  title: null;
  createdAt: string;
  updatedAt: string;
  peer: { id: string; username: string };
};
