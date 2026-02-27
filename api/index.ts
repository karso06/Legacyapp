/// <reference types="node" />
import { MongoClient } from "mongodb";

const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "legacyapp";

if (!mongoUri) {
  throw new Error("MONGODB_URI es requerido");
}

const mongoUrl = mongoUri;

type UserDoc = { id: number; username: string; password?: string };
type ProjectDoc = { id: number; name: string; description?: string };
type TaskDoc = {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  project_id?: number | null;
  assigned_to?: number | null;
  due_date?: string | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
};
type CommentDoc = {
  id: number;
  task_id: number;
  user_id: number;
  content: string;
  created_at: string;
};
type HistoryDoc = {
  id: number;
  task_id: number;
  user_id: number | null;
  action: string;
  old_value: string;
  new_value: string;
  timestamp: string;
};
type NotificationDoc = {
  id: number;
  user_id: number;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
};
type CounterDoc = { _id: string; seq: number };

let cachedClient: MongoClient | null = null;

async function getDb() {
  if (!cachedClient) {
    cachedClient = new MongoClient(mongoUrl);
    await cachedClient.connect();
  }
  return cachedClient.db(dbName);
}

async function getCollections() {
  const db = await getDb();
  return {
    usersCol: db.collection<UserDoc>("users"),
    projectsCol: db.collection<ProjectDoc>("projects"),
    tasksCol: db.collection<TaskDoc>("tasks"),
    commentsCol: db.collection<CommentDoc>("comments"),
    historyCol: db.collection<HistoryDoc>("history"),
    notificationsCol: db.collection<NotificationDoc>("notifications"),
    countersCol: db.collection<CounterDoc>("counters"),
  };
}

type Collections = Awaited<ReturnType<typeof getCollections>>;

async function getNextId(
  name: string,
  countersCol: Collections["countersCol"],
) {
  const result = (await countersCol.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  )) as unknown as { value?: CounterDoc | null } | CounterDoc | null;

  let counter: CounterDoc | null = null;
  if (result && "value" in result) {
    counter = result.value ?? null;
  } else {
    counter = result as CounterDoc | null;
  }

  return counter?.seq ?? 1;
}

async function ensureDefaults() {
  const { usersCol, projectsCol, countersCol } = await getCollections();
  const userCount = await usersCol.countDocuments();
  if (userCount === 0) {
    const adminId = await getNextId("users", countersCol);
    const user1Id = await getNextId("users", countersCol);
    const user2Id = await getNextId("users", countersCol);
    await usersCol.insertMany([
      { id: adminId, username: "admin", password: "admin" },
      { id: user1Id, username: "user1", password: "user1" },
      { id: user2Id, username: "user2", password: "user2" },
    ]);
  }

  const projectCount = await projectsCol.countDocuments();
  if (projectCount === 0) {
    const demoId = await getNextId("projects", countersCol);
    const alphaId = await getNextId("projects", countersCol);
    const betaId = await getNextId("projects", countersCol);
    await projectsCol.insertMany([
      { id: demoId, name: "Proyecto Demo", description: "Proyecto de ejemplo" },
      {
        id: alphaId,
        name: "Proyecto Alpha",
        description: "Proyecto importante",
      },
      { id: betaId, name: "Proyecto Beta", description: "Proyecto secundario" },
    ]);
  }
}

function json(res: any, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function csv(res: any, content: string) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="tasks.csv"');
  res.end(content);
}

function getPath(req: any) {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  return url.pathname.replace(/^\/api/, "") || "/";
}

function getQuery(req: any) {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  return url.searchParams;
}

async function getBody(req: any) {
  if (req.method === "GET" || req.method === "HEAD") return null;
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) return null;
  const raw = Buffer.concat(chunks).toString("utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  await ensureDefaults();
  const path = getPath(req);
  const query = getQuery(req);
  const body = await getBody(req);

  const {
    usersCol,
    projectsCol,
    tasksCol,
    commentsCol,
    historyCol,
    notificationsCol,
    countersCol,
  } = await getCollections();

  try {
    // Auth
    if (path === "/auth/login" && req.method === "POST") {
      const { username, password } = body || {};
      if (!username || !password) {
        return json(res, 400, { error: "Usuario y contraseña requeridos" });
      }
      const user = await usersCol.findOne({ username, password });
      if (!user) {
        return json(res, 401, { error: "Credenciales inválidas" });
      }
      return json(res, 200, { user: { id: user.id, username: user.username } });
    }

    // Users
    if (path === "/users" && req.method === "GET") {
      const users = await usersCol
        .find({}, { projection: { _id: 0 } })
        .sort({ id: 1 })
        .toArray();
      return json(res, 200, { users });
    }

    // Projects
    if (path === "/projects" && req.method === "GET") {
      const projects = await projectsCol
        .find({}, { projection: { _id: 0 } })
        .sort({ id: 1 })
        .toArray();
      return json(res, 200, { projects });
    }

    if (path === "/projects" && req.method === "POST") {
      const { name, description } = body || {};
      if (!name) {
        return json(res, 400, { error: "Nombre requerido" });
      }
      const id = await getNextId("projects", countersCol);
      const project = { id, name, description: description || "" };
      await projectsCol.insertOne(project);
      return json(res, 201, { project });
    }

    if (path.startsWith("/projects/") && req.method === "PUT") {
      const id = Number(path.split("/")[2]);
      const { name, description } = body || {};
      if (!id || !name) {
        return json(res, 400, { error: "Id y nombre requeridos" });
      }
      const existing = await projectsCol.findOne(
        { id },
        { projection: { _id: 0 } },
      );
      if (!existing) {
        return json(res, 404, { error: "Proyecto no encontrado" });
      }
      const updated = { ...existing, name, description: description || "" };
      await projectsCol.updateOne({ id }, { $set: updated });
      return json(res, 200, { project: updated });
    }

    if (path.startsWith("/projects/") && req.method === "DELETE") {
      const id = Number(path.split("/")[2]);
      if (!id) {
        return json(res, 400, { error: "Id requerido" });
      }
      await projectsCol.deleteOne({ id });
      return json(res, 200, { success: true });
    }

    // Tasks
    if (path === "/tasks" && req.method === "GET") {
      const tasks = await tasksCol
        .find({}, { projection: { _id: 0 } })
        .sort({ id: -1 })
        .toArray();
      return json(res, 200, { tasks });
    }

    if (path === "/tasks" && req.method === "POST") {
      const task = body || {};
      if (!task.title) {
        return json(res, 400, { error: "Título requerido" });
      }
      const id = await getNextId("tasks", countersCol);
      const now = new Date().toISOString();
      const newTask: TaskDoc = {
        id,
        title: task.title,
        description: task.description || "",
        status: task.status || "Pendiente",
        priority: task.priority || "Media",
        project_id: task.projectId || null,
        assigned_to: task.assignedTo || null,
        due_date: task.dueDate || null,
        estimated_hours: task.estimatedHours || 0,
        actual_hours: task.actualHours || 0,
        created_by: task.createdBy || null,
        created_at: now,
        updated_at: now,
      };
      await tasksCol.insertOne(newTask);
      await historyCol.insertOne({
        id: await getNextId("history", countersCol),
        task_id: newTask.id,
        user_id: task.createdBy || null,
        action: "CREATED",
        old_value: "",
        new_value: newTask.title,
        timestamp: now,
      });
      if (task.assignedTo) {
        await notificationsCol.insertOne({
          id: await getNextId("notifications", countersCol),
          user_id: task.assignedTo,
          message: `Nueva tarea asignada: ${newTask.title}`,
          type: "task_assigned",
          read: false,
          created_at: now,
        });
      }
      return json(res, 201, { task: newTask });
    }

    if (path.startsWith("/tasks/") && req.method === "PUT") {
      const id = Number(path.split("/")[2]);
      const task = body || {};
      if (!id || !task.title) {
        return json(res, 400, { error: "Id y título requeridos" });
      }
      const oldTask = await tasksCol.findOne({ id });
      if (!oldTask) {
        return json(res, 404, { error: "Tarea no encontrada" });
      }
      const now = new Date().toISOString();
      const updated = {
        title: task.title,
        description: task.description || "",
        status: task.status || "Pendiente",
        priority: task.priority || "Media",
        project_id: task.projectId || null,
        assigned_to: task.assignedTo || null,
        due_date: task.dueDate || null,
        estimated_hours: task.estimatedHours || 0,
        actual_hours: task.actualHours || 0,
        updated_at: now,
      };
      await tasksCol.updateOne({ id }, { $set: updated });
      const newTask = { ...oldTask, ...updated } as TaskDoc;
      if (oldTask.status !== newTask.status) {
        await historyCol.insertOne({
          id: await getNextId("history", countersCol),
          task_id: id,
          user_id: task.updatedBy || null,
          action: "STATUS_CHANGED",
          old_value: oldTask.status,
          new_value: newTask.status,
          timestamp: now,
        });
      }
      if (oldTask.title !== newTask.title) {
        await historyCol.insertOne({
          id: await getNextId("history", countersCol),
          task_id: id,
          user_id: task.updatedBy || null,
          action: "TITLE_CHANGED",
          old_value: oldTask.title,
          new_value: newTask.title,
          timestamp: now,
        });
      }
      if (task.assignedTo) {
        await notificationsCol.insertOne({
          id: await getNextId("notifications", countersCol),
          user_id: task.assignedTo,
          message: `Tarea actualizada: ${newTask.title}`,
          type: "task_updated",
          read: false,
          created_at: now,
        });
      }
      return json(res, 200, { task: newTask });
    }

    if (path.startsWith("/tasks/") && req.method === "DELETE") {
      const id = Number(path.split("/")[2]);
      if (!id) {
        return json(res, 400, { error: "Id requerido" });
      }
      const oldTask = await tasksCol.findOne({ id });
      if (!oldTask) {
        return json(res, 404, { error: "Tarea no encontrada" });
      }
      await tasksCol.deleteOne({ id });
      await historyCol.insertOne({
        id: await getNextId("history", countersCol),
        task_id: id,
        user_id: null,
        action: "DELETED",
        old_value: oldTask.title,
        new_value: "",
        timestamp: new Date().toISOString(),
      });
      return json(res, 200, { success: true });
    }

    // Comments
    if (path === "/comments" && req.method === "GET") {
      const taskId = Number(query.get("taskId") || 0);
      const filter = taskId ? { task_id: taskId } : {};
      const comments = await commentsCol
        .find(filter, { projection: { _id: 0 } })
        .sort({ created_at: 1 })
        .toArray();
      return json(res, 200, { comments });
    }

    if (path === "/comments" && req.method === "POST") {
      const { taskId, userId, content } = body || {};
      if (!taskId || !userId || !content) {
        return json(res, 400, { error: "taskId, userId y content requeridos" });
      }
      const now = new Date().toISOString();
      const comment: CommentDoc = {
        id: await getNextId("comments", countersCol),
        task_id: taskId,
        user_id: userId,
        content,
        created_at: now,
      };
      await commentsCol.insertOne(comment);
      return json(res, 201, { comment });
    }

    // History
    if (path === "/history" && req.method === "GET") {
      const taskId = Number(query.get("taskId") || 0);
      const filter = taskId ? { task_id: taskId } : {};
      const history = await historyCol
        .find(filter, { projection: { _id: 0 } })
        .sort({ timestamp: -1 })
        .toArray();
      return json(res, 200, { history });
    }

    // Notifications
    if (path === "/notifications" && req.method === "GET") {
      const userId = Number(query.get("userId") || 0);
      const filter = userId ? { user_id: userId } : {};
      const notifications = await notificationsCol
        .find(filter, { projection: { _id: 0 } })
        .sort({ created_at: -1 })
        .toArray();
      return json(res, 200, { notifications });
    }

    if (path === "/notifications/mark-read" && req.method === "POST") {
      const { userId } = body || {};
      if (!userId) {
        return json(res, 400, { error: "userId requerido" });
      }
      await notificationsCol.updateMany(
        { user_id: userId },
        { $set: { read: true } },
      );
      return json(res, 200, { success: true });
    }

    // Search
    if (path === "/search" && req.method === "GET") {
      const queryText = String(query.get("query") || "").trim();
      const projectId = Number(query.get("projectId") || 0);
      const status = String(query.get("status") || "");
      const priority = String(query.get("priority") || "");
      const assignedTo = Number(query.get("assignedTo") || 0);

      const filter: Record<string, unknown> = {};

      if (queryText) {
        filter.title = { $regex: queryText, $options: "i" };
      }
      if (projectId) {
        filter.project_id = projectId;
      }
      if (status) {
        filter.status = status;
      }
      if (priority) {
        filter.priority = priority;
      }
      if (assignedTo) {
        filter.assigned_to = assignedTo;
      }

      const results = await tasksCol
        .find(filter, { projection: { _id: 0 } })
        .sort({ id: -1 })
        .toArray();
      return json(res, 200, { results });
    }

    // Reports
    if (path === "/reports/summary" && req.method === "GET") {
      const tasks = await tasksCol
        .find({}, { projection: { _id: 0 } })
        .toArray();
      const projects = await projectsCol
        .find({}, { projection: { _id: 0 } })
        .toArray();
      const users = await usersCol
        .find({}, { projection: { _id: 0 } })
        .toArray();
      const statusCounts = (tasks || []).reduce<Record<string, number>>(
        (acc: Record<string, number>, task: TaskDoc) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        },
        {},
      );
      return json(res, 200, {
        totals: {
          tasks: tasks.length,
          projects: projects.length,
          users: users.length,
        },
        statusCounts,
      });
    }

    // Export CSV
    if (path === "/export/tasks.csv" && req.method === "GET") {
      const tasks = await tasksCol
        .find({}, { projection: { _id: 0 } })
        .sort({ id: 1 })
        .toArray();
      const headers = [
        "id",
        "title",
        "description",
        "status",
        "priority",
        "project_id",
        "assigned_to",
        "due_date",
        "estimated_hours",
        "actual_hours",
        "created_by",
        "created_at",
        "updated_at",
      ];
      const rows = (tasks || []).map((t: TaskDoc) =>
        headers
          .map((h) => {
            const value = (t as Record<string, unknown>)[h];
            if (value === null || value === undefined) return "";
            const str = String(value).replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(","),
      );
      const csvContent = [headers.join(","), ...rows].join("\n");
      return csv(res, csvContent);
    }

    return json(res, 404, { error: "Ruta no encontrada" });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Error interno" });
  }
}
