using MediatR;

namespace ProjectManagement.Application.Common;

public interface IQuery<TResponse> : IRequest<Result<TResponse>> { }
