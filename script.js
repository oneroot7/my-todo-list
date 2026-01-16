function addTodo() {
    const input = document.getElementById('todo-input');
    const text = input.value;
    if (text === '') return;
    const li = document.createElement('li');
    li.innerHTML = `${text} <button onclick="this.parentElement.remove()">X</button>`;
    document.getElementById('todo-list').appendChild(li);
    input.value = '';
}
