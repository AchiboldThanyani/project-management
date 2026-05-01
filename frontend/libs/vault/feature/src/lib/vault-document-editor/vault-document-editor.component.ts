import {
  Component, Input, Output, EventEmitter,
  OnDestroy, AfterViewInit, ElementRef, ViewChild, signal, inject, NgZone,
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
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { VaultDocumentDetail } from '@pm/shared/models';
import { VaultAiService } from '@pm/vault/data-access';

interface ActiveStates {
  bold: boolean; italic: boolean; underline: boolean; strike: boolean;
  h1: boolean; h2: boolean; h3: boolean;
  bulletList: boolean; orderedList: boolean; blockquote: boolean; codeBlock: boolean;
  link: boolean;
}

@Component({
  selector: 'pm-vault-document-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="editor-wrap">

      <!-- Title -->
      <div class="title-row">
        <input class="doc-title" [value]="titleValue" (input)="onTitleInput($event)"
               placeholder="Untitled document" [readonly]="readonly" />
      </div>

      <!-- Toolbar -->
      <div *ngIf="!readonly" class="toolbar">
        <div class="tb-group">
          <button class="tb-btn" (click)="cmd('undo')" title="Undo"><span class="material-icons-round">undo</span></button>
          <button class="tb-btn" (click)="cmd('redo')" title="Redo"><span class="material-icons-round">redo</span></button>
        </div>
        <span class="tb-sep"></span>
        <div class="tb-group">
          <button class="tb-btn" [class.active]="active().bold"        (click)="cmd('toggleBold')"        title="Bold">        <span class="material-icons-round">format_bold</span></button>
          <button class="tb-btn" [class.active]="active().italic"      (click)="cmd('toggleItalic')"      title="Italic">      <span class="material-icons-round">format_italic</span></button>
          <button class="tb-btn" [class.active]="active().underline"   (click)="cmd('toggleUnderline')"   title="Underline">   <span class="material-icons-round">format_underlined</span></button>
          <button class="tb-btn" [class.active]="active().strike"      (click)="cmd('toggleStrike')"      title="Strike">      <span class="material-icons-round">strikethrough_s</span></button>
        </div>
        <span class="tb-sep"></span>
        <div class="tb-group">
          <button class="tb-btn" [class.active]="active().h1" (click)="cmdH(1)" title="H1"><span class="material-icons-round">looks_one</span></button>
          <button class="tb-btn" [class.active]="active().h2" (click)="cmdH(2)" title="H2"><span class="material-icons-round">looks_two</span></button>
          <button class="tb-btn" [class.active]="active().h3" (click)="cmdH(3)" title="H3"><span class="material-icons-round">looks_3</span></button>
        </div>
        <span class="tb-sep"></span>
        <div class="tb-group">
          <button class="tb-btn" [class.active]="active().bulletList"  (click)="cmd('toggleBulletList')"  title="Bullet list"> <span class="material-icons-round">format_list_bulleted</span></button>
          <button class="tb-btn" [class.active]="active().orderedList" (click)="cmd('toggleOrderedList')" title="Num list">    <span class="material-icons-round">format_list_numbered</span></button>
          <button class="tb-btn" [class.active]="active().blockquote"  (click)="cmd('toggleBlockquote')"  title="Quote">       <span class="material-icons-round">format_quote</span></button>
        </div>
        <span class="tb-sep"></span>
        <div class="tb-group">
          <button class="tb-btn" [class.active]="active().codeBlock"   (click)="cmd('toggleCodeBlock')"   title="Code block">  <span class="material-icons-round">code</span></button>
          <button class="tb-btn"                                        (click)="insertHr()"               title="Divider">     <span class="material-icons-round">horizontal_rule</span></button>
        </div>
        <span class="tb-sep"></span>
        <div class="tb-group">
          <button class="tb-btn" [class.active]="active().link"        (click)="toggleLinkInput()"        title="Link">        <span class="material-icons-round">link</span></button>
          <button class="tb-btn"                                        (click)="insertTable()"            title="Table">       <span class="material-icons-round">table_chart</span></button>
          <button class="tb-btn"                                        (click)="insertImage()"            title="Image">       <span class="material-icons-round">image</span></button>
        </div>
      </div>

      <!-- Link bar -->
      <div *ngIf="showLinkInput()" class="link-bar">
        <span class="material-icons-round link-bar-icon">link</span>
        <input class="link-input" [(ngModel)]="linkUrl" placeholder="https://..."
               (keydown.enter)="applyLink()" (keydown.escape)="closeLinkInput()" />
        <button class="link-bar-btn apply"  (click)="applyLink()"  title="Apply">  <span class="material-icons-round">check</span></button>
        <button *ngIf="active().link" class="link-bar-btn remove" (click)="removeLink()" title="Remove"><span class="material-icons-round">link_off</span></button>
        <button class="link-bar-btn"        (click)="closeLinkInput()" title="Cancel"><span class="material-icons-round">close</span></button>
      </div>

      <!-- Editor -->
      <div #editorEl class="tiptap-content" [class.readonly]="readonly"></div>

      <!-- AI bar -->
      <div *ngIf="!readonly" class="ai-bar">
        <!-- Mode toggle -->
        <div class="ai-mode">
          <button class="ai-mode-btn" [class.active]="aiMode() === 'edit'"
                  (click)="setMode('edit')" title="Edit / write">
            <span class="material-icons-round">edit</span>
            <span class="mode-label">Edit</span>
          </button>
          <button class="ai-mode-btn" [class.active]="aiMode() === 'spec'"
                  (click)="setMode('spec')" title="Generate a spec">
            <span class="material-icons-round">auto_awesome</span>
            <span class="mode-label">Spec</span>
          </button>
        </div>

        <!-- Selection chip -->
        <div *ngIf="aiMode() === 'edit' && selectionWords() > 0" class="selection-chip">
          <span class="material-icons-round chip-icon">text_fields</span>
          {{ selectionWords() }}w selected
        </div>

        <!-- Input -->
        <input #aiInput class="ai-input"
               [(ngModel)]="aiPrompt"
               [placeholder]="aiPlaceholder()"
               (keydown.enter)="submitAi()"
               (keydown.escape)="aiPrompt = ''" />

        <!-- Send -->
        <button class="ai-send" [class.loading]="aiLoading()"
                [disabled]="aiLoading() || !aiPrompt.trim()"
                (click)="submitAi()" title="Send">
          <span class="material-icons-round">
            {{ aiLoading() ? 'hourglass_top' : 'send' }}
          </span>
        </button>
      </div>

      <!-- Footer -->
      <div class="editor-footer">
        <span class="word-count">{{ wordCount() }} words · {{ charCount() }} characters</span>
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }

    .editor-wrap { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }

    /* ── Title ── */
    .title-row { padding: 28px 48px 0; flex-shrink: 0; }
    .doc-title {
      width: 100%; border: none; outline: none;
      font-size: 28px; font-weight: 700; letter-spacing: -0.3px;
      background: transparent; color: var(--ink); padding: 0; line-height: 1.3;
    }
    .doc-title::placeholder { color: var(--soft); }

    /* ── Toolbar ── */
    .toolbar {
      display: flex; align-items: center; gap: 2px; flex-wrap: wrap;
      padding: 6px 48px; margin: 12px 0 0;
      border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
      background: var(--white); flex-shrink: 0; position: sticky; top: 0; z-index: 10;
    }
    .tb-group { display: flex; align-items: center; gap: 1px; }
    .tb-btn {
      width: 30px; height: 30px; border: none; background: transparent;
      border-radius: var(--r-sm); cursor: pointer; color: var(--ink-4);
      display: flex; align-items: center; justify-content: center; transition: background 0.1s, color 0.1s;
    }
    .tb-btn .material-icons-round { font-size: 18px; }
    .tb-btn:hover { background: var(--surface); color: var(--ink); }
    .tb-btn.active { background: var(--violet-mid); color: var(--violet); }
    .tb-sep { width: 1px; height: 18px; background: var(--border); margin: 0 4px; flex-shrink: 0; }

    /* ── Link bar ── */
    .link-bar {
      display: flex; align-items: center; gap: 6px; padding: 6px 48px;
      border-bottom: 1px solid var(--border); background: var(--surface); flex-shrink: 0;
    }
    .link-bar-icon { font-size: 16px; color: var(--muted); }
    .link-input {
      flex: 1; border: 1px solid var(--border); border-radius: var(--r-sm);
      padding: 4px 10px; font-size: 13px; background: var(--white); color: var(--ink); outline: none;
    }
    .link-input:focus { border-color: var(--violet); }
    .link-bar-btn {
      width: 28px; height: 28px; border: none; border-radius: var(--r-sm);
      background: transparent; cursor: pointer; color: var(--muted);
      display: flex; align-items: center; justify-content: center;
    }
    .link-bar-btn .material-icons-round { font-size: 16px; }
    .link-bar-btn:hover { background: var(--border); color: var(--ink); }
    .link-bar-btn.apply { color: var(--violet); }
    .link-bar-btn.apply:hover { background: var(--violet-mid); }
    .link-bar-btn.remove { color: #ef4444; }
    .link-bar-btn.remove:hover { background: #fef2f2; }

    /* ── Editor ── */
    .tiptap-content {
      flex: 1; overflow-y: auto; padding: 24px 48px;
      outline: none; font-size: 15px; line-height: 1.75; color: var(--ink);
    }
    .tiptap-content.readonly { cursor: default; }

    /* ── AI bar ── */
    .ai-bar {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 16px; border-top: 1px solid var(--border);
      background: var(--surface); flex-shrink: 0;
    }

    .ai-mode {
      display: flex; border: 1px solid var(--border); border-radius: var(--r-md);
      overflow: hidden; flex-shrink: 0;
    }
    .ai-mode-btn {
      display: flex; align-items: center; gap: 4px; padding: 5px 10px;
      border: none; background: transparent; cursor: pointer;
      font-size: 12px; font-weight: 500; color: var(--muted);
      transition: background 0.12s, color 0.12s;
    }
    .ai-mode-btn .material-icons-round { font-size: 14px; }
    .ai-mode-btn:hover { background: var(--border); color: var(--ink); }
    .ai-mode-btn.active { background: var(--violet); color: #fff; }
    .mode-label { white-space: nowrap; }

    .selection-chip {
      display: flex; align-items: center; gap: 4px; padding: 3px 8px;
      background: var(--violet-mid); color: var(--violet);
      border-radius: 99px; font-size: 11px; font-weight: 600; flex-shrink: 0;
    }
    .chip-icon { font-size: 13px; }

    .ai-input {
      flex: 1; border: 1px solid var(--border); border-radius: var(--r-md);
      padding: 7px 12px; font-size: 13px; background: var(--white); color: var(--ink);
      outline: none; transition: border-color 0.15s; font-family: inherit;
    }
    .ai-input:focus { border-color: var(--violet); }

    .ai-send {
      width: 32px; height: 32px; border: none; border-radius: var(--r-md);
      background: var(--violet); color: #fff; cursor: pointer; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      transition: opacity 0.15s;
    }
    .ai-send .material-icons-round { font-size: 16px; }
    .ai-send:hover:not(:disabled) { opacity: 0.85; }
    .ai-send:disabled { opacity: 0.45; cursor: not-allowed; }
    .ai-send.loading { opacity: 0.7; }

    /* ── Footer ── */
    .editor-footer { padding: 4px 48px; border-top: 1px solid var(--border); background: var(--white); flex-shrink: 0; }
    .word-count { font-size: 11px; color: var(--muted); }

    /* ── ProseMirror ── */
    :host ::ng-deep .tiptap-content .ProseMirror { outline: none; min-height: 300px; }
    :host ::ng-deep .tiptap-content p.is-editor-empty:first-child::before {
      content: attr(data-placeholder); color: var(--soft); pointer-events: none; float: left; height: 0;
    }
    :host ::ng-deep .tiptap-content h1 { font-size: 1.75em; font-weight: 700; letter-spacing: -0.3px; margin: 1.4em 0 0.4em; line-height: 1.25; }
    :host ::ng-deep .tiptap-content h2 { font-size: 1.35em; font-weight: 700; letter-spacing: -0.2px; margin: 1.2em 0 0.35em; line-height: 1.3; }
    :host ::ng-deep .tiptap-content h3 { font-size: 1.1em; font-weight: 600; margin: 1em 0 0.3em; line-height: 1.4; }
    :host ::ng-deep .tiptap-content p { margin: 0.25em 0; }
    :host ::ng-deep .tiptap-content a { color: var(--violet); text-decoration: underline; cursor: pointer; }
    :host ::ng-deep .tiptap-content a:hover { opacity: 0.8; }
    :host ::ng-deep .tiptap-content ul, :host ::ng-deep .tiptap-content ol { padding-left: 1.5em; margin: 0.5em 0; }
    :host ::ng-deep .tiptap-content li { margin: 0.2em 0; }
    :host ::ng-deep .tiptap-content li > p { margin: 0; }
    :host ::ng-deep .tiptap-content blockquote { border-left: 3px solid var(--violet); margin: 1em 0; padding: 4px 0 4px 16px; color: var(--ink-4); font-style: italic; }
    :host ::ng-deep .tiptap-content code { background: var(--surface); color: #c026d3; padding: 2px 6px; border-radius: 4px; font-size: 0.875em; font-family: 'Fira Code', 'Cascadia Code', monospace; }
    :host ::ng-deep .tiptap-content pre { background: #1e1e2e; color: #cdd6f4; padding: 16px 20px; border-radius: var(--r-lg); margin: 1em 0; overflow-x: auto; line-height: 1.6; }
    :host ::ng-deep .tiptap-content pre code { background: none; color: inherit; padding: 0; font-size: 13px; font-family: 'Fira Code', 'Cascadia Code', monospace; }
    :host ::ng-deep .tiptap-content hr { border: none; border-top: 1px solid var(--border); margin: 1.5em 0; }
    :host ::ng-deep .tiptap-content table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 14px; }
    :host ::ng-deep .tiptap-content th, :host ::ng-deep .tiptap-content td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
    :host ::ng-deep .tiptap-content th { background: var(--surface); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-4); }
    :host ::ng-deep .tiptap-content td { vertical-align: top; }
    :host ::ng-deep .tiptap-content .selectedCell { background: var(--violet-mid); }
    :host ::ng-deep .tiptap-content img { max-width: 100%; border-radius: var(--r-lg); margin: 1em 0; display: block; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    :host ::ng-deep .tiptap-content ::selection { background: var(--violet-mid); }
  `],
})
export class VaultDocumentEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorEl', { static: true }) editorEl!: ElementRef<HTMLDivElement>;

  @Input({ required: true }) document!: VaultDocumentDetail;
  @Input() readonly = false;
  @Output() save = new EventEmitter<{ title: string; contentJson: string }>();
  @Output() saveStatusChange = new EventEmitter<'idle' | 'saving' | 'saved' | 'error'>();

  private vaultAi = inject(VaultAiService);
  private zone    = inject(NgZone);

  titleValue  = '';
  linkUrl     = '';
  aiPrompt    = '';

  showLinkInput  = signal(false);
  aiMode         = signal<'edit' | 'spec'>('edit');
  aiLoading      = signal(false);
  selectionWords = signal(0);
  wordCount      = signal(0);
  charCount      = signal(0);
  active         = signal<ActiveStates>({
    bold: false, italic: false, underline: false, strike: false,
    h1: false, h2: false, h3: false,
    bulletList: false, orderedList: false, blockquote: false, codeBlock: false,
    link: false,
  });

  aiPlaceholder = () => this.aiMode() === 'spec'
    ? 'Describe what to spec out…'
    : this.selectionWords() > 0
      ? 'Improve, shorten, rewrite, change tone…'
      : 'Ask AI to write, add, or edit content…';

  private editor: Editor | null = null;
  private save$ = new Subject<void>();
  private saveSub = this.save$.pipe(debounceTime(2000)).subscribe(() => this.emitSave());
  private selFrom = 0;
  private selTo   = 0;

  ngAfterViewInit(): void {
    this.titleValue = this.document.title;
    this.editor = new Editor({
      element: this.editorEl.nativeElement,
      extensions: [
        StarterKit,
        Underline,
        Link.configure({ openOnClick: false }),
        Placeholder.configure({ placeholder: 'Start writing…' }),
        CharacterCount,
        Table.configure({ resizable: false }),
        TableRow, TableHeader, TableCell,
        Image,
      ],
      content: (() => {
        try { return this.document.contentJson ? JSON.parse(this.document.contentJson) : ''; }
        catch { return ''; }
      })(),
      editable: !this.readonly,
      onUpdate:         () => { this.refreshState(); if (!this.readonly) { this.saveStatusChange.emit('saving'); this.save$.next(); } },
      onSelectionUpdate: () => this.refreshState(),
    });
    this.refreshState();
  }

  private refreshState(): void {
    if (!this.editor) return;
    this.zone.run(() => {
      this.active.set({
        bold:        this.editor!.isActive('bold'),
        italic:      this.editor!.isActive('italic'),
        underline:   this.editor!.isActive('underline'),
        strike:      this.editor!.isActive('strike'),
        h1:          this.editor!.isActive('heading', { level: 1 }),
        h2:          this.editor!.isActive('heading', { level: 2 }),
        h3:          this.editor!.isActive('heading', { level: 3 }),
        bulletList:  this.editor!.isActive('bulletList'),
        orderedList: this.editor!.isActive('orderedList'),
        blockquote:  this.editor!.isActive('blockquote'),
        codeBlock:   this.editor!.isActive('codeBlock'),
        link:        this.editor!.isActive('link'),
      });
      const { from, to } = this.editor!.state.selection;
      this.selFrom = from; this.selTo = to;
      if (from !== to) {
        const text = this.editor!.state.doc.textBetween(from, to, ' ');
        this.selectionWords.set(text.trim().split(/\s+/).filter(w => w).length);
      } else {
        this.selectionWords.set(0);
      }
      const cc = (this.editor!.storage as any)['characterCount'];
      if (cc) { this.wordCount.set(cc.words?.() ?? 0); this.charCount.set(cc.characters?.() ?? 0); }
    });
  }

  setMode(mode: 'edit' | 'spec'): void { this.aiMode.set(mode); }

  submitAi(): void {
    if (!this.aiPrompt.trim() || this.aiLoading()) return;
    this.aiLoading.set(true);
    const prompt = this.aiPrompt;
    this.aiPrompt = '';

    if (this.aiMode() === 'spec') {
      this.vaultAi.generateSpec(prompt, this.document.projectId).subscribe({
        next: html  => this.insertHtml(html),
        error: ()   => this.aiLoading.set(false),
      });
    } else if (this.selectionWords() > 0) {
      const text = this.editor!.state.doc.textBetween(this.selFrom, this.selTo, ' ');
      const from = this.selFrom, to = this.selTo;
      this.vaultAi.editSelection(text, prompt).subscribe({
        next: result => {
          this.editor?.chain().focus().setTextSelection({ from, to }).insertContent(result).run();
          this.aiLoading.set(false);
          this.triggerSave();
        },
        error: () => this.aiLoading.set(false),
      });
    } else {
      this.vaultAi.documentCommand(prompt, this.document.projectId).subscribe({
        next: html  => this.insertHtml(html),
        error: ()   => this.aiLoading.set(false),
      });
    }
  }

  private insertHtml(html: string): void {
    this.editor?.chain().focus().insertContent(html).run();
    this.aiLoading.set(false);
    this.triggerSave();
  }

  private triggerSave(): void { this.saveStatusChange.emit('saving'); this.save$.next(); }

  // ── Toolbar ─────────────────────────────────────────────────────
  cmd(command: string): void { (this.editor?.chain().focus() as any)[command]?.().run(); }
  cmdH(level: 1 | 2 | 3): void { this.editor?.chain().focus().toggleHeading({ level }).run(); }
  insertHr(): void { this.editor?.chain().focus().setHorizontalRule().run(); }
  insertTable(): void { this.editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); }
  insertImage(): void { const src = prompt('Image URL:'); if (src) this.editor?.chain().focus().setImage({ src }).run(); }

  toggleLinkInput(): void {
    this.linkUrl = this.active().link ? (this.editor?.getAttributes('link')?.['href'] ?? '') : '';
    this.showLinkInput.update(v => !v);
  }
  applyLink(): void {
    if (this.linkUrl.trim()) {
      const href = this.linkUrl.trim().startsWith('http') ? this.linkUrl.trim() : `https://${this.linkUrl.trim()}`;
      this.editor?.chain().focus().setLink({ href }).run();
    }
    this.closeLinkInput();
  }
  removeLink(): void { this.editor?.chain().focus().unsetLink().run(); this.closeLinkInput(); }
  closeLinkInput(): void { this.showLinkInput.set(false); this.linkUrl = ''; }

  onTitleInput(event: Event): void {
    this.titleValue = (event.target as HTMLInputElement).value;
    if (!this.readonly) { this.saveStatusChange.emit('saving'); this.save$.next(); }
  }

  private emitSave(): void {
    const contentJson = JSON.stringify(this.editor?.getJSON() ?? {});
    this.save.emit({ title: this.titleValue, contentJson });
    this.saveStatusChange.emit('saved');
  }

  ngOnDestroy(): void { this.saveSub.unsubscribe(); this.editor?.destroy(); }
}
