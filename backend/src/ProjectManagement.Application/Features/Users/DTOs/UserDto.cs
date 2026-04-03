namespace ProjectManagement.Application.Features.Users.DTOs;

public record UserDto
{
    public string Id { get; init; } = default!;
    public string Email { get; init; } = default!;
    public string FirstName { get; init; } = default!;
    public string LastName { get; init; } = default!;
    public string FullName => $"{FirstName} {LastName}";
}
