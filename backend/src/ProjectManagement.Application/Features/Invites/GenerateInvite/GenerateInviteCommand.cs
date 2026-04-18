using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Invites.DTOs;

namespace ProjectManagement.Application.Features.Invites.GenerateInvite;
public record GenerateInviteCommand(Guid ProjectId) : IRequest<Result<InviteDto>>;
