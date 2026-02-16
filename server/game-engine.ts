import { type Tile, type Suit, type TileValue, type PlayerSeat, type PlayerState, type RoomState, type ClientRoomView, SEAT_ORDER } from "@shared/schema";
import { checkForWin } from "@shared/patterns";

const SUITS: Suit[] = ["Bam", "Crak", "Dot"];
const WINDS: TileValue[] = ["East", "South", "West", "North"];
const DRAGONS: TileValue[] = ["Red", "Green", "White"];

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

export interface GameRoom {
  state: RoomState;
  deck: Tile[];
}

const rooms = new Map<string, GameRoom>();

export function createRoom(playerId: string, playerName: string): GameRoom {
  let roomCode = generateRoomCode();
  while (rooms.has(roomCode)) {
    roomCode = generateRoomCode();
  }

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
    },
    deck: [],
  };

  rooms.set(roomCode, room);
  return room;
}

export function joinRoom(roomCode: string, playerId: string, playerName: string): GameRoom | null {
  const room = rooms.get(roomCode);
  if (!room) return null;
  if (room.state.started) return null;
  if (room.state.players.length >= 4) return null;
  if (room.state.players.find(p => p.id === playerId)) return room;

  const takenSeats = new Set(room.state.players.map(p => p.seat));
  const nextSeat = SEAT_ORDER.find(s => !takenSeats.has(s));
  if (!nextSeat) return null;

  room.state.players.push({
    id: playerId,
    name: playerName,
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

export function removePlayer(roomCode: string, playerId: string): boolean {
  const room = rooms.get(roomCode);
  if (!room) return false;

  if (room.state.started) {
    const player = room.state.players.find(p => p.id === playerId);
    if (player) player.connected = false;
    return true;
  }

  room.state.players = room.state.players.filter(p => p.id !== playerId);
  if (room.state.players.length === 0) {
    rooms.delete(roomCode);
  }
  return true;
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
  }

  room.deck = deck;
  room.state.wallCount = deck.length;
  room.state.currentTurn = "East";
  room.state.phase = "draw";
  room.state.discardPile = [];
  room.state.lastDiscard = null;
  room.state.lastDiscardedBy = null;
  room.state.winnerId = null;
  room.state.winnerSeat = null;
  room.state.started = true;

  return true;
}

export function drawTile(roomCode: string, playerId: string): { success: boolean; error?: string } {
  const room = rooms.get(roomCode);
  if (!room) return { success: false, error: "Room not found" };
  if (!room.state.started) return { success: false, error: "Game not started" };
  if (room.state.phase !== "draw") return { success: false, error: "Not draw phase" };

  const player = room.state.players.find(p => p.id === playerId);
  if (!player) return { success: false, error: "Player not in room" };
  if (player.seat !== room.state.currentTurn) return { success: false, error: "Not your turn" };
  if (room.deck.length === 0) return { success: false, error: "Wall is empty" };

  const tile = room.deck.shift()!;
  player.hand.push(tile);
  room.state.wallCount = room.deck.length;
  room.state.phase = "discard";

  return { success: true };
}

export function discardTile(roomCode: string, playerId: string, tileId: string): { success: boolean; error?: string } {
  const room = rooms.get(roomCode);
  if (!room) return { success: false, error: "Room not found" };
  if (!room.state.started) return { success: false, error: "Game not started" };
  if (room.state.phase !== "discard") return { success: false, error: "Not discard phase" };

  const player = room.state.players.find(p => p.id === playerId);
  if (!player) return { success: false, error: "Player not in room" };
  if (player.seat !== room.state.currentTurn) return { success: false, error: "Not your turn" };

  const tileIndex = player.hand.findIndex(t => t.id === tileId);
  if (tileIndex === -1) return { success: false, error: "Tile not in hand" };

  const [discarded] = player.hand.splice(tileIndex, 1);
  room.state.discardPile.unshift(discarded);
  room.state.lastDiscard = discarded;
  room.state.lastDiscardedBy = player.seat;

  const currentIdx = SEAT_ORDER.indexOf(room.state.currentTurn);
  room.state.currentTurn = SEAT_ORDER[(currentIdx + 1) % 4];
  room.state.phase = "draw";

  return { success: true };
}

export function sortPlayerHand(roomCode: string, playerId: string): boolean {
  const room = rooms.get(roomCode);
  if (!room) return false;
  const player = room.state.players.find(p => p.id === playerId);
  if (!player) return false;
  player.hand.sort(compareTiles);
  return true;
}

export function getClientView(room: GameRoom, playerId: string): import("@shared/schema").ClientRoomView | null {
  const player = room.state.players.find(p => p.id === playerId);
  if (!player) return null;

  return {
    roomCode: room.state.roomCode,
    players: room.state.players.map(p => ({
      id: p.id,
      name: p.name,
      seat: p.seat,
      handCount: p.hand.length,
      exposures: p.exposures,
      connected: p.connected,
    })),
    myHand: player.hand,
    mySeat: player.seat,
    currentTurn: room.state.currentTurn,
    phase: room.state.phase,
    wallCount: room.state.wallCount,
    discardPile: room.state.discardPile,
    lastDiscard: room.state.lastDiscard,
    lastDiscardedBy: room.state.lastDiscardedBy,
    winnerId: room.state.winnerId,
    winnerSeat: room.state.winnerSeat,
    started: room.state.started,
  };
}

export function checkWinForPlayer(roomCode: string, playerId: string): { won: boolean; patternName?: string; description?: string } {
  const room = rooms.get(roomCode);
  if (!room) return { won: false };
  const player = room.state.players.find(p => p.id === playerId);
  if (!player) return { won: false };
  if (player.hand.length !== 14) return { won: false };

  const result = checkForWin(player.hand);
  if (result) {
    room.state.phase = "won";
    room.state.winnerId = playerId;
    room.state.winnerSeat = player.seat;
    return { won: true, patternName: result.patternName, description: result.description };
  }
  return { won: false };
}

export function resetGame(roomCode: string): boolean {
  const room = rooms.get(roomCode);
  if (!room) return false;

  const deck = generateDeck();
  for (const player of room.state.players) {
    player.hand = deck.splice(0, 13).sort(compareTiles);
    player.exposures = [];
  }

  room.deck = deck;
  room.state.wallCount = deck.length;
  room.state.currentTurn = "East";
  room.state.phase = "draw";
  room.state.discardPile = [];
  room.state.lastDiscard = null;
  room.state.lastDiscardedBy = null;
  room.state.winnerId = null;
  room.state.winnerSeat = null;

  return true;
}
