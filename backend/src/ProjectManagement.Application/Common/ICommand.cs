using MediatR;

namespace ProjectManagement.Application.Common;

public interface ICommand<TResponse> : IRequest<Result<TResponse>> { }

public interface ICommand : IRequest<Result> { }
