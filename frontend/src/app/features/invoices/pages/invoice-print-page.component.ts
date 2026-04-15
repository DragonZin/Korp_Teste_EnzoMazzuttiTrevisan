import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { mapHttpErrorMessage } from '../../../core/http/http-error-mapper';
import { InvoiceProductLookupService } from '../data/invoice-product-lookup.service';
import { InvoicesApiService } from '../data/invoices-api.service';
import { Invoice } from '../models/invoice.model';
import { InvoiceSummaryCardComponent } from '../components/invoice-summary-card.component';

@Component({
  selector: 'app-invoice-print-page',
  standalone: true,
  imports: [CommonModule, InvoiceSummaryCardComponent],
  templateUrl: './invoice-print-page.component.html', 
  styleUrl: './invoice-print-page.component.scss',
})
export class InvoicePrintPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly invoicesApiService = inject(InvoicesApiService);
  private readonly invoiceProductLookupService = inject(InvoiceProductLookupService);

  protected readonly invoice = signal<Invoice | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly isClosingInvoice = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly productNamesById = signal<Record<string, string>>({});
  protected readonly productCodesById = signal<Record<string, string>>({});

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';

    if (!id) {
      this.errorMessage.set('Identificador da nota fiscal não foi informado.');
      return;
    }

    this.loadInvoice(id);
  }

  ngOnDestroy(): void {
    this.disablePrintMode();
  }

  protected getProductDisplayName(productId: string): string {
    return this.productNamesById()[productId] ?? productId;
  }
  
  protected getProductCode(productId: string): string {
    return this.productCodesById()[productId] ?? '-';
  }

  protected goBack(): void {
    void this.router.navigate(['/invoices']);
  }

  protected printAgain(): void {
    this.printDetails();
  }

  protected closeInvoice(): void {
    const invoice = this.invoice();

    if (!invoice || invoice.status === 2) {
      return;
    }

    this.isClosingInvoice.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.invoicesApiService
      .close(invoice.id)
      .pipe(finalize(() => this.isClosingInvoice.set(false)))
      .subscribe({
        next: (updatedInvoice) => {
          this.invoice.set(updatedInvoice);
          this.successMessage.set(`Nota fiscal NF-${updatedInvoice.number} foi fechada com sucesso.`);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.getFriendlyErrorMessage(error));
        }
      });
  }

  private loadInvoice(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.invoicesApiService
      .getById(id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (invoice: Invoice) => {
          this.invoice.set(invoice);
          this.loadProductNames(invoice);
          this.printDetails();
        },
        error: (error: HttpErrorResponse) => {
          this.invoice.set(null);
          this.productNamesById.set({});
          this.productCodesById.set({});
          this.errorMessage.set(this.getFriendlyErrorMessage(error));
        }
      });
  }

  private loadProductNames(invoice: Invoice): void {
    const productIds = invoice.products.map((item) => item.productId);

    this.invoiceProductLookupService.getLookupByProductIds(productIds).subscribe(({ namesById, codesById }) => {
      this.productNamesById.set(namesById);
      this.productCodesById.set(codesById);
    });
  }

  private printDetails(): void {
    if (!this.invoice()) {
      return;
    }

    this.enablePrintMode();
    window.addEventListener('afterprint', () => this.disablePrintMode(), { once: true });
    setTimeout(() => window.print(), 150);
  }

  private getFriendlyErrorMessage(error: HttpErrorResponse): string {
    return mapHttpErrorMessage(error, { domain: 'invoice-print' });
  }

  private enablePrintMode(): void {
    document.body.classList.add('invoice-print-mode');
  }

  private disablePrintMode(): void {
    document.body.classList.remove('invoice-print-mode');
  }
}