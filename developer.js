const source = window.BOARDMAP_DATA || {};
const db = window.supabaseBoardmapDataSource?.client;

const datasets = {
  boardGames: { label: "Board Games", readOnly: true, records: source.boardGames || [] },
  locations: { label: "Locations", readOnly: true, records: source.boardGameLocations || [] },
  maps: { label: "Maps", readOnly: true, records: source.maps || [] },
  regions: { label: "Regions", readOnly: true, records: source.mapRegions || [] },
  members: { label: "Members", readOnly: false, records: [] },
  sessions: { label: "Play Sessions", readOnly: false, records: [] },
  sessionMembers: { label: "Session Participants", readOnly: false, records: [] }
};

const metricGrid = document.querySelector("#metricGrid");
const validationResult = document.querySelector("#validationResult");
const dataTabs = document.querySelector("#dataTabs");
const tableHead = document.querySelector("#tableHead");
const tableBody = document.querySelector("#tableBody");
const tableNote = document.querySelector("#tableNote");
const recordSearch = document.querySelector("#recordSearch");
const actionMessage = document.querySelector("#actionMessage");
const resetConfirmation = document.querySelector("#resetConfirmation");
const resetButton = document.querySelector("#resetButton");
const sessionEditor = document.querySelector("#sessionEditor");
const editSessionId = document.querySelector("#editSessionId");
const editGameTitle = document.querySelector("#editGameTitle");
const gameTitleOptions = document.querySelector("#gameTitleOptions");
const gameCombobox = document.querySelector("#gameCombobox");
const editPlayDate = document.querySelector("#editPlayDate");
const editSessionNote = document.querySelector("#editSessionNote");
const saveSessionButton = document.querySelector("#saveSessionButton");
const cancelEditButton = document.querySelector("#cancelEditButton");
const memberFilter = document.querySelector("#memberFilter");
const sessionMemberOptions = document.querySelector("#sessionMemberOptions");
const selectedMemberCount = document.querySelector("#selectedMemberCount");
const memberEditor = document.querySelector("#memberEditor");
const editMemberId = document.querySelector("#editMemberId");
const editMemberName = document.querySelector("#editMemberName");
const saveMemberButton = document.querySelector("#saveMemberButton");
const cancelMemberEditButton = document.querySelector("#cancelMemberEditButton");
const historyMemberSelect = document.querySelector("#historyMemberSelect");
const historySummary = document.querySelector("#historySummary");
const historyTableBody = document.querySelector("#historyTableBody");
let activeDataset = "boardGames";
let sessionSelectedMemberIds = new Set();

async function refreshRemoteRecords() {
  if (!db) throw new Error("Supabase is not configured.");
  const [members, sessions, relations] = await Promise.all([
    db.from("members").select("id, display_name, active, role, created_at").order("display_name"),
    db.from("play_sessions").select("id, game_id, played_at, note, created_by, created_at").order("played_at", { ascending: false }),
    db.from("play_session_members").select("session_id, member_id, result, score, created_at")
  ]);
  [members, sessions, relations].forEach(({ error }) => { if (error) throw error; });
  datasets.members.records = members.data.map((record) => ({ id: record.id, name: record.display_name, active: record.active, role: record.role, createdAt: record.created_at }));
  datasets.sessions.records = sessions.data.map((record) => ({ id: record.id, gameId: record.game_id, date: record.played_at, note: record.note || "", createdBy: record.created_by, createdAt: record.created_at }));
  datasets.sessionMembers.records = relations.data.map((record) => ({ sessionId: record.session_id, memberId: record.member_id, result: record.result, score: record.score, createdAt: record.created_at }));
}

function validateData() {
  const errors = [];
  const gameIds = new Set(datasets.boardGames.records.map((record) => record.id));
  const mapIds = new Set(datasets.maps.records.map((record) => record.id));
  const regionIds = new Set(datasets.regions.records.map((record) => record.id));
  const sessionIds = new Set(datasets.sessions.records.map((record) => record.id));
  const duplicateGames = datasets.boardGames.records.length - gameIds.size;
  if (duplicateGames) errors.push(`${duplicateGames} duplicate game ID(s)`);
  datasets.locations.records.forEach((record) => {
    if (record.gameId && !gameIds.has(record.gameId)) errors.push(`Location references missing game: ${record.gameId}`);
    if (!mapIds.has(record.mapId)) errors.push(`Location references missing map: ${record.mapId}`);
    if (!regionIds.has(record.regionId)) errors.push(`Location references missing region: ${record.regionId}`);
  });
  datasets.sessions.records.forEach((record) => { if (!gameIds.has(record.gameId)) errors.push(`Session references missing game: ${record.gameId}`); });
  datasets.sessionMembers.records.forEach((record) => { if (!sessionIds.has(record.sessionId)) errors.push(`Member relation references missing session: ${record.sessionId}`); });
  return [...new Set(errors)];
}

function renderOverview() {
  const metrics = [
    [datasets.boardGames.records.length, "Board games"], [datasets.locations.records.length, "Map nodes"],
    [datasets.maps.records.length, "Maps"], [datasets.regions.records.length, "Regions"],
    [datasets.members.records.length, "Members"], [datasets.sessions.records.length, "Shared sessions"]
  ];
  metricGrid.innerHTML = metrics.map(([value, label]) => `<article class="metric"><strong>${value}</strong><span>${label}</span></article>`).join("");
  const errors = validateData();
  validationResult.classList.toggle("has-errors", errors.length > 0);
  validationResult.textContent = errors.length ? `${errors.length} issue(s): ${errors.slice(0, 4).join(" · ")}` : "All IDs and shared record references are valid.";
}

function columnsFor(records) {
  const keys = [];
  records.slice(0, 50).forEach((record) => Object.keys(record).forEach((key) => { if (!keys.includes(key)) keys.push(key); }));
  return keys;
}

function displayValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return value ?? "";
}

function sessionForDisplay(record) {
  const relations = datasets.sessionMembers.records.filter((relation) => relation.sessionId === record.id);
  const memberNames = relations.map((relation) => datasets.members.records.find((member) => member.id === relation.memberId)?.name || relation.memberName || relation.memberId);
  return {
    id: record.id,
    gameTitle: datasets.boardGames.records.find((game) => game.id === record.gameId)?.title || record.gameTitle || record.gameId,
    members: memberNames.join(", ") || "-",
    playerCount: record.playerCount || relations.length || "-",
    date: record.date,
    note: record.note || "",
    createdAt: record.createdAt || ""
  };
}

function renderTable() {
  const dataset = datasets[activeDataset];
  const query = recordSearch.value.trim().toLocaleLowerCase();
  const records = dataset.records
    .map((record, index) => ({ record: activeDataset === "sessions" ? sessionForDisplay(record) : record, index }))
    .filter(({ record }) => !query || JSON.stringify(record).toLocaleLowerCase().includes(query));
  const displayRecords = activeDataset === "sessions" ? dataset.records.map(sessionForDisplay) : dataset.records;
  const columns = columnsFor(displayRecords);
  tableHead.innerHTML = `<tr>${columns.map((column) => `<th>${column}</th>`).join("")}${dataset.readOnly ? "" : "<th>action</th>"}</tr>`;
  tableBody.innerHTML = records.map(({ record, index }) => `<tr>${columns.map((column) => `<td>${escapeHtml(String(displayValue(record[column])))}</td>`).join("")}${dataset.readOnly ? "" : `<td>${activeDataset === "sessions" || activeDataset === "members" ? `<button class="row-edit" data-index="${index}" type="button">Edit</button>` : ""}<button class="row-delete" data-index="${index}" type="button">Delete</button></td>`}</tr>`).join("");
  tableNote.textContent = `${records.length} of ${dataset.records.length} records · ${dataset.readOnly ? "Bundled JSON / read-only" : "Supabase / publicly editable"}`;
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function renderTabs() {
  dataTabs.innerHTML = Object.entries(datasets).map(([key, dataset]) => `<button type="button" role="tab" data-dataset="${key}" aria-selected="${key === activeDataset}">${dataset.label}</button>`).join("");
}

async function refresh() {
  try { await refreshRemoteRecords(); }
  catch (error) { actionMessage.textContent = `Supabase error: ${error.message}`; }
  renderOverview();
  renderTabs();
  renderSessionEditor();
  renderMemberEditor();
  renderMemberOptions();
  renderHistoryMemberSelect();
  renderMemberHistory();
  renderTable();
}

function resetSessionEditor() {
  editSessionId.value = "";
  editGameTitle.value = "";
  editPlayDate.value = new Date().toISOString().slice(0, 10);
  editSessionNote.value = "";
  memberFilter.value = "";
  saveSessionButton.textContent = "Add session";
  cancelEditButton.hidden = true;
  closeGameOptions();
  renderMemberOptions([]);
}

function renderSessionEditor() {
  sessionEditor.hidden = activeDataset !== "sessions";
  if (activeDataset !== "sessions") return;
}

function selectedMemberIds() {
  return [...sessionSelectedMemberIds];
}

function updateSelectedMemberCount() {
  selectedMemberCount.textContent = `${selectedMemberIds().length} selected`;
}

function renderMemberOptions(selectedIds) {
  if (selectedIds) sessionSelectedMemberIds = new Set(selectedIds);
  const query = memberFilter.value.trim().toLocaleLowerCase();
  const members = datasets.members.records
    .filter((member) => !query || member.name.toLocaleLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  sessionMemberOptions.innerHTML = members.length
    ? members.map((member) => `<label class="member-choice"><input type="checkbox" value="${escapeHtml(member.id)}"${sessionSelectedMemberIds.has(member.id) ? " checked" : ""}>${escapeHtml(member.name)}</label>`).join("")
    : `<span class="game-options-empty">${datasets.members.records.length ? "No matching members" : "Add members in the Members tab first"}</span>`;
  updateSelectedMemberCount();
}

function renderMemberEditor() {
  memberEditor.hidden = activeDataset !== "members";
}

function resetMemberEditor() {
  editMemberId.value = "";
  editMemberName.value = "";
  saveMemberButton.textContent = "Add member";
  cancelMemberEditButton.hidden = true;
}

function editMember(index) {
  const member = datasets.members.records[index];
  if (!member) return;
  editMemberId.value = member.id;
  editMemberName.value = member.name;
  saveMemberButton.textContent = "Save changes";
  cancelMemberEditButton.hidden = false;
  editMemberName.focus();
}

function renderHistoryMemberSelect() {
  const current = historyMemberSelect.value;
  historyMemberSelect.innerHTML = `<option value="">Select a member</option>${datasets.members.records
    .slice().sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.name)}</option>`).join("")}`;
  historyMemberSelect.value = datasets.members.records.some((member) => member.id === current) ? current : "";
}

function renderMemberHistory() {
  const memberId = historyMemberSelect.value;
  const member = datasets.members.records.find((record) => record.id === memberId);
  if (!member) {
    historySummary.textContent = "Select a member to see their play history.";
    historyTableBody.innerHTML = "";
    return;
  }
  const sessionIds = new Set(datasets.sessionMembers.records.filter((relation) => relation.memberId === memberId).map((relation) => relation.sessionId));
  const sessions = datasets.sessions.records.filter((session) => sessionIds.has(session.id)).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  historySummary.textContent = `${member.name} · ${sessions.length} play session${sessions.length === 1 ? "" : "s"}`;
  historyTableBody.innerHTML = sessions.map((session) => {
    const view = sessionForDisplay(session);
    return `<tr><td>${escapeHtml(view.date)}</td><td>${escapeHtml(view.gameTitle)}</td><td>${escapeHtml(String(view.playerCount))}</td><td>${escapeHtml(view.note)}</td></tr>`;
  }).join("");
}

function renderGameOptions() {
  const query = editGameTitle.value.trim().toLocaleLowerCase();
  const matches = datasets.boardGames.records
    .filter((game) => !query || game.title.toLocaleLowerCase().includes(query))
    .sort((a, b) => a.title.localeCompare(b.title, "ko"));
  gameTitleOptions.innerHTML = matches.length
    ? matches.map((game) => `<button class="game-option" type="button" role="option" data-game-id="${escapeHtml(game.id)}">${escapeHtml(game.title)}</button>`).join("")
    : `<span class="game-options-empty">No matching games</span>`;
}

function openGameOptions() {
  renderGameOptions();
  gameTitleOptions.hidden = false;
  editGameTitle.setAttribute("aria-expanded", "true");
}

function closeGameOptions() {
  gameTitleOptions.hidden = true;
  editGameTitle.setAttribute("aria-expanded", "false");
}

function editSession(index) {
  const session = datasets.sessions.records[index];
  if (!session) return;
  editSessionId.value = session.id;
  editGameTitle.value = datasets.boardGames.records.find((game) => game.id === session.gameId)?.title || session.gameTitle || "";
  editPlayDate.value = session.date;
  editSessionNote.value = session.note || "";
  const memberIds = datasets.sessionMembers.records.filter((relation) => relation.sessionId === session.id).map((relation) => relation.memberId);
  renderMemberOptions(memberIds);
  saveSessionButton.textContent = "Save changes";
  cancelEditButton.hidden = false;
  sessionEditor.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function deleteRemoteRecord(index) {
  if (!confirm("Delete this shared Supabase record?")) return;
  try {
    let result;
    if (activeDataset === "sessions") result = await db.from("play_sessions").delete().eq("id", datasets.sessions.records[index]?.id);
    else if (activeDataset === "members") result = await db.from("members").delete().eq("id", datasets.members.records[index]?.id);
    else {
      const relation = datasets.sessionMembers.records[index];
      result = await db.from("play_session_members").delete().eq("session_id", relation?.sessionId).eq("member_id", relation?.memberId);
    }
    if (result.error) throw result.error;
    actionMessage.textContent = "Shared record deleted from Supabase.";
    await refresh();
  } catch (error) { actionMessage.textContent = error.message; }
}

dataTabs.addEventListener("click", (event) => { const key = event.target.dataset.dataset; if (!key) return; activeDataset = key; recordSearch.value = ""; renderTabs(); renderSessionEditor(); renderMemberEditor(); renderTable(); });
recordSearch.addEventListener("input", renderTable);
tableBody.addEventListener("click", async (event) => {
  if (event.target.matches(".row-edit")) {
    if (activeDataset === "sessions") editSession(Number(event.target.dataset.index));
    if (activeDataset === "members") editMember(Number(event.target.dataset.index));
  }
  if (event.target.matches(".row-delete")) await deleteRemoteRecord(Number(event.target.dataset.index));
});
sessionEditor.addEventListener("submit", async (event) => {
  event.preventDefault();
  const existingIndex = datasets.sessions.records.findIndex((session) => session.id === editSessionId.value);
  const existing = datasets.sessions.records[existingIndex];
  const selectedGame = datasets.boardGames.records.find((game) => game.title.toLocaleLowerCase() === editGameTitle.value.trim().toLocaleLowerCase());
  const memberIds = selectedMemberIds();
  if (!selectedGame?.id || !editPlayDate.value || memberIds.length < 1) {
    actionMessage.textContent = "Choose a game, play date, and at least one registered member.";
    return;
  }
  try {
    const values = { game_id: selectedGame.id, played_at: editPlayDate.value, note: editSessionNote.value.trim() || null, created_by: existing?.createdBy || memberIds[0] };
    let sessionId = existing?.id;
    if (existing) {
      const updated = await db.from("play_sessions").update(values).eq("id", existing.id);
      if (updated.error) throw updated.error;
      const removed = await db.from("play_session_members").delete().eq("session_id", existing.id);
      if (removed.error) throw removed.error;
    } else {
      const inserted = await db.from("play_sessions").insert(values).select("id").single();
      if (inserted.error) throw inserted.error;
      sessionId = inserted.data.id;
    }
    const added = await db.from("play_session_members").insert(memberIds.map((memberId) => ({ session_id: sessionId, member_id: memberId })));
    if (added.error) throw added.error;
    actionMessage.textContent = existing ? "Play session updated in Supabase." : "Play session added to Supabase.";
    resetSessionEditor();
    await refresh();
  } catch (error) { actionMessage.textContent = error.message; }
});
cancelEditButton.addEventListener("click", resetSessionEditor);
memberEditor.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = editMemberName.value.trim();
  const existingIndex = datasets.members.records.findIndex((member) => member.id === editMemberId.value);
  const duplicate = datasets.members.records.some((member, index) => index !== existingIndex && member.name.toLocaleLowerCase() === name.toLocaleLowerCase());
  if (!name || duplicate) {
    actionMessage.textContent = duplicate ? "A member with this name already exists." : "Member name is required.";
    return;
  }
  const existing = datasets.members.records[existingIndex];
  try {
    const result = existing
      ? await db.from("members").update({ display_name: name }).eq("id", existing.id)
      : await db.from("members").insert({ display_name: name });
    if (result.error) throw result.error;
    actionMessage.textContent = existing ? "Member updated in Supabase." : "Member added to Supabase.";
    resetMemberEditor();
    await refresh();
  } catch (error) { actionMessage.textContent = error.message; }
});
cancelMemberEditButton.addEventListener("click", resetMemberEditor);
memberFilter.addEventListener("input", () => renderMemberOptions());
sessionMemberOptions.addEventListener("change", (event) => {
  if (!event.target.matches("input[type='checkbox']")) return;
  if (event.target.checked) sessionSelectedMemberIds.add(event.target.value);
  else sessionSelectedMemberIds.delete(event.target.value);
  updateSelectedMemberCount();
});
historyMemberSelect.addEventListener("change", renderMemberHistory);
editGameTitle.addEventListener("focus", openGameOptions);
editGameTitle.addEventListener("click", openGameOptions);
editGameTitle.addEventListener("input", openGameOptions);
editGameTitle.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeGameOptions();
  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (gameTitleOptions.hidden) openGameOptions();
    gameTitleOptions.querySelector(".game-option")?.focus();
  }
});
gameTitleOptions.addEventListener("click", (event) => {
  const option = event.target.closest(".game-option");
  if (!option) return;
  const game = datasets.boardGames.records.find((record) => record.id === option.dataset.gameId);
  if (!game) return;
  editGameTitle.value = game.title;
  closeGameOptions();
  editPlayDate.focus();
});
gameTitleOptions.addEventListener("keydown", (event) => {
  const options = [...gameTitleOptions.querySelectorAll(".game-option")];
  const index = options.indexOf(document.activeElement);
  if (event.key === "ArrowDown" && options[index + 1]) { event.preventDefault(); options[index + 1].focus(); }
  if (event.key === "ArrowUp") { event.preventDefault(); (options[index - 1] || editGameTitle).focus(); }
  if (event.key === "Escape") { closeGameOptions(); editGameTitle.focus(); }
});
document.addEventListener("click", (event) => { if (!gameCombobox.contains(event.target)) closeGameOptions(); });
document.querySelector("#refreshButton").addEventListener("click", refresh);
document.querySelector("#exportButton").addEventListener("click", () => {
  const backup = { version: 2, exportedAt: new Date().toISOString(), members: datasets.members.records, playSessions: datasets.sessions.records, playSessionMembers: datasets.sessionMembers.records };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: `boardmap-backup-${new Date().toISOString().slice(0, 10)}.json` });
  link.click(); URL.revokeObjectURL(url); actionMessage.textContent = "Backup exported.";
});
document.querySelector("#importInput").addEventListener("change", async (event) => {
  try {
    const backup = JSON.parse(await event.target.files[0].text());
    if (!Array.isArray(backup.playSessions) || !Array.isArray(backup.playSessionMembers)) throw new Error("Invalid Boardmap backup.");
    if (!confirm("Replace all shared Supabase play records with this backup?")) return;
    const clearSessions = await db.from("play_sessions").delete().not("id", "is", null);
    if (clearSessions.error) throw clearSessions.error;
    const clearMembers = await db.from("members").delete().is("auth_user_id", null);
    if (clearMembers.error) throw clearMembers.error;

    const memberIdMap = new Map();
    for (const member of (Array.isArray(backup.members) ? backup.members : [])) {
      const inserted = await db.from("members").insert({ display_name: member.name || member.displayName || "Member" }).select("id").single();
      if (inserted.error) throw inserted.error;
      memberIdMap.set(member.id, inserted.data.id);
    }
    const sessionIdMap = new Map();
    for (const session of backup.playSessions) {
      const oldMemberIds = backup.playSessionMembers.filter((relation) => relation.sessionId === session.id).map((relation) => memberIdMap.get(relation.memberId)).filter(Boolean);
      if (!oldMemberIds.length) continue;
      const inserted = await db.from("play_sessions").insert({ game_id: session.gameId, played_at: session.date, note: session.note || null, created_by: oldMemberIds[0] }).select("id").single();
      if (inserted.error) throw inserted.error;
      sessionIdMap.set(session.id, inserted.data.id);
    }
    const relations = backup.playSessionMembers.map((relation) => ({ session_id: sessionIdMap.get(relation.sessionId), member_id: memberIdMap.get(relation.memberId) })).filter((relation) => relation.session_id && relation.member_id);
    if (relations.length) {
      const inserted = await db.from("play_session_members").insert(relations);
      if (inserted.error) throw inserted.error;
    }
    actionMessage.textContent = "Backup imported to Supabase.";
    await refresh();
  } catch (error) { actionMessage.textContent = error.message; }
  event.target.value = "";
});
resetConfirmation.addEventListener("input", () => { resetButton.disabled = resetConfirmation.value !== "DELETE"; });
resetButton.addEventListener("click", async () => {
  if (resetConfirmation.value !== "DELETE" || !confirm("Permanently delete all shared Supabase play records and non-login members?")) return;
  try {
    const sessions = await db.from("play_sessions").delete().not("id", "is", null);
    if (sessions.error) throw sessions.error;
    const members = await db.from("members").delete().is("auth_user_id", null);
    if (members.error) throw members.error;
    resetConfirmation.value = "";
    resetButton.disabled = true;
    actionMessage.textContent = "Shared Supabase play records deleted.";
    await refresh();
  } catch (error) { actionMessage.textContent = error.message; }
});

resetSessionEditor();
resetMemberEditor();
refresh();
