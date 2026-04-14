using Microsoft.EntityFrameworkCore;
using ApiProduct.Models;

namespace ApiProduct.Data;

public class AppDbContext : DbContext
{
    public DbSet<Product> Products => Set<Product>();
    public DbSet<IdempotencyKeyRecord> IdempotencyKeys => Set<IdempotencyKeyRecord>();

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("products");

            entity.HasKey(p => p.Id);
           
            entity.HasIndex(p => p.Code)
                .IsUnique()
                .HasFilter("\"is_deleted\" = false");

            entity.HasQueryFilter(p => !p.IsDeleted);

            entity.Property(p => p.Id)
                .HasColumnName("id");
            
            entity.Property(p => p.Code)
                .HasColumnName("code")
                .IsRequired()
                .HasMaxLength(50);

            entity.Property(p => p.Name)
                .HasColumnName("name")
                .IsRequired()
                .HasMaxLength(255);

            entity.Property(p => p.Stock)
                .HasColumnName("stock")
                .IsRequired();

            entity.Property(p => p.Price)
                .HasColumnName("price")
                .HasColumnType("numeric(10,2)")
                .IsRequired();

            entity.Property(p => p.IsDeleted)
                .HasColumnName("is_deleted")
                .IsRequired()
                .HasDefaultValue(false);

            entity.Property(p => p.CreatedAt)
                .HasColumnName("created_at")
                .IsRequired();

            entity.Property(p => p.UpdatedAt)
                .HasColumnName("updated_at")
                .IsRequired();
        });
           
    modelBuilder.Entity<IdempotencyKeyRecord>(entity =>
        {
            entity.ToTable("idempotency_keys");

            entity.HasKey(i => i.Id);

            entity.HasIndex(i => new { i.Key, i.Endpoint })
                .IsUnique();

            entity.Property(i => i.Id)
                .HasColumnName("id");

            entity.Property(i => i.Key)
                .HasColumnName("key")
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(i => i.Endpoint)
                .HasColumnName("endpoint")
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(i => i.Response)
                .HasColumnName("response")
                .HasColumnType("jsonb")
                .IsRequired();

            entity.Property(i => i.StatusCode)
                .HasColumnName("status_code")
                .IsRequired();

            entity.Property(i => i.CreatedAt)
                .HasColumnName("created_at")
                .IsRequired();
        });
    }

    public override int SaveChanges()
    {
        UpdateTimestamps();
        return base.SaveChanges();
    }

    public override async Task<int> SaveChangesAsync(
        CancellationToken cancellationToken = default)
    {
        UpdateTimestamps();
        return await base.SaveChangesAsync(cancellationToken);
    }

    private void UpdateTimestamps()
    {
        var entries = ChangeTracker
            .Entries<Product>();

        foreach (var entry in entries)
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