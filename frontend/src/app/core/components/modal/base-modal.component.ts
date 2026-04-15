import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

export type BaseModalSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-base-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isOpen" class="app-modal-backdrop" role="presentation" (click)="onBackdropClick()">
      <div
        class="app-modal-dialog"
        [ngClass]="sizeClass"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="title ? titleId : null"
        (click)="$event.stopPropagation()"
      >
        <div class="app-modal-header" *ngIf="title || subtitle">
          <div>
            <h3 *ngIf="title" [id]="titleId" class="app-modal-title">{{ title }}</h3>
            <p *ngIf="subtitle" class="app-modal-subtitle">{{ subtitle }}</p>
          </div>

          <button type="button" class="btn-close" aria-label="Fechar modal" (click)="requestClose()"></button>
        </div>

        <div class="app-modal-content">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
  styleUrl: './base-modal.component.scss',
})
export class BaseModalComponent {
  private static nextTitleId = 0;

  @Input() isOpen = false;
  @Input() title = '';
  @Input() subtitle = '';
  @Input() size: BaseModalSize = 'md';
  @Input() closeOnBackdropClick = true;
  @Output() readonly closed = new EventEmitter<void>();

  readonly titleId = `app-modal-title-${BaseModalComponent.nextTitleId++}`;

  get sizeClass(): string {
    return `app-modal-dialog--${this.size}`;
  }

  @HostListener('document:keydown.escape')
  protected onEscapePressed(): void {
    if (!this.isOpen) {
      return;
    }

    this.requestClose();
  }

  protected onBackdropClick(): void {
    if (!this.closeOnBackdropClick) {
      return;
    }

    this.requestClose();
  }

  protected requestClose(): void {
    this.closed.emit();
  }
}