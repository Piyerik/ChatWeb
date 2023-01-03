async function main() {
  const stringified = '{"' + document.cookie.replaceAll('=', '":"').replaceAll('; ', '", "') + '"}';
  const cookies = JSON.parse(stringified);
  const { token, username } = cookies;
  const id = +cookies.id;

  const container = document.getElementById('messages');
  const chatbox = document.getElementById('chatbox');
  const socket = new WebSocket(`ws${secure ? 's' : ''}://${domain}`);

  socket.addEventListener('message', async event => {
    const text = await event.data.text();
    if (text === '10') return;

    const msg = JSON.parse(text);
    if (msg.error) return console.error(msg);

    if (msg.type === 'new') {
      const msgDOM = document.createElement('p');
      if (msg.authorId === id) msgDOM.setAttribute('data-self', true);
      msgDOM.setAttribute('data-id', msg.id);
      msgDOM.innerHTML = msg.content.replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '<br>')
      
      // check if above element is self, if so, append to that, else wise create another block
      if (document.getElementById('messages').lastChild?.getAttribute('data-self') === 'true')
        document.getElementById('messages').lastChild.appendChild(msgDOM);
      else {
        const block = document.createElement('div');
        const userDOM = document.createElement('b');
        userDOM.innerHTML = msg.username;
        if (msg.authorId === id) block.setAttribute('data-self', true);
        block.setAttribute('data-authorId', msg.authorId);
        block.appendChild(userDOM);

        block.append(msgDOM);
        container.append(block);
      }

      messages.scrollTo(0, messages.scrollHeight);
    } else if (msg.type === 'edit') {
      const msgDOM = document.querySelector(`[data-id='${msg.id}'`);
      msgDOM.innerHTML = msg.content.replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '<br>')
    } else if (msg.type === 'delete') {
      const msgDOM = document.querySelector(`[data-id='${msg.id}'`);
      console.log(msgDOM);
      // 2 = username + last message
      if (msgDOM.parentNode.children.length === 2) {
        console.log('fr');
        msgDOM.parentNode.parentNode.removeChild(msgDOM.parentNode);
      } else {
        console.log('okay');
        msgDOM.parentNode.removeChild(msgDOM);
      }
    }
  });

  socket.addEventListener('close', () => {
    alert('Disconnected from server. Refresh to reconnect.');
  });

  window.addEventListener('offline', () => {
    alert('You are offline. Refresh to reconnect.');
  })

  let date = Date.now();
  const latestMessagesReq = await fetch(`${api}/messages/${date}`, {
    method: 'GET',
    headers: {
      'Authorization': token
    }
  });
  const latestMessages = (await latestMessagesReq.json()).messages;

  for (let i = 0, block = document.createElement('div'); i < latestMessages.length; i++) {
    const message = latestMessages[i];
    const previous = latestMessages[i - 1];

    if (i > 0 && message.authorId !== previous.authorId) {
      container.appendChild(block);
      block = document.createElement('div');
    }

    if (block.children.length == 0) {
      const userDOM = document.createElement('b');
      userDOM.innerHTML = message.author.username;
      if (message.authorId === id) block.setAttribute('data-self', true);
      block.setAttribute('data-authorId', message.authorId);
      block.appendChild(userDOM);
    }

    const msgDOM = document.createElement('p');
    msgDOM.setAttribute('data-id', message.id);
    msgDOM.innerHTML = `${message.content.replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '<br>')}`;
    block.appendChild(msgDOM);

    if (i + 1 === latestMessages.length) {
      container.appendChild(block);
    }
  }
  date = latestMessages[0]?.createdAt || 0;

  messages.scrollTo(0, messages.scrollHeight);

  messages.addEventListener('scroll', async () => {
    if (messages.scrollTop !== 0) return;

    const messagesReq = await fetch(`${api}/messages/${date}`, {
      method: 'GET',
      headers: {
        'Authorization': token
      }
    });
    const _messages = (await messagesReq.json()).messages;
    if (_messages.length == 0) return;

    const topMessage = document.getElementById('messages').firstElementChild;
    for (let i = 0, block = document.createElement('div'); i < latestMessages.length; i++) {
      const message = latestMessages[i];
      const previous = latestMessages[i - 1];
  
      if (i > 0 && message.authorId !== previous.authorId) {
        topMessage.before(block);
        block = document.createElement('div');
      }
  
      if (block.children.length == 0) {
        const userDOM = document.createElement('b');
        userDOM.innerHTML = message.author.username;
        if (message.authorId === id) block.setAttribute('data-self', true);
        block.setAttribute('data-authorId', message.authorId);
        block.appendChild(userDOM);
      }
  
      const msgDOM = document.createElement('p');
      msgDOM.setAttribute('data-id', message.id);
      msgDOM.innerHTML = `${message.content.replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '<br>')}`;
      block.appendChild(msgDOM);
  
      if (i + 1 === latestMessages.length) {
        if (message.authorId === topMessage.getAttribute('data-authorId'))
          topMessage.removeChild(topMessage.children[0]);
        topMessage.before(block);
      }
    }

    const lastLocation = topMessage.getBoundingClientRect().y - 140; // magic number :O
    messages.scrollTo(0, lastLocation);
    
    date = messages[0]?.createdAt || 0;
  });

  const sendMessage = async () => {
    const value = document.getElementById('chatbox').value;
    if (value.replaceAll(' ', '').replaceAll('\n', '').length == 0) return;
    if (value.length > 2000) return alert('Message exceeds 2000 character limit.');
    chatbox.value = "";

    socket.send(JSON.stringify({
      token,
      request: 'send',
      body: {
        content: value
      }
    }));

    messages.scrollTo(0, messages.scrollHeight);
    
    const chatbox_ = document.getElementById('chatbox');
    if (chatbox_.scrollHeight > 400) return;
    chatbox_.style.height = 0;
    chatbox_.style.height = chatbox.scrollHeight + 'px';
  }

  chatbox.addEventListener('keypress', async key => {
    if (key.code !== 'Enter') return;
    if (!key.shiftKey) key.preventDefault();
    else return;

    return sendMessage();
  });

  chatbox.addEventListener('input', () => {
    const chatbox_ = document.getElementById('chatbox');
    if (chatbox_.scrollHeight > 400) return;
    chatbox_.style.height = 0;
    chatbox_.style.height = chatbox.scrollHeight + 'px';
  })


  document.getElementById('send').addEventListener('click', async() => sendMessage());

  document.body.addEventListener('dblclick', event => {
    const element = event.target;
    const alreadySelected = document.querySelector("[contenteditable='true'");
    if (alreadySelected) {
      alreadySelected.setAttribute('contenteditable', false);
      alreadySelected.style.backgroundColor = '';
    }
    if (element.parentNode.getAttribute('data-self') !== 'true') return;

    if (socket.readyState !== WebSocket.OPEN) return window.location.href = '/login';

    element.setAttribute('contenteditable', true);
    element.style.backgroundColor = 'orange';

    const before = document.querySelector(`[data-id='${element.getAttribute('data-id')}'`).innerHTML;

    let listener = element.addEventListener('keypress', (key) => {
      if (key.code !== 'Enter') return;
      const value = document.querySelector(`[data-id='${element.getAttribute('data-id')}'`).innerHTML;
      if (value.length > 2000) return alert('Message exceeds 2000 character limit.');
      element.setAttribute('contenteditable', false);
      element.style.backgroundColor = '';
      element.innerHTML = before;

      socket.send(JSON.stringify({
        token,
        request: value.length === 0 ? 'delete' : 'edit',
        body: {
          messageId: +element.getAttribute('data-id'),
          content: value
        }
      }));

      listener = null;
    })
  });

  const interval = setInterval(() => {
    if (socket.readyState !== WebSocket.OPEN) return clearInterval(interval);
    socket.send('9');
  }, 20000);
}

main();