using ApiProduct.Contracts;
using FluentValidation;

namespace ApiProduct.Validators;

public class GetProductsByIdsRequestValidator : AbstractValidator<GetProductsByIdsRequest>
{
    public GetProductsByIdsRequestValidator()
    {
        RuleFor(x => x.Ids)
            .NotNull().WithMessage("A lista de IDs é obrigatória.")
            .Must(ids => ids is { Count: > 0 }).WithMessage("Informe ao menos um ID.");

        RuleForEach(x => x.Ids)
            .NotEqual(Guid.Empty)
            .WithMessage("IDs devem ser válidos.");
    }
}