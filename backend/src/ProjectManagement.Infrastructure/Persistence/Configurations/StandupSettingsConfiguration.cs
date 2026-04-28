using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Infrastructure.Persistence.Configurations;

public class StandupSettingsConfiguration : IEntityTypeConfiguration<StandupSettings>
{
    public void Configure(EntityTypeBuilder<StandupSettings> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.ProjectId).IsRequired();
        builder.Property(s => s.ScheduledTime).HasColumnType("time").IsRequired();
        builder.HasIndex(s => s.ProjectId).IsUnique();
        builder.HasOne(s => s.Project)
            .WithMany()
            .HasForeignKey(s => s.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
