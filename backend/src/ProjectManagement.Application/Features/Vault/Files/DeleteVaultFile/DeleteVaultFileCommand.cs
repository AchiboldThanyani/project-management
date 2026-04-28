using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Vault.Files.DeleteVaultFile;

public sealed record DeleteVaultFileCommand(Guid FileId, Guid ProjectId) : ICommand;
