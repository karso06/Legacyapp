type User = { id: number; username: string };
type Project = { id: number; name: string; description?: string };
type Task = {
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
};

type AppComment = {
  id: number;
  task_id: number;
  user_id: number;
  content: string;
  created_at: string;
};
type AppHistory = {
  id: number;
  task_id: number;
  user_id: number;
  action: string;
  old_value: string;
  new_value: string;
  timestamp: string;
};
type AppNotification = {
  id: number;
  user_id: number;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
};

const apiMeta = document.querySelector(
  'meta[name="api-base"]',
) as HTMLMetaElement | null;
const apiBase =
  apiMeta?.content?.trim() ||
  (location.hostname === "localhost" ||
  location.hostname === "127.0.0.1" ||
  location.hostname === ""
    ? "http://localhost:3000"
    : "");
let currentUser: User | null = null;
let selectedTaskId: number | null = null;
let selectedProjectId: number | null = null;

const el = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(apiBase + url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Error en la solicitud");
  }
  return data as T;
}

function showToast(message: string) {
  alert(message);
}

async function login() {
  const username = (el<HTMLInputElement>("username").value || "").trim();
  const password = (el<HTMLInputElement>("password").value || "").trim();

  if (!username || !password) {
    showToast("Usuario y contraseña requeridos");
    return;
  }

  const { user } = await fetchJSON<{ user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  currentUser = user;
  el<HTMLDivElement>("loginPanel").classList.add("d-none");
  el<HTMLDivElement>("mainPanel").classList.remove("d-none");
  el<HTMLElement>("currentUser").textContent = user.username;

  await loadUsers();
  await loadProjects();
  await loadTasks();
  await loadHistory();
  await loadNotifications();
  await loadReports();
}

function logout() {
  currentUser = null;
  selectedTaskId = null;
  selectedProjectId = null;
  el<HTMLDivElement>("loginPanel").classList.remove("d-none");
  el<HTMLDivElement>("mainPanel").classList.add("d-none");
}

async function loadUsers() {
  const { users } = await fetchJSON<{ users: User[] }>("/api/users");

  const assignedSelect = el<HTMLSelectElement>("taskAssigned");
  assignedSelect.innerHTML = '<option value="">Sin asignar</option>';

  const searchAssigned = el<HTMLSelectElement>("searchAssigned");
  searchAssigned.innerHTML = '<option value="">Asignado</option>';

  users.forEach((user) => {
    const option = new Option(user.username, String(user.id));
    assignedSelect.add(option.cloneNode(true) as HTMLOptionElement);
    searchAssigned.add(option);
  });
}

async function loadProjects() {
  const { projects } = await fetchJSON<{ projects: Project[] }>(
    "/api/projects",
  );

  const taskProject = el<HTMLSelectElement>("taskProject");
  const searchProject = el<HTMLSelectElement>("searchProject");

  taskProject.innerHTML = "";
  searchProject.innerHTML = '<option value="">Todos</option>';

  projects.forEach((project) => {
    const option = new Option(project.name, String(project.id));
    taskProject.add(option.cloneNode(true) as HTMLOptionElement);
    searchProject.add(option);
  });

  renderProjects(projects);
}

async function loadTasks() {
  const { tasks } = await fetchJSON<{ tasks: Task[] }>("/api/tasks");
  renderTasks(tasks);
  const commentTask = el<HTMLSelectElement>("commentTask");
  commentTask.innerHTML = "";
  tasks.forEach((task) => {
    commentTask.add(new Option(`#${task.id} ${task.title}`, String(task.id)));
  });
}

function renderTasks(tasks: Task[]) {
  const table = el<HTMLTableSectionElement>("tasksTable");
  table.innerHTML = "";

  tasks.forEach((task) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${task.id}</td>
            <td>${task.title}</td>
            <td>${task.status}</td>
            <td>${task.priority}</td>
            <td>${task.project_id ?? ""}</td>
            <td>${task.assigned_to ?? ""}</td>
        `;
    row.addEventListener("click", () => selectTask(task));
    table.appendChild(row);
  });
}

function selectTask(task: Task) {
  selectedTaskId = task.id;
  el<HTMLInputElement>("taskTitle").value = task.title;
  el<HTMLTextAreaElement>("taskDescription").value = task.description || "";
  el<HTMLSelectElement>("taskStatus").value = task.status;
  el<HTMLSelectElement>("taskPriority").value = task.priority;
  el<HTMLSelectElement>("taskProject").value = task.project_id
    ? String(task.project_id)
    : "";
  el<HTMLSelectElement>("taskAssigned").value = task.assigned_to
    ? String(task.assigned_to)
    : "";
  el<HTMLInputElement>("taskDueDate").value = task.due_date
    ? String(task.due_date)
    : "";
  el<HTMLInputElement>("taskHours").value = String(task.estimated_hours || "");
}

function clearTaskForm() {
  selectedTaskId = null;
  el<HTMLInputElement>("taskTitle").value = "";
  el<HTMLTextAreaElement>("taskDescription").value = "";
  el<HTMLSelectElement>("taskStatus").value = "Pendiente";
  el<HTMLSelectElement>("taskPriority").value = "Media";
  el<HTMLSelectElement>("taskProject").selectedIndex = 0;
  el<HTMLSelectElement>("taskAssigned").selectedIndex = 0;
  el<HTMLInputElement>("taskDueDate").value = "";
  el<HTMLInputElement>("taskHours").value = "";
}

async function addTask() {
  if (!currentUser) return;
  const payload = {
    title: el<HTMLInputElement>("taskTitle").value,
    description: el<HTMLTextAreaElement>("taskDescription").value,
    status: el<HTMLSelectElement>("taskStatus").value,
    priority: el<HTMLSelectElement>("taskPriority").value,
    projectId: Number(el<HTMLSelectElement>("taskProject").value) || null,
    assignedTo: Number(el<HTMLSelectElement>("taskAssigned").value) || null,
    dueDate: el<HTMLInputElement>("taskDueDate").value || null,
    estimatedHours: Number(el<HTMLInputElement>("taskHours").value) || 0,
    createdBy: currentUser.id,
  };

  await fetchJSON("/api/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await loadTasks();
  clearTaskForm();
  showToast("Tarea agregada");
}

async function updateTask() {
  if (!selectedTaskId || !currentUser) {
    showToast("Selecciona una tarea");
    return;
  }

  const payload = {
    title: el<HTMLInputElement>("taskTitle").value,
    description: el<HTMLTextAreaElement>("taskDescription").value,
    status: el<HTMLSelectElement>("taskStatus").value,
    priority: el<HTMLSelectElement>("taskPriority").value,
    projectId: Number(el<HTMLSelectElement>("taskProject").value) || null,
    assignedTo: Number(el<HTMLSelectElement>("taskAssigned").value) || null,
    dueDate: el<HTMLInputElement>("taskDueDate").value || null,
    estimatedHours: Number(el<HTMLInputElement>("taskHours").value) || 0,
    updatedBy: currentUser.id,
  };

  await fetchJSON(`/api/tasks/${selectedTaskId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  await loadTasks();
  clearTaskForm();
  showToast("Tarea actualizada");
}

async function deleteTask() {
  if (!selectedTaskId) {
    showToast("Selecciona una tarea");
    return;
  }

  await fetchJSON(`/api/tasks/${selectedTaskId}`, { method: "DELETE" });
  await loadTasks();
  clearTaskForm();
  showToast("Tarea eliminada");
}

async function loadProjectsTable() {
  const { projects } = await fetchJSON<{ projects: Project[] }>(
    "/api/projects",
  );
  renderProjects(projects);
}

function renderProjects(projects: Project[]) {
  const table = el<HTMLTableSectionElement>("projectsTable");
  table.innerHTML = "";
  projects.forEach((project) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${project.id}</td>
            <td>${project.name}</td>
            <td>${project.description || ""}</td>
        `;
    row.addEventListener("click", () => selectProject(project));
    table.appendChild(row);
  });
}

function selectProject(project: Project) {
  selectedProjectId = project.id;
  el<HTMLInputElement>("projectName").value = project.name;
  el<HTMLTextAreaElement>("projectDescription").value =
    project.description || "";
}

function clearProjectForm() {
  selectedProjectId = null;
  el<HTMLInputElement>("projectName").value = "";
  el<HTMLTextAreaElement>("projectDescription").value = "";
}

async function addProject() {
  const payload = {
    name: el<HTMLInputElement>("projectName").value,
    description: el<HTMLTextAreaElement>("projectDescription").value,
  };

  await fetchJSON("/api/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await loadProjects();
  clearProjectForm();
  showToast("Proyecto agregado");
}

async function updateProject() {
  if (!selectedProjectId) {
    showToast("Selecciona un proyecto");
    return;
  }

  const payload = {
    name: el<HTMLInputElement>("projectName").value,
    description: el<HTMLTextAreaElement>("projectDescription").value,
  };

  await fetchJSON(`/api/projects/${selectedProjectId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  await loadProjects();
  clearProjectForm();
  showToast("Proyecto actualizado");
}

async function deleteProject() {
  if (!selectedProjectId) {
    showToast("Selecciona un proyecto");
    return;
  }
  await fetchJSON(`/api/projects/${selectedProjectId}`, { method: "DELETE" });
  await loadProjects();
  clearProjectForm();
  showToast("Proyecto eliminado");
}

async function loadComments() {
  const taskId = Number(el<HTMLSelectElement>("commentTask").value);
  if (!taskId) return;

  const { comments } = await fetchJSON<{ comments: AppComment[] }>(
    `/api/comments?taskId=${taskId}`,
  );
  const { users } = await fetchJSON<{ users: User[] }>("/api/users");

  const usersMap = new Map(users.map((u) => [u.id, u.username]));
  const table = el<HTMLTableSectionElement>("commentsTable");
  table.innerHTML = "";

  comments.forEach((comment) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${new Date(comment.created_at).toLocaleString()}</td>
            <td>${usersMap.get(comment.user_id) || comment.user_id}</td>
            <td>${comment.content}</td>
        `;
    table.appendChild(row);
  });
}

async function addComment() {
  if (!currentUser) return;
  const taskId = Number(el<HTMLSelectElement>("commentTask").value);
  const content = el<HTMLTextAreaElement>("commentContent").value.trim();
  if (!taskId || !content) {
    showToast("Selecciona tarea y escribe comentario");
    return;
  }

  await fetchJSON("/api/comments", {
    method: "POST",
    body: JSON.stringify({ taskId, userId: currentUser.id, content }),
  });

  el<HTMLTextAreaElement>("commentContent").value = "";
  await loadComments();
  showToast("Comentario agregado");
}

async function loadHistory() {
  const { history } = await fetchJSON<{ history: AppHistory[] }>(
    "/api/history",
  );
  const table = el<HTMLTableSectionElement>("historyTable");
  table.innerHTML = "";

  history.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${new Date(item.timestamp).toLocaleString()}</td>
            <td>${item.action}</td>
            <td>${item.old_value} → ${item.new_value}</td>
        `;
    table.appendChild(row);
  });
}

async function loadNotifications() {
  if (!currentUser) return;
  const { notifications } = await fetchJSON<{
    notifications: AppNotification[];
  }>(`/api/notifications?userId=${currentUser.id}`);
  const table = el<HTMLTableSectionElement>("notificationsTable");
  table.innerHTML = "";

  notifications.forEach((n) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${new Date(n.created_at).toLocaleString()}</td>
            <td>${n.message}</td>
            <td>${n.read ? "Leída" : "Pendiente"}</td>
        `;
    table.appendChild(row);
  });
}

async function markNotificationsRead() {
  if (!currentUser) return;
  await fetchJSON("/api/notifications/mark-read", {
    method: "POST",
    body: JSON.stringify({ userId: currentUser.id }),
  });
  await loadNotifications();
}

async function searchTasks() {
  const query = el<HTMLInputElement>("searchQuery").value.trim();
  const projectId = el<HTMLSelectElement>("searchProject").value;
  const status = el<HTMLSelectElement>("searchStatus").value;
  const priority = el<HTMLSelectElement>("searchPriority").value;
  const assignedTo = el<HTMLSelectElement>("searchAssigned").value;

  const params = new URLSearchParams();
  if (query) params.set("query", query);
  if (projectId) params.set("projectId", projectId);
  if (status) params.set("status", status);
  if (priority) params.set("priority", priority);
  if (assignedTo) params.set("assignedTo", assignedTo);

  const { results } = await fetchJSON<{ results: Task[] }>(
    `/api/search?${params.toString()}`,
  );
  const table = el<HTMLTableSectionElement>("searchTable");
  table.innerHTML = "";

  results.forEach((task) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${task.id}</td>
            <td>${task.title}</td>
            <td>${task.status}</td>
            <td>${task.priority}</td>
        `;
    table.appendChild(row);
  });
}

async function loadReports() {
  const { totals, statusCounts } = await fetchJSON<{
    totals: { tasks: number; projects: number; users: number };
    statusCounts: Record<string, number>;
  }>("/api/reports/summary");

  el<HTMLDivElement>("reportTotals").innerHTML = `
        <div>Tareas: <strong>${totals.tasks}</strong></div>
        <div>Proyectos: <strong>${totals.projects}</strong></div>
        <div>Usuarios: <strong>${totals.users}</strong></div>
    `;

  el<HTMLDivElement>("reportStatuses").innerHTML = Object.entries(statusCounts)
    .map(([status, count]) => `<div>${status}: <strong>${count}</strong></div>`)
    .join("");

  el<HTMLAnchorElement>("exportCsvBtn").href = "/api/export/tasks.csv";
}

function bindEvents() {
  el<HTMLButtonElement>("loginBtn").addEventListener("click", () =>
    login().catch((e) => showToast(e.message)),
  );
  el<HTMLButtonElement>("logoutBtn").addEventListener("click", logout);

  el<HTMLButtonElement>("taskAddBtn").addEventListener("click", () =>
    addTask().catch((e) => showToast(e.message)),
  );
  el<HTMLButtonElement>("taskUpdateBtn").addEventListener("click", () =>
    updateTask().catch((e) => showToast(e.message)),
  );
  el<HTMLButtonElement>("taskDeleteBtn").addEventListener("click", () =>
    deleteTask().catch((e) => showToast(e.message)),
  );
  el<HTMLButtonElement>("taskClearBtn").addEventListener(
    "click",
    clearTaskForm,
  );

  el<HTMLButtonElement>("projectAddBtn").addEventListener("click", () =>
    addProject().catch((e) => showToast(e.message)),
  );
  el<HTMLButtonElement>("projectUpdateBtn").addEventListener("click", () =>
    updateProject().catch((e) => showToast(e.message)),
  );
  el<HTMLButtonElement>("projectDeleteBtn").addEventListener("click", () =>
    deleteProject().catch((e) => showToast(e.message)),
  );
  el<HTMLButtonElement>("projectClearBtn").addEventListener(
    "click",
    clearProjectForm,
  );

  el<HTMLButtonElement>("commentAddBtn").addEventListener("click", () =>
    addComment().catch((e) => showToast(e.message)),
  );
  el<HTMLSelectElement>("commentTask").addEventListener("change", () =>
    loadComments().catch((e) => showToast(e.message)),
  );

  el<HTMLButtonElement>("notificationsReadBtn").addEventListener("click", () =>
    markNotificationsRead().catch((e) => showToast(e.message)),
  );

  el<HTMLButtonElement>("searchBtn").addEventListener("click", () =>
    searchTasks().catch((e) => showToast(e.message)),
  );

  document.querySelectorAll('[data-bs-toggle="tab"]').forEach((tab) => {
    tab.addEventListener("shown.bs.tab", async (event) => {
      const target = (event.target as HTMLElement).getAttribute(
        "data-bs-target",
      );
      try {
        if (target === "#tasksTab") await loadTasks();
        if (target === "#projectsTab") await loadProjectsTable();
        if (target === "#commentsTab") await loadComments();
        if (target === "#historyTab") await loadHistory();
        if (target === "#notificationsTab") await loadNotifications();
        if (target === "#reportsTab") await loadReports();
      } catch (error) {
        showToast((error as Error).message);
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
});
