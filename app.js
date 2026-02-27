// Sistema de almacenamiento con localStorage
const Storage = {
    // Inicializar datos por defecto
    init() {
        if (!localStorage.getItem('users')) {
            localStorage.setItem('users', JSON.stringify([
                { id: 1, username: 'admin', password: 'admin' },
                { id: 2, username: 'user1', password: 'user1' },
                { id: 3, username: 'user2', password: 'user2' }
            ]));
        }
        if (!localStorage.getItem('projects')) {
            localStorage.setItem('projects', JSON.stringify([
                { id: 1, name: 'Proyecto Demo', description: 'Proyecto de ejemplo' },
                { id: 2, name: 'Proyecto Alpha', description: 'Proyecto importante' },
                { id: 3, name: 'Proyecto Beta', description: 'Proyecto secundario' }
            ]));
        }
        if (!localStorage.getItem('tasks')) {
            localStorage.setItem('tasks', JSON.stringify([]));
        }
        if (!localStorage.getItem('comments')) {
            localStorage.setItem('comments', JSON.stringify([]));
        }
        if (!localStorage.getItem('history')) {
            localStorage.setItem('history', JSON.stringify([]));
        }
        if (!localStorage.getItem('notifications')) {
            localStorage.setItem('notifications', JSON.stringify([]));
        }
        if (!localStorage.getItem('nextTaskId')) {
            localStorage.setItem('nextTaskId', '1');
        }
        if (!localStorage.getItem('nextProjectId')) {
            localStorage.setItem('nextProjectId', '4');
        }
    },

    // Usuarios
    getUsers() {
        return JSON.parse(localStorage.getItem('users') || '[]');
    },

    // Proyectos
    getProjects() {
        return JSON.parse(localStorage.getItem('projects') || '[]');
    },

    addProject(project) {
        const projects = this.getProjects();
        const id = parseInt(localStorage.getItem('nextProjectId') || '1');
        project.id = id;
        projects.push(project);
        localStorage.setItem('projects', JSON.stringify(projects));
        localStorage.setItem('nextProjectId', String(id + 1));
        return id;
    },

    updateProject(id, project) {
        const projects = this.getProjects();
        const index = projects.findIndex(p => p.id === id);
        if (index !== -1) {
            project.id = id;
            projects[index] = project;
            localStorage.setItem('projects', JSON.stringify(projects));
            return true;
        }
        return false;
    },

    deleteProject(id) {
        const projects = this.getProjects();
        const filtered = projects.filter(p => p.id !== id);
        localStorage.setItem('projects', JSON.stringify(filtered));
        return true;
    },

    // Tareas
    getTasks() {
        return JSON.parse(localStorage.getItem('tasks') || '[]');
    },

    addTask(task) {
        const tasks = this.getTasks();
        const id = parseInt(localStorage.getItem('nextTaskId') || '1');
        task.id = id;
        task.createdAt = new Date().toISOString();
        task.updatedAt = new Date().toISOString();
        tasks.push(task);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        localStorage.setItem('nextTaskId', String(id + 1));
        return id;
    },

    updateTask(id, task) {
        const tasks = this.getTasks();
        const index = tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            task.id = id;
            task.updatedAt = new Date().toISOString();
            tasks[index] = task;
            localStorage.setItem('tasks', JSON.stringify(tasks));
            return true;
        }
        return false;
    },

    deleteTask(id) {
        const tasks = this.getTasks();
        const filtered = tasks.filter(t => t.id !== id);
        localStorage.setItem('tasks', JSON.stringify(filtered));
        return true;
    },

    // Comentarios
    getComments() {
        return JSON.parse(localStorage.getItem('comments') || '[]');
    },

    addComment(comment) {
        const comments = this.getComments();
        comment.id = comments.length + 1;
        comment.createdAt = new Date().toISOString();
        comments.push(comment);
        localStorage.setItem('comments', JSON.stringify(comments));
    },

    // Historial
    getHistory() {
        return JSON.parse(localStorage.getItem('history') || '[]');
    },

    addHistory(entry) {
        const history = this.getHistory();
        entry.id = history.length + 1;
        entry.timestamp = new Date().toISOString();
        history.push(entry);
        localStorage.setItem('history', JSON.stringify(history));
    },

    // Notificaciones
    getNotifications() {
        return JSON.parse(localStorage.getItem('notifications') || '[]');
    },

    addNotification(notification) {
        const notifications = this.getNotifications();
        notification.id = notifications.length + 1;
        notification.read = false;
        notification.createdAt = new Date().toISOString();
        notifications.push(notification);
        localStorage.setItem('notifications', JSON.stringify(notifications));
    },

    markNotificationsRead(userId) {
        const notifications = this.getNotifications();
        notifications.forEach(n => {
            if (n.userId === userId) {
                n.read = true;
            }
        });
        localStorage.setItem('notifications', JSON.stringify(notifications));
    }
};

// Estado de la aplicación
let currentUser = null;
let selectedTaskId = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    Storage.init();
    loadProjects();
    loadUsers();
});

// Login
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        alert('Usuario y contraseña requeridos');
        return;
    }

    const users = Storage.getUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        currentUser = user;
        document.getElementById('loginPanel').style.display = 'none';
        document.getElementById('mainPanel').style.display = 'block';
        document.getElementById('currentUser').textContent = user.username;
        loadTasks();
        updateStats();
    } else {
        alert('Credenciales inválidas');
    }
}

// Logout
function logout() {
    currentUser = null;
    selectedTaskId = null;
    document.getElementById('loginPanel').style.display = 'block';
    document.getElementById('mainPanel').style.display = 'none';
    clearTaskForm();
}

// Navegación de pestañas
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(tabName + 'Tab').classList.add('active');
    event.target.classList.add('active');

    if (tabName === 'tasks') {
        loadTasks();
    } else if (tabName === 'projects') {
        loadProjectsTable();
    }
}

// Cargar usuarios y proyectos en selects
function loadUsers() {
    const users = Storage.getUsers();
    const select = document.getElementById('taskAssigned');
    select.innerHTML = '<option value="0">Sin asignar</option>';
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.username;
        select.appendChild(option);
    });
}

function loadProjects() {
    const projects = Storage.getProjects();
    const select = document.getElementById('taskProject');
    const searchSelect = document.getElementById('searchProject');
    
    select.innerHTML = '';
    if (searchSelect) {
        searchSelect.innerHTML = '<option value="0">Todos</option>';
    }

    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        select.appendChild(option);

        if (searchSelect) {
            const searchOption = document.createElement('option');
            searchOption.value = project.id;
            searchOption.textContent = project.name;
            searchSelect.appendChild(searchOption);
        }
    });
}

// Gestión de Tareas
function addTask() {
    if (!currentUser) return;

    const title = document.getElementById('taskTitle').value;
    if (!title) {
        alert('El título es requerido');
        return;
    }

    const task = {
        title: title,
        description: document.getElementById('taskDescription').value || '',
        status: document.getElementById('taskStatus').value || 'Pendiente',
        priority: document.getElementById('taskPriority').value || 'Media',
        projectId: parseInt(document.getElementById('taskProject').value) || 0,
        assignedTo: parseInt(document.getElementById('taskAssigned').value) || 0,
        dueDate: document.getElementById('taskDueDate').value || '',
        estimatedHours: parseFloat(document.getElementById('taskHours').value) || 0,
        actualHours: 0,
        createdBy: currentUser.id
    };

    const taskId = Storage.addTask(task);
    
    Storage.addHistory({
        taskId: taskId,
        userId: currentUser.id,
        action: 'CREATED',
        oldValue: '',
        newValue: task.title
    });

    if (task.assignedTo > 0) {
        Storage.addNotification({
            userId: task.assignedTo,
            message: 'Nueva tarea asignada: ' + task.title,
            type: 'task_assigned'
        });
    }

    loadTasks();
    clearTaskForm();
    updateStats();
    alert('Tarea agregada');
}

function updateTask() {
    if (!selectedTaskId) {
        alert('Selecciona una tarea');
        return;
    }

    const title = document.getElementById('taskTitle').value;
    if (!title) {
        alert('El título es requerido');
        return;
    }

    const oldTask = Storage.getTasks().find(t => t.id === selectedTaskId);
    if (!oldTask) return;

    const task = {
        title: title,
        description: document.getElementById('taskDescription').value || '',
        status: document.getElementById('taskStatus').value || 'Pendiente',
        priority: document.getElementById('taskPriority').value || 'Media',
        projectId: parseInt(document.getElementById('taskProject').value) || 0,
        assignedTo: parseInt(document.getElementById('taskAssigned').value) || 0,
        dueDate: document.getElementById('taskDueDate').value || '',
        estimatedHours: parseFloat(document.getElementById('taskHours').value) || 0,
        actualHours: oldTask.actualHours || 0,
        createdBy: oldTask.createdBy,
        createdAt: oldTask.createdAt
    };

    if (oldTask.status !== task.status) {
        Storage.addHistory({
            taskId: selectedTaskId,
            userId: currentUser.id,
            action: 'STATUS_CHANGED',
            oldValue: oldTask.status,
            newValue: task.status
        });
    }

    if (oldTask.title !== task.title) {
        Storage.addHistory({
            taskId: selectedTaskId,
            userId: currentUser.id,
            action: 'TITLE_CHANGED',
            oldValue: oldTask.title,
            newValue: task.title
        });
    }

    Storage.updateTask(selectedTaskId, task);

    if (task.assignedTo > 0) {
        Storage.addNotification({
            userId: task.assignedTo,
            message: 'Tarea actualizada: ' + task.title,
            type: 'task_updated'
        });
    }

    loadTasks();
    clearTaskForm();
    updateStats();
    alert('Tarea actualizada');
}

function deleteTask() {
    if (!selectedTaskId) {
        alert('Selecciona una tarea');
        return;
    }

    const task = Storage.getTasks().find(t => t.id === selectedTaskId);
    if (!task) return;

    if (confirm('¿Eliminar tarea: ' + task.title + '?')) {
        Storage.addHistory({
            taskId: selectedTaskId,
            userId: currentUser.id,
            action: 'DELETED',
            oldValue: task.title,
            newValue: ''
        });

        Storage.deleteTask(selectedTaskId);
        loadTasks();
        clearTaskForm();
        updateStats();
        alert('Tarea eliminada');
    }
}

function clearTaskForm() {
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    document.getElementById('taskStatus').selectedIndex = 0;
    document.getElementById('taskPriority').selectedIndex = 1;
    document.getElementById('taskProject').selectedIndex = 0;
    document.getElementById('taskAssigned').selectedIndex = 0;
    document.getElementById('taskDueDate').value = '';
    document.getElementById('taskHours').value = '';
    selectedTaskId = null;
}

function loadTasks() {
    const tasks = Storage.getTasks();
    const projects = Storage.getProjects();
    const users = Storage.getUsers();
    const tbody = document.getElementById('tasksTableBody');
    
    tbody.innerHTML = '';

    tasks.forEach(task => {
        const row = document.createElement('tr');
        row.onclick = () => selectTask(task.id);

        const project = projects.find(p => p.id === task.projectId);
        const user = users.find(u => u.id === task.assignedTo);

        row.innerHTML = `
            <td>${task.id}</td>
            <td>${task.title}</td>
            <td>${task.status || 'Pendiente'}</td>
            <td>${task.priority || 'Media'}</td>
            <td>${project ? project.name : 'Sin proyecto'}</td>
            <td>${user ? user.username : 'Sin asignar'}</td>
            <td>${task.dueDate || 'Sin fecha'}</td>
        `;

        tbody.appendChild(row);
    });
}

function selectTask(id) {
    selectedTaskId = id;
    const task = Storage.getTasks().find(t => t.id === id);
    if (!task) return;

    document.getElementById('taskTitle').value = task.title || '';
    document.getElementById('taskDescription').value = task.description || '';
    
    const statusSelect = document.getElementById('taskStatus');
    for (let i = 0; i < statusSelect.options.length; i++) {
        if (statusSelect.options[i].value === task.status) {
            statusSelect.selectedIndex = i;
            break;
        }
    }

    const prioritySelect = document.getElementById('taskPriority');
    for (let i = 0; i < prioritySelect.options.length; i++) {
        if (prioritySelect.options[i].value === task.priority) {
            prioritySelect.selectedIndex = i;
            break;
        }
    }

    const projectSelect = document.getElementById('taskProject');
    for (let i = 0; i < projectSelect.options.length; i++) {
        if (parseInt(projectSelect.options[i].value) === task.projectId) {
            projectSelect.selectedIndex = i;
            break;
        }
    }

    const assignedSelect = document.getElementById('taskAssigned');
    for (let i = 0; i < assignedSelect.options.length; i++) {
        if (parseInt(assignedSelect.options[i].value) === task.assignedTo) {
            assignedSelect.selectedIndex = i;
            break;
        }
    }

    document.getElementById('taskDueDate').value = task.dueDate || '';
    document.getElementById('taskHours').value = task.estimatedHours || '';
}

function updateStats() {
    const tasks = Storage.getTasks();
    let total = tasks.length;
    let completed = 0;
    let pending = 0;
    let highPriority = 0;
    let overdue = 0;

    tasks.forEach(task => {
        if (task.status === 'Completada') {
            completed++;
        } else {
            pending++;
        }

        if (task.priority === 'Alta' || task.priority === 'Crítica') {
            highPriority++;
        }

        if (task.dueDate && task.status !== 'Completada') {
            const due = new Date(task.dueDate);
            const now = new Date();
            if (due < now) {
                overdue++;
            }
        }
    });

    document.getElementById('statsText').textContent = 
        `Total: ${total} | Completadas: ${completed} | Pendientes: ${pending} | Alta Prioridad: ${highPriority} | Vencidas: ${overdue}`;
}

// Gestión de Proyectos
function addProject() {
    const name = document.getElementById('projectName').value;
    if (!name) {
        alert('El nombre es requerido');
        return;
    }

    const project = {
        name: name,
        description: document.getElementById('projectDescription').value || ''
    };

    Storage.addProject(project);
    loadProjects();
    loadProjectsTable();
    document.getElementById('projectName').value = '';
    document.getElementById('projectDescription').value = '';
    alert('Proyecto agregado');
}

function updateProject() {
    const name = document.getElementById('projectName').value;
    if (!name) {
        alert('Selecciona un proyecto de la tabla');
        return;
    }

    const projects = Storage.getProjects();
    const project = projects.find(p => p.name === name);
    if (!project) {
        alert('Proyecto no encontrado');
        return;
    }

    project.name = name;
    project.description = document.getElementById('projectDescription').value || '';

    Storage.updateProject(project.id, project);
    loadProjects();
    loadProjectsTable();
    alert('Proyecto actualizado');
}

function deleteProject() {
    const name = document.getElementById('projectName').value;
    if (!name) {
        alert('Selecciona un proyecto de la tabla');
        return;
    }

    const projects = Storage.getProjects();
    const project = projects.find(p => p.name === name);
    if (!project) {
        alert('Proyecto no encontrado');
        return;
    }

    if (confirm('¿Eliminar proyecto: ' + project.name + '?')) {
        Storage.deleteProject(project.id);
        loadProjects();
        loadProjectsTable();
        document.getElementById('projectName').value = '';
        document.getElementById('projectDescription').value = '';
        alert('Proyecto eliminado');
    }
}

function loadProjectsTable() {
    const projects = Storage.getProjects();
    const tbody = document.getElementById('projectsTableBody');
    
    tbody.innerHTML = '';

    projects.forEach(project => {
        const row = document.createElement('tr');
        row.onclick = () => {
            document.getElementById('projectName').value = project.name;
            document.getElementById('projectDescription').value = project.description || '';
        };

        row.innerHTML = `
            <td>${project.id}</td>
            <td>${project.name}</td>
            <td>${project.description || ''}</td>
        `;

        tbody.appendChild(row);
    });
}

// Comentarios
function addComment() {
    const taskId = parseInt(document.getElementById('commentTaskId').value);
    const text = document.getElementById('commentText').value;

    if (!taskId) {
        alert('ID de tarea requerido');
        return;
    }

    if (!text) {
        alert('El comentario no puede estar vacío');
        return;
    }

    Storage.addComment({
        taskId: taskId,
        userId: currentUser.id,
        commentText: text
    });

    document.getElementById('commentText').value = '';
    loadComments();
    alert('Comentario agregado');
}

function loadComments() {
    const taskId = parseInt(document.getElementById('commentTaskId').value);
    if (!taskId) {
        document.getElementById('commentsArea').value = 'Ingresa un ID de tarea';
        return;
    }

    const comments = Storage.getComments().filter(c => c.taskId === taskId);
    const users = Storage.getUsers();
    
    let text = `=== COMENTARIOS TAREA #${taskId} ===\n\n`;
    
    if (comments.length === 0) {
        text += 'No hay comentarios\n';
    } else {
        comments.forEach(comment => {
            const user = users.find(u => u.id === comment.userId);
            text += `[${comment.createdAt}] ${user ? user.username : 'Usuario'}: ${comment.commentText}\n---\n`;
        });
    }

    document.getElementById('commentsArea').value = text;
}

// Historial
function loadHistory() {
    const taskId = parseInt(document.getElementById('historyTaskId').value);
    if (!taskId) {
        document.getElementById('historyArea').value = 'Ingresa un ID de tarea';
        return;
    }

    const history = Storage.getHistory().filter(h => h.taskId === taskId);
    const users = Storage.getUsers();
    
    let text = `=== HISTORIAL TAREA #${taskId} ===\n\n`;
    
    if (history.length === 0) {
        text += 'No hay historial\n';
    } else {
        history.forEach(entry => {
            const user = users.find(u => u.id === entry.userId);
            text += `${entry.timestamp} - ${entry.action}\n`;
            text += `  Usuario: ${user ? user.username : 'Desconocido'}\n`;
            text += `  Antes: ${entry.oldValue || '(vacío)'}\n`;
            text += `  Después: ${entry.newValue || '(vacío)'}\n---\n`;
        });
    }

    document.getElementById('historyArea').value = text;
}

function loadAllHistory() {
    const history = Storage.getHistory();
    const users = Storage.getUsers();
    
    let text = '=== HISTORIAL COMPLETO ===\n\n';
    
    if (history.length === 0) {
        text += 'No hay historial\n';
    } else {
        history.slice(-100).reverse().forEach(entry => {
            const user = users.find(u => u.id === entry.userId);
            text += `Tarea #${entry.taskId} - ${entry.action} - ${entry.timestamp}\n`;
            text += `  Usuario: ${user ? user.username : 'Desconocido'}\n`;
            text += `  Antes: ${entry.oldValue || '(vacío)'}\n`;
            text += `  Después: ${entry.newValue || '(vacío)'}\n---\n`;
        });
    }

    document.getElementById('historyArea').value = text;
}

// Notificaciones
function loadNotifications() {
    if (!currentUser) return;

    const notifications = Storage.getNotifications().filter(n => 
        n.userId === currentUser.id && !n.read
    );
    
    let text = '=== NOTIFICACIONES ===\n\n';
    
    if (notifications.length === 0) {
        text += 'No hay notificaciones nuevas\n';
    } else {
        notifications.forEach(notif => {
            text += `• [${notif.type}] ${notif.message} (${notif.createdAt})\n`;
        });
    }

    document.getElementById('notificationsArea').value = text;
}

function markNotificationsRead() {
    if (!currentUser) return;

    Storage.markNotificationsRead(currentUser.id);
    loadNotifications();
    alert('Notificaciones marcadas como leídas');
}

// Búsqueda
function searchTasks() {
    const searchText = document.getElementById('searchText').value.toLowerCase();
    const statusFilter = document.getElementById('searchStatus').value;
    const priorityFilter = document.getElementById('searchPriority').value;
    const projectFilter = parseInt(document.getElementById('searchProject').value) || 0;

    const tasks = Storage.getTasks();
    const projects = Storage.getProjects();
    const tbody = document.getElementById('searchTableBody');
    
    tbody.innerHTML = '';

    const filtered = tasks.filter(task => {
        if (searchText && !task.title.toLowerCase().includes(searchText) && 
            !task.description.toLowerCase().includes(searchText)) {
            return false;
        }
        if (statusFilter && task.status !== statusFilter) {
            return false;
        }
        if (priorityFilter && task.priority !== priorityFilter) {
            return false;
        }
        if (projectFilter > 0 && task.projectId !== projectFilter) {
            return false;
        }
        return true;
    });

    filtered.forEach(task => {
        const row = document.createElement('tr');
        const project = projects.find(p => p.id === task.projectId);

        row.innerHTML = `
            <td>${task.id}</td>
            <td>${task.title}</td>
            <td>${task.status || 'Pendiente'}</td>
            <td>${task.priority || 'Media'}</td>
            <td>${project ? project.name : 'Sin proyecto'}</td>
        `;

        tbody.appendChild(row);
    });
}

// Reportes
function generateReport(type) {
    let text = `=== REPORTE: ${type.toUpperCase()} ===\n\n`;

    if (type === 'tasks') {
        const tasks = Storage.getTasks();
        const statusCount = {};
        tasks.forEach(task => {
            const status = task.status || 'Pendiente';
            statusCount[status] = (statusCount[status] || 0) + 1;
        });
        Object.keys(statusCount).forEach(status => {
            text += `${status}: ${statusCount[status]} tareas\n`;
        });
    } else if (type === 'projects') {
        const projects = Storage.getProjects();
        const tasks = Storage.getTasks();
        projects.forEach(project => {
            const count = tasks.filter(t => t.projectId === project.id).length;
            text += `${project.name}: ${count} tareas\n`;
        });
    } else if (type === 'users') {
        const users = Storage.getUsers();
        const tasks = Storage.getTasks();
        users.forEach(user => {
            const count = tasks.filter(t => t.assignedTo === user.id).length;
            text += `${user.username}: ${count} tareas asignadas\n`;
        });
    }

    document.getElementById('reportsArea').value = text;
}

function exportCSV() {
    const tasks = Storage.getTasks();
    const projects = Storage.getProjects();
    
    let csv = 'ID,Título,Estado,Prioridad,Proyecto\n';
    
    tasks.forEach(task => {
        const project = projects.find(p => p.id === task.projectId);
        csv += `${task.id},"${task.title}","${task.status || 'Pendiente'}","${task.priority || 'Media'}","${project ? project.name : 'Sin proyecto'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export_tasks.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    alert('Exportado a export_tasks.csv');
}
