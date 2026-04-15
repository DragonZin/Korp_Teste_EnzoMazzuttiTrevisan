import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';

import { FieldValidationMessages, getFirstControlErrorMessage, hasControlError } from '../../../core/forms/form-error.util';
import { CreateInvoiceRequest } from '../models/create-invoice-request.model';

@Component({
  selector: 'app-invoice-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './invoice-form.component.html',
})
export class InvoiceFormComponent {
  private readonly fb = new FormBuilder();
  private readonly customerDocumentPattern = /^(\d{11}|\d{14}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})$/;

  private readonly trimRequiredValidator: ValidatorFn = (control: AbstractControl<string>) =>
    control.value.trim().length > 0 ? null : { trimRequired: true };
  private readonly documentValidator: ValidatorFn = (control: AbstractControl<string>) => {
    const value = control.value.trim();

    if (value.length === 0) {
      return null;
    }

    return this.customerDocumentPattern.test(value) ? null : { documentFormat: true };
  };

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

  private readonly fieldMessages: FieldValidationMessages<keyof CreateInvoiceRequest> = {
    customerName: {
      maxlength: 'Nome deve ter no máximo 255 caracteres.',
    },
    customerDocument: {
      minlength: 'Documento deve ter pelo menos 11 caracteres.',
      maxlength: 'Documento deve ter no máximo 18 caracteres.',
      documentFormat: 'Documento deve estar no formato CPF ou CNPJ válido.',
    },
  };

  hasControlError(controlName: keyof CreateInvoiceRequest): boolean {
    return hasControlError(this.form.controls[controlName], this.apiFieldErrors()[controlName]);
  }

  getControlErrorMessage(controlName: keyof CreateInvoiceRequest): string {
    return getFirstControlErrorMessage({
      control: this.form.controls[controlName],
      field: controlName,
      apiError: this.apiFieldErrors()[controlName],
      fieldMessages: this.fieldMessages,
      priority: ['required', 'trimRequired', 'documentFormat', 'minlength', 'maxlength', 'min', 'max', 'pattern'],
    });
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
}