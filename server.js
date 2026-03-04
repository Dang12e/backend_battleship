const express = require("express");
const app = express();
const server = require("http").createServer(app);
const port = process.env.PORT || 5500;

const plconnected = [];

const io = require("socket.io")(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
  },
});

const path = require("path");

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

//
const size = 10;
const hit_index = 20;
const miss_index = 21;
const water_index = 0;
class ship {
  constructor(index, name, hp) {
    this.index = index;
    this.name = name;
    this.hp = hp;
  }
}

// declare ship
//#region ship declaration
const Carrier = new ship(1, "Carrier", 5);
const Cruiser = new ship(2, "Carrier", 4);
const Battleship = new ship(3, "Carrier", 3);
const Submarine = new ship(4, "Carrier", 3);
const Destroyer = new ship(5, "Carrier", 2);

const Ships = [];
Ships.push(Carrier, Cruiser, Battleship, Submarine, Destroyer);

function findSocketById(socketId) {
  return io.sockets.sockets.get(socketId);
}
function refuseEvents(socketIds) {
  const tempsockets = [];
  tempsockets.push(findSocketById(socketIds[0]), findSocketById(socketIds[1]));
  tempsockets.forEach((socket) => {
    socket.removeAllListeners("Matching request");
    socket.removeAllListeners("mapData");
    socket.removeAllListeners("shoot");
    socket.removeAllListeners("CreatePrivateRoom");
    socket.removeAllListeners("JoinPrivateRoom");
  });
}
class RoomsManager {
  constructor() {
    this.room = new Map();
    this.id = 0;
  }
  getID() {
    return this.id++;
  }
  createNewPrivateRoom(socket) {
    if (socket.hasRoom) {
      socket.emit("alReadyhasRoom");
      return;
    }
    socket.hasRoom = true;
    const R = new Room(this.getID(), this, true);
    R.generateShipsInfo();
    this.room.set(R.id, R);
    socket.roomID = R.id;
    socket.playerID = 0;
    socket.join(R.id);
    socket.emit("Player assign", 1);
    socket.emit("Room Joined", R.id);
    this.room.get(R.id).player_ids[0] = socket.id;
  }
  joinPrivateRoom(socket, roomID) {
    if (socket.hasRoom != undefined) {
      socket.emit("alReadyhasRoom");
      return;
    }
    console.log("a player is trying to join room " + roomID);

    const R = this.room.get(parseInt(roomID));
    if (R === undefined || R.isPrivate === false) {
      if (R === undefined) {
        console.log("Room ID " + roomID + " does not exist");
      }
      socket.emit("InvalidRoomID");
      return;
    }
    socket.hasRoom = true;
    if (R && R.player_ids.length < 2) {
      socket.roomID = R.id;
      socket.playerID = 1;
      socket.join(R.id);
      socket.emit("Player assign", 2);
      R.player_ids[1] = socket.id;
      io.to(socket.roomID).emit("Room Joined", socket.roomID);
      io.to(socket.roomID).emit("placementPhase");
    } else {
      socket.emit("InvalidRoomID");
    }
  }

  createNewRoom(sockets) {
    const R = new Room(this.getID(), this, false);
    R.generateShipsInfo();
    this.room.set(R.id, R);
    let i = 0;
    sockets.forEach((socket) => {
      socket.roomID = R.id;
      socket.playerID = i++;
      socket.join(R.id);
      socket.emit("Player assign", i);
    });
    this.room.get(R.id).player_ids[0] = sockets[0].id;
    this.room.get(R.id).player_ids[1] = sockets[1].id;
  }
  deleteRoom(roomID) {
    this.room.delete(roomID);
  }
  getGameDatafor(roomID, socket, map) {
    this.room.get(roomID).player_maps[socket.playerID] = map;
  }
  startGameat(roomID) {
    this.room.get(roomID).turn[0] = true;
  }
}
const rm = new RoomsManager();
class Room {
  constructor(id, rm, isPrivate) {
    this.isPrivate = isPrivate;
    this.rm = rm;
    this.id = id;
    this.player_ids = [];
    this.player_maps = [];
    this.player_hp = [];
    this.turn = [];
    this.ships_info = [];
  }
  generateShipsInfo() {
    this.player_hp[0] = 17;
    this.player_hp[1] = 17;
    this.ships_info[0] = Ships.map((s) => new ship(s.index, s.name, s.hp));
    this.ships_info[1] = Ships.map((s) => new ship(s.index, s.name, s.hp));
  }
  shoot(r, c, socket) {
    if (socket.playerID == 0) {
      switch (parseInt(this.player_maps[1][r][c])) {
        case 0:
          this.turn[0] = false;
          this.turn[1] = true;
          this.player_maps[1][r][c] = miss_index;
          socket.emit("miss", { row: r, col: c });
          socket.to(socket.roomID).emit("got missed", { row: r, col: c });
          break;
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          this.turn[0] = false;
          this.turn[1] = true;
          socket.emit("hit", { row: r, col: c });
          socket.to(socket.roomID).emit("got hit", { row: r, col: c });
          const index = parseInt(this.player_maps[1][r][c]);
          console.log("ship index is " + index);
          this.ships_info[1][index - 1].hp--;
          this.player_maps[1][r][c] = hit_index;
          if (this.ships_info[1][index - 1].hp <= 0) {
            socket.emit(
              "EnemyshipDestroyed!",
              this.ships_info[1][index - 1].name,
            );
            socket
              .to(socket.roomID)
              .emit("YourshipDestroyed!", this.ships_info[1][index - 1].name);
          }
          if (--this.player_hp[1] <= 0) {
            socket.emit("Won");
            socket.to(socket.roomID).emit("Lost");
            refuseEvents(this.player_ids);
            rm.deleteRoom(this.id);
          }
          break;
        case 20:
        case 21:
          socket.emit("alreadyShotPos");
          break;
        default:
          console.log("incorrect input from map:" + this.player_maps[1][r][c]);
          break;
      }
    } else {
      switch (parseInt(this.player_maps[0][r][c])) {
        case 0:
          this.turn[1] = false;
          this.turn[0] = true;
          this.player_maps[0][r][c] = miss_index;
          socket.emit("miss", { row: r, col: c });
          socket.to(socket.roomID).emit("got missed", { row: r, col: c });
          break;
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          this.turn[1] = false;
          this.turn[0] = true;
          socket.emit("hit", { row: r, col: c });
          socket.to(socket.roomID).emit("got hit", { row: r, col: c });
          const index = parseInt(this.player_maps[0][r][c]);
          console.log("ship index is " + index);
          this.ships_info[0][index - 1].hp--;
          this.player_maps[0][r][c] = hit_index;
          if (this.ships_info[0][index - 1].hp <= 0) {
            socket.emit(
              "EnemyshipDestroyed!",
              this.ships_info[0][index - 1].name,
            );
            socket
              .to(socket.roomID)
              .emit("YourshipDestroyed!", this.ships_info[0][index - 1].name);
          }
          if (--this.player_hp[0] <= 0) {
            socket.emit("Won");
            socket.to(socket.roomID).emit("Lost");
            refuseEvents(this.player_ids);
            rm.deleteRoom(this.id);
          }
          break;
        case 20:
        case 21:
          socket.emit("alreadyShotPos");
          break;
        default:
          console.log("incorrect input from map: " + this.player_maps[0][r][c]);
          break;
      }
    }
  }
}

server.listen(port, () => {
  console.log("Server is running " + port);
});

const MAX_CLIENTS = 10;
let connectedClients = 0;
io.use((socket, next) => {
  connectedClients++;
  console.log("Number of clients: " + connectedClients);
  if (connectedClients >= MAX_CLIENTS) {
    connectedClients--;
    console.log("A connection attempt was denied.");
    console.log(
      "Number of clients after denying connection: " + connectedClients,
    );
    return next(new Error("Server is full"));
  }

  next();
});

io.on("error", (err) => {
  if (err.message === "Server is full") console.log(err.message);
});

io.on("connection", (socket) => {
  console.log("player id :" + socket.id + " connected!");
  socket.on("CreatePrivateRoom", () => {
    rm.createNewPrivateRoom(socket);
  });
  socket.on("JoinPrivateRoom", (data) => {
    if (isValidInterger(parseInt(data)) == false) {
      socket.emit("InvalidRoomID");
      return;
    }
    rm.joinPrivateRoom(socket, data);
  });
  socket.on("Matching Request", () => {
    if (socket.hasRoom == undefined) {
      console.log("a player sent matching request");
      socket.hasRoom = true;
      plconnected.push(socket);
      if (plconnected.length >= 2) {
        let sockets = [];
        sockets.push(plconnected[0], plconnected[1]);
        plconnected.pop();
        plconnected.pop();

        rm.createNewRoom(sockets);
        const id = sockets[0].roomID;
        console.log(
          "Room " +
            id +
            " created with players: " +
            sockets[0].id +
            " and " +
            sockets[1].id,
        );
        io.to(socket.roomID).emit("Room Joined", socket.roomID);
        io.to(socket.roomID).emit("placementPhase");
      }
    } else socket.emit("alReadyhasRoom");
  });

  socket.on("sendName", (data) => {
    if (socket.hasRoom)
      socket.to(rm.room.get(socket.roomID).player_ids).emit("getName", data);
  });

  socket.on("disconnect", () => {
    connectedClients--;
    console.log("player id :" + socket.id + " disconnected!");
    console.log("Number of clients after disconnection: " + connectedClients);

    if (socket.hasRoom) {
      const R = rm.room.get(socket.roomID);
      socket.to(socket.roomID).emit("opponentDisconnected");
      refuseEvents(R.player_ids);
      rm.deleteRoom(socket.roomID);
    }
  });

  socket.on("mapData", (data) => {
    if (isMapValid(data.map) == false) {
      console.log("received invalid map data from a player");
      socket.emit("invalidMapData");
      return;
    }
    if (isShipsPosValid(data.map) == false) {
      console.log("received invalid ship positions from a player");
      socket.emit("invalidMapData");
      return;
    }
    if (socket.roomID != undefined) {
      rm.getGameDatafor(socket.roomID, socket, data.map);
      console.log("a player sent map info!");
      if (
        rm.room.get(socket.roomID).player_maps[0] &&
        rm.room.get(socket.roomID).player_maps[1]
      ) {
        rm.startGameat(socket.roomID);
        io.to(socket.roomID).emit("Match_begin");
      }
    } else {
      console.log("failure!");
    }
  });
  socket.on("shoot", (data) => {
    if (!isValidPosition(parseInt(data.pos.y), parseInt(data.pos.x))) {
      socket.emit("invalidShootPos");
      return;
    }
    if (socket.roomID != undefined) {
      const r = parseInt(data.pos.y);
      const c = parseInt(data.pos.x);
      if (rm.room.get(socket.roomID).turn[socket.playerID]) {
        rm.room.get(socket.roomID).shoot(r, c, socket); ////
      } else {
        socket.emit("notYourTurn");
      }
    }
  });
});

function isValidInterger(interger) {
  return Number.isInteger(interger) && interger >= 0;
}
function isValidPosition(r, c) {
  return isValidInterger(r) && isValidInterger(c) && r < size && c < size;
}
function isMapValid(map) {
  if (!Array.isArray(map) || map.length !== size) {
    console.log("map is invalid");
    return false;
  }
  for (let r = 0; r < size; r++) {
    if (!Array.isArray(map[r]) || map[r].length !== size) {
      console.log("row " + r + " is invalid");
      return false;
    }
    for (let c = 0; c < size; c++) {
      const cell = parseInt(map[r][c]);
      if (!isValidInterger(cell) || cell < 0 || cell > 5) {
        console.log("cell " + r + "," + c + " is invalid");
        return false;
      }
    }
  }
  return true;
}
function isShipsPosValid(map) {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = parseInt(map[r][c]);
      if (cell != water_index) {
        const cell_right = c + 1 < size ? map[r][c + 1] : null;
        const cell_down = r + 1 < size ? map[r + 1][c] : null;
        const length = Ships[cell - 1].hp;
        let count = 0;
        if (cell_right === cell) {
          for (let i = 0; i < length; i++) {
            if (c + i < size && map[r][c + i] === cell) {
              count++;
            } else {
              return false;
            }
          }
        } else if (cell_down === cell) {
          for (let i = 0; i < length; i++) {
            if (r + i < size && map[r + i][c] === cell) {
              count++;
            } else {
              return false;
            }
          }
        }
      }
    }
  }
  return true;
}
