#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = (process.env["PROJECTHUB_URL"] ?? "http://localhost:5000").replace(/\/$/, "");
const TOKEN = process.env["PROJECTHUB_TOKEN"] ?? "";

if (!TOKEN) {
  process.stderr.write(
    "Error: PROJECTHUB_TOKEN is not set.\n" +
    "Generate a token from your ProjectHub profile page and set it in your MCP config.\n"
  );
  process.exit(1);
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = "";
    try { detail = await res.text(); } catch {}
    throw new Error(`ProjectHub API error ${res.status}: ${detail}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Server setup ──────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "projecthub",
  version: "1.0.0",
});

// ── Tools ─────────────────────────────────────────────────────────────────────

server.registerTool(
  "list_my_projects",
  {
    description: "List all projects the current user is a member of.",
    inputSchema: z.object({
      page: z.number().int().min(1).default(1).describe("Page number"),
      pageSize: z.number().int().min(1).max(100).default(20).describe("Items per page"),
    }),
  },
  async ({ page, pageSize }) => {
    const data = await api<unknown>("GET", `/api/projects?page=${page}&pageSize=${pageSize}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  "list_project_tasks",
  {
    description: "List tasks in a project. Returns paginated results with task details including status, priority, assignees, and due dates.",
    inputSchema: z.object({
      projectId: z.string().uuid().describe("The project ID"),
      page: z.number().int().min(1).default(1).describe("Page number"),
      pageSize: z.number().int().min(1).max(100).default(50).describe("Items per page"),
    }),
  },
  async ({ projectId, page, pageSize }) => {
    const data = await api<unknown>("GET", `/api/tasks/project/${projectId}?page=${page}&pageSize=${pageSize}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  "get_task",
  {
    description: "Get full details of a specific task including description, status, assignees, sub-tasks, time logs, and comments.",
    inputSchema: z.object({
      taskId: z.string().uuid().describe("The task ID"),
    }),
  },
  async ({ taskId }) => {
    const data = await api<unknown>("GET", `/api/tasks/${taskId}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  "update_task_status",
  {
    description: "Update the status of a task. Valid statuses: Todo, InProgress, InReview, Done, Blocked, Cancelled.",
    inputSchema: z.object({
      taskId: z.string().uuid().describe("The task ID"),
      status: z.enum(["Todo", "InProgress", "InReview", "Done", "Blocked", "Cancelled"])
        .describe("New status for the task"),
    }),
  },
  async ({ taskId, status }) => {
    const data = await api<unknown>("PATCH", `/api/tasks/${taskId}/status`, { status });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  "create_task",
  {
    description: "Create a new task in a project.",
    inputSchema: z.object({
      projectId: z.string().uuid().describe("The project ID"),
      title: z.string().min(1).describe("Task title"),
      description: z.string().optional().describe("Task description (markdown supported)"),
      priority: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium")
        .describe("Task priority"),
      dueDate: z.string().datetime({ offset: true }).optional()
        .describe("Due date in ISO 8601 format"),
      sprintId: z.string().uuid().optional().describe("Sprint to assign the task to"),
      storyPoints: z.number().int().min(0).optional().describe("Story points estimate"),
      assigneeIds: z.array(z.string()).optional()
        .describe("Array of user IDs to assign. Omit to leave unassigned."),
    }),
  },
  async ({ projectId, title, description, priority, dueDate, sprintId, storyPoints, assigneeIds }) => {
    const data = await api<unknown>("POST", "/api/tasks", {
      title,
      description,
      priority,
      dueDate,
      sprintId,
      storyPoints,
      assigneeIds,
      projectId,
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  "add_comment",
  {
    description: "Add a comment to a task. Supports markdown content.",
    inputSchema: z.object({
      taskId: z.string().uuid().describe("The task ID"),
      content: z.string().min(1).describe("Comment content (markdown supported)"),
    }),
  },
  async ({ taskId, content }) => {
    const data = await api<unknown>("POST", `/api/tasks/${taskId}/comments`, { content });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  "get_comments",
  {
    description: "Get all comments on a task.",
    inputSchema: z.object({
      taskId: z.string().uuid().describe("The task ID"),
    }),
  },
  async ({ taskId }) => {
    const data = await api<unknown>("GET", `/api/tasks/${taskId}/comments`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  "log_time",
  {
    description: "Log time spent on a task.",
    inputSchema: z.object({
      taskId: z.string().uuid().describe("The task ID"),
      hours: z.number().positive().describe("Number of hours to log"),
      loggedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Date in YYYY-MM-DD format"),
      description: z.string().optional().describe("What was done during this time"),
    }),
  },
  async ({ taskId, hours, loggedDate, description }) => {
    const data = await api<unknown>("POST", `/api/tasks/${taskId}/timelogs`, {
      hours,
      loggedDate,
      description,
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  "get_calendar",
  {
    description: "Get calendar events (tasks with due dates, sprint dates) for a date range. Useful for planning today's or this week's work.",
    inputSchema: z.object({
      start: z.string().datetime({ offset: true }).describe("Start of range in ISO 8601 format"),
      end: z.string().datetime({ offset: true }).describe("End of range in ISO 8601 format"),
    }),
  },
  async ({ start, end }) => {
    const data = await api<unknown>("GET", `/api/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  "list_project_sprints",
  {
    description: "List all sprints in a project.",
    inputSchema: z.object({
      projectId: z.string().uuid().describe("The project ID"),
    }),
  },
  async ({ projectId }) => {
    const data = await api<unknown>("GET", `/api/projects/${projectId}/sprints`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  "list_project_members",
  {
    description: "List all members of a project with their roles.",
    inputSchema: z.object({
      projectId: z.string().uuid().describe("The project ID"),
    }),
  },
  async ({ projectId }) => {
    const data = await api<unknown>("GET", `/api/projects/${projectId}/members`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Start ─────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
