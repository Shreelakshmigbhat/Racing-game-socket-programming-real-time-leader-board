class Leaderboard:
    def __init__(self):
        self.scores = {}

    def update_score(self, player, score):
        current_score = self.scores.get(player, 0)
        self.scores[player] = max(current_score, score)

    def get_leaderboard(self):
        sorted_scores = sorted(self.scores.items(), key=lambda x: x[1], reverse=True)
        return [{"rank": i + 1, "player": p, "score": s} for i, (p, s) in enumerate(sorted_scores)]

    def get_leaderboard_string(self):
        board = self.get_leaderboard()
        return "\n".join([f"{item['rank']}. {item['player']} : {item['score']}" for item in board])
