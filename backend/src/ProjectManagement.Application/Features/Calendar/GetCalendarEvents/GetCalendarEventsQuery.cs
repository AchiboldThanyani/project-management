using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Calendar.DTOs;

namespace ProjectManagement.Application.Features.Calendar.GetCalendarEvents;

public sealed record GetCalendarEventsQuery(DateTime Start, DateTime End)
    : IQuery<List<CalendarEventDto>>;
