const create = document.getElementById("submit");
const error = document.getElementById("error");

const registerInput = async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById('password').value;

  if (username.length > 32) {
    error.innerHTML =
      "Username may not be longer than 32 characters in length.";
    return;
  } else if (username.length < 2) {
    error.innerHTML = "Username must be at least 2 characters in length.";
    return;
  }

  const userReq = await fetch(`${api}/users`, {
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

create.addEventListener("click", async () => registerInput());
