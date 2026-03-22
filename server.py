import socket
import threading
import json
from leaderboard import Leaderboard

HOST = "0.0.0.0"
PORT = 5000

leaderboard = Leaderboard()

def handle_client(conn, addr):
    print(f"Connected: {addr}")
    while True:
        try:
            data = conn.recv(1024).decode()
            if not data:
                break

            command = data.strip().split()
            if not command:
                continue

            if command[0] == "UPDATE":
                if len(command) < 3:
                    conn.sendall(b"Invalid command format. Use: UPDATE <player> <score>\n")
                    continue
                player = command[1]
                try:
                    score = int(command[2])
                    leaderboard.update_score(player, score)
                    conn.sendall(b"Score updated\n")
                except ValueError:
                    conn.sendall(b"Score must be an integer\n")

            elif command[0] == "GET":
                board_str = leaderboard.get_leaderboard_string()
                conn.sendall(board_str.encode() + b"\n")

            elif command[0] == "JSON":
                board_json = json.dumps(leaderboard.get_leaderboard())
                conn.sendall(board_json.encode() + b"\n")

            elif command[0] == "EXIT":
                break

            else:
                conn.sendall(b"Invalid command. Use UPDATE, GET, JSON, or EXIT\n")

        except Exception as e:
            print(f"Error handling client {addr}: {e}")
            break

    print(f"Disconnected: {addr}")
    conn.close()

def start_server():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind((HOST, PORT))
    server.listen()
    print(f"Python TCP Server listening on {HOST}:{PORT}")

    while True:
        conn, addr = server.accept()
        thread = threading.Thread(target=handle_client, args=(conn, addr))
        thread.start()

if __name__ == "__main__":
    start_server()
