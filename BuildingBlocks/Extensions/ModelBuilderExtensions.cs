using BuildingBlocks.Models;
using Microsoft.EntityFrameworkCore;

namespace BuildingBlocks.Extensions;

public static class ModelBuilderExtensions
{
    public static ModelBuilder ConfigureIdempotencyKeyRecord(this ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<IdempotencyKeyRecord>(entity =>
        {
            entity.ToTable("idempotency_keys");

            entity.HasKey(i => i.Id);

            entity.HasIndex(i => new { i.Key, i.Endpoint })
                .IsUnique();

            entity.HasIndex(i => i.CreatedAt);

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

        return modelBuilder;
    }
}