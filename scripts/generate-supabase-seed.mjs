import { readFileSync, writeFileSync } from "node:fs";

const read = (name) => JSON.parse(readFileSync(new URL(`../assets/data/${name}`, import.meta.url), "utf8").replace(/^\uFEFF/, ""));
const quote = (value) => value == null ? "null" : `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => `${quote(JSON.stringify(value))}::jsonb`;
const array = (values) => `array[${values.map(quote).join(", ")}]::text[]`;
const rows = (table, columns, values) => values.length
  ? `insert into public.${table} (${columns.join(", ")}) values\n${values.map((row) => `  (${row.join(", ")})`).join(",\n")}\non conflict do nothing;\n`
  : "";

const maps = read("maps.json");
const regions = read("map-regions.json");
const games = read("board-games.json");
const locations = read("board-game-locations.json");

const sql = [
  "begin;\n",
  rows("maps", ["id", "title", "type", "image_url", "sort_order", "active"], maps.map((v) => [quote(v.id), quote(v.title), quote(v.type), quote(v.imageUrl), v.sortOrder, v.active])),
  rows("map_regions", ["id", "map_id", "title", "description", "image_url", "sort_order"], regions.map((v) => [quote(v.id), quote("world-atlas"), quote(v.title), quote(v.description), quote(v.imageUrl), v.sortOrder])),
  rows("board_games", ["id", "title", "primary_genre", "genres", "theme", "recommended_players", "play_time", "difficulty", "region_id", "source_order"], games.map((v) => [quote(v.id), quote(v.title), quote(v.primaryGenre), array(v.genres), quote(v.theme), quote(v.recommendedPlayers), quote(v.playTime), quote(v.difficulty), quote(v.regionId), v.sourceOrder])),
  rows("board_game_locations", ["node_id", "game_id", "map_id", "region_id", "map_x", "map_y", "node_order", "placement_status", "placement_method", "data"], locations.map((v) => [quote(v.nodeId), quote(v.gameId), quote(v.mapId), quote(v.regionId), v.x ?? "null", v.y ?? "null", v.nodeOrder, quote(v.placementStatus), quote(v.placementMethod), json(v.data)])),
  "commit;\n",
].join("\n");

writeFileSync(new URL("../supabase/seed.sql", import.meta.url), sql, "utf8");
