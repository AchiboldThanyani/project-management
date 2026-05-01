using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Infrastructure.Persistence.Configurations;

public class TaskAssigneeConfiguration : IEntityTypeConfiguration<TaskAssignee>
{
    public void Configure(EntityTypeBuilder<TaskAssignee> builder)
    {
        builder.HasKey(a => new { a.TaskId, a.UserId });
        builder.Property(a => a.UserId).HasMaxLength(450);
        builder.Property(a => a.FullName).HasMaxLength(200);

        builder.HasOne(a => a.Task)
            .WithMany(t => t.Assignees)
            .HasForeignKey(a => a.TaskId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
