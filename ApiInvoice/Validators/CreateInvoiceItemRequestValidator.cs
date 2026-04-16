using ApiInvoice.Contracts;
using FluentValidation;

namespace ApiInvoice.Validators;

public class CreateInvoiceItemRequestValidator : AbstractValidator<CreateInvoiceItemRequest>
{
    public CreateInvoiceItemRequestValidator()
    {
        RuleFor(x => x.ProductId)
            .NotEqual(Guid.Empty)
            .WithMessage("ProductId é obrigatório.");

        RuleFor(x => x.ProductCode)
            .NotEmpty().WithMessage("ProductCode é obrigatório.")
            .MaximumLength(50).WithMessage("ProductCode deve ter no máximo 50 caracteres.");

        RuleFor(x => x.ProductName)
            .NotEmpty().WithMessage("ProductName é obrigatório.")
            .MaximumLength(255).WithMessage("ProductName deve ter no máximo 255 caracteres.");

        RuleFor(x => x.UnitPrice)
            .GreaterThanOrEqualTo(0)
            .WithMessage("UnitPrice não pode ser negativo.");

        RuleFor(x => x.Quantity)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Quantity não pode ser negativo.");
    }
}