import { io } from "socket.io-client";
import readline from "readline";

const SERVER_URL = process.env.APP_URL || "http://localhost:3000";

const socket = io(SERVER_URL);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`Connecting to server at ${SERVER_URL}...`);

socket.on("connect", () => {
  console.log("Connected to server");
  showMenu();
});

socket.on("leaderboardUpdate", (data) => {
  console.log("\n--- Real-time Leaderboard Update ---");
  data.forEach(item => {
    console.log(`${item.rank}. ${item.player} : ${item.score}`);
  });
  console.log("------------------------------------\n");
});

function showMenu() {
  console.log("\n1. Update Score");
  console.log("2. Get Leaderboard");
  console.log("3. Exit");
  rl.question("Enter choice: ", (choice) => {
    if (choice === "1") {
      rl.question("Player name: ", (player) => {
        rl.question("Score: ", (score) => {
          socket.emit("updateScore", { player, score: parseInt(score) });
          console.log("Update sent!");
          showMenu();
        });
      });
    } else if (choice === "2") {
      // Leaderboard is already updated via socket events, but we can fetch it manually too
      fetch(`${SERVER_URL}/api/leaderboard`)
        .then(res => res.json())
        .then(data => {
          console.log("\nLeaderboard:");
          data.forEach((item: any) => {
            console.log(`${item.rank}. ${item.player} : ${item.score}`);
          });
          showMenu();
        })
        .catch(err => {
          console.error("Error fetching leaderboard:", err);
          showMenu();
        });
    } else if (choice === "3") {
      socket.disconnect();
      process.exit(0);
    } else {
      console.log("Invalid choice");
      showMenu();
    }
  });
}

socket.on("disconnect", () => {
  console.log("Disconnected from server");
});
