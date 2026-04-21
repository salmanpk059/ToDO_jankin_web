const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoList = document.getElementById('todo-list');
const itemsLeft = document.getElementById('items-left');
const dateDisplay = document.getElementById('date-display');
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

// State Management
let todos = JSON.parse(localStorage.getItem('todos')) || [];
let activeFilter = 'all';
let searchQuery = '';

const themeKey = 'taskflow-theme';

function loadTheme() {
    const savedTheme = localStorage.getItem(themeKey) || 'light';
    document.body.classList.toggle('dark', savedTheme === 'dark');
    themeToggle.textContent = savedTheme === 'dark' ? '☀' : '☾';
}

function saveTheme(theme) {
    localStorage.setItem(themeKey, theme);
    document.body.classList.toggle('dark', theme === 'dark');
    themeToggle.textContent = theme === 'dark' ? '☀' : '☾';
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

function saveAndRender() {
    localStorage.setItem('todos', JSON.stringify(todos));
    render(activeFilter);
}

function render(filter = 'all') {
    activeFilter = filter;
    todoList.innerHTML = '';

    filterButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === activeFilter);
    });

    const filteredTodos = todos.filter(todo => {
        if (filter === 'pending') return !todo.completed;
        if (filter === 'completed') return todo.completed;
        return true;
    }).filter(todo => todo.text.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filteredTodos.length === 0) {
        const emptyState = document.createElement('li');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = searchQuery
            ? '<strong>No matching tasks.</strong><span>Try a different search term or clear the search box.</span>'
            : '<strong>No tasks here yet.</strong><span>Add one to get started and build your day.</span>';
        todoList.appendChild(emptyState);
    }

    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        const overdue = isOverdue(todo.dueDate, todo.completed);
        li.innerHTML = `
            <div class="todo-card">
                <div class="todo-main">
                    <span class="todo-text" onclick="toggleTodo('${todo.id}')">${todo.text}</span>
                </div>
                <div class="todo-meta">
                    <span class="badge priority-${todo.priority}">${todo.priority}</span>
                    ${todo.dueDate ? `<span class="badge ${overdue ? 'overdue' : ''}">${overdue ? 'Overdue' : `Due ${formatDueDate(todo.dueDate)}`}</span>` : ''}
                </div>
                <div class="todo-actions">
                    <button class="edit-btn" onclick="editTodo('${todo.id}')">Edit</button>
                    <button class="delete-btn" onclick="deleteTodo('${todo.id}')">✕</button>
                </div>
            </div>
        `;
        todoList.appendChild(li);
    });

    const remaining = todos.filter(t => !t.completed).length;
    itemsLeft.innerText = `${remaining} task${remaining !== 1 ? 's' : ''} left`;
    totalCount.innerText = todos.length;
    activeCount.innerText = remaining;
    completedCount.innerText = todos.filter(t => t.completed).length;

    updateProgress();
}

// Actions
todoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const cleanText = todoInput.value.trim();
    if (!cleanText) return;

    const newTodo = {
        id: Date.now().toString(),
        text: cleanText,
        priority: todoPriority.value,
        dueDate: todoDueDate.value,
        completed: false
    };
    todos.push(newTodo);
    todoInput.value = '';
    todoPriority.value = 'medium';
    todoDueDate.value = '';
    saveAndRender();
});

window.toggleTodo = (id) => {
    todos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveAndRender();
};

window.deleteTodo = (id) => {
    todos = todos.filter(t => t.id !== id);
    saveAndRender();
};

window.editTodo = (id) => {
    const targetTodo = todos.find(todo => todo.id === id);
    if (!targetTodo) return;

    const nextText = prompt('Edit task text:', targetTodo.text);
    if (nextText === null) return;

    const cleanText = nextText.trim();
    if (!cleanText) return;

    const nextPriority = prompt('Edit priority (high, medium, low):', targetTodo.priority) || targetTodo.priority;
    const validPriority = ['high', 'medium', 'low'].includes(nextPriority.toLowerCase()) ? nextPriority.toLowerCase() : targetTodo.priority;
    const nextDueDate = prompt('Edit due date (YYYY-MM-DD) or leave empty:', targetTodo.dueDate || '');

    targetTodo.text = cleanText;
    targetTodo.priority = validPriority;
    targetTodo.dueDate = nextDueDate === null ? targetTodo.dueDate : nextDueDate.trim();
    saveAndRender();
};

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        render(button.dataset.filter);
    });
});

searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    render(activeFilter);
});

clearCompletedBtn.addEventListener('click', () => {
    todos = todos.filter(t => !t.completed);
    saveAndRender();
});

themeToggle.addEventListener('click', () => {
    const nextTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
    saveTheme(nextTheme);
});


function updateProgress() {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;

    const percentage = total === 0 ? 0 : (completed / total) * 100;
    progressFill.style.width = `${percentage}%`;
}

function setDateText() {
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    dateDisplay.innerText = new Date().toLocaleDateString(undefined, options);
}

// Initial Load
loadTheme();
setDateText();
render();