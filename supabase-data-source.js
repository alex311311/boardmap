(function () {
  const config = window.BOARDMAP_SUPABASE;
  const sdk = window.supabase;
  const configured = Boolean(config?.url && config?.publishableKey && !config.url.includes("YOUR_PROJECT_REF"));
  const client = configured && sdk ? sdk.createClient(config.url, config.publishableKey) : null;

  const camel = (row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()), value]));
  const required = (error) => { if (error) throw error; };

  async function list(table, order = "created_at") {
    const response = await client.from(table).select("*").order(order);
    required(response.error);
    return response.data.map(camel);
  }

  const dataSource = {
    configured,
    client,
    async getSession() { return (await client.auth.getSession()).data.session; },
    async signIn(email, password) { const result = await client.auth.signInWithPassword({ email, password }); required(result.error); return result.data; },
    async signUp(email, password, displayName) { const result = await client.auth.signUp({ email, password, options: { data: { display_name: displayName } } }); required(result.error); return result.data; },
    async signOut() { const result = await client.auth.signOut(); required(result.error); },
    async getCatalog() {
      const [maps, regions, games, locations, progress] = await Promise.all([
        list("maps", "sort_order"), list("map_regions", "sort_order"), list("board_games", "source_order"),
        list("board_game_locations", "node_order"), list("game_progress", "game_id")
      ]);
      return { maps, mapRegions: regions, boardGames: games, boardGameLocations: locations, gameProgress: progress };
    },
    async getMembers() { return list("members", "display_name"); },
    async getPlaySessions() { return list("play_sessions", "played_at"); },
    async getPlaySessionMembers() { return list("play_session_members", "created_at"); },
    async createPlaySession({ gameId, playedAt, note, createdBy, memberIds }) {
      const inserted = await client.from("play_sessions").insert({ game_id: gameId, played_at: playedAt, note: note || null, created_by: createdBy }).select().single();
      required(inserted.error);
      const participants = memberIds.map((memberId) => ({ session_id: inserted.data.id, member_id: memberId }));
      if (participants.length) { const result = await client.from("play_session_members").insert(participants); required(result.error); }
      return camel(inserted.data);
    }
  };

  window.supabaseBoardmapDataSource = dataSource;
})();
