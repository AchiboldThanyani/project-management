import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@pm/shared/util';

@Injectable({ providedIn: 'root' })
export class TaskDependencyService {
  private readonly base = `${environment.apiUrl}/tasks`;

  constructor(private http: HttpClient) {}

  /** Make blockingTaskId block blockedTaskId */
  add(blockingTaskId: string, blockedTaskId: string) {
    return this.http.post<void>(`${this.base}/${blockingTaskId}/blocks/${blockedTaskId}`, {});
  }

  remove(dependencyId: string) {
    return this.http.delete<void>(`${this.base}/dependencies/${dependencyId}`);
  }
}
