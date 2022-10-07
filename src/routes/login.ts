import type { Express } from "express";
import path from 'path';
import db from '../db';

export default function(app: Express) {
  app.get("/login", async (req, res) => {
    const cookies = req.cookies;
    if (cookies.token) {
      const user = await db.user.findUnique({ where: { token: cookies.token } });
      if (user) return res.redirect("/");
    }

    res.sendFile(path.join(__dirname, "../../client/login/login.html"));
  });
}