import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export const DEFAULT_PAGE_SIZE_OPTIONS: ReadonlyArray<number> = [ 10, 25, 50, 75, 100];

@Component({
  selector: 'app-pagination-controls',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      [ngClass]="containerClass"
      *ngIf="!isLoading && totalItems > 0"
    >
      <p [ngClass]="summaryClass">
        Exibindo {{ currentItemCount }} de {{ totalItems }} itens (página {{ page }} de {{ totalPages }}).
      </p>

      <div [ngClass]="controlsClass">
        <label [ngClass]="pageSizeLabelClass" [for]="pageSizeId">{{ pageSizeLabel }}</label>
        <select
          [id]="pageSizeId"
          class="form-select form-select-sm"
          style="width: auto"
          [value]="pageSize"
          [disabled]="isLoading"
          (change)="onPageSizeSelection($event)"
        >
          <option *ngFor="let size of pageSizeOptions" [value]="size">{{ size }}</option>
        </select>

        <div class="btn-group btn-group-sm" role="group" [attr.aria-label]="ariaLabel">
          <button
            type="button"
            class="btn btn-outline-secondary"
            (click)="previous.emit()"
            [disabled]="isLoading || page <= 1"
          >
            Anterior
          </button>
          <button
            type="button"
            class="btn btn-outline-secondary"
            (click)="next.emit()"
            [disabled]="isLoading || page >= totalPages"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  `,
})
export class PaginationControlsComponent {
  @Input({ required: true }) currentItemCount = 0;
  @Input({ required: true }) totalItems = 0;
  @Input({ required: true }) page = 1;
  @Input({ required: true }) totalPages = 1;
  @Input({ required: true }) pageSize = 10;
  @Input({ required: true }) pageSizeOptions: ReadonlyArray<number> = DEFAULT_PAGE_SIZE_OPTIONS;
  @Input() isLoading = false;
  @Input() pageSizeId = 'page-size';
  @Input() ariaLabel = 'Paginação';
  @Input() pageSizeLabel = 'Itens por página';
  @Input() containerClass = 'd-flex flex-wrap justify-content-between align-items-center gap-3 mt-3';
  @Input() summaryClass = 'text-body-secondary mb-0';
  @Input() controlsClass = 'd-flex flex-wrap align-items-center gap-2';
  @Input() pageSizeLabelClass = 'form-label mb-0 text-body-secondary';

  @Output() readonly previous = new EventEmitter<void>();
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly pageSizeChange = new EventEmitter<number>();

  onPageSizeSelection(event: Event): void {
    const selectedPageSize = Number((event.target as HTMLSelectElement).value);

    if (!this.isValidPageSizeSelection(selectedPageSize) || selectedPageSize === this.pageSize) {
      return;
    }

    this.pageSizeChange.emit(selectedPageSize);
  }

  private isValidPageSizeSelection(selectedPageSize: number): boolean {
    return Number.isFinite(selectedPageSize) && this.pageSizeOptions.includes(selectedPageSize);
  }
}