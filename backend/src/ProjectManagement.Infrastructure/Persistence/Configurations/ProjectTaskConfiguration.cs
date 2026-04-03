using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Infrastructure.Persistence.Configurations;

public class ProjectTaskConfiguration : IEntityTypeConfiguration<ProjectTask>
{
    public void Configure(EntityTypeBuilder<ProjectTask> builder)
    {
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Title).IsRequired().HasMaxLength(500);
        builder.Property(t => t.Description).HasMaxLength(5000);
        builder.HasMany(t => t.Comments).WithOne(c => c.Task).HasForeignKey(c => c.TaskId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(t => t.Sprint).WithMany(s => s.Tasks).HasForeignKey(t => t.SprintId).OnDelete(DeleteBehavior.SetNull);
    }
}
