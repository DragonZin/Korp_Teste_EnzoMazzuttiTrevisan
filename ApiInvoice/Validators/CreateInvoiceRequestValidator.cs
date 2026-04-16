using ApiInvoice.Contracts;
using FluentValidation;

namespace ApiInvoice.Validators;

public class CreateInvoiceRequestValidator : AbstractValidator<CreateInvoiceRequest>
{
    public CreateInvoiceRequestValidator()
    {
        RuleFor(x => x.CustomerName)
            .NotEmpty().WithMessage("CustomerName é obrigatório.")
            .MaximumLength(255).WithMessage("CustomerName deve ter no máximo 255 caracteres.");

        RuleFor(x => x.CustomerDocument)
            .NotEmpty().WithMessage("CustomerDocument é obrigatório.")
            .MaximumLength(50).WithMessage("CustomerDocument deve ter no máximo 50 caracteres.");
    }
}