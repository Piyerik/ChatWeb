const create = document.getElementById("submit");
const error = document.getElementById("error");
const inviteRegex = /[a-zA-Z0-9]{6}/;

const params = new URLSearchParams(window.location.search);
if (params.get('invite'))
  document.getElementById('invite').value = params.get('invite');

const registerInput = async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById('password').value;
  const invite = document.getElementById('invite').value;

  if (username.length > 32) {
    error.innerHTML =
      "Username may not be longer than 32 characters in length.";
    return;
  } else if (username.length < 2) {
    error.innerHTML = "Username must be at least 2 characters in length.";
    return;
  }

  if (!inviteRegex.test(invite)) {
    error.innerHTML = 'Invalid invite code.';
    return;
  }

  const userReq = await fetch(`${api}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password, invite }),
  });

  const user = await userReq.json();
  if (!userReq.ok) {
    error.innerHTML = user.message;
    return;
  }

  document.cookie = `token=${user.token}; path=/`;
  document.cookie = `username=${username}; path=/`;
  document.cookie = `id=${user.id}; path=/`;
  window.location.href = "/";
};