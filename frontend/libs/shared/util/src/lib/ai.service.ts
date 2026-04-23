import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './environment';

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly base = `${environment.apiUrl}/ai`;

  constructor(private http: HttpClient) {}

  ask(question: string, projectId?: string): Observable<string> {
    return this.http.post(`${this.base}/ask`, { question, projectId }, { responseType: 'text' });
  }
}
