import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { FieldValidationMessages, getFirstControlErrorMessage, hasControlError } from '../../../core/forms/form-error.util';
import { CreateProductRequest } from '../models/create-product-request.model';
import { Product } from '../models/product.model';
import { UpdateProductRequest } from '../models/update-product-request.model';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="mb-3">
        <label for="product-code" class="form-label">Código</label>
        <input
          id="product-code"
          type="text"
          class="form-control"
          [class.is-invalid]="hasControlError('code')"
          formControlName="code"
          maxlength="50"
        />
        <div class="invalid-feedback" *ngIf="hasControlError('code')">
          {{ getControlErrorMessage('code') }}
        </div>
      </div>

      <div class="mb-3">
        <label for="product-name" class="form-label">Nome</label>
        <input
          id="product-name"
          type="text"
          class="form-control"
          [class.is-invalid]="hasControlError('name')"
          formControlName="name"
          maxlength="255"
        />
        <div class="invalid-feedback" *ngIf="hasControlError('name')">
          {{ getControlErrorMessage('name') }}
        </div>
      </div>

      <div class="row g-3 mb-3">
        <div class="col-sm-6">
          <label for="product-stock" class="form-label">Estoque</label>
          <input
            id="product-stock"
            type="number"
            class="form-control"
            [class.is-invalid]="hasControlError('stock')"
            formControlName="stock"
            min="0"
            step="1"
          />
          <div class="invalid-feedback" *ngIf="hasControlError('stock')">
            {{ getControlErrorMessage('stock') }}
          </div>
        </div>

        <div class="col-sm-6">
          <label for="product-price" class="form-label">Preço</label>
          <input
            id="product-price"
            type="number"
            class="form-control"
            [class.is-invalid]="hasControlError('price')"
            formControlName="price"
            min="0"
            step="0.01"
          />
          <div class="invalid-feedback" *ngIf="hasControlError('price')">
            {{ getControlErrorMessage('price') }}
          </div>
        </div>
      </div>

      <div *ngIf="apiErrorMessage()" class="alert alert-danger py-2" role="alert">
        {{ apiErrorMessage() }}
      </div>

      <div class="d-flex justify-content-end gap-2 mt-4">
        <button
          type="button"
          class="btn btn-outline-secondary"
          (click)="cancelled.emit()"
          [disabled]="isSubmitting()"
        >
          Cancelar
        </button>
        <button type="submit" class="btn btn-primary" [disabled]="isSubmitting()">
          {{ submitLabel() }}
        </button>
      </div>
    </form>
  `,
})
export class ProductFormComponent {
  private readonly fb = new FormBuilder();

  readonly product = input<Product | null>(null);
  readonly isSubmitting = input(false);
  readonly apiErrorMessage = input<string | null>(null);
  readonly apiFieldErrors = input<Partial<Record<keyof CreateProductRequest, string>>>({});

  readonly submitted = output<CreateProductRequest | UpdateProductRequest>();
  readonly cancelled = output<void>();

  readonly submitLabel = computed(() => (this.product() ? 'Salvar alterações' : 'Criar produto'));

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(255)]],
    stock: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    price: [0, [Validators.required, Validators.min(0)]],
  });

  private readonly fieldMessages: FieldValidationMessages<keyof CreateProductRequest> = {
    code: {
      maxlength: 'Código deve ter no máximo 50 caracteres.',
    },
    name: {
      maxlength: 'Nome deve ter no máximo 255 caracteres.',
    },
    stock: {
      pattern: 'Estoque deve ser um número inteiro.',
      min: 'Valor não pode ser negativo.',
    },
    price: {
      min: 'Valor não pode ser negativo.',
    },
  };

  constructor() {
    effect(() => {
      const product = this.product();

      this.form.reset({
        code: product?.code ?? '',
        name: product?.name ?? '',
        stock: product?.stock ?? 0,
        price: product?.price ?? 0,
      });
    });
  }

  hasControlError(controlName: keyof CreateProductRequest): boolean {
    return hasControlError(this.form.controls[controlName], this.apiFieldErrors()[controlName]);
  }

  getControlErrorMessage(controlName: keyof CreateProductRequest): string {
    return getFirstControlErrorMessage({
      control: this.form.controls[controlName],
      field: controlName,
      apiError: this.apiFieldErrors()[controlName],
      fieldMessages: this.fieldMessages,
    });
  }

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const payload: CreateProductRequest = {
      code: this.form.controls.code.value.trim(),
      name: this.form.controls.name.value.trim(),
      stock: Number(this.form.controls.stock.value),
      price: Number(this.form.controls.price.value),
    };

    this.submitted.emit(payload);
  }
}