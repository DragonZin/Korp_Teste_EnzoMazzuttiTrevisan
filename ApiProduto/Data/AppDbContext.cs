using Microsoft.EntityFrameworkCore;
using ProductsService.Models;

namespace ProductsService.Data;

public class AppDbContext : DbContext
{
    public DbSet<Product> Products => Set<Product>();

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("Products");

            entity.HasKey(p => p.Id);

            entity.Property(p => p.Id)
                .HasColumnName("id");

            entity.Property(p => p.Name)
                .HasColumnName("name")
                .IsRequired()
                .HasMaxLength(255);

            entity.Property(p => p.Stock)
                .HasColumnName("stock")
                .IsRequired();

            entity.Property(p => p.CreatedAt)
                .HasColumnName("created_at")
                .IsRequired();

            entity.Property(p => p.UpdatedAt)
                .HasColumnName("updated_at")
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