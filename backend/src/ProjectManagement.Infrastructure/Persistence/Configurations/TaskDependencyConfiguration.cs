using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Infrastructure.Persistence.Configurations;

public class TaskDependencyConfiguration : IEntityTypeConfiguration<TaskDependency>
{
    public void Configure(EntityTypeBuilder<TaskDependency> builder)
    {
        builder.HasKey(d => d.Id);

        builder.HasOne(d => d.BlockingTask)
            .WithMany(t => t.BlockingDependencies)
            .HasForeignKey(d => d.BlockingTaskId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.BlockedTask)
            .WithMany(t => t.BlockedByDependencies)
            .HasForeignKey(d => d.BlockedTaskId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(d => new { d.BlockingTaskId, d.BlockedTaskId }).IsUnique();
    }
}
