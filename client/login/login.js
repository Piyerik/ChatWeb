async function main() {
  const login = document.getElementById('login');
  const error = document.getElementById('error');

  const registerInput = async () => {
    const username = document.getElementById('username').value;
    
    if (username.length == 0) {
      error.innerHTML = 'Username is required.';
      return;
    }
    else if (username.length > 32) {
      error.innerHTML = 'Username cannot be greater than 32 characters.';
      return;
    }

    const password = document.getElementById('password').value;
    if (password.length == 0) {
      error.innerHTML = 'Password is required.';
      return;
    }

    const userReq = await fetch('http://localhost:3000/user-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const user = await userReq.json();
    if (!userReq.ok) {
      error.innerHTML = user.message;
      return;
    }

    document.cookie = `token=${user.token}; path=/`;
    document.cookie = `username=${username}; path=/`;
    document.cookie = `id=${user.id}; path=/`;
    window.location.href='/';
  }   

  login.addEventListener('click', async () => registerInput());
}

main();