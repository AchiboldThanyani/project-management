export interface Activity {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName: string;
  createdAt: string;
}
