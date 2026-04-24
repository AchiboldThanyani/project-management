export interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  relatedEntityId?: string;
  isRead: boolean;
  createdAt: string;
}

export enum NotificationType {
  TaskAssigned = 0,
  TaskBlocked = 1,
  TaskOverdue = 2,
  TicketReplied = 3,
  SlaBreached = 4,
}
