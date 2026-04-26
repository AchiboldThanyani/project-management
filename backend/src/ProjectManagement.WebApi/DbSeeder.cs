using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Infrastructure.Identity;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.WebApi;

public static class DbSeeder
{
    // ── Called on every startup ───────────────────────────────────────────────
    public static async Task SeedAdminUserAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        await EnsureAdminAsync(userManager);
    }

    // ── Called in Development only ────────────────────────────────────────────
    public static async Task SeedDemoDataAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db          = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        // Apply any pending migrations (no-op if already up to date)
        await db.Database.MigrateAsync();

        // Skip seeding if already done
        if (await userManager.FindByEmailAsync("super.user@projecthub.com") is not null)
            return;

        // ── Users ─────────────────────────────────────────────────────────────
        var admin  = await CreateUser(userManager, "super.user@projecthub.com",  "Admin@123",  "Super",   "User",    UserRole.Admin);
        var alice  = await CreateUser(userManager, "alice.johnson@projecthub.com","Staff@123",  "Alice",   "Johnson", UserRole.ProjectManager);
        var bob    = await CreateUser(userManager, "bob.smith@projecthub.com",    "Staff@123",  "Bob",     "Smith",   UserRole.ProjectManager);
        var carol  = await CreateUser(userManager, "carol.white@projecthub.com",  "Staff@123",  "Carol",   "White",   UserRole.Staff);
        var dan    = await CreateUser(userManager, "dan.brown@projecthub.com",    "Staff@123",  "Dan",     "Brown",   UserRole.Staff);
        var client = await CreateUser(userManager, "eve.client@acme.com",         "Client@123", "Eve",     "Carter",  UserRole.Client);

        // ── Teams ─────────────────────────────────────────────────────────────
        var engineering = Team.Create("Engineering", "Core product engineering team");
        var productDesign = Team.Create("Product & Design", "Product management and design team");
        db.Teams.AddRange(engineering, productDesign);
        await db.SaveChangesAsync();

        db.TeamMembers.AddRange(
            TeamMember.Create(engineering.Id,   alice.Id, TeamRole.Owner),
            TeamMember.Create(engineering.Id,   bob.Id,   TeamRole.Manager),
            TeamMember.Create(engineering.Id,   carol.Id, TeamRole.Member),
            TeamMember.Create(engineering.Id,   dan.Id,   TeamRole.Member),
            TeamMember.Create(productDesign.Id, alice.Id, TeamRole.Owner),
            TeamMember.Create(productDesign.Id, carol.Id, TeamRole.Manager),
            TeamMember.Create(productDesign.Id, dan.Id,   TeamRole.Member)
        );
        await db.SaveChangesAsync();

        // ── Projects ──────────────────────────────────────────────────────────
        var now = DateTime.UtcNow;

        var platform = Project.Create(
            "ProjectHub Platform",
            alice.Id,
            "Core project management platform — internal product.",
            engineering.Id,
            now.AddDays(-30), now.AddDays(60));

        var mobile = Project.Create(
            "Mobile App v2",
            bob.Id,
            "Redesigned mobile client for iOS and Android.",
            engineering.Id,
            now.AddDays(-10), now.AddDays(80));

        var portal = Project.Create(
            "Customer Portal Redesign",
            alice.Id,
            "Revamp of the client-facing support portal.",
            productDesign.Id,
            now, now.AddDays(45));

        db.Projects.AddRange(platform, mobile, portal);
        await db.SaveChangesAsync();

        // ── Project Members ───────────────────────────────────────────────────
        db.ProjectMembers.AddRange(
            // Platform
            ProjectMember.Create(platform.Id, alice.Id, ProjectMemberRole.Manager),
            ProjectMember.Create(platform.Id, bob.Id,   ProjectMemberRole.Lead),
            ProjectMember.Create(platform.Id, carol.Id, ProjectMemberRole.Member),
            ProjectMember.Create(platform.Id, dan.Id,   ProjectMemberRole.Member),
            // Mobile
            ProjectMember.Create(mobile.Id, bob.Id,   ProjectMemberRole.Manager),
            ProjectMember.Create(mobile.Id, carol.Id, ProjectMemberRole.Lead),
            ProjectMember.Create(mobile.Id, dan.Id,   ProjectMemberRole.Member),
            // Portal
            ProjectMember.Create(portal.Id, alice.Id, ProjectMemberRole.Manager),
            ProjectMember.Create(portal.Id, carol.Id, ProjectMemberRole.Lead),
            ProjectMember.Create(portal.Id, dan.Id,   ProjectMemberRole.Member)
        );
        await db.SaveChangesAsync();

        // ── Sprints ───────────────────────────────────────────────────────────
        var sp1 = Sprint.Create("Sprint 1 — Foundation", platform.Id,
            now.AddDays(-28), now.AddDays(-14),
            "Set up core architecture and CI pipeline");
        sp1.Complete("Solid foundation. Auth and project CRUD done. Need better error handling next sprint.");

        var sp2 = Sprint.Create("Sprint 2 — Tasks & Sprints", platform.Id,
            now.AddDays(-14), now.AddDays(0),
            "Task management, sprint board, and drag-and-drop");
        sp2.Activate();

        var sp3 = Sprint.Create("Sprint 3 — Notifications & Portal", platform.Id,
            now.AddDays(1), now.AddDays(14),
            "Real-time notifications and customer portal");

        var mSp1 = Sprint.Create("Sprint 1 — Discovery", mobile.Id,
            now.AddDays(-8), now.AddDays(6),
            "Wireframes, API contracts, and auth flows");
        mSp1.Activate();

        var pSp1 = Sprint.Create("Sprint 1 — Audit & Wireframes", portal.Id,
            now, now.AddDays(14),
            "Audit current portal and produce new wireframes");
        pSp1.Activate();

        db.Sprints.AddRange(sp1, sp2, sp3, mSp1, pSp1);
        await db.SaveChangesAsync();
    }

    // ─────────────────────────────────────────────────────────────────────────

    private static async Task EnsureAdminAsync(UserManager<ApplicationUser> userManager)
    {
        const string email = "super.user@projecthub.com";
        const string password = "Admin@123";

        var existing = await userManager.FindByEmailAsync(email);
        if (existing is not null)
        {
            if (existing.Role != UserRole.Admin)
            {
                existing.Role = UserRole.Admin;
                await userManager.UpdateAsync(existing);
            }
            return;
        }

        await CreateUser(userManager, email, password, "Super", "User", UserRole.Admin);
    }

    private static async Task<ApplicationUser> CreateUser(
        UserManager<ApplicationUser> userManager,
        string email, string password, string firstName, string lastName, UserRole role)
    {
        var user = new ApplicationUser
        {
            UserName  = email,
            Email     = email,
            FirstName = firstName,
            LastName  = lastName,
            Role      = role,
        };

        var result = await userManager.CreateAsync(user, password);
        if (!result.Succeeded)
            throw new Exception($"Failed to create {email}: {string.Join(", ", result.Errors.Select(e => e.Description))}");

        return user;
    }
}
