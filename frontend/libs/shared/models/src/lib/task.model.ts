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

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  storyPoints?: number;
  projectId: string;
  sprintId?: string;
  assigneeId?: string;
  assigneeName?: string;
  reporterId: string;
  createdAt: string;
  updatedAt?: string;
  labels: { id: string; name: string; color: string }[];
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
