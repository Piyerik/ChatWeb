const api = "https://chatweb-production.up.railway.app";

const stringified =
  '{"' + document.cookie.replaceAll("=", '":"').replaceAll("; ", '", "') + '"}';
const cookies = JSON.parse(stringified);

document.getElementById("username").value = cookies.username;

const update = document.getElementById("update");
const deleteBtn = document.getElementById("delete");
const logout = document.getElementById('logout');

update.addEventListener("click", async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const error = document.getElementById("error");

  if (username.length > 32) {
    error.innerHTML =
      "Username may not be longer than 32 characters in length.";
    return;
  } else if (username.length < 2) {
    error.innerHTML = "Username must be at least 2 characters in length.";
    return;
  }

  const changeData = {};
  if (username !== cookies.username) changeData.username = username;
  if (password) changeData.password = password;

  if (!changeData.username && !changeData.password) return;

  const confirmation = document.getElementById("confirmation").value;
  const req = await fetch(`${api}/users`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth: {
        username: cookies.username,
        password: confirmation,
      },
      ...changeData,
    }),
  });

  if (req.status !== 204) {
    const output = await req.json();
    error.innerHTML = output.message;
    return;
  }

  alert("Successfully updated!");
  document.getElementById("password").value = "";
  document.getElementById("confirmation").value = "";
  error.innerHTML = "";
});

deleteBtn.addEventListener("click", async () => {
  const confirmation = document.getElementById("confirmation").value;
  const random = "xxxxxx".replaceAll(/x/g, () => Math.floor(Math.random() * 6));
  const doubleConfirmation = prompt(
    `You requested to delete your account. Re-enter the confirmation code to proceed.\n${random}`
  );
  if (doubleConfirmation !== random)
    return alert("Confirmation code does not match.");

  const req = await fetch(`${api}/users`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: cookies.username,
      password: confirmation,
    }),
  });

  if (req.status !== 204) {
    const output = await req.json();
    error.innerHTML = output.message;
    return;
  }

  alert("Account deleted.");
  window.location.href = "/signup";
});

logout.addEventListener('click', () => {
  document.cookie = 'token=;path=/';
  document.cookie = 'id=;path=/';
  document.cookie = 'username=;path=/';

  window.location.href = '/login';
})
