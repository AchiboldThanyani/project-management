using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Infrastructure.Persistence.Configurations;

public class StandupReportConfiguration : IEntityTypeConfiguration<StandupReport>
{
    public void Configure(EntityTypeBuilder<StandupReport> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.ProjectId).IsRequired();
        builder.Property(r => r.ReportJson).IsRequired();
        builder.HasIndex(r => new { r.ProjectId, r.GeneratedAt });
        builder.HasOne(r => r.Project)
            .WithMany()
            .HasForeignKey(r => r.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
