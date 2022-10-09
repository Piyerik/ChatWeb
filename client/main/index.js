const api = 'https://chatweb-production.up.railway.app';

async function main() {
  const stringified = '{"' + document.cookie.replaceAll('=', '":"').replaceAll('; ', '", "') + '"}';
  const cookies = JSON.parse(stringified);
  const { token, username } = cookies;
  const id = +cookies.id;

  const container = document.getElementById('messages');
  const socket = new WebSocket(`wss://chatweb-production.up.railway.app`);

  socket.addEventListener('message', async event => {
    const msg = JSON.parse(await event.data.text());
    if (msg.error) return console.error(msg);

    if (msg.type === 'new') {
      const msgDOM = document.createElement('p');
      if (msg.authorId === id) msgDOM.setAttribute('data-self', true);
      msgDOM.setAttribute('data-id', msg.id);
      msgDOM.innerHTML = `${msg.username}: ${msg.content}`;
      container.appendChild(msgDOM);

      window.scrollTo(0, document.body.scrollHeight);
    } else if (msg.type === 'edit') {
      const msgDOM = document.querySelector(`[data-id='${msg.id}'`);
      msgDOM.innerHTML = `${msg.username}: ${msg.content}`;
    } else if (msg.type === 'delete') {
      const msgDOM = document.querySelector(`[data-id='${msg.id}'`);
      msgDOM.parentNode.removeChild(msgDOM);
    } else if (msg.type === 'send-response') {
      const msgDOM = document.querySelector(`[data-temp-id='${msg.temporaryId}'`);
      msgDOM.setAttribute('data-id', msg.id);
      msgDOM.removeAttribute('data-temp-id');
    }
  });

  socket.addEventListener('close', () => {
    alert('Disconnected from server. Refresh to reconnect.');
  });

  window.addEventListener('offline', () => {
    alert('You are offline. Refresh to reconnect.');
  })

  let date = Date.now();
  const latestMessagesReq = await fetch(`${api}/messages/${date}`);
  const latestMessages = (await latestMessagesReq.json()).messages;
  for (const message of latestMessages) {
    const msg = document.createElement('p');
    if (message.authorId === id) msg.setAttribute('data-self', true);
    msg.setAttribute('data-id', message.id);
    msg.innerHTML = `${message.author.username}: ${message.content.replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '<br>')}`;
    container.appendChild(msg);
  }
  date = latestMessages[0]?.createdAt || 0;

  window.scrollTo(0, document.body.scrollHeight);

  document.addEventListener('scroll', async () => {
    if (window.scrollY !== 0) return;

    const messagesReq = await fetch(`${api}/messages/${date}`);
    const messages = (await messagesReq.json()).messages;

    const topMessage = document.getElementById('messages').firstElementChild;
    for (const message of messages) {
      const msg = document.createElement('p');
      if (message.authorId === id) msg.setAttribute('data-self', true);
      msg.setAttribute('data-id', message.id);
      msg.innerHTML = `${message.author.username}: ${message.content.replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '<br>')}`;
      topMessage.before(msg);
    }
    
    date = messages[0]?.createdAt || 0;
  })

  const sendMessage = async () => {
    const value = document.getElementById('chatbox').value;
    if (value.replaceAll(' ', '').replaceAll('\n', '').length == 0) return;
    if (value.length > 2000) return alert('Message exceeds 2000 character limit.');
    document.getElementById('chatbox').value = "";

    const temporaryId = Math.floor(Math.random() * 1000);

    socket.send(JSON.stringify({
      token,
      request: 'send',
      body: {
        content: value,
        temporaryId
      }
    }));

    const msg = document.createElement('p');
    msg.setAttribute('data-self', true);
    msg.setAttribute('data-temp-id', temporaryId);
    msg.innerHTML = `${username}: ${value.replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '<br>')}`;
    container.appendChild(msg);

    window.scrollTo(0, document.body.scrollHeight);
  }

  document.getElementById('chatbox').addEventListener('keypress', async key => {
    if (key.code !== 'Enter') return;
    if (!key.shiftKey) key.preventDefault();
    else return;

    return sendMessage();
  });


  document.getElementById('send').addEventListener('click', async() => sendMessage());

  document.body.addEventListener('dblclick', event => {
    if (!event.target.parentNode.id === 'messages') return;
    const element = event.target;
    if (element.getAttribute('data-self') !== 'true') return;

    if (socket.readyState !== WebSocket.OPEN) return window.location.href = '/login';

    const newContent = prompt('Enter new message content');
    if (newContent == null) return;

    if (newContent.length == 0) {
      element.parentNode.removeChild(element);
      socket.send(JSON.stringify({
        token,
        request: 'delete',
        body: {
          messageId: +element.getAttribute('data-id')
        }
      }));

      return;
    }

    if (newContent.length > 2000) return alert('Message exceeds 2000 character limit.');

    element.innerHTML = `${username}: ${newContent}`;

    socket.send(JSON.stringify({
      token,
      request: 'edit',
      body: {
        messageId: +element.getAttribute('data-id'),
        content: newContent
      }
    }));
  });
}

main();