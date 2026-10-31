import torch
from torch import nn


class RNNRegressor(nn.Module):
    """Stacked LSTM/GRU -> FC -> ReLU -> FC -> Softplus (non-negative RUL).
    Output is RUL / cap (normalised); multiply by cap to get cycles."""

    def __init__(self, kind: str, input_size: int, hidden: int = 64, layers: int = 2, dropout: float = 0.2):
        super().__init__()
        rnn_cls = {"lstm": nn.LSTM, "gru": nn.GRU}[kind.lower()]
        self.rnn = rnn_cls(input_size, hidden, num_layers=layers, batch_first=True,
                           dropout=dropout if layers > 1 else 0.0)
        self.head = nn.Sequential(
            nn.Linear(hidden, 32), nn.ReLU(), nn.Dropout(dropout), nn.Linear(32, 1), nn.Softplus()
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.rnn(x)              # (B, T, H)
        return self.head(out[:, -1, :]).squeeze(-1)
