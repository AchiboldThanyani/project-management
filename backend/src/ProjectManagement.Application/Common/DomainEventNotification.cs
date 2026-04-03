using MediatR;
using ProjectManagement.Domain.Common;

namespace ProjectManagement.Application.Common;

/// <summary>Wraps a domain event so it can be published via MediatR.</summary>
public sealed record DomainEventNotification<T>(T DomainEvent) : INotification where T : IDomainEvent;
