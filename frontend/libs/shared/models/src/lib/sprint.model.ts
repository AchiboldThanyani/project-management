export interface Sprint {
  id: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isCompleted: boolean;
  retroNotes?: string;
  carryOverCount: number;
  projectId: string;
  createdAt: string;
}

export interface CreateSprintRequest {
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
}

export interface UpdateSprintRequest {
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
}
