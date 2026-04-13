using ApiInvoice.Models;
using Microsoft.EntityFrameworkCore;

namespace ApiInvoice.Data;

public class AppDbContext : DbContext
{
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceProduct> InvoiceProducts => Set<InvoiceProduct>();

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

            entity.HasIndex(i => i.Number)
                .IsUnique();

            entity.Property(i => i.Id)
                .HasColumnName("id");

            entity.Property(i => i.Number)
                .HasColumnName("number")
                .IsRequired();

            entity.Property(i => i.TotalAmount)
                .HasColumnName("total_amount")
                .HasColumnType("numeric(10,2)")
                .IsRequired();

            entity.Property(i => i.Status)
                .HasColumnName("status")
                .HasConversion<int>()
                .IsRequired();

            entity.Property(i => i.CreatedAt)
                .HasColumnName("created_at")
                .IsRequired();

            entity.Property(i => i.UpdatedAt)
                .HasColumnName("updated_at")
                .IsRequired();

            entity.HasMany(i => i.Products)
                .WithOne(i => i.Invoice)
                .HasForeignKey(i => i.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

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

            entity.Property(i => i.ProductCode)
                .HasColumnName("product_code")
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(i => i.ProductName)
                .HasColumnName("product_name")
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(i => i.UnitPrice)
                .HasColumnName("unit_price")
                .HasColumnType("numeric(10,2)")
                .IsRequired();
            
            entity.Property(i => i.Quantity)
                .HasColumnName("quantity")
                .IsRequired();
        });
    }

    public override int SaveChanges()
    {
        UpdateTimestamps();
        return base.SaveChanges();
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        UpdateTimestamps();
        return await base.SaveChangesAsync(cancellationToken);
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

            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
        }
    }
}