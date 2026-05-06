const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoList = document.getElementById('todo-list');
const itemsLeft = document.getElementById('items-left');
const dateDisplay = document.getElementById('date-display');
const nextDueDisplay = document.getElementById('next-due');
const filterButtons = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clear-completed');
const progressFill = document.getElementById('progress-fill');
const searchInput = document.getElementById('search-input');
const todoPriority = document.getElementById('todo-priority');
const todoDueDate = document.getElementById('todo-due-date');
const themeToggle = document.getElementById('theme-toggle');
const totalCount = document.getElementById('total-count');
const activeCount = document.getElementById('active-count');
const completedCount = document.getElementById('completed-count');
const sortModeSelect = document.getElementById('sort-mode');
const completeAllBtn = document.getElementById('complete-all');
const exportTasksBtn = document.getElementById('export-tasks');
const importTasksBtn = document.getElementById('import-tasks');
const importFileInput = document.getElementById('import-file');
const addBtn = document.getElementById('add-btn');
const cancelEditBtn = document.getElementById('cancel-edit');

const storageKey = 'taskflow-todos-v2';
const legacyStorageKey = 'todos';
const themeKey = 'taskflow-theme';
const priorityOrder = { high: 0, medium: 1, low: 2 };

let todos = loadTodos();
let activeFilter = 'all';
let searchQuery = '';
let sortMode = 'newest';
let editingTodoId = null;

function safeParseJSON(value) {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

function isValidDate(dateValue) {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateValue || '');
}

function normalizeTodo(rawTodo) {
    const text = String(rawTodo?.text || '').trim();
    if (!text) return null;

    const id = String(rawTodo?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const priority = ['high', 'medium', 'low'].includes(rawTodo?.priority) ? rawTodo.priority : 'medium';
    const dueDate = isValidDate(rawTodo?.dueDate) ? rawTodo.dueDate : '';
    const createdAt = Number(rawTodo?.createdAt) || Number.parseInt(id, 10) || Date.now();

    return {
        id,
        text,
        priority,
        dueDate,
        completed: Boolean(rawTodo?.completed),
        createdAt,
        updatedAt: Number(rawTodo?.updatedAt) || createdAt
    };
}

function loadTodos() {
    const currentData = safeParseJSON(localStorage.getItem(storageKey));
    const legacyData = safeParseJSON(localStorage.getItem(legacyStorageKey));
    const source = Array.isArray(currentData) ? currentData : (Array.isArray(legacyData) ? legacyData : []);

    return source.map(normalizeTodo).filter(Boolean);
}

function persistTodos() {
    localStorage.setItem(storageKey, JSON.stringify(todos));
}

function formatDueDate(dateValue) {
    if (!dateValue) return '';
    const date = new Date(`${dateValue}T00:00:00`);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(dateValue, completed) {
    if (!dateValue || completed) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(`${dateValue}T00:00:00`);
    return due < today;
}

function loadTheme() {
    const savedTheme = localStorage.getItem(themeKey) || 'light';
    document.body.classList.toggle('dark', savedTheme === 'dark');
    themeToggle.textContent = savedTheme === 'dark' ? '?' : '?';
}

function saveTheme(theme) {
    localStorage.setItem(themeKey, theme);
    document.body.classList.toggle('dark', theme === 'dark');
    themeToggle.textContent = theme === 'dark' ? '?' : '?';
}

function updateProgress() {
    const total = todos.length;
    const completed = todos.filter(todo => todo.completed).length;
    const percentage = total === 0 ? 0 : (completed / total) * 100;
    progressFill.style.width = `${percentage}%`;
}

function updateNextDue() {
    const pendingWithDue = todos
        .filter(todo => !todo.completed && todo.dueDate)
        .sort((a, b) => new Date(`${a.dueDate}T00:00:00`) - new Date(`${b.dueDate}T00:00:00`));

    if (pendingWithDue.length === 0) {
        nextDueDisplay.textContent = 'No upcoming due date';
        return;
    }

    const nextTodo = pendingWithDue[0];
    const overdue = isOverdue(nextTodo.dueDate, false);
    nextDueDisplay.textContent = overdue
        ? `Next due: ${nextTodo.text} (overdue)`
        : `Next due: ${nextTodo.text} on ${formatDueDate(nextTodo.dueDate)}`;
}

function setDateText() {
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    dateDisplay.textContent = new Date().toLocaleDateString(undefined, options);
}

function compareBySortMode(a, b) {
    if (sortMode === 'oldest') return a.createdAt - b.createdAt;

    if (sortMode === 'priority') {
        const primary = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (primary !== 0) return primary;
        return b.createdAt - a.createdAt;
    }

    if (sortMode === 'due-soon') {
        const dueA = a.dueDate ? new Date(`${a.dueDate}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
        const dueB = b.dueDate ? new Date(`${b.dueDate}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
        if (dueA !== dueB) return dueA - dueB;
        return b.createdAt - a.createdAt;
    }

    return b.createdAt - a.createdAt;
}

function getVisibleTodos() {
    return todos
        .filter(todo => {
            if (activeFilter === 'pending') return !todo.completed;
            if (activeFilter === 'completed') return todo.completed;
            return true;
        })
        .filter(todo => todo.text.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort(compareBySortMode);
}

function createBadge(text, className = '') {
    const badge = document.createElement('span');
    badge.className = `badge ${className}`.trim();
    badge.textContent = text;
    return badge;
}

function createTodoItem(todo) {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.completed ? 'completed' : ''}`;

    const card = document.createElement('div');
    card.className = 'todo-card';

    const main = document.createElement('div');
    main.className = 'todo-main';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-check';
    checkbox.checked = todo.completed;
    checkbox.dataset.action = 'toggle';
    checkbox.dataset.id = todo.id;

    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = todo.text;
    text.dataset.action = 'toggle';
    text.dataset.id = todo.id;

    main.appendChild(checkbox);
    main.appendChild(text);

    const meta = document.createElement('div');
    meta.className = 'todo-meta';
    meta.appendChild(createBadge(todo.priority, `priority-${todo.priority}`));

    if (todo.dueDate) {
        const overdue = isOverdue(todo.dueDate, todo.completed);
        const dueText = overdue ? 'Overdue' : `Due ${formatDueDate(todo.dueDate)}`;
        meta.appendChild(createBadge(dueText, overdue ? 'overdue' : ''));
    }

    const actions = document.createElement('div');
    actions.className = 'todo-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'edit-btn';
    editBtn.textContent = 'Edit';
    editBtn.dataset.action = 'edit';
    editBtn.dataset.id = todo.id;

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '?';
    deleteBtn.dataset.action = 'delete';
    deleteBtn.dataset.id = todo.id;

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(main);
    card.appendChild(meta);
    card.appendChild(actions);
    li.appendChild(card);

    return li;
}

function render() {
    todoList.innerHTML = '';

    filterButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === activeFilter);
    });

    const visibleTodos = getVisibleTodos();

    if (visibleTodos.length === 0) {
        const emptyState = document.createElement('li');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = searchQuery
            ? '<strong>No matching tasks.</strong><span>Try another keyword or clear search.</span>'
            : '<strong>No tasks yet.</strong><span>Add your first task and start your day.</span>';
        todoList.appendChild(emptyState);
    } else {
        visibleTodos.forEach(todo => {
            todoList.appendChild(createTodoItem(todo));
        });
    }

    const remaining = todos.filter(todo => !todo.completed).length;
    const done = todos.filter(todo => todo.completed).length;

    itemsLeft.textContent = `${remaining} task${remaining !== 1 ? 's' : ''} left`;
    totalCount.textContent = String(todos.length);
    activeCount.textContent = String(remaining);
    completedCount.textContent = String(done);

    updateProgress();
    updateNextDue();
}

function saveAndRender() {
    persistTodos();
    render();
}

function resetFormToAddState() {
    editingTodoId = null;
    addBtn.textContent = 'Add';
    cancelEditBtn.classList.add('hidden');
    todoInput.value = '';
    todoPriority.value = 'medium';
    todoDueDate.value = '';
}

function startEdit(todoId) {
    const todo = todos.find(item => item.id === todoId);
    if (!todo) return;

    editingTodoId = todo.id;
    todoInput.value = todo.text;
    todoPriority.value = todo.priority;
    todoDueDate.value = todo.dueDate;
    addBtn.textContent = 'Save';
    cancelEditBtn.classList.remove('hidden');
    todoInput.focus();
}

function upsertTodoFromForm() {
    const cleanText = todoInput.value.trim();
    if (!cleanText) return;

    if (editingTodoId) {
        todos = todos.map(todo => {
            if (todo.id !== editingTodoId) return todo;
            return {
                ...todo,
                text: cleanText,
                priority: todoPriority.value,
                dueDate: todoDueDate.value,
                updatedAt: Date.now()
            };
        });
    } else {
        const now = Date.now();
        todos.push({
            id: String(now),
            text: cleanText,
            priority: todoPriority.value,
            dueDate: todoDueDate.value,
            completed: false,
            createdAt: now,
            updatedAt: now
        });
    }

    resetFormToAddState();
    saveAndRender();
}

function deleteTodo(todoId) {
    todos = todos.filter(todo => todo.id !== todoId);
    if (editingTodoId === todoId) {
        resetFormToAddState();
    }
    saveAndRender();
}

function toggleTodo(todoId) {
    todos = todos.map(todo => {
        if (todo.id !== todoId) return todo;
        return { ...todo, completed: !todo.completed, updatedAt: Date.now() };
    });
    saveAndRender();
}

function completeAllTasks() {
    let changed = false;
    todos = todos.map(todo => {
        if (todo.completed) return todo;
        changed = true;
        return { ...todo, completed: true, updatedAt: Date.now() };
    });

    if (changed) saveAndRender();
}

function exportTasks() {
    const blob = new Blob([JSON.stringify(todos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `taskflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
}

function importTasks(file) {
    const reader = new FileReader();

    reader.onload = () => {
        const parsed = safeParseJSON(String(reader.result));
        if (!Array.isArray(parsed)) {
            alert('Invalid file format. Please import a JSON array of tasks.');
            return;
        }

        const normalized = parsed.map(normalizeTodo).filter(Boolean);
        if (normalized.length === 0) {
            alert('No valid tasks found in file.');
            return;
        }

        const existingIds = new Set(todos.map(todo => todo.id));
        normalized.forEach(todo => {
            if (existingIds.has(todo.id)) {
                todo.id = `${todo.id}-${Math.random().toString(16).slice(2, 6)}`;
            }
            existingIds.add(todo.id);
            todos.push(todo);
        });

        saveAndRender();
    };

    reader.readAsText(file);
}

function debounce(fn, delay = 160) {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

// Form and controls
todoForm.addEventListener('submit', event => {
    event.preventDefault();
    upsertTodoFromForm();
});

cancelEditBtn.addEventListener('click', () => {
    resetFormToAddState();
});

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        activeFilter = button.dataset.filter;
        render();
    });
});

searchInput.addEventListener('input', debounce(() => {
    searchQuery = searchInput.value.trim();
    render();
}));

sortModeSelect.addEventListener('change', () => {
    sortMode = sortModeSelect.value;
    render();
});

clearCompletedBtn.addEventListener('click', () => {
    todos = todos.filter(todo => !todo.completed);
    saveAndRender();
});

completeAllBtn.addEventListener('click', () => {
    completeAllTasks();
});

exportTasksBtn.addEventListener('click', () => {
    exportTasks();
});

importTasksBtn.addEventListener('click', () => {
    importFileInput.click();
});

importFileInput.addEventListener('change', () => {
    const file = importFileInput.files?.[0];
    if (!file) return;
    importTasks(file);
    importFileInput.value = '';
});

themeToggle.addEventListener('click', () => {
    const nextTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
    saveTheme(nextTheme);
});

// Event delegation for dynamic todo items
todoList.addEventListener('click', event => {
    const actionNode = event.target.closest('[data-action]');
    if (!actionNode) return;

    const action = actionNode.dataset.action;
    const todoId = actionNode.dataset.id;
    if (!todoId) return;

    if (action === 'toggle') {
        toggleTodo(todoId);
        return;
    }

    if (action === 'edit') {
        startEdit(todoId);
        return;
    }

    if (action === 'delete') {
        deleteTodo(todoId);
    }
});

// Keyboard shortcuts
window.addEventListener('keydown', event => {
    const isCmdOrCtrl = event.metaKey || event.ctrlKey;

    if (isCmdOrCtrl && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInput.focus();
        searchInput.select();
    }

    if (event.key === 'Escape') {
        if (editingTodoId) {
            resetFormToAddState();
        }
    }
});

// Initial load
loadTheme();
setDateText();
resetFormToAddState();
render();
