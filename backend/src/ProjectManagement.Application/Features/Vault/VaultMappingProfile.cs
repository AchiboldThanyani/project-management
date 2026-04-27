using AutoMapper;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Application.Features.Vault;

public class VaultMappingProfile : Profile
{
    public VaultMappingProfile()
    {
        CreateMap<VaultFolder, VaultFolderDto>();
        CreateMap<VaultDocument, VaultDocumentDto>();
        CreateMap<VaultDocument, VaultDocumentDetailDto>();
        CreateMap<VaultFile, VaultFileDto>();
    }
}
