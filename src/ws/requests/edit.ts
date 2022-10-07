import { User } from "@prisma/client";
import { Server, WebSocket } from "ws";
import db from "../../db";

export default async function (
  wss: Server<WebSocket>,
  ws: WebSocket,
  data: any,
  body: any,
  user: User
) {
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
}
