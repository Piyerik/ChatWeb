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
  if (!body?.content)
    return ws.send(Buffer.from(JSON.stringify({
      code: 411,
      error: true,
      message: "Cannot send an empty message.",
      requestData: data,
  })));

  if (body.content.length > 2000)
    return ws.send(Buffer.from(JSON.stringify({
      code: 400,
      error: true,
      message: "Message exceeds 2000 character limit.",
      requestData: data,
    })));

  const messageData = {
    authorId: user.id,
    content: body.content,
    createdAt: BigInt(Date.now()),
  };

  const { id } = await db.message.create({
    data: messageData,
  });

  ws.send(Buffer.from(JSON.stringify({ type: 'send-response', id, temporaryId: body.temporaryId })));
  
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
}
