import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@pm/shared/util';

export interface CalendarEvent {
  id: string;
  type: 'Task' | 'Sprint';
  title: string;
  start: string;
  end: string;
  projectId: string;
  projectName: string;
  color: string;
  priority: string | null;
  isCompleted: boolean;
}

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private readonly base = `${environment.apiUrl}/calendar`;

  constructor(private http: HttpClient) {}

  getEvents(start: string, end: string) {
    return this.http.get<CalendarEvent[]>(this.base, { params: { start, end } });
  }
}
