import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@pm/shared/util';
import {
  StandupSettings, UpdateStandupSettingsRequest,
  StandupReport, StandupReportSummary,
} from '@pm/shared/models';

@Injectable({ providedIn: 'root' })
export class UpdatesService {
  private http = inject(HttpClient);
  private base(projectId: string) {
    return `${environment.apiUrl}/projects/${projectId}/standup`;
  }

  getSettings(projectId: string) {
    return this.http.get<StandupSettings>(`${this.base(projectId)}/settings`);
  }

  updateSettings(projectId: string, request: UpdateStandupSettingsRequest) {
    return this.http.put<StandupSettings>(`${this.base(projectId)}/settings`, request);
  }

  generate(projectId: string) {
    return this.http.post<StandupReport>(`${this.base(projectId)}/generate`, {});
  }

  getReports(projectId: string) {
    return this.http.get<StandupReportSummary[]>(`${this.base(projectId)}/reports`);
  }

  getReport(projectId: string, reportId: string) {
    return this.http.get<StandupReport>(`${this.base(projectId)}/reports/${reportId}`);
  }
}
