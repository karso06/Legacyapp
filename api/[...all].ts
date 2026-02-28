import express from "express";
import cors from "cors";
import { MongoClient, type Collection } from "mongodb";

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

type Collections = {
  usersCol: Collection<UserDoc>;
  projectsCol: Collection<ProjectDoc>;
  tasksCol: Collection<TaskDoc>;
  commentsCol: Collection<CommentDoc>;
  historyCol: Collection<HistoryDoc>;
  notificationsCol: Collection<NotificationDoc>;
  countersCol: Collection<CounterDoc>;
};

declare global {
  // eslint-disable-next-line no-var
  var __legacyappMongoPromise: Promise<Collections> | undefined;
}

async function getNextId(countersCol: Collections["countersCol"], name: string) {
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

async function ensureDefaults(cols: Collections) {
  const { usersCol, projectsCol, countersCol } = cols;

  const userCount = await usersCol.countDocuments();
  if (userCount === 0) {
    const adminId = await getNextId(countersCol, "users");
    const user1Id = await getNextId(countersCol, "users");
    const user2Id = await getNextId(countersCol, "users");
    await usersCol.insertMany([
      { id: adminId, username: "admin", password: "admin" },
      { id: user1Id, username: "user1", password: "user1" },
      { id: user2Id, username: "user2", password: "user2" },
    ]);
  }

  const projectCount = await projectsCol.countDocuments();
  if (projectCount === 0) {
    const demoId = await getNextId(countersCol, "projects");
    const alphaId = await getNextId(countersCol, "projects");
    const betaId = await getNextId(countersCol, "projects");
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

async function getCollections(): Promise<Collections> {
  if (!globalThis.__legacyappMongoPromise) {
    globalThis.__legacyappMongoPromise = (async () => {
      const mongoUri = process.env.MONGODB_URI;
      const dbName = process.env.MONGODB_DB || "legacyapp";

      if (!mongoUri) {
        throw new Error("MONGODB_URI es requerido");
      }

      const client = new MongoClient(mongoUri);
      await client.connect();

      const db = client.db(dbName);
      const cols: Collections = {
        usersCol: db.collection<UserDoc>("users"),
        projectsCol: db.collection<ProjectDoc>("projects"),
        tasksCol: db.collection<TaskDoc>("tasks"),
        commentsCol: db.collection<CommentDoc>("comments"),
        historyCol: db.collection<HistoryDoc>("history"),
        notificationsCol: db.collection<NotificationDoc>("notifications"),
        countersCol: db.collection<CounterDoc>("counters"),
      };

      await ensureDefaults(cols);
      return cols;
    })();
  }

  return globalThis.__legacyappMongoPromise;
}

const app = express();
app.use(cors());
app.use(express.json());

function asyncHandler(
  fn: (req: express.Request, res: express.Response) => Promise<void>,
) {
  return (req: express.Request, res: express.Response) => {
    fn(req, res).catch((error) => {
      console.error(error);
      res.status(500).json({ error: "Error interno" });
    });
  };
}

// Health
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Auth
app.post(
  "/api/auth/login",
  asyncHandler(async (req, res) => {
    const { usersCol } = await getCollections();

    const { username, password } = req.body || {};
    if (!username || !password) {
      res.status(400).json({ error: "Usuario y contraseña requeridos" });
      return;
    }

    const user = await usersCol.findOne({ username, password });
    if (!user) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    res.json({ user: { id: user.id, username: user.username } });
  }),
);

// Users
app.get(
  "/api/users",
  asyncHandler(async (_req, res) => {
    const { usersCol } = await getCollections();

    const users = await usersCol
      .find({}, { projection: { _id: 0 } })
      .sort({ id: 1 })
      .toArray();
    res.json({ users });
  }),
);

// Projects
app.get(
  "/api/projects",
  asyncHandler(async (_req, res) => {
    const { projectsCol } = await getCollections();

    const projects = await projectsCol
      .find({}, { projection: { _id: 0 } })
      .sort({ id: 1 })
      .toArray();
    res.json({ projects });
  }),
);

app.post(
  "/api/projects",
  asyncHandler(async (req, res) => {
    const { projectsCol, countersCol } = await getCollections();

    const { name, description } = req.body || {};
    if (!name) {
      res.status(400).json({ error: "Nombre requerido" });
      return;
    }

    const id = await getNextId(countersCol, "projects");
    const project = { id, name, description: description || "" };
    await projectsCol.insertOne(project);
    res.status(201).json({ project });
  }),
);

app.put(
  "/api/projects/:id",
  asyncHandler(async (req, res) => {
    const { projectsCol } = await getCollections();

    const id = Number(req.params.id);
    const { name, description } = req.body || {};
    if (!id || !name) {
      res.status(400).json({ error: "Id y nombre requeridos" });
      return;
    }

    const existing = await projectsCol.findOne(
      { id },
      { projection: { _id: 0 } },
    );

    if (!existing) {
      res.status(404).json({ error: "Proyecto no encontrado" });
      return;
    }

    const updated = { ...existing, name, description: description || "" };
    await projectsCol.updateOne({ id }, { $set: updated });
    res.json({ project: updated });
  }),
);

app.delete(
  "/api/projects/:id",
  asyncHandler(async (req, res) => {
    const { projectsCol } = await getCollections();

    const id = Number(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Id requerido" });
      return;
    }

    await projectsCol.deleteOne({ id });
    res.json({ success: true });
  }),
);

// Tasks
app.get(
  "/api/tasks",
  asyncHandler(async (_req, res) => {
    const { tasksCol } = await getCollections();

    const tasks = await tasksCol
      .find({}, { projection: { _id: 0 } })
      .sort({ id: -1 })
      .toArray();
    res.json({ tasks });
  }),
);

app.post(
  "/api/tasks",
  asyncHandler(async (req, res) => {
    const { tasksCol, historyCol, notificationsCol, countersCol } =
      await getCollections();

    const task = req.body || {};
    if (!task.title) {
      res.status(400).json({ error: "Título requerido" });
      return;
    }

    const id = await getNextId(countersCol, "tasks");
    const now = new Date().toISOString();

    const newTask = {
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
      id: await getNextId(countersCol, "history"),
      task_id: newTask.id,
      user_id: task.createdBy || null,
      action: "CREATED",
      old_value: "",
      new_value: newTask.title,
      timestamp: now,
    });

    if (task.assignedTo) {
      await notificationsCol.insertOne({
        id: await getNextId(countersCol, "notifications"),
        user_id: task.assignedTo,
        message: `Nueva tarea asignada: ${newTask.title}`,
        type: "task_assigned",
        read: false,
        created_at: now,
      });
    }

    res.status(201).json({ task: newTask });
  }),
);

app.put(
  "/api/tasks/:id",
  asyncHandler(async (req, res) => {
    const { tasksCol, historyCol, notificationsCol, countersCol } =
      await getCollections();

    const id = Number(req.params.id);
    const task = req.body || {};
    if (!id || !task.title) {
      res.status(400).json({ error: "Id y título requeridos" });
      return;
    }

    const oldTask = await tasksCol.findOne({ id });
    if (!oldTask) {
      res.status(404).json({ error: "Tarea no encontrada" });
      return;
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
    const newTask = { ...oldTask, ...updated };

    if (oldTask.status !== newTask.status) {
      await historyCol.insertOne({
        id: await getNextId(countersCol, "history"),
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
        id: await getNextId(countersCol, "history"),
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
        id: await getNextId(countersCol, "notifications"),
        user_id: task.assignedTo,
        message: `Tarea actualizada: ${newTask.title}`,
        type: "task_updated",
        read: false,
        created_at: now,
      });
    }

    res.json({ task: newTask });
  }),
);

app.delete(
  "/api/tasks/:id",
  asyncHandler(async (req, res) => {
    const { tasksCol, historyCol, countersCol } = await getCollections();

    const id = Number(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Id requerido" });
      return;
    }

    const oldTask = await tasksCol.findOne({ id });
    if (!oldTask) {
      res.status(404).json({ error: "Tarea no encontrada" });
      return;
    }

    await tasksCol.deleteOne({ id });

    await historyCol.insertOne({
      id: await getNextId(countersCol, "history"),
      task_id: id,
      user_id: null,
      action: "DELETED",
      old_value: oldTask.title,
      new_value: "",
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true });
  }),
);

// Comments
app.get(
  "/api/comments",
  asyncHandler(async (req, res) => {
    const { commentsCol } = await getCollections();

    const taskId = Number(req.query.taskId);
    const filter = taskId ? { task_id: taskId } : {};
    const comments = await commentsCol
      .find(filter, { projection: { _id: 0 } })
      .sort({ created_at: 1 })
      .toArray();
    res.json({ comments });
  }),
);

app.post(
  "/api/comments",
  asyncHandler(async (req, res) => {
    const { commentsCol, countersCol } = await getCollections();

    const { taskId, userId, content } = req.body || {};
    if (!taskId || !userId || !content) {
      res.status(400).json({ error: "taskId, userId y content requeridos" });
      return;
    }

    const now = new Date().toISOString();
    const comment = {
      id: await getNextId(countersCol, "comments"),
      task_id: taskId,
      user_id: userId,
      content,
      created_at: now,
    };

    await commentsCol.insertOne(comment);
    res.status(201).json({ comment });
  }),
);

// History
app.get(
  "/api/history",
  asyncHandler(async (req, res) => {
    const { historyCol } = await getCollections();

    const taskId = Number(req.query.taskId);
    const filter = taskId ? { task_id: taskId } : {};
    const history = await historyCol
      .find(filter, { projection: { _id: 0 } })
      .sort({ timestamp: -1 })
      .toArray();
    res.json({ history });
  }),
);

// Notifications
app.get(
  "/api/notifications",
  asyncHandler(async (req, res) => {
    const { notificationsCol } = await getCollections();

    const userId = Number(req.query.userId);
    const filter = userId ? { user_id: userId } : {};
    const notifications = await notificationsCol
      .find(filter, { projection: { _id: 0 } })
      .sort({ created_at: -1 })
      .toArray();
    res.json({ notifications });
  }),
);

app.post(
  "/api/notifications/mark-read",
  asyncHandler(async (req, res) => {
    const { notificationsCol } = await getCollections();

    const { userId } = req.body || {};
    if (!userId) {
      res.status(400).json({ error: "userId requerido" });
      return;
    }

    await notificationsCol.updateMany(
      { user_id: userId },
      { $set: { read: true } },
    );
    res.json({ success: true });
  }),
);

// Search
app.get(
  "/api/search",
  asyncHandler(async (req, res) => {
    const { tasksCol } = await getCollections();

    const queryText = String(req.query.query || "").trim();
    const projectId = Number(req.query.projectId || 0);
    const status = String(req.query.status || "");
    const priority = String(req.query.priority || "");
    const assignedTo = Number(req.query.assignedTo || 0);

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

    res.json({ results });
  }),
);

// Reports
app.get(
  "/api/reports/summary",
  asyncHandler(async (_req, res) => {
    const { tasksCol, projectsCol, usersCol } = await getCollections();

    const tasks = await tasksCol.find({}, { projection: { _id: 0 } }).toArray();
    const projects = await projectsCol
      .find({}, { projection: { _id: 0 } })
      .toArray();
    const users = await usersCol.find({}, { projection: { _id: 0 } }).toArray();

    const statusCounts = (tasks || []).reduce<Record<string, number>>(
      (acc: Record<string, number>, task: TaskDoc) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      },
      {},
    );

    res.json({
      totals: {
        tasks: tasks.length,
        projects: projects.length,
        users: users.length,
      },
      statusCounts,
    });
  }),
);

// Export CSV
app.get(
  "/api/export/tasks.csv",
  asyncHandler(async (_req, res) => {
    const { tasksCol } = await getCollections();

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

    const csv = [headers.join(","), ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="tasks.csv"');
    res.send(csv);
  }),
);

export default app;
