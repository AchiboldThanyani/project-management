import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  EventEmitter,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { Excalidraw } from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types/types';

@Component({
  selector: 'pm-excalidraw-wrapper',
  standalone: true,
  template: `<div #container style="width:100%;height:100%"></div>`,
})
export class ExcalidrawWrapperComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  @Input() contentJson = '';
  @Output() contentChanged = new EventEmitter<string>();

  private root: ReactDOM.Root | null = null;
  private isApplyingRemoteChange = false;
  private broadcastDebounce: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.root = ReactDOM.createRoot(this.containerRef.nativeElement);
    this.renderExcalidraw();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contentJson'] && !changes['contentJson'].firstChange) {
      this.isApplyingRemoteChange = true;
      this.renderExcalidraw();
      setTimeout(() => (this.isApplyingRemoteChange = false), 0);
    }
  }

  ngOnDestroy(): void {
    if (this.broadcastDebounce) clearTimeout(this.broadcastDebounce);
    this.root?.unmount();
    this.root = null;
  }

  private getInitialData() {
    if (!this.contentJson) return undefined;
    try {
      return JSON.parse(this.contentJson);
    } catch {
      return undefined;
    }
  }

  private renderExcalidraw(): void {
    const initialData = this.getInitialData();
    const onChange = (
      elements: readonly ExcalidrawElement[],
      _appState: AppState,
      _files: BinaryFiles
    ) => {
      if (this.isApplyingRemoteChange) return;
      if (this.broadcastDebounce) clearTimeout(this.broadcastDebounce);
      this.broadcastDebounce = setTimeout(() => {
        const json = JSON.stringify({ elements });
        this.contentChanged.emit(json);
      }, 500);
    };

    this.root!.render(
      React.createElement(Excalidraw, {
        initialData,
        onChange,
      })
    );
  }
}
