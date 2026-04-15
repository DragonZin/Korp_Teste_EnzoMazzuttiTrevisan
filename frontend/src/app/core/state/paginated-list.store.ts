import { HttpErrorResponse } from '@angular/common/http';
import { Signal, signal } from '@angular/core';
import { Observable, Subscription, finalize } from 'rxjs';

import { PagedResponse } from '../models/paged-response.model';

export interface PaginatedListState<TItem> {
  items: TItem[];
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedLoadParams {
  page: number;
  pageSize: number;
}

export type PaginatedListLoader<TItem> = (params: PaginatedLoadParams) => Observable<PagedResponse<TItem>>;

interface PaginatedListStoreConfig<TItem> {
  initialPageSize: number;
  loader: PaginatedListLoader<TItem>;
  mapError?: (error: HttpErrorResponse) => string;
}

export class PaginatedListStore<TItem> {
  private loadSubscription: Subscription | null = null;
  private readonly mapError: (error: HttpErrorResponse) => string;
  private readonly pageSizeWritable = signal(1);

  readonly items = signal<TItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSize: Signal<number> = this.pageSizeWritable.asReadonly();
  readonly totalItems = signal(0);
  readonly totalPages = signal(0);

  constructor(private readonly config: PaginatedListStoreConfig<TItem>) {
    this.pageSizeWritable.set(config.initialPageSize);
    this.mapError = config.mapError ?? (() => 'Não foi possível carregar os dados da listagem.');
  }

  load(params?: Partial<PaginatedLoadParams>): void {
    const nextPage = params?.page ?? this.page();
    const nextPageSize = params?.pageSize ?? this.pageSize();

    this.loadBy(nextPage, nextPageSize);
  }

  nextPage(): void {
    if (!this.canGoNext()) {
      return;
    }

    this.loadBy(this.page() + 1, this.pageSize());
  }

  previousPage(): void {
    if (!this.canGoPrevious()) {
      return;
    }

    this.loadBy(this.page() - 1, this.pageSize());
  }

  setPageSize(nextPageSize: number): void {
    if (!Number.isInteger(nextPageSize) || nextPageSize < 1) {
      return;
    }

    this.loadBy(1, nextPageSize);
  }

  canGoNext(): boolean {
    return !this.loading() && this.page() < this.totalPages();
  }

  canGoPrevious(): boolean {
    return !this.loading() && this.page() > 1;
  }

  clearError(): void {
    this.error.set(null);
  }

  destroy(): void {
    this.loadSubscription?.unsubscribe();
    this.loadSubscription = null;
  }

  private loadBy(page: number, pageSize: number): void {
    this.loadSubscription?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);

    this.loadSubscription = this.config.loader({ page, pageSize })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.items.set(response.items);
          this.page.set(response.page);
          this.pageSizeWritable.set(response.pageSize);
          this.totalItems.set(response.totalItems);
          this.totalPages.set(response.totalPages);
        },
        error: (error: HttpErrorResponse) => {
          this.items.set([]);
          this.totalItems.set(0);
          this.totalPages.set(0);
          this.error.set(this.mapError(error));
        }
      });
  }
}