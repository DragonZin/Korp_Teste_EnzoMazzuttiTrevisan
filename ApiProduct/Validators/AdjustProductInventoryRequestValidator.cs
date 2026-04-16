using ApiProduct.Contracts;
using FluentValidation;

namespace ApiProduct.Validators;

public class AdjustProductInventoryRequestValidator : AbstractValidator<AdjustProductInventoryRequest>
{
    public AdjustProductInventoryRequestValidator()
    {
        RuleFor(x => x)
            .NotNull()
            .WithMessage("O corpo da requisição é obrigatório.");
    }
}