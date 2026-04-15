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
  templateUrl: './product-form.component.html',
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