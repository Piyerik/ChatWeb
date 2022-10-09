import type { Express } from "express";
import crypto from 'crypto';
import db from "../db";

export default function (app: Express) {
  app.route('/users')
  .post(async (req, res) => {
    const { body } = req;
    if (!('username' in body && 'password' in body))
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
        createdAt: BigInt(Date.now())
      },
    });

    return res.status(201).send({ token, id: user.id });
  })
  .patch(async (req, res) => {
    const { body } = req;
    if (!('username' in body.auth && 'password' in body.auth))
      return res.status(400).send({
        message: "Request must have properties `auth.username` and `auth.password`.",
      });

    const user = await db.user.findUnique({
      where: { username: body.auth.username },
    });
    if (!user)
      return res.status(401).send({ message: "Invalid username or password." });

    const { salt, password } = user;
    const hash = crypto.scryptSync(body.auth.password, salt, 64).toString("hex");
    if (password !== hash)
      return res.status(401).send({ message: "Invalid username or password." });

    if ('username' in body) {
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

      await db.user.update({
        where: {
          username: body.auth.username
        },
        data: {
          username: body.username
        }
      });

      res.cookie('username', body.username);
    }

    if ('password' in body) {
      const p_token = crypto.randomBytes(16).toString("hex");
      const p_salt = crypto.randomBytes(16).toString("hex");
      const p_hash = crypto.scryptSync(body.password, p_salt, 64).toString("hex");

      await db.user.update({
        where: {
          username: body.auth.username
        },
        data: {
          token: p_token,
          salt: p_salt,
          password: p_hash
        },
      });

      res.cookie('token', p_token);
    }

    return res.status(204).send();
  })
  .delete(async (req, res) => {
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

    const { salt, password } = user;
    const hash = crypto.scryptSync(body.password, salt, 64).toString("hex");
    if (password !== hash)
      return res.status(401).send({ message: "Invalid username or password." });

    await db.message.deleteMany({
      where: {
        authorId: user.id
      }
    });

    await db.user.delete({
      where: {
        username: body.username
      }
    });

    return res.status(204).send();
  });
}
