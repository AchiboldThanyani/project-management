import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@pm/shared/util';
import { Invite } from '@pm/shared/models';

@Injectable({ providedIn: 'root' })
export class InviteService {
  private readonly base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  generate(projectId: string) {
    return this.http.post<Invite>(`${this.base}/projects/${projectId}/invites`, {});
  }

  getByProject(projectId: string) {
    return this.http.get<Invite[]>(`${this.base}/projects/${projectId}/invites`);
  }

  revoke(projectId: string, inviteId: string) {
    return this.http.delete<void>(`${this.base}/projects/${projectId}/invites/${inviteId}`);
  }

  getInfo(token: string) {
    return this.http.get<Invite>(`${this.base}/invites/${token}`);
  }
}
