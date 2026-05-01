import { TaskPriority } from './task.model';

export enum IssueType {
  Bug = 'Bug',
  Feature = 'Feature',
  Question = 'Question',
  Chore = 'Chore',
}

export enum IssueStatus {
  Open = 'Open',
  InProgress = 'InProgress',
  Closed = 'Closed',
}

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  [IssueType.Bug]:     'Bug',
  [IssueType.Feature]: 'Feature',
  [IssueType.Question]:'Question',
  [IssueType.Chore]:   'Chore',
};

export const ISSUE_TYPE_ICONS: Record<IssueType, string> = {
  [IssueType.Bug]:      'bug_report',
  [IssueType.Feature]:  'auto_awesome',
  [IssueType.Question]: 'help_outline',
  [IssueType.Chore]:    'build',
};

export const ISSUE_TYPE_COLORS: Record<IssueType, string> = {
  [IssueType.Bug]:      'rose',
  [IssueType.Feature]:  'violet',
  [IssueType.Question]: 'blue',
  [IssueType.Chore]:    'amber',
};

export interface Issue {
  id: string;
  number: number;
  title: string;
  description?: string;
  type: IssueType;
  status: IssueStatus;
  priority: TaskPriority;
  projectId: string;
  reporterId: string;
  reporterName?: string;
  assigneeId?: string;
  assigneeName?: string;
  convertedToTaskId?: string;
  commentCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface IssueComment {
  id: string;
  content: string;
  authorId: string;
  authorName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateIssueRequest {
  title: string;
  description?: string;
  type: IssueType;
  priority: TaskPriority;
  projectId: string;
  assigneeId?: string;
}

export interface UpdateIssueRequest {
  title: string;
  description?: string;
  type: IssueType;
  priority: TaskPriority;
  assigneeId?: string;
}
