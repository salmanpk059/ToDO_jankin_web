const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoList = document.getElementById('todo-list');
const itemsLeft = document.getElementById('items-left');
const dateDisplay = document.getElementById('date-display');
const filterButtons = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clear-completed');
const progressFill = document.getElementById('progress-fill');

// State Management
let todos = JSON.parse(localStorage.getItem('todos')) || [];
let activeFilter = 'all';

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
    });

    if (filteredTodos.length === 0) {
        const emptyState = document.createElement('li');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'No tasks here yet. Add one to get started.';
        todoList.appendChild(emptyState);
    }

    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.innerHTML = `
            <span class="todo-text" onclick="toggleTodo('${todo.id}')">${todo.text}</span>
            <button class="delete-btn" onclick="deleteTodo('${todo.id}')">✕</button>
        `;
        todoList.appendChild(li);
    });

    const remaining = todos.filter(t => !t.completed).length;
    itemsLeft.innerText = `${remaining} task${remaining !== 1 ? 's' : ''} left`;

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
        completed: false
    };
    todos.push(newTodo);
    todoInput.value = '';
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

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        render(button.dataset.filter);
    });
});

clearCompletedBtn.addEventListener('click', () => {
    todos = todos.filter(t => !t.completed);
    saveAndRender();
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
setDateText();
render();