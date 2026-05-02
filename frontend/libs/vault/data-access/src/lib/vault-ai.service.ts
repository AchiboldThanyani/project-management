import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@pm/shared/util';

@Injectable({ providedIn: 'root' })
export class VaultAiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/ai/vault`;

  generateSpec(brief: string, projectId: string): Observable<string> {
    return this.http.post<string>(this.base, {
      mode: 'spec',
      instruction: brief,
      projectId,
    });
  }

  editSelection(text: string, instruction: string): Observable<string> {
    return this.http.post<string>(this.base, {
      mode: 'edit',
      instruction,
      content: text,
    });
  }

  documentCommand(instruction: string, projectId: string): Observable<string> {
    return this.http.post<string>(this.base, {
      mode: 'command',
      instruction,
      projectId,
    });
  }
}
