const socket = io();
const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');
const fileForm = document.getElementById('fileForm');
const fileInput = document.getElementById('fileInput');

form.addEventListener('submit', e => {
  e.preventDefault();
  if (input.value) {
    socket.emit('chat message', input.value);
    input.value = '';
  }
});

socket.on('chat message', msg => {
  const item = document.createElement('div');
  item.textContent = msg;
  messages.appendChild(item);
});

fileForm.addEventListener('submit', async e => {
  e.preventDefault();
  const file = fileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/upload', { method: 'POST', body: formData });
  const data = await res.json();
});

socket.on('file', ({ fileUrl, fileName }) => {
  const item = document.createElement('div');
  item.innerHTML = `📁 <a href="${fileUrl}" target="_blank">${fileName}</a>`;
  messages.appendChild(item);
});