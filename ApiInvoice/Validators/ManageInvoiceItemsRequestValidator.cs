using ApiInvoice.Contracts;
using FluentValidation;

namespace ApiInvoice.Validators;

public class ManageInvoiceItemsRequestValidator : AbstractValidator<ManageInvoiceItemsRequest>
{
    public ManageInvoiceItemsRequestValidator()
    {
        RuleFor(x => x.Products)
            .NotNull().WithMessage("Informe ao menos um produto para gerenciar na nota fiscal.")
            .Must(products => products is { Count: > 0 })
            .WithMessage("Informe ao menos um produto para gerenciar na nota fiscal.");

        RuleForEach(x => x.Products)
            .SetValidator(new ManageInvoiceItemRequestValidator());

        RuleFor(x => x.Products)
            .Must(HaveUniqueProductIds)
            .WithMessage("Não é permitido repetir o mesmo ProductId na mesma requisição.")
            .When(x => x.Products is not null);
    }

    private static bool HaveUniqueProductIds(IReadOnlyCollection<ManageInvoiceItemRequest>? products)
        => products is null || products.GroupBy(p => p.ProductId).All(group => group.Count() == 1);
}