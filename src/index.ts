import express from "express";
import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import path from "path";
import crypto from "crypto";
const port = parseInt(process.env.PORT!);

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(cookieParser());
app.use(express.static("client"));

const db = new PrismaClient();

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  ws.on("message", async (data) => {
    let msg: { token: string; request: string; body?: any };
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return ws.send({
        code: 400,
        error: true,
        message: "Data could not be parsed as JSON",
        requestData: data,
      });
    }

    const { token, request, body } = msg;

    if (!token || !request)
      return ws.send({
        code: 400,
        error: true,
        message: "Request must have properties `token` and `request`",
        requestData: data,
      });

    const user = await db.user.findUnique({ where: { token } });
    if (!user)
      return ws.send({
        code: 498,
        error: true,
        message: "Invalid token.",
        requestData: data,
      });

    if (request === "send") {
      if (!body?.content)
        return ws.send({
          code: 411,
          error: true,
          message: "Cannot send an empty message.",
          requestData: data,
        });

      const messageData = {
        authorId: user.id,
        content: body.content,
        createdAt: BigInt(Date.now()),
      };

      const { id } = await db.message.create({
        data: messageData,
      });

      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState == WebSocket.OPEN)
          client.send(
            Buffer.from(
              JSON.stringify(
                { type: "new", ...messageData, id, username: user.username },
                (k, v) => (typeof v === "bigint" ? v.toString() : v)
              )
            )
          );
      });
    } else if (request === "edit") {
      if (!body?.messageId)
        return ws.send({
          code: 400,
          error: true,
          message: "Missing message ID.",
          requestData: data,
        });

      if (!body?.content)
        return ws.send({
          code: 411,
          error: true,
          message: "Cannot edit to an empty message.",
          requestData: data,
        });

      if (typeof body.messageId !== "number") body.messageId = +body.messageId;

      const message = await db.message.findUnique({
        where: { id: body.messageId },
      });

      if (!message)
        return ws.send({
          code: 404,
          error: true,
          message: "Message not found",
          requestData: data,
        });
      if (message.authorId !== user.id)
        return ws.send({
          code: 401,
          error: true,
          message: "You cannot edit a message you do not own.",
        });

      await db.message.update({
        where: {
          id: body.messageId,
        },
        data: {
          content: body.content,
        },
      });

      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState == WebSocket.OPEN)
          client.send(
            Buffer.from(
              JSON.stringify({
                type: "edit",
                id: body.messageId,
                content: body.content,
                username: user.username,
              })
            )
          );
      });
    } else if (request === 'delete') {
      if (!body?.messageId)
        return ws.send({
          code: 400,
          error: true,
          message: "Missing message ID.",
          requestData: data,
        });

      if (typeof body.messageId !== "number") body.messageId = +body.messageId;
      const message = await db.message.findUnique({
        where: { id: body.messageId },
      });

      if (!message)
        return ws.send({
          code: 404,
          error: true,
          message: "Message not found",
          requestData: data,
        });
      if (message.authorId !== user.id)
        return ws.send({
          code: 401,
          error: true,
          message: "You cannot edit a message you do not own.",
        });

      await db.message.delete({
        where: {
          id: body.messageId
        }
      });

      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState == WebSocket.OPEN)
          client.send(
            Buffer.from(
              JSON.stringify({
                type: "delete",
                id: body.messageId
              })
            )
          );
      });

    } else {
      return ws.send({
        code: 400,
        error: true,
        message: "Unknown request.",
        requestData: data,
      });
    }
  });
});

app.get("/", async (req, res) => {
  const cookies = req.cookies;
  if (cookies.token) {
    const user = await db.user.findUnique({ where: { token: cookies.token } });
    if (user)
      return res.sendFile(path.join(__dirname, "../client/main/index.html"));
  }
  res.redirect("/login");
});

app.get("/login", async (req, res) => {
  const cookies = req.cookies;
  if (cookies.token) {
    const user = await db.user.findUnique({ where: { token: cookies.token } });
    if (user) return res.redirect("/");
  }

  res.sendFile(path.join(__dirname, "../client/login/login.html"));
});

app.get("/signup", async (req, res) =>
  res.sendFile(path.join(__dirname, "../client/signup/signup.html"))
);

app.get("/messages/:before", async (req, res) => {
  const cookies = req.cookies;
  if (cookies.user) {
    const userJSON = JSON.parse(cookies.user);
    const user = await db.user.findUnique({ where: { token: userJSON.token } });
    if (!user) return res.status(403).send({ message: "Unauthorized." });
  }

  const before = +req.params.before;
  if (!before && before !== 0)
    return res
      .status(400)
      .send({ message: "Parameter `before` is not a number." });

  const messages = await db.message.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    where: {
      createdAt: {
        lt: before,
      },
    },
    include: { author: true },
  });

  return res.send(
    JSON.stringify(
      {
        messages: messages.reverse(),
      },
      (k, v) => (typeof v === "bigint" ? v.toString() : v)
    )
  );
});

app.post("/users", async (req, res) => {
  const { body } = req;
  if (!(body.username && body.password))
    return res.status(400).send({
      message: "Request must have properties `username` and `password`.",
    });

  if (body.username.length < 2)
    return res
      .status(400)
      .send({ message: "Username must be at least 2 characters in length." });
  if (body.username.length > 32)
    return res.status(400).send({
      message: "Username may not be longer than 32 characters in length.",
    });

  const token = crypto.randomBytes(16).toString("hex");
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(body.password, salt, 64).toString("hex");

  const userAlready = await db.user.findUnique({
    where: { username: body.username },
  });
  if (userAlready)
    return res.status(409).send({ message: "Username already exists." });

  const user = await db.user.create({
    data: {
      token,
      salt,
      password: hash,
      username: body.username,
    },
  });

  return res.status(201).send({ token, id: user.id });
});

app.post("/user-auth", async (req, res) => {
  const { body } = req;
  if (!(body.username && body.password))
    return res.status(400).send({
      message: "Request must have properties `username` and `password`.",
    });

  const user = await db.user.findUnique({ where: { username: body.username } });
  if (!user)
    return res.status(401).send({ message: "Invalid username or password." });

  const { salt, password, token, id } = user;
  const hash = crypto.scryptSync(body.password, salt, 64).toString("hex");
  if (password !== hash)
    return res.status(401).send({ message: "Invalid username or password." });

  return res.send({ token, id });
});

server.listen(port, () => console.log(`Server listening on port ${port}`));

process.on("uncaughtException", (e) => console.error(e));
