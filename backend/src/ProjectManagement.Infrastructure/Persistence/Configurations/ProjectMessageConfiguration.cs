using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Infrastructure.Persistence.Configurations;

public class ProjectMessageConfiguration : IEntityTypeConfiguration<ProjectMessage>
{
    public void Configure(EntityTypeBuilder<ProjectMessage> builder)
    {
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Content).IsRequired().HasMaxLength(4000);
        builder.HasOne(m => m.Project).WithMany().HasForeignKey(m => m.ProjectId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(m => new { m.ProjectId, m.CreatedAt });
    }
}
