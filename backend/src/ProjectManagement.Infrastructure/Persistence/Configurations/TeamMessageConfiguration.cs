using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Infrastructure.Persistence.Configurations;

public class TeamMessageConfiguration : IEntityTypeConfiguration<TeamMessage>
{
    public void Configure(EntityTypeBuilder<TeamMessage> builder)
    {
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Content).IsRequired().HasMaxLength(4000);
        builder.HasOne(m => m.Team).WithMany().HasForeignKey(m => m.TeamId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(m => new { m.TeamId, m.CreatedAt });
    }
}
