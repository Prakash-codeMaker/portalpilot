export type NotificationEvent = {
  type: string;
  title: string;
  message: string;
  applicationId?: string;
  runId?: string;
};

export interface NotificationProvider {
  send(event: NotificationEvent): Promise<void>;
}

export class InAppNotificationProvider implements NotificationProvider {
  constructor(private readonly persist: (event: NotificationEvent) => Promise<void>) {}
  async send(event: NotificationEvent) { await this.persist(event); }
}
