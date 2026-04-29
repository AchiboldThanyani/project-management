export interface StandupSettings {
  projectId: string;
  isEnabled: boolean;
  scheduledTime: string; // "HH:mm"
}

export interface UpdateStandupSettingsRequest {
  isEnabled: boolean;
  scheduledTime: string;
}

export interface StandupMemberSummary {
  userId: string;
  name: string;
  summary: string;
}

export interface StandupReport {
  id: string;
  projectId: string;
  generatedAt: string;
  isScheduled: boolean;
  generatedById?: string;
  members: StandupMemberSummary[];
}

export interface StandupReportSummary {
  id: string;
  generatedAt: string;
  isScheduled: boolean;
}
