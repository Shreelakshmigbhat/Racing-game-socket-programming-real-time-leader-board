import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";

// Leaderboard Logic
class Leaderboard {
  scores = new Map();

  updateScore(player, score) {
    const currentScore = this.scores.get(player) || 0;
    this.scores.set(player, Math.max(currentScore, score));
  }

  getLeaderboard() {
    return Array.from(this.scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([player, score], index) => ({
        rank: index + 1,
        player,
        score
      }));
  }

  getLeaderboardString() {
    return this.getLeaderboard()
      .map(item => `${item.rank}. ${item.player} : ${item.score}`)
      .join("\n");
  }
}

const leaderboard = new Leaderboard();

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // ✅ Clean routes (no /api)
  app.get("/leaderboard", (req, res) => {
    res.json(leaderboard.getLeaderboard());
  });

  app.post("/update-score", (req, res) => {
    const { player, score } = req.body;

    if (!player || typeof score !== "number") {
      return res.status(400).json({ error: "Invalid data" });
    }

    leaderboard.updateScore(player, score);

    console.log(`[HTTP] ${player} → ${score}`);

    io.emit("leaderboardUpdate", leaderboard.getLeaderboard());

    res.json({ message: "Score updated" });
  });

  // ✅ Socket.IO
  io.on("connection", (socket) => {
    const port =
      socket.request.socket.remotePort ||
      socket.conn?.transport?.socket?._socket?.remotePort;

    // store port for reuse
    socket.clientPort = port;

    console.log(`[PORT ${port}] Connected`);

    // send initial leaderboard
    socket.emit("leaderboardUpdate", leaderboard.getLeaderboard());

    socket.on("updateScore", (data) => {
      const { player, score } = data;

      leaderboard.updateScore(player, score);

      console.log(`[PORT ${socket.clientPort}] ${player} → ${score}`);

      io.emit("leaderboardUpdate", leaderboard.getLeaderboard());
    });

    socket.on("disconnect", () => {
      console.log(`[PORT ${socket.clientPort}] Disconnected`);
    });
  });

  // Vite (frontend)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Leaderboard available at http://localhost:${PORT}/leaderboard`);
  });
}

startServer();