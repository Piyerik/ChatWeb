import type { Express } from "express";
import db from '../db';

export default function(app: Express) {
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
      select: { author: { select: { username: true, createdAt: true, id: true }}}
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
}