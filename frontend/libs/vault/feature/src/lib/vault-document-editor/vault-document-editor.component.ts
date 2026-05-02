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
          <button class="tb-btn" [class.active]="active().h1" (click)="cmdH(1)" title="H1"><b style="font-size:11px">H1</b></button>
          <button class="tb-btn" [class.active]="active().h2" (click)="cmdH(2)" title="H2"><b style="font-size:11px">H2</b></button>
          <button class="tb-btn" [class.active]="active().h3" (click)="cmdH(3)" title="H3"><b style="font-size:11px">H3</b></button>
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

        <!-- Word count pill on the right -->
        <div class="tb-right">
          <span class="tb-word-count">{{ wordCount() }} words</span>
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

      <!-- Page canvas -->
      <div class="page-canvas">
        <div class="page" [class.readonly]="readonly">

          <!-- Title lives inside the page -->
          <input class="doc-title" [value]="titleValue" (input)="onTitleInput($event)"
                 placeholder="Untitled document" [readonly]="readonly" />

          <!-- Editor content -->
          <div #editorEl class="tiptap-content"></div>

        </div>
      </div>

      <!-- AI bar -->
      <div *ngIf="!readonly" class="ai-bar" [class.ai-busy]="aiLoading()">

        <!-- Left: spark + mode pills -->
        <div class="ai-left">
          <div class="ai-spark" [class.spinning]="aiLoading()">
            <span class="material-icons-round">auto_awesome</span>
          </div>
          <div class="ai-mode">
            <button class="ai-mode-btn" [class.active]="aiMode() === 'edit'"
                    (click)="setMode('edit')" title="Edit / write">
              <span class="material-icons-round">edit</span>
            </button>
            <button class="ai-mode-btn" [class.active]="aiMode() === 'spec'"
                    (click)="setMode('spec')" title="Generate a spec">
              <span class="material-icons-round">auto_fix_high</span>
            </button>
          </div>
        </div>

        <!-- Selection chip -->
        <div *ngIf="aiMode() === 'edit' && (selectionWords() > 0 || savedSelWords() > 0)" class="selection-chip">
          <span class="material-icons-round chip-icon">text_fields</span>
          {{ selectionWords() > 0 ? selectionWords() : savedSelWords() }}w
        </div>

        <!-- Input (no border — the whole bar is the input surface) -->
        <div class="ai-input-wrap">
          <input #aiInput class="ai-input"
                 [(ngModel)]="aiPrompt"
                 [placeholder]="aiPlaceholder()"
                 (keydown.enter)="submitAi()"
                 (keydown.escape)="aiPrompt = ''" />
        </div>

        <!-- Right: status + send -->
        <div class="ai-right">
          <span *ngIf="aiError()" class="ai-error">{{ aiError() }}</span>
          <span *ngIf="!aiError()" class="bar-word-count">{{ wordCount() }}w</span>
          <button class="ai-send" [class.loading]="aiLoading()"
                  [disabled]="aiLoading() || !aiPrompt.trim()"
                  (click)="submitAi()" title="Send">
            <span class="material-icons-round">{{ aiLoading() ? 'hourglass_top' : 'arrow_upward' }}</span>
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }
    .editor-wrap { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }

    /* ── Toolbar ── */
    .toolbar {
      display: flex; align-items: center; gap: 2px; flex-wrap: wrap;
      padding: 0 16px; min-height: 42px;
      border-bottom: 1px solid var(--border);
      background: var(--white); flex-shrink: 0; z-index: 10;
    }
    .tb-group { display: flex; align-items: center; gap: 1px; }
    .tb-btn {
      min-width: 30px; height: 30px; padding: 0 6px; border: none; background: transparent;
      border-radius: 6px; cursor: pointer; color: var(--ink-4);
      display: flex; align-items: center; justify-content: center;
      transition: background 0.1s, color 0.1s; font-family: inherit;
    }
    .tb-btn .material-icons-round { font-size: 17px; }
    .tb-btn:hover { background: var(--surface); color: var(--ink); }
    .tb-btn.active { background: var(--violet-mid); color: var(--violet); }
    .tb-sep { width: 1px; height: 18px; background: var(--border); margin: 0 4px; flex-shrink: 0; }
    .tb-right { margin-left: auto; }
    .tb-word-count { font-size: 11px; color: var(--muted); font-weight: 500; }

    /* ── Link bar ── */
    .link-bar {
      display: flex; align-items: center; gap: 6px; padding: 6px 16px;
      border-bottom: 1px solid var(--border); background: var(--surface); flex-shrink: 0;
    }
    .link-bar-icon { font-size: 16px; color: var(--muted); }
    .link-input {
      flex: 1; border: 1px solid var(--border); border-radius: 6px;
      padding: 5px 10px; font-size: 13px; background: var(--white); color: var(--ink); outline: none;
    }
    .link-input:focus { border-color: var(--violet); box-shadow: 0 0 0 3px var(--violet-mid); }
    .link-bar-btn {
      width: 28px; height: 28px; border: none; border-radius: 6px;
      background: transparent; cursor: pointer; color: var(--muted);
      display: flex; align-items: center; justify-content: center;
    }
    .link-bar-btn .material-icons-round { font-size: 16px; }
    .link-bar-btn:hover { background: var(--border); color: var(--ink); }
    .link-bar-btn.apply { color: var(--violet); }
    .link-bar-btn.apply:hover { background: var(--violet-mid); }
    .link-bar-btn.remove { color: #ef4444; }
    .link-bar-btn.remove:hover { background: #fef2f2; }

    /* ── Page canvas ── */
    .page-canvas {
      flex: 1; overflow-y: auto;
      background: var(--surface, #f5f5f5);
      padding: 40px 24px 140px;
      display: flex; flex-direction: column; align-items: center;
    }

    /* ── Page ── */
    .page {
      width: 100%; max-width: 760px;
      background: var(--white);
      border-radius: 8px;
      border: 1px solid var(--border);
      box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 6px 24px rgba(0,0,0,0.06);
      padding: 64px 80px 80px;
      min-height: 1000px;
      position: relative;
    }
    @media (max-width: 900px) { .page { padding: 40px 40px 60px; } }

    /* ── Document title (inside page) ── */
    .doc-title {
      display: block; width: 100%;
      border: none; outline: none;
      font-size: 34px; font-weight: 700; letter-spacing: -0.5px;
      background: transparent; color: var(--ink);
      padding: 0; line-height: 1.2; margin-bottom: 4px;
      font-family: inherit;
    }
    .doc-title::placeholder { color: var(--soft); }
    .page.readonly .doc-title { cursor: default; }

    /* ── Editor content ── */
    .tiptap-content { outline: none; }

    /* ── AI bar ── */
    .ai-bar {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      width: min(720px, calc(100vw - 260px));
      z-index: 20;
      display: flex; align-items: center; gap: 10px;
      padding: 7px 7px 7px 14px;
      background: rgba(255,255,255,0.88);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid rgba(99,102,241,0.18);
      border-radius: 18px;
      box-shadow:
        0 0 0 4px rgba(99,102,241,0.06),
        0 8px 40px rgba(99,102,241,0.14),
        0 2px 8px rgba(0,0,0,0.07),
        inset 0 1px 0 rgba(255,255,255,0.9);
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .ai-bar.ai-busy {
      border-color: rgba(99,102,241,0.40);
      box-shadow:
        0 0 0 4px rgba(99,102,241,0.10),
        0 8px 48px rgba(99,102,241,0.24),
        0 2px 8px rgba(0,0,0,0.07),
        inset 0 1px 0 rgba(255,255,255,0.9);
    }

    .ai-left { display: flex; align-items: center; gap: 7px; flex-shrink: 0; }

    /* Spark icon */
    .ai-spark {
      width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
      background: linear-gradient(135deg, var(--violet) 0%, #818cf8 100%);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 10px rgba(99,102,241,0.40);
    }
    .ai-spark .material-icons-round { font-size: 16px; color: #fff; }
    .ai-spark.spinning .material-icons-round {
      animation: sparkPulse 1.4s ease-in-out infinite;
    }
    @keyframes sparkPulse {
      0%, 100% { transform: scale(1) rotate(0deg);   opacity: 1; }
      50%       { transform: scale(1.2) rotate(20deg); opacity: 0.8; }
    }

    /* Mode pills */
    .ai-mode {
      display: flex; gap: 2px;
      background: rgba(0,0,0,0.04); border: 1px solid var(--border);
      border-radius: 9px; padding: 2px; flex-shrink: 0;
    }
    .ai-mode-btn {
      width: 28px; height: 28px; border: none; background: transparent;
      border-radius: 7px; cursor: pointer; color: var(--muted);
      display: flex; align-items: center; justify-content: center;
      transition: background 0.12s, color 0.12s, box-shadow 0.12s;
    }
    .ai-mode-btn .material-icons-round { font-size: 14px; }
    .ai-mode-btn:hover { background: var(--white); color: var(--ink); }
    .ai-mode-btn.active {
      background: var(--violet); color: #fff;
      box-shadow: 0 1px 5px rgba(99,102,241,0.4);
    }

    /* Selection chip */
    .selection-chip {
      display: flex; align-items: center; gap: 4px; padding: 3px 9px;
      background: var(--violet-mid); color: var(--violet);
      border: 1px solid rgba(99,102,241,0.2);
      border-radius: 99px; font-size: 11px; font-weight: 600; flex-shrink: 0;
    }
    .chip-icon { font-size: 12px; }

    /* Input — borderless, the bar IS the input surface */
    .ai-input-wrap { flex: 1; min-width: 0; display: flex; align-items: center; }
    .ai-input {
      width: 100%; border: none; outline: none; background: transparent;
      font-size: 13.5px; color: var(--ink); font-family: inherit; line-height: 1.4;
      padding: 4px 0;
    }
    .ai-input::placeholder { color: var(--muted); }

    /* Right side */
    .ai-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .bar-word-count { font-size: 11px; color: var(--muted); white-space: nowrap; }
    .ai-error { font-size: 11px; color: #ef4444; white-space: nowrap; font-weight: 500; }

    /* Send button */
    .ai-send {
      width: 36px; height: 36px; border: none; border-radius: 11px; flex-shrink: 0;
      background: var(--violet); color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 10px rgba(99,102,241,0.45);
      transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
    }
    .ai-send .material-icons-round { font-size: 18px; }
    .ai-send:hover:not(:disabled) {
      transform: scale(1.07) translateY(-1px);
      box-shadow: 0 4px 16px rgba(99,102,241,0.55);
    }
    .ai-send:disabled { opacity: 0.35; cursor: not-allowed; box-shadow: none; transform: none; }
    .ai-send.loading { opacity: 0.7; }

    /* Dark mode adaptations */
    :host-context([data-theme="dark"]) .ai-bar {
      background: rgba(18,18,28,0.90);
      border-color: rgba(99,102,241,0.22);
      box-shadow:
        0 0 0 4px rgba(99,102,241,0.08),
        0 8px 40px rgba(0,0,0,0.5),
        inset 0 1px 0 rgba(255,255,255,0.06);
    }
    :host-context([data-theme="dark"]) .ai-bar.ai-busy {
      border-color: rgba(99,102,241,0.42);
    }
    :host-context([data-theme="dark"]) .ai-mode {
      background: rgba(255,255,255,0.06);
    }

    /* ── ProseMirror content styles ── */
    :host ::ng-deep .tiptap-content .ProseMirror {
      outline: none;
      min-height: 500px;
      font-size: 15.5px;
      line-height: 1.8;
      color: var(--ink);
      caret-color: var(--violet);
    }

    /* Placeholder */
    :host ::ng-deep .tiptap-content .ProseMirror p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      color: var(--soft);
      pointer-events: none;
      float: left;
      height: 0;
    }

    /* Paragraphs */
    :host ::ng-deep .tiptap-content .ProseMirror p {
      margin: 0.9em 0;
    }
    :host ::ng-deep .tiptap-content .ProseMirror > :first-child { margin-top: 0; }
    :host ::ng-deep .tiptap-content .ProseMirror > :last-child  { margin-bottom: 0; }

    /* Headings */
    :host ::ng-deep .tiptap-content .ProseMirror h1 {
      font-size: 2em; font-weight: 700; letter-spacing: -0.4px;
      margin: 1.6em 0 0.5em; line-height: 1.2; color: var(--ink);
      border-bottom: 2px solid var(--border); padding-bottom: 0.3em;
    }
    :host ::ng-deep .tiptap-content .ProseMirror h2 {
      font-size: 1.45em; font-weight: 700; letter-spacing: -0.2px;
      margin: 1.4em 0 0.4em; line-height: 1.25; color: var(--ink);
    }
    :host ::ng-deep .tiptap-content .ProseMirror h3 {
      font-size: 1.15em; font-weight: 600;
      margin: 1.2em 0 0.35em; line-height: 1.35; color: var(--ink);
    }
    :host ::ng-deep .tiptap-content .ProseMirror h1:first-child,
    :host ::ng-deep .tiptap-content .ProseMirror h2:first-child,
    :host ::ng-deep .tiptap-content .ProseMirror h3:first-child { margin-top: 0; }

    /* Links */
    :host ::ng-deep .tiptap-content .ProseMirror a {
      color: var(--violet); text-decoration: underline; text-underline-offset: 2px; cursor: pointer;
    }
    :host ::ng-deep .tiptap-content .ProseMirror a:hover { opacity: 0.75; }

    /* Lists */
    :host ::ng-deep .tiptap-content .ProseMirror ul,
    :host ::ng-deep .tiptap-content .ProseMirror ol {
      padding-left: 1.6em; margin: 0.75em 0;
    }
    :host ::ng-deep .tiptap-content .ProseMirror li { margin: 0.35em 0; }
    :host ::ng-deep .tiptap-content .ProseMirror li > p { margin: 0; }

    /* Blockquote */
    :host ::ng-deep .tiptap-content .ProseMirror blockquote {
      border-left: 4px solid var(--violet);
      margin: 1.25em 0; padding: 8px 0 8px 20px;
      color: var(--ink-4); font-style: italic;
      background: var(--violet-mid);
      border-radius: 0 6px 6px 0;
    }
    :host ::ng-deep .tiptap-content .ProseMirror blockquote p { margin: 0; }

    /* Inline code */
    :host ::ng-deep .tiptap-content .ProseMirror code {
      background: rgba(99,102,241,0.08); color: #7c3aed;
      padding: 2px 6px; border-radius: 5px;
      font-size: 0.875em; font-family: 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
      border: 1px solid rgba(99,102,241,0.15);
    }

    /* Code block */
    :host ::ng-deep .tiptap-content .ProseMirror pre {
      background: #1e1e2e; color: #cdd6f4;
      padding: 20px 24px; border-radius: 10px; margin: 1.25em 0;
      overflow-x: auto; line-height: 1.65;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
    }
    :host ::ng-deep .tiptap-content .ProseMirror pre code {
      background: none; color: inherit; padding: 0; border: none;
      font-size: 13.5px; font-family: 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
    }

    /* Horizontal rule */
    :host ::ng-deep .tiptap-content .ProseMirror hr {
      border: none; border-top: 2px solid var(--border); margin: 2em 0;
    }

    /* Table */
    :host ::ng-deep .tiptap-content .ProseMirror table {
      border-collapse: collapse; width: 100%; margin: 1.25em 0;
      font-size: 14px; border-radius: 8px; overflow: hidden;
      border: 1px solid var(--border);
    }
    :host ::ng-deep .tiptap-content .ProseMirror th,
    :host ::ng-deep .tiptap-content .ProseMirror td {
      border: 1px solid var(--border); padding: 10px 14px; text-align: left; vertical-align: top;
    }
    :host ::ng-deep .tiptap-content .ProseMirror th {
      background: var(--surface); font-weight: 600; font-size: 12px;
      text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-4);
    }
    :host ::ng-deep .tiptap-content .ProseMirror tr:nth-child(even) td { background: rgba(0,0,0,0.015); }
    :host ::ng-deep .tiptap-content .ProseMirror .selectedCell { background: var(--violet-mid) !important; }

    /* Images */
    :host ::ng-deep .tiptap-content .ProseMirror img {
      max-width: 100%; border-radius: 8px; margin: 1.25em 0;
      display: block; box-shadow: 0 2px 12px rgba(0,0,0,0.10);
    }

    /* Text selection */
    :host ::ng-deep .tiptap-content .ProseMirror ::selection { background: var(--violet-mid); }

    /* Focus outline on the page */
    :host ::ng-deep .tiptap-content .ProseMirror:focus { outline: none; }
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

  aiError        = signal('');

  // Preserved across editor blur — public so template can read it
  savedSelWords  = signal(0);

  aiPlaceholder = () => this.aiMode() === 'spec'
    ? 'Describe what to spec out…'
    : this.savedSelWords() > 0
      ? 'Improve, shorten, rewrite, change tone…'
      : 'Ask AI to write, add, or edit content…';

  private editor: Editor | null = null;
  private save$ = new Subject<void>();
  private saveSub = this.save$.pipe(debounceTime(2000)).subscribe(() => this.emitSave());
  private selFrom = 0;
  private selTo   = 0;
  private savedSelFrom = 0;
  private savedSelTo   = 0;

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
        const words = text.trim().split(/\s+/).filter(w => w).length;
        this.selectionWords.set(words);
        // Persist non-empty selection so clicking the AI input doesn't lose it
        this.savedSelFrom = from;
        this.savedSelTo   = to;
        this.savedSelWords.set(words);
      } else {
        this.selectionWords.set(0);
        // Don't clear savedSel* — keep the last real selection for the AI call
      }
      const cc = (this.editor!.storage as any)['characterCount'];
      if (cc) { this.wordCount.set(cc.words?.() ?? 0); this.charCount.set(cc.characters?.() ?? 0); }
    });
  }

  setMode(mode: 'edit' | 'spec'): void { this.aiMode.set(mode); }

  submitAi(): void {
    if (!this.aiPrompt.trim() || this.aiLoading()) return;
    this.aiLoading.set(true);
    this.aiError.set('');
    const prompt = this.aiPrompt;
    this.aiPrompt = '';

    if (this.aiMode() === 'spec') {
      this.vaultAi.generateSpec(prompt, this.document.projectId).subscribe({
        next: html  => this.zone.run(() => this.insertHtml(html)),
        error: err  => this.zone.run(() => this.showAiError(err)),
      });
    } else if (this.savedSelWords() > 0) {
      const text = this.editor!.state.doc.textBetween(this.savedSelFrom, this.savedSelTo, ' ');
      const from = this.savedSelFrom, to = this.savedSelTo;
      this.vaultAi.editSelection(text, prompt).subscribe({
        next: result => this.zone.run(() => {
          this.editor?.chain().focus().setTextSelection({ from, to }).insertContent(result).run();
          this.savedSelFrom = 0; this.savedSelTo = 0; this.savedSelWords.set(0);
          this.aiLoading.set(false);
          this.triggerSave();
        }),
        error: err => this.zone.run(() => this.showAiError(err)),
      });
    } else {
      this.vaultAi.documentCommand(prompt, this.document.projectId).subscribe({
        next: html  => this.zone.run(() => this.insertHtml(html)),
        error: err  => this.zone.run(() => this.showAiError(err)),
      });
    }
  }

  private insertHtml(html: string): void {
    this.editor?.chain().focus().insertContent(html).run();
    this.aiLoading.set(false);
    this.triggerSave();
  }

  private showAiError(err: unknown): void {
    this.aiLoading.set(false);
    const status = (err as any)?.status;
    this.aiError.set(status === 403 ? 'Not authorised' : status === 0 ? 'Cannot reach server' : 'AI error — try again');
    setTimeout(() => this.zone.run(() => this.aiError.set('')), 4000);
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
