import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import fs from 'fs';
import ws_ from './ws/ws';
const port = parseInt(process.env.PORT!);

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(cookieParser());
app.use(express.static("client"));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

ws_(wss);

(async () => {
  const routes = fs.readdirSync('./api/routes');
  for (const route of routes) {
    const fileName = route.slice(0, -3);
    (await import(`./routes/${fileName}`)).default(app);
  }
})();

server.listen(port, () => console.log(`Server listening on port ${port}`));

process.on("uncaughtException", (e) => console.error(e));
