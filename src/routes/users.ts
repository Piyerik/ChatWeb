import type { Express } from "express";
import crypto from 'crypto';
import db from "../db";

export default function (app: Express) {
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

    const userAlready = await db.user.findUnique({
      where: { username: body.username },
    });
    if (userAlready)
      return res.status(409).send({ message: "Username already exists." });

    const token = crypto.randomBytes(16).toString("hex");
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(body.password, salt, 64).toString("hex");

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
}
