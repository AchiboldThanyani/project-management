import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  Output,
  EventEmitter,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { Excalidraw } from '@excalidraw/excalidraw';

@Component({
  selector: 'pm-excalidraw-wrapper',
  standalone: true,
  template: `<div #container style="width:100%;height:100%;min-height:0"></div>`,
  styles: [`:host { display:flex; flex:1; min-height:0; }`],
})
export class ExcalidrawWrapperComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  @Input() initialData = '';
  @Input() remoteChange: string | null = null;
  @Output() contentChanged = new EventEmitter<string>();

  private root: ReactDOM.Root | null = null;
  private api: unknown = null;
  private isApplyingRemoteChange = false;
  private broadcastDebounce: ReturnType<typeof setTimeout> | null = null;

  ngAfterViewInit(): void {
    this.root = ReactDOM.createRoot(this.containerRef.nativeElement);
    this.renderExcalidraw();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['remoteChange'] && changes['remoteChange'].currentValue && this.api) {
      const json = changes['remoteChange'].currentValue as string;
      try {
        const parsed = JSON.parse(json);
        this.isApplyingRemoteChange = true;
        (this.api as any).updateScene({ elements: parsed.elements ?? [] });
        this.isApplyingRemoteChange = false;
      } catch {
        this.isApplyingRemoteChange = false;
      }
    }
  }

  ngOnDestroy(): void {
    if (this.broadcastDebounce) clearTimeout(this.broadcastDebounce);
    this.root?.unmount();
    this.root = null;
  }

  private renderExcalidraw(): void {
    let parsedInitial: any = { elements: [] };
    try {
      if (this.initialData) parsedInitial = JSON.parse(this.initialData);
    } catch { /* empty canvas */ }

    const self = this;

    this.root!.render(
      React.createElement(Excalidraw, {
        initialData: parsedInitial,
        excalidrawAPI: (api: unknown) => { self.api = api; },
        onChange: (elements: readonly unknown[]) => {
          if (self.isApplyingRemoteChange) return;
          if (self.broadcastDebounce) clearTimeout(self.broadcastDebounce);
          self.broadcastDebounce = setTimeout(() => {
            self.contentChanged.emit(JSON.stringify({ elements }));
          }, 500);
        },
      })
    );
  }
}
