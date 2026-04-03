using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class CommentRepository(ApplicationDbContext context)
    : Repository<Comment>(context), ICommentRepository { }
