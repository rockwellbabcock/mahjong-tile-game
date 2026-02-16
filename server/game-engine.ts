import { type Tile, type Suit, type TileValue, type PlayerSeat, type PlayerState, type RoomState, type ClientRoomView, type ClientCharlestonView, type DisconnectedPlayerInfo, type RoomConfig, type GameMode, type CharlestonState, type CharlestonDirection, SEAT_ORDER } from "@shared/schema";
import { checkForWin, checkAllPatterns } from "@shared/patterns";

const RECONNECT_TIMEOUT_MS = 60_000;
const BOT_TURN_DELAY_MS = 2_000;
const SUITS: Suit[] = ["Bam", "Crak", "Dot"];
const WINDS: TileValue[] = ["East", "South", "West", "North"];
const DRAGONS: TileValue[] = ["Red", "Green", "White"];

const BOT_NAMES = ["Bot Yi", "Bot Er", "Bot San", "Bot Si"];

function generateDeck(): Tile[] {
  const deck: Tile[] = [];
  let idCounter = 1;

  const addTile = (suit: Suit, value: TileValue, count: number = 4) => {
    for (let i = 0; i < count; i++) {
      deck.push({
        id: `${suit}-${value}-${i}-${idCounter++}`,
        suit,
        value,
        isJoker: suit === "Joker",
      });
    }
  };

  SUITS.forEach((suit) => {
    for (let i = 1; i <= 9; i++) {
      addTile(suit, i);
    }
  });

  WINDS.forEach((wind) => addTile("Wind", wind));
  DRAGONS.forEach((dragon) => addTile("Dragon", dragon));

  (["Plum", "Orchid", "Chrysanthemum", "Bamboo"] as const).forEach((name) => addTile("Flower", name, 1));
  (["Spring", "Summer", "Fall", "Winter"] as const).forEach((name) => addTile("Flower", name, 1));
  addTile("Joker", null, 8);

  return shuffle(deck);
}

function shuffle(array: Tile[]): Tile[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function compareTiles(a: Tile, b: Tile): number {
  const suitOrder: Record<string, number> = {
    Joker: 0, Flower: 1, Dragon: 2, Wind: 3, Bam: 4, Crak: 5, Dot: 6,
  };
  if (suitOrder[a.suit] !== suitOrder[b.suit]) {
    return suitOrder[a.suit] - suitOrder[b.suit];
  }
  if (typeof a.value === "number" && typeof b.value === "number") {
    return a.value - b.value;
  }
  if (typeof a.value === "string" && typeof b.value === "string") {
    return a.value.localeCompare(b.value);
  }
  return 0;
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export interface DisconnectTimer {
  playerId: string;
  playerName: string;
  seat: PlayerSeat;
  timeoutAt: number;
  timer: ReturnType<typeof setTimeout>;
  rejoinToken: string;
}

export interface GameRoom {
  state: RoomState;
  deck: Tile[];
  disconnectTimers: Map<string, DisconnectTimer>;
  botTimers: Map<string, ReturnType<typeof setTimeout>>;
  onBotTurn?: (roomCode: string) => void;
}

const rooms = new Map<string, GameRoom>();

const DEFAULT_CONFIG: RoomConfig = { gameMode: "4-player", fillWithBots: false };

function deduplicateName(name: string, existingPlayers: PlayerState[]): string {
  const existingNames = existingPlayers.map(p => p.name);
  if (!existingNames.includes(name)) return name;

  let counter = 2;
  while (existingNames.includes(`${name} (${counter})`)) {
    counter++;
  }
  return `${name} (${counter})`;
}

export function createRoom(playerId: string, playerName: string, config?: RoomConfig): GameRoom {
  let roomCode = generateRoomCode();
  while (rooms.has(roomCode)) {
    roomCode = generateRoomCode();
  }

  const roomConfig = config || DEFAULT_CONFIG;

  const player: PlayerState = {
    id: playerId,
    name: playerName,
    seat: "East",
    hand: [],
    exposures: [],
    connected: true,
  };

  const room: GameRoom = {
    state: {
      roomCode,
      players: [player],
      currentTurn: "East",
      phase: "draw",
      wallCount: 0,
      discardPile: [],
      lastDiscard: null,
      lastDiscardedBy: null,
      winnerId: null,
      winnerSeat: null,
      started: false,
      config: roomConfig,
    },
    deck: [],
    disconnectTimers: new Map(),
    botTimers: new Map(),
  };

  rooms.set(roomCode, room);
  return room;
}

function generateBotId(): string {
  return `bot-${Math.random().toString(36).substring(2, 10)}`;
}

export function addBotsToRoom(roomCode: string): PlayerState[] {
  const room = rooms.get(roomCode);
  if (!room) return [];

  const addedBots: PlayerState[] = [];
  const takenSeats = new Set(room.state.players.map(p => p.seat));
  let botIndex = 0;

  while (room.state.players.length < 4) {
    const nextSeat = SEAT_ORDER.find(s => !takenSeats.has(s));
    if (!nextSeat) break;

    const botName = BOT_NAMES[botIndex % BOT_NAMES.length];
    const bot: PlayerState = {
      id: generateBotId(),
      name: botName,
      seat: nextSeat,
      hand: [],
      exposures: [],
      connected: true,
      isBot: true,
    };

    room.state.players.push(bot);
    takenSeats.add(nextSeat);
    addedBots.push(bot);
    botIndex++;
  }

  return addedBots;
}

export function setupTwoPlayerMode(roomCode: string, player1Id: string): void {
  const room = rooms.get(roomCode);
  if (!room) return;

  const player1 = room.state.players.find(p => p.id === player1Id);
  if (!player1) return;

  const p1Seat = player1.seat;
  const p1Idx = SEAT_ORDER.indexOf(p1Seat);
  const partnerSeat = SEAT_ORDER[(p1Idx + 2) % 4];

  for (const p of room.state.players) {
    if (p.seat === partnerSeat && !p.isBot) {
      continue;
    }
    if (p.seat === partnerSeat) {
      p.controlledBy = player1Id;
    }
  }
}

export function setupTwoPlayerPartner(roomCode: string, player2Id: string): void {
  const room = rooms.get(roomCode);
  if (!room) return;

  const player2 = room.state.players.find(p => p.id === player2Id);
  if (!player2) return;

  const p2Seat = player2.seat;
  const p2Idx = SEAT_ORDER.indexOf(p2Seat);
  const partnerSeat = SEAT_ORDER[(p2Idx + 2) % 4];

  for (const p of room.state.players) {
    if (p.seat === partnerSeat && p.isBot) {
      p.controlledBy = player2Id;
    }
  }
}

export function joinRoom(roomCode: string, playerId: string, playerName: string): GameRoom | null {
  const room = rooms.get(roomCode);
  if (!room) return null;
  if (room.state.started) return null;
  if (room.state.players.find(p => p.id === playerId)) return room;

  const humanPlayers = room.state.players.filter(p => !p.isBot);
  const maxHumans = room.state.config.gameMode === "2-player" ? 2 : 4;
  if (humanPlayers.length >= maxHumans) return null;

  const takenSeats = new Set(room.state.players.filter(p => !p.isBot).map(p => p.seat));
  const humanSeats: PlayerSeat[] = room.state.config.gameMode === "2-player"
    ? ["East", "South"]
    : SEAT_ORDER.slice();
  const nextSeat = humanSeats.find(s => !takenSeats.has(s));
  if (!nextSeat) return null;

  const dedupedName = deduplicateName(playerName, room.state.players);

  room.state.players.push({
    id: playerId,
    name: dedupedName,
    seat: nextSeat,
    hand: [],
    exposures: [],
    connected: true,
  });

  return room;
}

export function getRoom(roomCode: string): GameRoom | undefined {
  return rooms.get(roomCode);
}

export function getRoomByPlayerId(playerId: string): GameRoom | undefined {
  const entries = Array.from(rooms.values());
  for (const room of entries) {
    if (room.state.players.find((p: PlayerState) => p.id === playerId)) {
      return room;
    }
  }
  return undefined;
}

export function markPlayerDisconnected(roomCode: string, playerId: string): PlayerState | null {
  const room = rooms.get(roomCode);
  if (!room) return null;

  const player = room.state.players.find(p => p.id === playerId);
  if (!player) return null;

  if (room.state.started) {
    player.connected = false;
    return player;
  }

  room.state.players = room.state.players.filter(p => p.id !== playerId);
  if (room.state.players.length === 0) {
    rooms.delete(roomCode);
  }
  return null;
}

export function reconnectPlayer(roomCode: string, playerName: string, rejoinToken: string, newSocketId: string): PlayerState | null {
  const room = rooms.get(roomCode);
  if (!room) return null;
  if (!room.state.started) return null;

  const player = room.state.players.find(p => p.name === playerName && !p.connected && p.rejoinToken === rejoinToken);
  if (!player) return null;

  const oldId = player.id;
  player.id = newSocketId;
  player.connected = true;

  const timer = room.disconnectTimers.get(playerName);
  if (timer) {
    clearTimeout(timer.timer);
    room.disconnectTimers.delete(playerName);
  }

  if (room.state.config.gameMode === "2-player") {
    for (const p of room.state.players) {
      if (p.controlledBy === oldId) {
        p.controlledBy = newSocketId;
      }
    }
  }

  return player;
}

function generateRejoinToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function createDisconnectTimer(roomCode: string, player: PlayerState, onTimeout: () => void): { rejoinToken: string; timeoutAt: number } {
  const room = rooms.get(roomCode);
  if (!room) return { rejoinToken: "", timeoutAt: 0 };

  const rejoinToken = generateRejoinToken();
  const timeoutAt = Date.now() + RECONNECT_TIMEOUT_MS;

  const timer = setTimeout(() => {
    room.disconnectTimers.delete(player.name);
    onTimeout();
  }, RECONNECT_TIMEOUT_MS);

  room.disconnectTimers.set(player.name, {
    playerId: player.id,
    playerName: player.name,
    seat: player.seat,
    timeoutAt,
    timer,
    rejoinToken,
  });

  return { rejoinToken, timeoutAt };
}

export function getDisconnectedPlayers(roomCode: string): DisconnectedPlayerInfo[] {
  const room = rooms.get(roomCode);
  if (!room) return [];

  const result: DisconnectedPlayerInfo[] = [];
  room.disconnectTimers.forEach((timer) => {
    result.push({
      playerName: timer.playerName,
      seat: timer.seat,
      timeoutAt: timer.timeoutAt,
    });
  });
  return result;
}

export function endGame(roomCode: string): boolean {
  const room = rooms.get(roomCode);
  if (!room) return false;

  room.disconnectTimers.forEach((timer) => {
    clearTimeout(timer.timer);
  });
  room.disconnectTimers.clear();
  room.botTimers.forEach((timer) => {
    clearTimeout(timer);
  });
  room.botTimers.clear();
  rooms.delete(roomCode);
  return true;
}

export function isReadyToStart(roomCode: string): boolean {
  const room = rooms.get(roomCode);
  if (!room) return false;
  if (room.state.started) return false;

  if (room.state.config.gameMode === "2-player") {
    const humans = room.state.players.filter(p => !p.isBot);
    if (room.state.config.fillWithBots) {
      return humans.length >= 1;
    }
    return humans.length === 2;
  }
  return room.state.players.length === 4;
}

export function fillBotsAndStart(roomCode: string): boolean {
  const room = rooms.get(roomCode);
  if (!room) return false;
  if (room.state.started) return false;
  if (!room.state.config.fillWithBots) return false;

  if (room.state.config.gameMode === "2-player") {
    fillBotsForSiamese(roomCode);
  } else {
    addBotsToRoom(roomCode);
  }

  return room.state.players.length === 4;
}

function fillBotsForSiamese(roomCode: string): void {
  const room = rooms.get(roomCode);
  if (!room) return;

  const humans = room.state.players.filter(p => !p.isBot);
  const takenSeats = new Set(room.state.players.map(p => p.seat));

  if (humans.length === 1) {
    const human = humans[0];
    const humanIdx = SEAT_ORDER.indexOf(human.seat);
    const humanPartnerSeat = SEAT_ORDER[(humanIdx + 2) % 4];

    const botMainSeat = SEAT_ORDER.find(s => !takenSeats.has(s) && s !== humanPartnerSeat)
      || SEAT_ORDER.find(s => !takenSeats.has(s));
    if (!botMainSeat) return;

    const botId = generateBotId();
    const bot: PlayerState = {
      id: botId,
      name: BOT_NAMES[0],
      seat: botMainSeat,
      hand: [],
      exposures: [],
      connected: true,
      isBot: true,
    };
    room.state.players.push(bot);
    takenSeats.add(botMainSeat);

    const botIdx = SEAT_ORDER.indexOf(botMainSeat);
    const botPartnerSeat = SEAT_ORDER[(botIdx + 2) % 4];

    if (!takenSeats.has(humanPartnerSeat)) {
      const humanPartner: PlayerState = {
        id: generateBotId(),
        name: `${human.name}'s Hand 2`,
        seat: humanPartnerSeat,
        hand: [],
        exposures: [],
        connected: true,
        isBot: true,
        controlledBy: human.id,
      };
      room.state.players.push(humanPartner);
      takenSeats.add(humanPartnerSeat);
    }

    if (!takenSeats.has(botPartnerSeat)) {
      const botPartner: PlayerState = {
        id: generateBotId(),
        name: `${BOT_NAMES[0]}'s Hand 2`,
        seat: botPartnerSeat,
        hand: [],
        exposures: [],
        connected: true,
        isBot: true,
        controlledBy: botId,
      };
      room.state.players.push(botPartner);
      takenSeats.add(botPartnerSeat);
    }
  } else if (humans.length === 2) {
    for (const human of humans) {
      const humanIdx = SEAT_ORDER.indexOf(human.seat);
      const partnerSeat = SEAT_ORDER[(humanIdx + 2) % 4];
      if (!takenSeats.has(partnerSeat)) {
        const partner: PlayerState = {
          id: generateBotId(),
          name: `${human.name}'s Hand 2`,
          seat: partnerSeat,
          hand: [],
          exposures: [],
          connected: true,
          isBot: true,
          controlledBy: human.id,
        };
        room.state.players.push(partner);
        takenSeats.add(partnerSeat);
      }
    }
  }
}

export function startGame(roomCode: string): boolean {
  const room = rooms.get(roomCode);
  if (!room) return false;
  if (room.state.players.length !== 4) return false;
  if (room.state.started) return false;

  const deck = generateDeck();

  for (const player of room.state.players) {
    player.hand = deck.splice(0, 13).sort(compareTiles);
    player.exposures = [];
    if (!player.isBot) {
      player.rejoinToken = generateRejoinToken();
    }
  }

  room.deck = deck;
  room.state.wallCount = deck.length;
  room.state.currentTurn = "East";
  room.state.discardPile = [];
  room.state.lastDiscard = null;
  room.state.lastDiscardedBy = null;
  room.state.winnerId = null;
  room.state.winnerSeat = null;
  room.state.started = true;

  room.state.charleston = createCharlestonState();
  room.state.phase = "charleston";

  return true;
}

const CHARLESTON_PASSES: { round: 1 | 2; direction: CharlestonDirection }[] = [
  { round: 1, direction: "right" },
  { round: 1, direction: "across" },
  { round: 1, direction: "left" },
  { round: 2, direction: "left" },
  { round: 2, direction: "across" },
  { round: 2, direction: "right" },
];

function createCharlestonState(): CharlestonState {
  return {
    round: 1,
    passIndex: 0,
    direction: "right",
    selections: {},
    readyPlayers: [],
    secondCharlestonOffered: false,
    secondCharlestonVotes: {},
    skipped: false,
  };
}

function getCharlestonHumanSeats(room: GameRoom): PlayerSeat[] {
  const seats: PlayerSeat[] = [];
  for (const p of room.state.players) {
    if (!p.isBot && !p.controlledBy) {
      seats.push(p.seat);
    }
  }
  return seats;
}

function getCharlestonAllSeats(room: GameRoom): PlayerSeat[] {
  return room.state.players.map(p => p.seat);
}

function getTargetSeat(fromSeat: PlayerSeat, direction: CharlestonDirection): PlayerSeat {
  const idx = SEAT_ORDER.indexOf(fromSeat);
  switch (direction) {
    case "right": return SEAT_ORDER[(idx + 1) % 4];
    case "across": return SEAT_ORDER[(idx + 2) % 4];
    case "left": return SEAT_ORDER[(idx + 3) % 4];
  }
}

export function charlestonSelectTile(roomCode: string, playerId: string, tileId: string): { success: boolean; error?: string } {
  const room = rooms.get(roomCode);
  if (!room) return { success: false, error: "Room not found" };
  if (room.state.phase !== "charleston") return { success: false, error: "Not in Charleston phase" };
  if (!room.state.charleston) return { success: false, error: "No Charleston state" };

  const player = room.state.players.find(p => p.id === playerId);
  if (!player) return { success: false, error: "Player not found" };

  const seat = player.seat;
  const charleston = room.state.charleston;

  if (charleston.readyPlayers.includes(seat)) {
    return { success: false, error: "Already submitted for this pass" };
  }

  const selected = charleston.selections[seat] || [];
  const tileInHand = player.hand.find(t => t.id === tileId);
  if (!tileInHand) return { success: false, error: "Tile not in your hand" };

  const existingIndex = selected.indexOf(tileId);
  if (existingIndex >= 0) {
    selected.splice(existingIndex, 1);
  } else {
    if (selected.length >= 3) return { success: false, error: "Already selected 3 tiles" };
    selected.push(tileId);
  }

  charleston.selections[seat] = selected;
  return { success: true };
}

export function charlestonReady(roomCode: string, playerId: string): { success: boolean; allReady?: boolean; error?: string } {
  const room = rooms.get(roomCode);
  if (!room) return { success: false, error: "Room not found" };
  if (room.state.phase !== "charleston") return { success: false, error: "Not in Charleston phase" };
  if (!room.state.charleston) return { success: false, error: "No Charleston state" };

  const player = room.state.players.find(p => p.id === playerId);
  if (!player) return { success: false, error: "Player not found" };

  const seat = player.seat;
  const charleston = room.state.charleston;

  if (charleston.readyPlayers.includes(seat)) {
    return { success: false, error: "Already ready" };
  }

  const selected = charleston.selections[seat] || [];
  if (selected.length !== 3) return { success: false, error: "Must select exactly 3 tiles" };

  charleston.readyPlayers.push(seat);

  const allSeats = getCharlestonAllSeats(room);
  const allReady = allSeats.every(s => charleston.readyPlayers.includes(s));

  return { success: true, allReady };
}

export function executeCharlestonPass(roomCode: string): boolean {
  const room = rooms.get(roomCode);
  if (!room || !room.state.charleston) return false;

  const charleston = room.state.charleston;
  const direction = charleston.direction;

  const tilesToPass: Record<string, Tile[]> = {};

  for (const p of room.state.players) {
    const selectedIds = charleston.selections[p.seat] || [];
    const tiles: Tile[] = [];
    for (const id of selectedIds) {
      const idx = p.hand.findIndex(t => t.id === id);
      if (idx >= 0) {
        tiles.push(p.hand[idx]);
        p.hand.splice(idx, 1);
      }
    }
    tilesToPass[p.seat] = tiles;
  }

  for (const p of room.state.players) {
    const sourceSeat = getSourceSeat(p.seat, direction);
    const incoming = tilesToPass[sourceSeat] || [];
    p.hand.push(...incoming);
    p.hand.sort(compareTiles);
  }

  const nextPassIndex = charleston.passIndex + 1;

  if (nextPassIndex === 3) {
    charleston.secondCharlestonOffered = true;
    charleston.selections = {};
    charleston.readyPlayers = [];
    charleston.passIndex = nextPassIndex;
    return true;
  }

  if (nextPassIndex >= 6 || (charleston.round === 2 && nextPassIndex >= 6)) {
    endCharleston(room);
    return true;
  }

  const nextPass = CHARLESTON_PASSES[nextPassIndex];
  charleston.passIndex = nextPassIndex;
  charleston.round = nextPass.round;
  charleston.direction = nextPass.direction;
  charleston.selections = {};
  charleston.readyPlayers = [];

  return true;
}

function getSourceSeat(toSeat: PlayerSeat, direction: CharlestonDirection): PlayerSeat {
  const idx = SEAT_ORDER.indexOf(toSeat);
  switch (direction) {
    case "right": return SEAT_ORDER[(idx + 3) % 4];
    case "across": return SEAT_ORDER[(idx + 2) % 4];
    case "left": return SEAT_ORDER[(idx + 1) % 4];
  }
}

export function charlestonVote(roomCode: string, playerId: string, accept: boolean): { success: boolean; decided?: boolean; accepted?: boolean; error?: string } {
  const room = rooms.get(roomCode);
  if (!room || !room.state.charleston) return { success: false, error: "Room not found" };
  if (!room.state.charleston.secondCharlestonOffered) return { success: false, error: "Second Charleston not offered" };

  const player = room.state.players.find(p => p.id === playerId);
  if (!player) return { success: false, error: "Player not found" };

  room.state.charleston.secondCharlestonVotes[player.seat] = accept;

  const humanSeats = getCharlestonHumanSeats(room);
  const allVoted = humanSeats.every(s => room.state.charleston!.secondCharlestonVotes[s] !== undefined);

  if (!allVoted) return { success: true, decided: false };

  const allAccepted = humanSeats.every(s => room.state.charleston!.secondCharlestonVotes[s] === true);

  if (allAccepted) {
    const charleston = room.state.charleston;
    charleston.secondCharlestonOffered = false;
    charleston.round = 2;
    charleston.passIndex = 3;
    charleston.direction = "left";
    charleston.selections = {};
    charleston.readyPlayers = [];
    charleston.secondCharlestonVotes = {};
    return { success: true, decided: true, accepted: true };
  } else {
    endCharleston(room);
    return { success: true, decided: true, accepted: false };
  }
}

export function charlestonSkip(roomCode: string, playerId: string): boolean {
  const room = rooms.get(roomCode);
  if (!room || !room.state.charleston) return false;
  if (room.state.phase !== "charleston") return false;

  endCharleston(room);
  return true;
}

function endCharleston(room: GameRoom): void {
  room.state.phase = "draw";
  room.state.currentTurn = "East";
  room.state.charleston = undefined;
}

export function charlestonBotAutoSelect(roomCode: string): void {
  const room = rooms.get(roomCode);
  if (!room || !room.state.charleston) return;

  const charleston = room.state.charleston;

  for (const p of room.state.players) {
    if (!p.isBot) continue;
    if (charleston.readyPlayers.includes(p.seat)) continue;

    const hand = [...p.hand];
    hand.sort(compareTiles);
    const selected = hand.slice(0, 3).map(t => t.id);
    charleston.selections[p.seat] = selected;
    charleston.readyPlayers.push(p.seat);
  }
}

export function charlestonBotVote(roomCode: string): void {
  const room = rooms.get(roomCode);
  if (!room || !room.state.charleston) return;

  for (const p of room.state.players) {
    if (!p.isBot) continue;
    if (p.controlledBy) continue;
    if (room.state.charleston.secondCharlestonVotes[p.seat] !== undefined) continue;
    room.state.charleston.secondCharlestonVotes[p.seat] = true;
  }
}

export function drawTile(roomCode: string, playerId: string, forSeat?: PlayerSeat): { success: boolean; error?: string } {
  const room = rooms.get(roomCode);
  if (!room) return { success: false, error: "Room not found" };
  if (!room.state.started) return { success: false, error: "Game not started" };
  if (room.state.phase !== "draw") return { success: false, error: "Not draw phase" };

  const actingSeat = forSeat || room.state.players.find(p => p.id === playerId)?.seat;
  if (!actingSeat) return { success: false, error: "Player not in room" };
  if (actingSeat !== room.state.currentTurn) return { success: false, error: "Not your turn" };

  if (!canPlayerActForSeat(room, playerId, actingSeat)) {
    return { success: false, error: "You cannot act for this seat" };
  }

  const player = room.state.players.find(p => p.seat === actingSeat);
  if (!player) return { success: false, error: "Seat not found" };
  if (room.deck.length === 0) return { success: false, error: "Wall is empty" };

  const tile = room.deck.shift()!;
  player.hand.push(tile);
  room.state.wallCount = room.deck.length;
  room.state.phase = "discard";

  return { success: true };
}

export function discardTile(roomCode: string, playerId: string, tileId: string, forSeat?: PlayerSeat): { success: boolean; error?: string } {
  const room = rooms.get(roomCode);
  if (!room) return { success: false, error: "Room not found" };
  if (!room.state.started) return { success: false, error: "Game not started" };
  if (room.state.phase !== "discard") return { success: false, error: "Not discard phase" };

  const actingSeat = forSeat || room.state.players.find(p => p.id === playerId)?.seat;
  if (!actingSeat) return { success: false, error: "Player not in room" };
  if (actingSeat !== room.state.currentTurn) return { success: false, error: "Not your turn" };

  if (!canPlayerActForSeat(room, playerId, actingSeat)) {
    return { success: false, error: "You cannot act for this seat" };
  }

  const player = room.state.players.find(p => p.seat === actingSeat);
  if (!player) return { success: false, error: "Seat not found" };

  const tileIndex = player.hand.findIndex(t => t.id === tileId);
  if (tileIndex === -1) return { success: false, error: "Tile not in hand" };

  const [discarded] = player.hand.splice(tileIndex, 1);
  room.state.discardPile.unshift(discarded);
  room.state.lastDiscard = discarded;
  room.state.lastDiscardedBy = player.seat;

  if (room.state.config.gameMode === "2-player") {
    const controllerId = player.controlledBy || player.id;
    const opponentMain = room.state.players.find(p => p.id !== controllerId && !p.controlledBy);
    if (opponentMain) {
      room.state.currentTurn = opponentMain.seat;
    } else {
      const currentIdx = SEAT_ORDER.indexOf(room.state.currentTurn);
      room.state.currentTurn = SEAT_ORDER[(currentIdx + 1) % 4];
    }
  } else {
    const currentIdx = SEAT_ORDER.indexOf(room.state.currentTurn);
    room.state.currentTurn = SEAT_ORDER[(currentIdx + 1) % 4];
  }
  room.state.phase = "draw";

  return { success: true };
}

function canPlayerActForSeat(room: GameRoom, playerId: string, seat: PlayerSeat): boolean {
  const seatPlayer = room.state.players.find(p => p.seat === seat);
  if (!seatPlayer) return false;

  if (seatPlayer.id === playerId) return true;

  if (seatPlayer.controlledBy === playerId) return true;

  return false;
}

export function sortPlayerHand(roomCode: string, playerId: string, forSeat?: PlayerSeat): boolean {
  const room = rooms.get(roomCode);
  if (!room) return false;

  const seat = forSeat || room.state.players.find(p => p.id === playerId)?.seat;
  if (!seat) return false;

  const player = room.state.players.find(p => p.seat === seat);
  if (!player) return false;

  if (!canPlayerActForSeat(room, playerId, seat)) return false;

  player.hand.sort(compareTiles);
  return true;
}

export function transferTile(roomCode: string, playerId: string, tileId: string, fromSeat: PlayerSeat, toSeat: PlayerSeat): { success: boolean; error?: string } {
  const room = rooms.get(roomCode);
  if (!room) return { success: false, error: "Room not found" };
  if (!room.state.started) return { success: false, error: "Game not started" };
  if (room.state.config.gameMode !== "2-player") return { success: false, error: "Transfer only available in 2-player mode" };
  if (room.state.phase !== "draw" && room.state.phase !== "discard") return { success: false, error: "Can only transfer during your turn" };

  if (!canPlayerActForSeat(room, playerId, fromSeat)) {
    return { success: false, error: "You cannot act for the source rack" };
  }
  if (!canPlayerActForSeat(room, playerId, toSeat)) {
    return { success: false, error: "You cannot act for the destination rack" };
  }

  const fromPlayer = room.state.players.find(p => p.seat === fromSeat);
  const toPlayer = room.state.players.find(p => p.seat === toSeat);
  if (!fromPlayer || !toPlayer) return { success: false, error: "Rack not found" };

  const tileIndex = fromPlayer.hand.findIndex(t => t.id === tileId);
  if (tileIndex === -1) return { success: false, error: "Tile not in source rack" };

  const [tile] = fromPlayer.hand.splice(tileIndex, 1);
  toPlayer.hand.push(tile);

  return { success: true };
}

export function getClientView(room: GameRoom, playerId: string): ClientRoomView | null {
  const player = room.state.players.find(p => p.id === playerId);
  if (!player) return null;

  const mySeats: PlayerSeat[] = [player.seat];
  const controlledPlayers = room.state.players.filter(p => p.controlledBy === playerId);
  for (const cp of controlledPlayers) {
    if (!mySeats.includes(cp.seat)) {
      mySeats.push(cp.seat);
    }
  }

  let partnerHand: Tile[] | undefined;
  if (room.state.config.gameMode === "2-player") {
    const partner = controlledPlayers[0];
    if (partner) {
      partnerHand = partner.hand;
    }
  }

  return {
    roomCode: room.state.roomCode,
    players: room.state.players.map(p => ({
      id: p.id,
      name: p.name,
      seat: p.seat,
      handCount: p.hand.length,
      exposures: p.exposures,
      connected: p.connected,
      isBot: p.isBot,
      controlledBy: p.controlledBy || null,
    })),
    myHand: player.hand,
    mySeat: player.seat,
    mySeats,
    currentTurn: room.state.currentTurn,
    phase: room.state.phase,
    wallCount: room.state.wallCount,
    discardPile: room.state.discardPile,
    lastDiscard: room.state.lastDiscard,
    lastDiscardedBy: room.state.lastDiscardedBy,
    winnerId: room.state.winnerId,
    winnerSeat: room.state.winnerSeat,
    started: room.state.started,
    disconnectedPlayers: getDisconnectedPlayers(room.state.roomCode),
    rejoinToken: player.rejoinToken,
    gameMode: room.state.config.gameMode,
    partnerHand,
    charleston: room.state.charleston ? getCharlestonView(room.state.charleston, player.seat) : undefined,
  };
}

function getCharlestonView(charleston: CharlestonState, mySeat: PlayerSeat): ClientCharlestonView {
  return {
    round: charleston.round,
    passIndex: charleston.passIndex,
    direction: charleston.direction,
    mySelectedTileIds: charleston.selections[mySeat] || [],
    readyCount: charleston.readyPlayers.length,
    totalPlayers: 4,
    secondCharlestonOffered: charleston.secondCharlestonOffered,
    mySecondVote: charleston.secondCharlestonVotes[mySeat],
    skipped: charleston.skipped,
  };
}

export function checkWinForPlayer(roomCode: string, playerId: string, forSeat?: PlayerSeat): { won: boolean; patternName?: string; description?: string } {
  const room = rooms.get(roomCode);
  if (!room) return { won: false };

  const seat = forSeat || room.state.players.find(p => p.id === playerId)?.seat;
  const player = room.state.players.find(p => p.seat === seat);
  if (!player) return { won: false };
  if (player.hand.length !== 14) return { won: false };

  const result = checkForWin(player.hand);
  if (!result) return { won: false };

  if (room.state.config.gameMode === "2-player") {
    const controllerId = player.controlledBy || player.id;
    const allSeats = room.state.players.filter(p =>
      p.id === controllerId || p.controlledBy === controllerId
    );

    const otherSeat = allSeats.find(p => p.seat !== player.seat);
    if (otherSeat) {
      if (otherSeat.hand.length !== 14) return { won: false };
      const otherResult = checkForWin(otherSeat.hand);
      if (!otherResult) return { won: false };

      room.state.phase = "won";
      const mainPlayer = room.state.players.find(p => p.id === controllerId);
      room.state.winnerId = controllerId;
      room.state.winnerSeat = mainPlayer?.seat || player.seat;
      return {
        won: true,
        patternName: `${result.patternName} + ${otherResult.patternName}`,
        description: `Both hands won! Hand 1: ${result.description}. Hand 2: ${otherResult.description}`,
      };
    }
  }

  room.state.phase = "won";
  room.state.winnerId = player.id;
  room.state.winnerSeat = player.seat;
  return { won: true, patternName: result.patternName, description: result.description };
}

export function resetGame(roomCode: string): boolean {
  const room = rooms.get(roomCode);
  if (!room) return false;

  room.botTimers.forEach((timer) => clearTimeout(timer));
  room.botTimers.clear();

  const deck = generateDeck();
  for (const player of room.state.players) {
    player.hand = deck.splice(0, 13).sort(compareTiles);
    player.exposures = [];
  }

  room.deck = deck;
  room.state.wallCount = deck.length;
  room.state.currentTurn = "East";
  room.state.discardPile = [];
  room.state.lastDiscard = null;
  room.state.lastDiscardedBy = null;
  room.state.winnerId = null;
  room.state.winnerSeat = null;

  room.state.charleston = createCharlestonState();
  room.state.phase = "charleston";

  return true;
}

export function testSiameseWin(roomCode: string, playerId: string): boolean {
  const room = rooms.get(roomCode);
  if (!room) return false;
  if (!room.state.started) return false;
  if (room.state.config.gameMode !== "2-player") return false;

  const mainPlayer = room.state.players.find(p => p.id === playerId);
  if (!mainPlayer) return false;

  const controllerId = mainPlayer.controlledBy || mainPlayer.id;
  const mySeats = room.state.players.filter(
    p => p.id === controllerId || p.controlledBy === controllerId
  );
  if (mySeats.length !== 2) return false;

  room.botTimers.forEach((timer) => clearTimeout(timer));
  room.botTimers.clear();

  let idCounter = 9000;
  const makeTile = (suit: Suit, value: TileValue): Tile => ({
    id: `test-${suit}-${value}-${idCounter++}`,
    suit,
    value,
    isJoker: suit === "Joker",
  });

  const hand1: Tile[] = [
    makeTile("Bam", 1), makeTile("Bam", 1),
    makeTile("Bam", 2), makeTile("Bam", 2),
    makeTile("Bam", 3), makeTile("Bam", 3),
    makeTile("Bam", 4), makeTile("Bam", 4),
    makeTile("Bam", 5), makeTile("Bam", 5), makeTile("Bam", 5),
    makeTile("Bam", 6), makeTile("Bam", 6), makeTile("Bam", 6),
  ];

  const hand2: Tile[] = [
    makeTile("Crak", 1), makeTile("Crak", 1),
    makeTile("Crak", 2), makeTile("Crak", 2),
    makeTile("Crak", 3), makeTile("Crak", 3),
    makeTile("Crak", 4), makeTile("Crak", 4),
    makeTile("Crak", 5), makeTile("Crak", 5), makeTile("Crak", 5),
    makeTile("Crak", 6), makeTile("Crak", 6), makeTile("Crak", 6),
  ];

  mySeats[0].hand = hand1.sort(compareTiles);
  mySeats[1].hand = hand2.sort(compareTiles);

  const opponentSeats = room.state.players.filter(
    p => p.id !== controllerId && p.controlledBy !== controllerId
  );
  const oppControllerId = opponentSeats[0]?.controlledBy || opponentSeats[0]?.id;
  const oppSeats = room.state.players.filter(
    p => p.id === oppControllerId || p.controlledBy === oppControllerId
  );

  const hand3: Tile[] = [
    makeTile("Dot", 1), makeTile("Dot", 1),
    makeTile("Dot", 2), makeTile("Dot", 2),
    makeTile("Dot", 3), makeTile("Dot", 3),
    makeTile("Dot", 4), makeTile("Dot", 4),
    makeTile("Dot", 5), makeTile("Dot", 5), makeTile("Dot", 5),
    makeTile("Dot", 6), makeTile("Dot", 6), makeTile("Dot", 6),
  ];

  const hand4: Tile[] = [
    makeTile("Bam", 4), makeTile("Bam", 4), makeTile("Bam", 4),
    makeTile("Bam", 5), makeTile("Bam", 5),
    makeTile("Bam", 6), makeTile("Bam", 6),
    makeTile("Bam", 7), makeTile("Bam", 7),
    makeTile("Bam", 8), makeTile("Bam", 8),
    makeTile("Bam", 9), makeTile("Bam", 9), makeTile("Bam", 9),
  ];

  if (oppSeats.length >= 1) oppSeats[0].hand = hand3.sort(compareTiles);
  if (oppSeats.length >= 2) oppSeats[1].hand = hand4.sort(compareTiles);

  room.state.currentTurn = mySeats[0].seat;
  room.state.phase = "discard";

  return true;
}

export function isCurrentTurnBot(roomCode: string): boolean {
  const room = rooms.get(roomCode);
  if (!room) return false;
  if (!room.state.started || room.state.phase === "won") return false;

  const currentPlayer = room.state.players.find(p => p.seat === room.state.currentTurn);
  if (!currentPlayer) return false;

  if (!currentPlayer.isBot) return false;

  if (currentPlayer.controlledBy) {
    const controller = room.state.players.find(p => p.id === currentPlayer.controlledBy);
    if (controller && !controller.isBot) return false;
    return true;
  }

  return true;
}

export function isCurrentTurnControlledByHuman(roomCode: string): string | null {
  const room = rooms.get(roomCode);
  if (!room) return null;

  const currentPlayer = room.state.players.find(p => p.seat === room.state.currentTurn);
  if (!currentPlayer) return null;

  if (currentPlayer.controlledBy) {
    return currentPlayer.controlledBy;
  }
  return null;
}

export function botChooseDiscard(hand: Tile[]): string {
  const patterns = checkAllPatterns(hand);
  const top3 = patterns.slice(0, 3);

  const tileScores = new Map<string, number>();
  for (const tile of hand) {
    tileScores.set(tile.id, 0);
  }

  for (const pattern of top3) {
    const weight = Math.max(1, 14 - pattern.tilesAway);
    for (const matchStr of pattern.matched) {
      const countMatch = matchStr.match(/^(\d+)x\s+(.+)$/);
      if (!countMatch) continue;
      const label = countMatch[2];
      for (const tile of hand) {
        const tileLabel = tile.suit === "Joker" ? "Joker" : `${tile.suit} ${tile.value}`;
        if (tileLabel === label || label === "Flower" && tile.suit === "Flower" || label === "any Dragon" && tile.suit === "Dragon") {
          tileScores.set(tile.id, (tileScores.get(tile.id) || 0) + weight);
        }
      }
    }
  }

  if (hand.filter(t => t.suit === "Joker").length > 0) {
    for (const t of hand) {
      if (t.suit === "Joker") {
        tileScores.set(t.id, (tileScores.get(t.id) || 0) + 100);
      }
    }
  }

  let worstTileId = hand[0].id;
  let worstScore = Infinity;
  for (const tile of hand) {
    const score = tileScores.get(tile.id) || 0;
    const tileRank = typeof tile.value === "number" ? tile.value : 5;
    const combined = score * 100 - tileRank;
    if (combined < worstScore) {
      worstScore = combined;
      worstTileId = tile.id;
    }
  }

  return worstTileId;
}

export function executeBotTransfers(roomCode: string): void {
  const room = rooms.get(roomCode);
  if (!room) return;
  if (room.state.config.gameMode !== "2-player") return;

  const currentPlayer = room.state.players.find(p => p.seat === room.state.currentTurn);
  if (!currentPlayer || !currentPlayer.isBot) return;

  const controllerId = currentPlayer.controlledBy || currentPlayer.id;
  const partner = room.state.players.find(p => p.controlledBy === controllerId);
  if (!partner) return;

  const hand1Patterns = checkAllPatterns(currentPlayer.hand);
  const hand2Patterns = checkAllPatterns(partner.hand);
  const best1 = hand1Patterns[0];
  const best2 = hand2Patterns[0];
  if (!best1 || !best2) return;

  for (const tile of [...currentPlayer.hand]) {
    if (currentPlayer.hand.length <= 1) break;

    const tileLabel = tile.suit === "Joker" ? "Joker" : `${tile.suit} ${tile.value}`;
    const usefulForHand1 = best1.matched.some(m => m.includes(tileLabel));
    const usefulForHand2 = best2.missing.some(m => m.includes(tileLabel));

    if (!usefulForHand1 && usefulForHand2) {
      const idx = currentPlayer.hand.findIndex(t => t.id === tile.id);
      if (idx !== -1) {
        const [moved] = currentPlayer.hand.splice(idx, 1);
        partner.hand.push(moved);
      }
    }
  }

  for (const tile of [...partner.hand]) {
    if (partner.hand.length <= 1) break;

    const tileLabel = tile.suit === "Joker" ? "Joker" : `${tile.suit} ${tile.value}`;
    const usefulForHand2 = best2.matched.some(m => m.includes(tileLabel));
    const usefulForHand1 = best1.missing.some(m => m.includes(tileLabel));

    if (!usefulForHand2 && usefulForHand1) {
      const idx = partner.hand.findIndex(t => t.id === tile.id);
      if (idx !== -1) {
        const [moved] = partner.hand.splice(idx, 1);
        currentPlayer.hand.push(moved);
      }
    }
  }
}

export function executeBotDraw(roomCode: string): { success: boolean; seat?: PlayerSeat } {
  const room = rooms.get(roomCode);
  if (!room) return { success: false };

  const currentPlayer = room.state.players.find(p => p.seat === room.state.currentTurn);
  if (!currentPlayer || !currentPlayer.isBot) return { success: false };

  if (room.state.phase !== "draw") return { success: false };
  if (room.deck.length === 0) return { success: false };

  const tile = room.deck.shift()!;
  currentPlayer.hand.push(tile);
  room.state.wallCount = room.deck.length;
  room.state.phase = "discard";

  return { success: true, seat: currentPlayer.seat };
}

export function executeBotDiscard(roomCode: string): { success: boolean; seat?: PlayerSeat } {
  const room = rooms.get(roomCode);
  if (!room) return { success: false };

  const currentPlayer = room.state.players.find(p => p.seat === room.state.currentTurn);
  if (!currentPlayer || !currentPlayer.isBot) return { success: false };

  if (room.state.phase !== "discard") return { success: false };

  const tileId = botChooseDiscard(currentPlayer.hand);
  const tileIndex = currentPlayer.hand.findIndex(t => t.id === tileId);
  if (tileIndex === -1) return { success: false };

  const [discarded] = currentPlayer.hand.splice(tileIndex, 1);
  room.state.discardPile.unshift(discarded);
  room.state.lastDiscard = discarded;
  room.state.lastDiscardedBy = currentPlayer.seat;

  if (room.state.config.gameMode === "2-player") {
    const controllerId = currentPlayer.controlledBy || currentPlayer.id;
    const opponentMain = room.state.players.find(p => p.id !== controllerId && !p.controlledBy);
    if (opponentMain) {
      room.state.currentTurn = opponentMain.seat;
    } else {
      const currentIdx = SEAT_ORDER.indexOf(room.state.currentTurn);
      room.state.currentTurn = SEAT_ORDER[(currentIdx + 1) % 4];
    }
  } else {
    const currentIdx = SEAT_ORDER.indexOf(room.state.currentTurn);
    room.state.currentTurn = SEAT_ORDER[(currentIdx + 1) % 4];
  }
  room.state.phase = "draw";

  return { success: true, seat: currentPlayer.seat };
}

export function scheduleBotTurn(roomCode: string, callback: () => void): void {
  const room = rooms.get(roomCode);
  if (!room) return;

  const timerKey = `${roomCode}-${Date.now()}`;
  const timer = setTimeout(() => {
    room.botTimers.delete(timerKey);
    callback();
  }, BOT_TURN_DELAY_MS);

  room.botTimers.set(timerKey, timer);
}

export function checkBotWin(roomCode: string): { won: boolean; botName?: string; botSeat?: PlayerSeat; patternName?: string; description?: string } {
  const room = rooms.get(roomCode);
  if (!room) return { won: false };

  const bots = room.state.players.filter(p => p.isBot && p.hand.length === 14 && !p.controlledBy);
  for (const bot of bots) {
    const result = checkForWin(bot.hand);
    if (!result) continue;

    if (room.state.config.gameMode === "2-player") {
      const partnerSeats = room.state.players.filter(p => p.controlledBy === bot.id);
      const partner = partnerSeats[0];
      if (partner) {
        if (partner.hand.length !== 14) continue;
        const partnerResult = checkForWin(partner.hand);
        if (!partnerResult) continue;

        room.state.phase = "won";
        room.state.winnerId = bot.id;
        room.state.winnerSeat = bot.seat;
        return {
          won: true,
          botName: bot.name,
          botSeat: bot.seat,
          patternName: `${result.patternName} + ${partnerResult.patternName}`,
          description: `Both hands won! Hand 1: ${result.description}. Hand 2: ${partnerResult.description}`,
        };
      }
    }

    room.state.phase = "won";
    room.state.winnerId = bot.id;
    room.state.winnerSeat = bot.seat;
    return { won: true, botName: bot.name, botSeat: bot.seat, patternName: result.patternName, description: result.description };
  }
  return { won: false };
}
