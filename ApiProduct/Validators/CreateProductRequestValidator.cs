using ApiProduct.Contracts;
using FluentValidation;

namespace ApiProduct.Validators;

public class CreateProductRequestValidator : AbstractValidator<CreateProductRequest>
{
    public CreateProductRequestValidator()
    {
        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Código é obrigatório.")
            .MaximumLength(50).WithMessage("Código deve ter no máximo 50 caracteres.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Nome é obrigatório.")
            .MaximumLength(255).WithMessage("Nome deve ter no máximo 255 caracteres.");

        RuleFor(x => x.Stock)
            .GreaterThanOrEqualTo(0).WithMessage("Estoque não pode ser negativo.");

        RuleFor(x => x.Price)
            .GreaterThanOrEqualTo(0).WithMessage("Preço não pode ser negativo.");
    }
}