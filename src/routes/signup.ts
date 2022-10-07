import type { Express } from "express";
import path from 'path';

export default function(app: Express) {
  app.get("/signup", async (req, res) =>
    res.sendFile(path.join(__dirname, "../../../client/signup/signup.html"))
  );
}