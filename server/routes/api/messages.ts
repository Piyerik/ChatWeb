import type { Express } from "express";
import db from '../../db';

export default function(app: Express) {
  app.get("/api/messages/:before", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).send({ message: 'Unauthorized.' });

    const user = await db.user.findUnique({ where: { token: authHeader } });
    if (!user) return res.status(403).send({ message: "Unauthorized." });
  
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
      include: { author: { select: { username: true, createdAt: true, id: true }}}
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