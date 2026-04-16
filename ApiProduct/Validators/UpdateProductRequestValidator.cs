
using ApiProduct.Contracts;
using FluentValidation;

namespace ApiProduct.Validators;

public class UpdateProductRequestValidator : AbstractValidator<UpdateProductRequest>
{
    public UpdateProductRequestValidator()
    {
        RuleFor(x => x)
            .Must(HaveAtLeastOneFieldToUpdate)
            .WithMessage("Informe ao menos um campo para atualização.");

        When(x => x.Code is not null, () =>
        {
            RuleFor(x => x.Code!)
                .NotEmpty().WithMessage("Código é obrigatório.")
                .MaximumLength(50).WithMessage("Código deve ter no máximo 50 caracteres.");
        });

        When(x => x.Name is not null, () =>
        {
            RuleFor(x => x.Name!)
                .NotEmpty().WithMessage("Nome é obrigatório.")
                .MaximumLength(255).WithMessage("Nome deve ter no máximo 255 caracteres.");
        });

        When(x => x.Stock.HasValue, () =>
        {
            RuleFor(x => x.Stock!.Value)
                .GreaterThanOrEqualTo(0).WithMessage("Estoque não pode ser negativo.");
        });

        When(x => x.Price.HasValue, () =>
        {
            RuleFor(x => x.Price!.Value)
                .GreaterThanOrEqualTo(0).WithMessage("Preço não pode ser negativo.");
        });
    }

    private static bool HaveAtLeastOneFieldToUpdate(UpdateProductRequest request)
        => request.Code is not null ||
           request.Name is not null ||
           request.Stock.HasValue ||
           request.Price.HasValue;
}