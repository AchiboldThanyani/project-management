namespace ProjectManagement.Application.Common.Exceptions;

public class NotFoundException : Exception
{
    public NotFoundException(string name, object key)
        : base($"'{name}' with key '{key}' was not found.") { }
}
