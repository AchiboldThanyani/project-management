export enum TaskStatus {
  Todo = 0,
  InProgress = 1,
  InReview = 2,
  Done = 3,
  Blocked = 4,
  Cancelled = 5,
}

export enum TaskPriority {
  Low = 0,
  Medium = 1,
  High = 2,
  Critical = 3,
}

export interface SubTask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  order: number;
  createdAt: string;
}

export interface TimeLog {
  id: string;
  taskId: string;
  userId: string;
  userName?: string;
  hours: number;
  description?: string;
  loggedDate: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedById: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  storyPoints?: number;
  estimatedHours?: number;
  totalLoggedHours: number;
  projectId: string;
  sprintId?: string;
  assigneeId?: string;
  assigneeName?: string;
  reporterId: string;
  createdAt: string;
  updatedAt?: string;
  labels: { id: string; name: string; color: string }[];
  subTasks: SubTask[];
  timeLogs: TimeLog[];
  attachments: TaskAttachment[];
  blockedBy: TaskRef[];
  blocking: TaskRef[];
  isBlocked: boolean;
}

export interface TaskRef {
  dependencyId: string;
  id: string;
  title: string;
  status: TaskStatus;
  projectId: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string;
  storyPoints?: number;
  projectId: string;
  sprintId?: string;
  assigneeId?: string;
}

export interface UpdateTaskStatusRequest {
  status: TaskStatus;
}

export interface UpdateTaskRequest {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string;
  sprintId?: string;
  assigneeId?: string;
  storyPoints?: number;
  estimatedHours?: number;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.Todo]: 'To Do',
  [TaskStatus.InProgress]: 'In Progress',
  [TaskStatus.InReview]: 'In Review',
  [TaskStatus.Done]: 'Done',
  [TaskStatus.Blocked]: 'Blocked',
  [TaskStatus.Cancelled]: 'Cancelled',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  [TaskPriority.Low]: 'Low',
  [TaskPriority.Medium]: 'Medium',
  [TaskPriority.High]: 'High',
  [TaskPriority.Critical]: 'Critical',
};
