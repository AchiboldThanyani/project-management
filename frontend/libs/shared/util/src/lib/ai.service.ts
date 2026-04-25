import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './environment';

export interface ChatMessage { role: 'user' | 'assistant'; content: string; }
export interface AiResponse  { answer: string; suggestions: string[]; }

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly base = `${environment.apiUrl}/ai`;

  constructor(private http: HttpClient) {}

  ask(question: string, projectId?: string, history: ChatMessage[] = []): Observable<AiResponse> {
    return this.http.post<AiResponse>(this.base + '/ask', { question, projectId, history });
  }
}
