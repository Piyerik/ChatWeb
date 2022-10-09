const login = document.getElementById("submit");
const error = document.getElementById("error");

const registerInput = async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById('password').value;

  const userReq = await fetch(`${api}/user-auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
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

login.addEventListener("click", async () => registerInput());
