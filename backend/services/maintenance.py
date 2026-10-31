"""Prototype thresholds only - NOT certified aircraft maintenance limits."""


def classify(rul: float):
    if rul > 100:
        return "HEALTHY", "Normal monitoring"
    if rul >= 50:
        return "MONITOR", "Increase monitoring"
    if rul >= 20:
        return "WARNING", "Schedule inspection"
    return "CRITICAL", "Urgent maintenance assessment"
