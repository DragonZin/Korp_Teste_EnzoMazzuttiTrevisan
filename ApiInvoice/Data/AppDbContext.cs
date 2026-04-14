using ApiInvoice.Models;
using Microsoft.EntityFrameworkCore;
using BuildingBlocks.Abstractions;
using BuildingBlocks.Extensions;
using BuildingBlocks.Models;

namespace ApiInvoice.Data;

public class AppDbContext : DbContext, IIdempotencyDbContext
{
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceProduct> InvoiceProducts => Set<InvoiceProduct>();
    public DbSet<IdempotencyKeyRecord> IdempotencyKeys => Set<IdempotencyKeyRecord>();

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.ToTable("invoices");

            entity.HasKey(i => i.Id);

            entity.Property(i => i.Id)
                .HasColumnName("id");

            entity.Property(i => i.Number)
                .HasColumnName("number")
                .IsRequired();

            entity.HasIndex(i => i.Number)
                .IsUnique();

            entity.Property(i => i.TotalAmount)
                .HasColumnName("total_amount")
                .HasColumnType("numeric(10,2)")
                .IsRequired();

            entity.Property(i => i.Status)
                .HasColumnName("status")
                .HasConversion<int>()
                .IsRequired();

            entity.Property(i => i.CustomerName)
                .HasColumnName("customer_name")
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(i => i.CustomerDocument)
                .HasColumnName("customer_document")
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(i => i.CreatedAt)
                .HasColumnName("created_at")
                .IsRequired();

            entity.Property(i => i.UpdatedAt)
                .HasColumnName("updated_at")
                .IsRequired();

            entity.Property(i => i.ClosedAt)
                .HasColumnName("closed_at");

            entity.HasMany(i => i.Products)
                .WithOne(p => p.Invoice)
                .HasForeignKey(p => p.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.ConfigureIdempotencyKeyRecord();

        modelBuilder.Entity<InvoiceProduct>(entity =>
        {
            entity.ToTable("invoice_products");

            entity.HasKey(i => i.Id);

            entity.Property(i => i.Id)
                .HasColumnName("id");

            entity.Property(i => i.InvoiceId)
                .HasColumnName("invoice_id")
                .IsRequired();

            entity.Property(i => i.ProductId)
                .HasColumnName("product_id")
                .IsRequired();

            entity.Property(i => i.Quantity)
                .HasColumnName("quantity")
                .IsRequired();

            entity.Property(i => i.UnitPrice)
                .HasColumnName("unit_price")
                .HasColumnType("numeric(10,2)")
                .IsRequired();

            entity.Ignore(i => i.TotalPrice);
        });
    }

    public override int SaveChanges()
    {
        UpdateTimestamps();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        UpdateTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void UpdateTimestamps()
    {
        var invoiceEntries = ChangeTracker.Entries<Invoice>();

        foreach (var entry in invoiceEntries)
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = DateTime.UtcNow;
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
        }
    }
}