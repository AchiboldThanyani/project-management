import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'mention', pure: true, standalone: true })
export class MentionPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);

  transform(content: string | null | undefined): SafeHtml {
    if (!content) return '';
    const html = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/@\[([^\]]+)\]\([^)]+\)/g,
        '<span class="mention-badge">@$1</span>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
