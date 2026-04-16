using ApiInvoice.Contracts;
using FluentValidation;

namespace ApiInvoice.Validators;

public class ManageInvoiceItemRequestValidator : AbstractValidator<ManageInvoiceItemRequest>
{
    public ManageInvoiceItemRequestValidator()
    {
        RuleFor(x => x.ProductId)
            .NotEqual(Guid.Empty)
            .WithMessage("ProductId é obrigatório.");

        RuleFor(x => x.Quantity)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Quantity não pode ser negativo.");
    }
}
