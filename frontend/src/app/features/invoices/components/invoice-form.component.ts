import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';

import { CreateInvoiceRequest } from '../models/create-invoice-request.model';

@Component({
  selector: 'app-invoice-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="mb-3">
        <label for="create-customer-name" class="form-label">Nome</label>
        <input
          id="create-customer-name"
          type="text"
          class="form-control"
          [class.is-invalid]="hasControlError('customerName')"
          formControlName="customerName"
          maxlength="255"
        />
        <div class="invalid-feedback" *ngIf="hasControlError('customerName')">
          {{ getControlErrorMessage('customerName') }}
        </div>
      </div>

      <div class="mb-3">
        <label for="create-customer-document" class="form-label">Documento</label>
        <input
          id="create-customer-document"
          type="text"
          class="form-control"
          [class.is-invalid]="hasControlError('customerDocument')"
          formControlName="customerDocument"
          maxlength="18"
        />
        <div class="invalid-feedback" *ngIf="hasControlError('customerDocument')">
          {{ getControlErrorMessage('customerDocument') }}
        </div>
      </div>

      <div *ngIf="apiErrorMessage()" class="alert alert-danger py-2" role="alert">
        {{ apiErrorMessage() }}
      </div>

      <div class="d-flex justify-content-end gap-2">
        <button type="button" class="btn btn-outline-secondary" (click)="cancelled.emit()" [disabled]="isSubmitting()">
          Cancelar
        </button>
        <button type="submit" class="btn btn-primary" [disabled]="isSubmitting()">
          {{ isSubmitting() ? 'Criando...' : 'Criar nota' }}
        </button>
      </div>
    </form>
  `,
})
export class InvoiceFormComponent {
  private readonly fb = new FormBuilder();
  private readonly customerDocumentPattern = /^(\d{11}|\d{14}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})$/;

  readonly isSubmitting = input(false);
  readonly apiErrorMessage = input<string | null>(null);
  readonly apiFieldErrors = input<Partial<Record<keyof CreateInvoiceRequest, string>>>({});

  readonly submitted = output<CreateInvoiceRequest>();
  readonly cancelled = output<void>();

  readonly form = this.fb.nonNullable.group({
    customerName: ['', [Validators.required, Validators.maxLength(255), this.trimRequiredValidator]],
    customerDocument: [
      '',
      [
        Validators.required,
        this.trimRequiredValidator,
        Validators.minLength(11),
        Validators.maxLength(18),
        this.documentValidator,
      ],
    ],
  });

  hasControlError(controlName: keyof CreateInvoiceRequest): boolean {
    const control = this.form.controls[controlName];
    return !!((control.touched || control.dirty) && control.invalid) || !!this.apiFieldErrors()[controlName];
  }

  getControlErrorMessage(controlName: keyof CreateInvoiceRequest): string {
    const control = this.form.controls[controlName];
    const apiError = this.apiFieldErrors()[controlName];

    if (apiError) {
      return apiError;
    }

    if (control.hasError('required') || control.hasError('trimRequired')) {
      return 'Este campo é obrigatório.';
    }

    if (controlName === 'customerName' && control.hasError('maxlength')) {
      return 'Nome deve ter no máximo 255 caracteres.';
    }

    if (controlName === 'customerDocument') {
      if (control.hasError('minlength')) {
        return 'Documento deve ter pelo menos 11 caracteres.';
      }

      if (control.hasError('maxlength')) {
        return 'Documento deve ter no máximo 18 caracteres.';
      }

      if (control.hasError('documentFormat')) {
        return 'Documento deve estar no formato CPF ou CNPJ válido.';
      }
    }

    return 'Valor inválido.';
  }

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const payload: CreateInvoiceRequest = {
      customerName: this.form.controls.customerName.value.trim(),
      customerDocument: this.form.controls.customerDocument.value.trim(),
    };

    this.submitted.emit(payload);
  }

  private trimRequiredValidator(control: AbstractControl<string>): ValidationErrors | null {
    return control.value.trim().length > 0 ? null : { trimRequired: true };
  }

  private documentValidator(control: AbstractControl<string>): ValidationErrors | null {
    const value = control.value.trim();

    if (value.length === 0) {
      return null;
    }

    return this.customerDocumentPattern.test(value) ? null : { documentFormat: true };
  }
}