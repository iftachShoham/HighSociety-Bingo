-- ============================================================
-- HS BINGO PLATFORM — Database Schema
-- ============================================================

-- Platform users (organizers who create events)
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name  VARCHAR(200),
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Events (a competition created by an organizer)
CREATE TABLE IF NOT EXISTS events (
  id              SERIAL PRIMARY KEY,
  organizer_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  discord_guild_id VARCHAR(100),
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Games (individual game instances within an event)
CREATE TABLE IF NOT EXISTS games (
  id          SERIAL PRIMARY KEY,
  event_id    INTEGER REFERENCES events(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  game_type   VARCHAR(50) NOT NULL DEFAULT 'bingo',
  status      VARCHAR(20) DEFAULT 'setup',
  join_code   VARCHAR(20) UNIQUE,
  config      JSONB DEFAULT '{}',
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Teams registered for a game
CREATE TABLE IF NOT EXISTS teams (
  id                  SERIAL PRIMARY KEY,
  game_id             INTEGER REFERENCES games(id) ON DELETE CASCADE,
  name                VARCHAR(200) NOT NULL,
  color               VARCHAR(20) DEFAULT '#808080',
  discord_channel_id  VARCHAR(100),
  discord_webhook_url TEXT,
  password_hash       VARCHAR(255),
  position            INTEGER DEFAULT 0,
  created_at          TIMESTAMP DEFAULT NOW()
);

-- Tiles on a game board
CREATE TABLE IF NOT EXISTS tiles (
  id                  SERIAL PRIMARY KEY,
  game_id             INTEGER REFERENCES games(id) ON DELETE CASCADE,
  position            INTEGER NOT NULL,
  task_description    TEXT,
  required_submissions INTEGER DEFAULT 1,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMP DEFAULT NOW(),
  UNIQUE(game_id, position)
);

-- Submissions (proof of tile completion)
CREATE TABLE IF NOT EXISTS submissions (
  id                  SERIAL PRIMARY KEY,
  team_id             INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  tile_id             INTEGER REFERENCES tiles(id) ON DELETE CASCADE,
  proof_url           TEXT NOT NULL,
  submitted_by        VARCHAR(200),
  is_early_completion BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMP DEFAULT NOW()
);

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
  id          SERIAL PRIMARY KEY,
  game_id     INTEGER REFERENCES games(id) ON DELETE CASCADE,
  team_id     INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  event_type  VARCHAR(50) NOT NULL,
  from_tile   INTEGER,
  to_tile     INTEGER,
  details     TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Extensions for full admin control
-- ============================================================
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS is_rat_tile BOOLEAN DEFAULT FALSE;
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS allow_early_submit BOOLEAN DEFAULT FALSE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS join_code VARCHAR(20);

-- ============================================================
-- Battleship Bingo: ship placements and attacks
-- ============================================================
CREATE TABLE IF NOT EXISTS ship_placements (
  id          SERIAL PRIMARY KEY,
  game_id     INTEGER REFERENCES games(id) ON DELETE CASCADE,
  team_id     INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  ship_name   VARCHAR(100) NOT NULL,
  ship_size   INTEGER NOT NULL,
  positions   INTEGER[] NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ship_attacks (
  id                SERIAL PRIMARY KEY,
  game_id           INTEGER REFERENCES games(id) ON DELETE CASCADE,
  attacker_team_id  INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  target_team_id    INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  position          INTEGER NOT NULL,
  hit               BOOLEAN NOT NULL,
  ship_placement_id INTEGER REFERENCES ship_placements(id) ON DELETE SET NULL,
  created_at        TIMESTAMP DEFAULT NOW()
);
