using ApiProduct.Contracts;
using FluentValidation;

namespace ApiProduct.Validators;

public class ProductQuantityRequestValidator : AbstractValidator<ProductQuantityRequest>
{
    public ProductQuantityRequestValidator()
    {
        RuleFor(x => x.Quantity)
            .GreaterThan(0)
            .WithMessage("Quantidade deve ser maior que zero.");
    }
}