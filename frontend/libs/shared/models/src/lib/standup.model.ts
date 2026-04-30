export interface UpdatesTimeLog {
  taskTitle: string;
  hours: number;
  description?: string;
}

export interface UpdatesActivity {
  action: string;
  entityType: string;
  entityName: string;
  createdAt: string;
}

export interface UpdatesFeedMember {
  userId: string;
  name: string;
  timeLogs: UpdatesTimeLog[];
  activity: UpdatesActivity[];
}

export interface UpdatesFeedDay {
  date: string;
  members: UpdatesFeedMember[];
}
