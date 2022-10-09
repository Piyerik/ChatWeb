import type { Server, WebSocket } from "ws";
import db from "../db";

export default function (wss: Server<WebSocket>) {
  wss.on("connection", (ws) => {
    ws.on("message", async (data) => {
      console.log(data);

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

      if (!token || !request || !body)
        return ws.send({
          code: 400,
          error: true,
          message: "Request must have properties `token`, `request` and `body`.",
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
      
      try {
        const file = (await import(`./requests/${request}`)).default;
        file(wss, ws, data, body, user); // file is not awaited as an unknown request error should not be sent from an internal error
      } catch {
        return ws.send({
          code: 400,
          error: true,
          message: 'Unknown request.',
          requestData: data
        })
      }
    });
  });
}
