import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Comment, CreateCommentRequest } from '@pm/shared/models';
import { environment } from '@pm/shared/util';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private base(taskId: string) { return `${environment.apiUrl}/tasks/${taskId}/comments`; }

  constructor(private http: HttpClient) {}

  getByTask(taskId: string) {
    return this.http.get<Comment[]>(this.base(taskId));
  }

  create(taskId: string, request: CreateCommentRequest) {
    return this.http.post<Comment>(this.base(taskId), request);
  }

  delete(taskId: string, commentId: string) {
    return this.http.delete<void>(`${this.base(taskId)}/${commentId}`);
  }
}
