const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

const conversation = [];

function appendMessage(role, text, options = {}) {
  const { isThinking = false, isError = false } = options;

  const message = document.createElement('div');
  message.className = `message ${role}`;

  if (isThinking) message.classList.add('thinking');
  if (isError) message.classList.add('error');

  const textNode = document.createElement('div');
  textNode.className = 'message-text';
  textNode.textContent = text;

  message.appendChild(textNode);
  chatBox.appendChild(message);
  chatBox.scrollTop = chatBox.scrollHeight;

  return message;
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };

    return entities[character];
  });
}

function formatBotResponse(text) {
  const escapedText = escapeHtml(text.trim());
  const lines = escapedText.split(/\r?\n/);
  const formattedLines = [];
  let insideList = false;

  const closeList = () => {
    if (insideList) {
      formattedLines.push('</ul>');
      insideList = false;
    }
  };

  lines.forEach((line) => {
    const listItem = line.match(/^\s*[-*]\s+(.+)$/);

    if (listItem) {
      if (!insideList) {
        formattedLines.push('<ul>');
        insideList = true;
      }

      formattedLines.push(`<li>${listItem[1]}</li>`);
      return;
    }

    closeList();

    if (!line.trim()) {
      formattedLines.push('');
      return;
    }

    const heading = line.match(/^\s*(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length + 2;
      formattedLines.push(`<h${level}>${heading[2]}</h${level}>`);
      return;
    }

    formattedLines.push(line);
  });

  closeList();

  return formattedLines
    .join('\n')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^\*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>')
    .replace(/\n/g, '<br>');
}

function resetInputState() {
  input.disabled = false;
  input.focus();

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = false;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const userText = input.value.trim();
  if (!userText) {
    input.focus();
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;

  input.disabled = true;

  const userMessage = { role: 'user', text: userText };
  conversation.push(userMessage);
  appendMessage('user', userText);

  const thinkingMessage = appendMessage('bot', 'Thinking...', { isThinking: true });

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ conversation })
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      throw new Error('Invalid JSON response');
    }

    const result = data && typeof data.result === 'string' ? data.result.trim() : '';

    if (!result) {
      throw new Error('No result received');
    }

    conversation.push({ role: 'model', text: result });

    thinkingMessage.querySelector('.message-text').innerHTML = formatBotResponse(result);
    thinkingMessage.classList.remove('thinking');
  } catch (error) {
    const errorMessage =
      error && error.message === 'No result received'
        ? 'Sorry, no response received.'
        : 'Failed to get response from server.';

    thinkingMessage.querySelector('.message-text').textContent = errorMessage;
    thinkingMessage.classList.remove('thinking');
    thinkingMessage.classList.add('error');
  } finally {
    input.value = '';
    resetInputState();
  }
});
