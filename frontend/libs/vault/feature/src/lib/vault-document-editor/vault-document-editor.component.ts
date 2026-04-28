import {
  Component, Input, Output, EventEmitter,
  OnDestroy, AfterViewInit, ElementRef, ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table';
import { TableHeader } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';
import { VaultDocumentDetail } from '@pm/shared/models';

@Component({
  selector: 'pm-vault-document-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="editor-wrap">
      <div class="editor-title-row">
        <input
          class="doc-title-input"
          [value]="titleValue"
          (input)="onTitleInput($event)"
          placeholder="Untitled document"
          [readonly]="readonly"
        />
      </div>

      <div *ngIf="!readonly" class="toolbar">
        <button class="tb-btn" (click)="cmd('toggleBold')" title="Bold"><b>B</b></button>
        <button class="tb-btn" (click)="cmd('toggleItalic')" title="Italic"><i>I</i></button>
        <button class="tb-btn" (click)="cmd('toggleStrike')" title="Strike"><s>S</s></button>
        <span class="tb-sep"></span>
        <button class="tb-btn" (click)="cmdH(1)" title="H1">H1</button>
        <button class="tb-btn" (click)="cmdH(2)" title="H2">H2</button>
        <button class="tb-btn" (click)="cmdH(3)" title="H3">H3</button>
        <span class="tb-sep"></span>
        <button class="tb-btn" (click)="cmd('toggleBulletList')" title="Bullet list">•</button>
        <button class="tb-btn" (click)="cmd('toggleOrderedList')" title="Numbered list">1.</button>
        <button class="tb-btn" (click)="cmd('toggleCodeBlock')" title="Code block">&lt;/&gt;</button>
        <span class="tb-sep"></span>
        <button class="tb-btn" (click)="insertTable()" title="Table">&#8862;</button>
        <button class="tb-btn" (click)="insertImage()" title="Image">Img</button>
      </div>

      <div #editorEl class="tiptap-content" [class.readonly]="readonly"></div>

      <div class="save-status" *ngIf="!readonly">
        <span *ngIf="saveStatus() === 'saving'">Saving...</span>
        <span *ngIf="saveStatus() === 'saved'">
          Saved - Last edited by {{ document.updatedByName || document.createdByName }}
        </span>
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }
    .editor-wrap { display: flex; flex-direction: column; flex: 1; min-height: 0; padding: 24px 32px; overflow-y: auto; }
    .editor-title-row { margin-bottom: 12px; }
    .doc-title-input {
      width: 100%; border: none; outline: none; font-size: 22px; font-weight: 700;
      background: transparent; color: var(--ink); padding: 4px 0;
    }
    .doc-title-input::placeholder { color: var(--soft); }
    .toolbar {
      display: flex; align-items: center; gap: 2px; flex-wrap: wrap;
      border: 1px solid var(--border); border-radius: var(--r-md);
      padding: 4px 8px; margin-bottom: 12px; background: var(--surface);
    }
    .tb-btn {
      padding: 4px 8px; border: none; background: transparent; border-radius: 4px;
      cursor: pointer; font-size: 13px; color: var(--ink-4); line-height: 1;
    }
    .tb-btn:hover { background: var(--violet-mid); color: var(--violet); }
    .tb-sep { width: 1px; height: 16px; background: var(--border); margin: 0 4px; }
    .tiptap-content { flex: 1; outline: none; font-size: 14px; line-height: 1.7; color: var(--ink); min-height: 200px; }
    .tiptap-content.readonly { cursor: default; }
    .save-status { font-size: 11px; color: var(--soft); margin-top: 8px; height: 16px; }
    :host ::ng-deep .tiptap-content h1 { font-size: 1.6em; font-weight: 700; margin: 16px 0 8px; }
    :host ::ng-deep .tiptap-content h2 { font-size: 1.3em; font-weight: 700; margin: 14px 0 6px; }
    :host ::ng-deep .tiptap-content h3 { font-size: 1.1em; font-weight: 600; margin: 12px 0 4px; }
    :host ::ng-deep .tiptap-content p { margin: 4px 0; }
    :host ::ng-deep .tiptap-content ul, :host ::ng-deep .tiptap-content ol { padding-left: 24px; margin: 4px 0; }
    :host ::ng-deep .tiptap-content code { background: var(--surface); padding: 2px 5px; border-radius: 4px; font-size: 12px; }
    :host ::ng-deep .tiptap-content pre { background: var(--surface); padding: 12px; border-radius: var(--r-md); margin: 8px 0; overflow-x: auto; }
    :host ::ng-deep .tiptap-content pre code { background: none; padding: 0; }
    :host ::ng-deep .tiptap-content blockquote { border-left: 3px solid var(--border); margin: 8px 0; padding-left: 12px; color: var(--muted); }
    :host ::ng-deep .tiptap-content table { border-collapse: collapse; width: 100%; margin: 8px 0; }
    :host ::ng-deep .tiptap-content th, :host ::ng-deep .tiptap-content td { border: 1px solid var(--border); padding: 6px 10px; font-size: 13px; }
    :host ::ng-deep .tiptap-content th { background: var(--surface); font-weight: 600; }
    :host ::ng-deep .tiptap-content img { max-width: 100%; border-radius: var(--r-md); margin: 8px 0; }
    :host ::ng-deep .tiptap-content .ProseMirror-focused { outline: none; }
  `],
})
export class VaultDocumentEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorEl', { static: true }) editorEl!: ElementRef<HTMLDivElement>;

  @Input({ required: true }) document!: VaultDocumentDetail;
  @Input() readonly = false;
  @Output() save = new EventEmitter<{ title: string; contentJson: string }>();

  saveStatus = signal<'idle' | 'saving' | 'saved'>('idle');
  titleValue = '';

  private editor: Editor | null = null;
  private save$ = new Subject<void>();
  private saveSub = this.save$.pipe(debounceTime(2000)).subscribe(() => this.emitSave());

  ngAfterViewInit(): void {
    this.titleValue = this.document.title;
    this.editor = new Editor({
      element: this.editorEl.nativeElement,
      extensions: [
        StarterKit,
        Table.configure({ resizable: false }),
        TableRow, TableHeader, TableCell,
        Image,
      ],
      content: (() => { try { return this.document.contentJson ? JSON.parse(this.document.contentJson) : ''; } catch { return ''; } })(),
      editable: !this.readonly,
      onUpdate: () => {
        if (!this.readonly) {
          this.saveStatus.set('saving');
          this.save$.next();
        }
      },
    });
  }

  onTitleInput(event: Event): void {
    this.titleValue = (event.target as HTMLInputElement).value;
    if (!this.readonly) {
      this.saveStatus.set('saving');
      this.save$.next();
    }
  }

  cmd(command: string): void {
    (this.editor?.chain().focus() as any)[command]?.().run();
  }

  cmdH(level: 1 | 2 | 3): void {
    this.editor?.chain().focus().toggleHeading({ level }).run();
  }

  insertTable(): void {
    this.editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  insertImage(): void {
    const src = prompt('Image URL:');
    if (src) this.editor?.chain().focus().setImage({ src }).run();
  }

  private emitSave(): void {
    const contentJson = JSON.stringify(this.editor?.getJSON() ?? {});
    this.save.emit({ title: this.titleValue, contentJson });
    this.saveStatus.set('saved');
  }

  ngOnDestroy(): void {
    this.saveSub.unsubscribe();
    this.editor?.destroy();
  }
}
