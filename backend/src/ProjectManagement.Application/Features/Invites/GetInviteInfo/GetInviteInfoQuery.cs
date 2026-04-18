using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Invites.DTOs;

namespace ProjectManagement.Application.Features.Invites.GetInviteInfo;
public record GetInviteInfoQuery(string Token) : IRequest<Result<InviteDto>>;
