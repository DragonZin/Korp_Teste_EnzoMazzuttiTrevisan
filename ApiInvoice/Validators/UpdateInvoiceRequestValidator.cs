using ApiInvoice.Contracts;
using FluentValidation;

namespace ApiInvoice.Validators;

public class UpdateInvoiceRequestValidator : AbstractValidator<UpdateInvoiceRequest>
{
    public UpdateInvoiceRequestValidator()
    {
        RuleFor(x => x)
            .Must(HaveAtLeastOneFieldToUpdate)
            .WithMessage("Informe CustomerName e/ou CustomerDocument para atualização.");

        When(x => x.CustomerName is not null, () =>
        {
            RuleFor(x => x.CustomerName!)
                .NotEmpty().WithMessage("CustomerName é obrigatório.")
                .MaximumLength(255).WithMessage("CustomerName deve ter no máximo 255 caracteres.");
        });

        When(x => x.CustomerDocument is not null, () =>
        {
            RuleFor(x => x.CustomerDocument!)
                .NotEmpty().WithMessage("CustomerDocument é obrigatório.")
                .MaximumLength(50).WithMessage("CustomerDocument deve ter no máximo 50 caracteres.");
        });
    }

    private static bool HaveAtLeastOneFieldToUpdate(UpdateInvoiceRequest request)
        => request.CustomerName is not null || request.CustomerDocument is not null;
}