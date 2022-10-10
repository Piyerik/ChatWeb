import type { Express } from "express";
import crypto from "crypto";
import db from "../../db";

export default function (app: Express) {
  app.post("/api/user-auth", async (req, res) => {
    const { body } = req;
    if (!('username' in body && 'password' in body))
      return res.status(400).send({
        message: "Request must have properties `username` and `password`.",
      });

    const user = await db.user.findUnique({
      where: { username: body.username },
    });
    if (!user)
      return res.status(401).send({ message: "Invalid username or password." });

    const { salt, password, token, id } = user;
    const hash = crypto.scryptSync(body.password, salt, 64).toString("hex");
    if (password !== hash)
      return res.status(401).send({ message: "Invalid username or password." });

    return res.send({ token, id });
  });
}
