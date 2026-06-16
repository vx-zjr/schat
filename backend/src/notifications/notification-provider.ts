export interface NotificationProvider {
  send(userId: string, event: string, payload: unknown): Promise<void>;
}

