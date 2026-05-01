export enum TicketStatus {
  New = 0,
  Open = 1,
  InProgress = 2,
  Resolved = 3,
  Closed = 4,
}

export enum TicketType {
  Bug = 0,
  Feature = 1,
  Question = 2,
  Other = 3,
}

export enum SlaStatus { OnTime = 0, AtRisk = 1, Breached = 2 }

export interface Ticket {
  id: string;
  number: number;
  projectId: string;
  projectName?: string;
  submittedById: string;
  submittedByName: string;
  subject: string;
  description?: string;
  type: TicketType;
  priority: number;
  status: TicketStatus;
  assignedToId?: string;
  assignedToName?: string;
  convertedToTaskId?: string;
  createdAt: string;
  updatedAt?: string;
  slaStatus: SlaStatus;
  responseDeadlineUtc: string;
  resolutionDeadlineUtc: string;
  slaHoursRemaining: number;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  content: string;
  isFromCustomer: boolean;
  createdAt: string;
}

export interface SubmitTicketRequest {
  subject: string;
  description?: string;
  type: TicketType;
  priority: number;
}

export interface UpdateTicketStatusRequest {
  status: TicketStatus;
  assignedToId?: string;
}

export interface Invite {
  id: string;
  projectId: string;
  projectName?: string;
  token: string;
  expiresAt: string;
  isRevoked: boolean;
  createdAt: string;
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.New]: 'New',
  [TicketStatus.Open]: 'Open',
  [TicketStatus.InProgress]: 'In Progress',
  [TicketStatus.Resolved]: 'Resolved',
  [TicketStatus.Closed]: 'Closed',
};

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  [TicketType.Bug]: 'Bug',
  [TicketType.Feature]: 'Feature Request',
  [TicketType.Question]: 'Question',
  [TicketType.Other]: 'Other',
};
