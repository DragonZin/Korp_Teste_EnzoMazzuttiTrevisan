import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

export type BaseModalSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-base-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './base-modal.component.html',
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