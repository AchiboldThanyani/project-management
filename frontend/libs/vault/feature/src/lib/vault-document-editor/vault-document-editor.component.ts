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

const EDIT_ACTIONS = [
  { label: 'Improve',      icon: 'auto_fix_high',    instruction: 'Rewrite to be clearer, more professional, and more impactful' },
  { label: 'Shorten',      icon: 'compress',         instruction: 'Make more concise, removing unnecessary words while keeping all key information' },
  { label: 'Expand',       icon: 'expand_content',   instruction: 'Expand with more detail, context, and explanation while keeping the same tone' },
  { label: 'Fix grammar',  icon: 'spellcheck',       instruction: 'Fix all grammar, spelling, and punctuation errors' },
] as const;

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
          <button class="tb-btn" (click)="cmd('undo')" title="Undo">
            <span class="material-icons-round">undo</span>
          </button>
          <button class="tb-btn" (click)="cmd('redo')" title="Redo">
            <span class="material-icons-round">redo</span>
          </button>
        </div>
        <span class="tb-sep"></span>
        <div class="tb-group">
          <button class="tb-btn" [class.active]="active().bold"        (click)="cmd('toggleBold')"         title="Bold"><span class="material-icons-round">format_bold</span></button>
          <button class="tb-btn" [class.active]="active().italic"      (click)="cmd('toggleItalic')"       title="Italic"><span class="material-icons-round">format_italic</span></button>
          <button class="tb-btn" [class.active]="active().underline"   (click)="cmd('toggleUnderline')"    title="Underline"><span class="material-icons-round">format_underlined</span></button>
          <button class="tb-btn" [class.active]="active().strike"      (click)="cmd('toggleStrike')"       title="Strikethrough"><span class="material-icons-round">strikethrough_s</span></button>
        </div>
        <span class="tb-sep"></span>
        <div class="tb-group">
          <button class="tb-btn" [class.active]="active().h1" (click)="cmdH(1)" title="Heading 1"><span class="material-icons-round">looks_one</span></button>
          <button class="tb-btn" [class.active]="active().h2" (click)="cmdH(2)" title="Heading 2"><span class="material-icons-round">looks_two</span></button>
          <button class="tb-btn" [class.active]="active().h3" (click)="cmdH(3)" title="Heading 3"><span class="material-icons-round">looks_3</span></button>
        </div>
        <span class="tb-sep"></span>
        <div class="tb-group">
          <button class="tb-btn" [class.active]="active().bulletList"  (click)="cmd('toggleBulletList')"   title="Bullet list"><span class="material-icons-round">format_list_bulleted</span></button>
          <button class="tb-btn" [class.active]="active().orderedList" (click)="cmd('toggleOrderedList')"  title="Numbered list"><span class="material-icons-round">format_list_numbered</span></button>
          <button class="tb-btn" [class.active]="active().blockquote"  (click)="cmd('toggleBlockquote')"   title="Quote"><span class="material-icons-round">format_quote</span></button>
        </div>
        <span class="tb-sep"></span>
        <div class="tb-group">
          <button class="tb-btn" [class.active]="active().codeBlock"   (click)="cmd('toggleCodeBlock')"    title="Code block"><span class="material-icons-round">code</span></button>
          <button class="tb-btn"                                        (click)="insertHr()"                title="Divider"><span class="material-icons-round">horizontal_rule</span></button>
        </div>
        <span class="tb-sep"></span>
        <div class="tb-group">
          <button class="tb-btn" [class.active]="active().link"        (click)="toggleLinkInput()"         title="Link"><span class="material-icons-round">link</span></button>
          <button class="tb-btn"                                        (click)="insertTable()"             title="Table"><span class="material-icons-round">table_chart</span></button>
          <button class="tb-btn"                                        (click)="insertImage()"             title="Image"><span class="material-icons-round">image</span></button>
        </div>
        <div class="tb-spacer"></div>
        <!-- AI button -->
        <button class="tb-ai-btn" (click)="openSpecDialog()" title="AI Spec Generator">
          <span class="material-icons-round">auto_awesome</span>
          <span class="tb-ai-label">AI Spec</span>
        </button>
      </div>

      <!-- Link bar -->
      <div *ngIf="showLinkInput()" class="link-bar">
        <span class="material-icons-round link-bar-icon">link</span>
        <input class="link-input" [(ngModel)]="linkUrl" placeholder="https://..."
               (keydown.enter)="applyLink()" (keydown.escape)="closeLinkInput()" />
        <button class="link-bar-btn apply" (click)="applyLink()" title="Apply"><span class="material-icons-round">check</span></button>
        <button *ngIf="active().link" class="link-bar-btn remove" (click)="removeLink()" title="Remove link"><span class="material-icons-round">link_off</span></button>
        <button class="link-bar-btn" (click)="closeLinkInput()" title="Cancel"><span class="material-icons-round">close</span></button>
      </div>

      <!-- Editor -->
      <div #editorEl class="tiptap-content" [class.readonly]="readonly"></div>

      <!-- Footer -->
      <div class="editor-footer">
        <span class="word-count">{{ wordCount() }} words · {{ charCount() }} characters</span>
      </div>
    </div>

    <!-- ── Floating AI selection toolbar (fixed, outside wrap) ── -->
    <div *ngIf="showAiFloat() && !readonly" class="ai-float"
         [style.top.px]="aiFloatY()" [style.left.px]="aiFloatX()">
      <ng-container *ngFor="let action of editActions">
        <button class="float-btn" [class.loading]="aiFloatAction() === action.label"
                [disabled]="!!aiFloatAction()"
                (click)="editSelection(action.label, action.instruction)"
                [title]="action.label">
          <span class="material-icons-round float-icon">
            {{ aiFloatAction() === action.label ? 'hourglass_top' : action.icon }}
          </span>
          <span class="float-label">{{ action.label }}</span>
        </button>
      </ng-container>
    </div>

    <!-- ── Spec generation dialog ── -->
    <div *ngIf="showSpecDialog()" class="spec-overlay" (click)="onOverlayClick($event)">
      <div class="spec-dialog">
        <div class="spec-dialog-header">
          <span class="material-icons-round spec-icon">auto_awesome</span>
          <div>
            <h3 class="spec-title">AI Spec Generator</h3>
            <p class="spec-sub">Describe what to spec — Claude will write the full document.</p>
          </div>
          <button class="spec-close" (click)="closeSpecDialog()">
            <span class="material-icons-round">close</span>
          </button>
        </div>
        <div class="spec-dialog-body">
          <label class="spec-label">Brief</label>
          <textarea class="spec-textarea" [(ngModel)]="specBrief"
                    placeholder="e.g. Authentication module using JWT with refresh tokens, covering API endpoints, data model, and security requirements…"
                    rows="4"
                    (keydown.escape)="closeSpecDialog()"></textarea>
          <div *ngIf="specError()" class="spec-error">
            <span class="material-icons-round" style="font-size:14px">error_outline</span>
            {{ specError() }}
          </div>
        </div>
        <div class="spec-dialog-footer">
          <button class="spec-cancel" (click)="closeSpecDialog()">Cancel</button>
          <button class="spec-generate" (click)="generateSpec()"
                  [disabled]="specLoading() || !specBrief.trim()">
            <span class="material-icons-round">{{ specLoading() ? 'hourglass_top' : 'auto_awesome' }}</span>
            {{ specLoading() ? 'Generating…' : 'Generate Spec' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; position: relative; }

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
    .tb-spacer { flex: 1; }
    .tb-btn {
      width: 30px; height: 30px; border: none; background: transparent;
      border-radius: var(--r-sm); cursor: pointer; color: var(--ink-4);
      display: flex; align-items: center; justify-content: center; transition: background 0.1s, color 0.1s;
    }
    .tb-btn .material-icons-round { font-size: 18px; }
    .tb-btn:hover { background: var(--surface); color: var(--ink); }
    .tb-btn.active { background: var(--violet-mid); color: var(--violet); }
    .tb-sep { width: 1px; height: 18px; background: var(--border); margin: 0 4px; flex-shrink: 0; }
    .tb-ai-btn {
      display: flex; align-items: center; gap: 5px; padding: 5px 12px;
      background: linear-gradient(135deg, #7c3aed, #6366f1);
      color: #fff; border: none; border-radius: var(--r-md);
      font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity 0.15s;
      flex-shrink: 0;
    }
    .tb-ai-btn:hover { opacity: 0.88; }
    .tb-ai-btn .material-icons-round { font-size: 15px; }
    .tb-ai-label { white-space: nowrap; }

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

    /* ── Editor content area ── */
    .tiptap-content { flex: 1; overflow-y: auto; padding: 24px 48px; outline: none; font-size: 15px; line-height: 1.75; color: var(--ink); }
    .tiptap-content.readonly { cursor: default; }

    /* ── Footer ── */
    .editor-footer { padding: 6px 48px; border-top: 1px solid var(--border); background: var(--white); flex-shrink: 0; }
    .word-count { font-size: 11px; color: var(--muted); }

    /* ── Floating AI toolbar ── */
    .ai-float {
      position: fixed; z-index: 9000; transform: translateX(-50%);
      display: flex; align-items: center; gap: 2px;
      background: var(--ink); border-radius: 8px;
      padding: 4px 6px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
    }
    .float-btn {
      display: flex; align-items: center; gap: 4px; padding: 4px 8px;
      background: transparent; border: none; border-radius: 5px;
      color: #fff; cursor: pointer; font-size: 12px; font-weight: 500;
      transition: background 0.1s; white-space: nowrap;
    }
    .float-btn:hover:not(:disabled) { background: rgba(255,255,255,0.15); }
    .float-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .float-btn.loading { color: #a78bfa; }
    .float-icon { font-size: 14px; }
    .float-label { font-size: 11px; }

    /* ── Spec dialog ── */
    .spec-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 9500;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(2px);
    }
    .spec-dialog {
      background: var(--white); border-radius: var(--r-xl);
      width: 520px; max-width: calc(100vw - 32px);
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
      display: flex; flex-direction: column;
    }
    .spec-dialog-header {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 20px 20px 0;
    }
    .spec-icon { font-size: 22px; color: var(--violet); margin-top: 2px; }
    .spec-title { font-size: 15px; font-weight: 700; color: var(--ink); margin: 0 0 2px; }
    .spec-sub { font-size: 12px; color: var(--muted); margin: 0; }
    .spec-close {
      margin-left: auto; width: 28px; height: 28px; border: none;
      background: transparent; cursor: pointer; border-radius: var(--r-sm);
      display: flex; align-items: center; justify-content: center; color: var(--muted);
    }
    .spec-close:hover { background: var(--surface); color: var(--ink); }
    .spec-close .material-icons-round { font-size: 18px; }
    .spec-dialog-body { padding: 16px 20px; }
    .spec-label { font-size: 11px; font-weight: 700; color: var(--ink-4); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 6px; }
    .spec-textarea {
      width: 100%; border: 1px solid var(--border); border-radius: var(--r-md);
      padding: 10px 12px; font-size: 13px; line-height: 1.6;
      color: var(--ink); background: var(--surface); resize: vertical;
      font-family: inherit; outline: none; box-sizing: border-box;
    }
    .spec-textarea:focus { border-color: var(--violet); background: var(--white); }
    .spec-error {
      display: flex; align-items: center; gap: 6px; margin-top: 8px;
      font-size: 12px; color: #ef4444;
    }
    .spec-dialog-footer {
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 12px 20px 16px; border-top: 1px solid var(--border);
    }
    .spec-cancel {
      padding: 7px 16px; border: 1px solid var(--border); border-radius: var(--r-md);
      background: var(--white); color: var(--ink-4); font-size: 13px; cursor: pointer;
    }
    .spec-cancel:hover { background: var(--surface); }
    .spec-generate {
      display: flex; align-items: center; gap: 6px; padding: 7px 18px;
      background: linear-gradient(135deg, #7c3aed, #6366f1); color: #fff;
      border: none; border-radius: var(--r-md); font-size: 13px; font-weight: 600;
      cursor: pointer; transition: opacity 0.15s;
    }
    .spec-generate:hover:not(:disabled) { opacity: 0.88; }
    .spec-generate:disabled { opacity: 0.55; cursor: not-allowed; }
    .spec-generate .material-icons-round { font-size: 16px; }

    /* ── ProseMirror content styles ── */
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
  private zone = inject(NgZone);

  titleValue = '';
  linkUrl = '';
  specBrief = '';
  readonly editActions = EDIT_ACTIONS;

  showLinkInput   = signal(false);
  showSpecDialog  = signal(false);
  specLoading     = signal(false);
  specError       = signal<string | null>(null);
  showAiFloat     = signal(false);
  aiFloatX        = signal(0);
  aiFloatY        = signal(0);
  aiFloatAction   = signal<string | null>(null);
  wordCount       = signal(0);
  charCount       = signal(0);
  active          = signal<ActiveStates>({
    bold: false, italic: false, underline: false, strike: false,
    h1: false, h2: false, h3: false,
    bulletList: false, orderedList: false, blockquote: false, codeBlock: false,
    link: false,
  });

  private editor: Editor | null = null;
  private save$ = new Subject<void>();
  private saveSub = this.save$.pipe(debounceTime(2000)).subscribe(() => this.emitSave());
  private selectionFrom = 0;
  private selectionTo   = 0;

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
      onUpdate: () => {
        this.refreshState();
        if (!this.readonly) { this.saveStatusChange.emit('saving'); this.save$.next(); }
      },
      onSelectionUpdate: () => {
        this.refreshState();
        this.updateFloat();
      },
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
      const cc = (this.editor!.storage as any)['characterCount'];
      if (cc) { this.wordCount.set(cc.words?.() ?? 0); this.charCount.set(cc.characters?.() ?? 0); }
    });
  }

  private updateFloat(): void {
    if (!this.editor || this.readonly) return;
    const { from, to } = this.editor.state.selection;
    this.selectionFrom = from;
    this.selectionTo   = to;
    if (from === to) { this.zone.run(() => this.showAiFloat.set(false)); return; }

    const startCoords = this.editor.view.coordsAtPos(from);
    const y = startCoords.top - 48;
    const x = startCoords.left + (this.editor.view.coordsAtPos(to).right - startCoords.left) / 2;

    this.zone.run(() => {
      this.aiFloatX.set(x);
      this.aiFloatY.set(y < 10 ? startCoords.bottom + 8 : y);
      this.showAiFloat.set(true);
    });
  }

  // ── Toolbar commands ────────────────────────────────────────────

  cmd(command: string): void { (this.editor?.chain().focus() as any)[command]?.().run(); }
  cmdH(level: 1 | 2 | 3): void { this.editor?.chain().focus().toggleHeading({ level }).run(); }
  insertHr(): void { this.editor?.chain().focus().setHorizontalRule().run(); }
  insertTable(): void { this.editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); }
  insertImage(): void { const src = prompt('Image URL:'); if (src) this.editor?.chain().focus().setImage({ src }).run(); }

  toggleLinkInput(): void {
    if (this.active().link) { this.linkUrl = this.editor?.getAttributes('link')?.['href'] ?? ''; }
    else { this.linkUrl = ''; }
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

  // ── Floating selection AI ───────────────────────────────────────

  editSelection(label: string, instruction: string): void {
    if (!this.editor || this.aiFloatAction()) return;
    const from = this.selectionFrom;
    const to   = this.selectionTo;
    const text = this.editor.state.doc.textBetween(from, to, ' ');
    if (!text.trim()) return;

    this.aiFloatAction.set(label);
    this.vaultAi.editText(text, instruction).subscribe({
      next: result => {
        this.editor?.chain().focus().setTextSelection({ from, to }).insertContent(result).run();
        this.aiFloatAction.set(null);
        this.showAiFloat.set(false);
      },
      error: () => this.aiFloatAction.set(null),
    });
  }

  // ── Spec dialog ─────────────────────────────────────────────────

  openSpecDialog(): void { this.specBrief = ''; this.specError.set(null); this.showSpecDialog.set(true); }
  closeSpecDialog(): void { this.showSpecDialog.set(false); this.specBrief = ''; this.specError.set(null); }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('spec-overlay')) this.closeSpecDialog();
  }

  generateSpec(): void {
    if (!this.specBrief.trim() || this.specLoading()) return;
    this.specLoading.set(true);
    this.specError.set(null);

    this.vaultAi.generateSpec(this.specBrief, this.document.projectId).subscribe({
      next: html => {
        this.editor?.chain().focus().insertContent(html).run();
        this.specLoading.set(false);
        this.closeSpecDialog();
        this.saveStatusChange.emit('saving');
        this.save$.next();
      },
      error: () => {
        this.specLoading.set(false);
        this.specError.set('Generation failed. Please try again.');
      },
    });
  }

  // ── Lifecycle ────────────────────────────────────────────────────

  private emitSave(): void {
    const contentJson = JSON.stringify(this.editor?.getJSON() ?? {});
    this.save.emit({ title: this.titleValue, contentJson });
    this.saveStatusChange.emit('saved');
  }

  ngOnDestroy(): void { this.saveSub.unsubscribe(); this.editor?.destroy(); }
}
