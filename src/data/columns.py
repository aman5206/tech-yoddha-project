"""Column definitions for NASA C-MAPSS files (26 columns, whitespace separated)."""
INDEX_COLS = ["engine_id", "cycle"]
SETTING_COLS = [f"op_setting_{i}" for i in range(1, 4)]
SENSOR_COLS = [f"s{i}" for i in range(1, 22)]
ALL_COLS = INDEX_COLS + SETTING_COLS + SENSOR_COLS
CANDIDATE_FEATURES = SETTING_COLS + SENSOR_COLS  # 24 before constant-feature removal
