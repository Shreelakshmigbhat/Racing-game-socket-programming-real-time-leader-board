import socket

HOST = "127.0.0.1"
PORT = 5000

def start_client():

    client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    client.connect((HOST, PORT))

    print("Connected to server")

    # Ask once
    player = input("Enter your name: ")

    while True:

        print("\n1 Update Score")
        print("2 Get Leaderboard")
        print("3 Exit")

        choice = input("Enter choice: ")

        if choice == "1":

            score = input("Score: ")
            message = f"UPDATE {player} {score}"

            client.send(message.encode())

            response = client.recv(1024).decode()
            print(response)

        elif choice == "2":

            client.send(b"GET")
            response = client.recv(4096).decode()

            print("\nLeaderboard")
            print(response)

        elif choice == "3":
            break

    client.close()


if __name__ == "__main__":
    start_client()