import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Message, SendMessageRequest } from '@pm/shared/models';
import { environment } from '@pm/shared/util';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private base(projectId: string) {
    return `${environment.apiUrl}/projects/${projectId}/messages`;
  }

  constructor(private http: HttpClient) {}

  getByProject(projectId: string) {
    return this.http.get<Message[]>(this.base(projectId));
  }

  send(projectId: string, request: SendMessageRequest) {
    return this.http.post<Message>(this.base(projectId), request);
  }
}
