import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Message, SendMessageRequest } from '@pm/shared/models';
import { environment } from '@pm/shared/util';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private base(teamId: string) {
    return `${environment.apiUrl}/teams/${teamId}/messages`;
  }

  constructor(private http: HttpClient) {}

  getByTeam(teamId: string) {
    return this.http.get<Message[]>(this.base(teamId));
  }

  send(teamId: string, request: SendMessageRequest) {
    return this.http.post<Message>(this.base(teamId), request);
  }
}
