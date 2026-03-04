const size = 10;
const hit_index = 20;
const miss_index = 21;
const water_index = 0;

let CurrentHoverEvent;
let Roomid;
let pl_number;
let canFinish = false;

const placementBoard = document.getElementById("PlacementBoard");

const YourBoard = document.getElementById("YourBoard");
const EnemyBoard = document.getElementById("EnemyBoard");
generateBoard(shoot, target, untarget, EnemyBoard);
generateBoard(checkInfo, target, untarget, YourBoard);
// can parse placement board
function parseMap(placementMap, board) {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (placementMap[r][c] != water_index) {
        board.children.item(r * size + c).classList.add("ship");
      }
    }
  }
}

document.getElementById("Search").addEventListener("click", Search);
document.getElementById("JoinRoom").addEventListener("click", () => {
  const roomID = document.getElementById("RoomIDInput").value;
  const playerName = document.getElementById("playerNameInput").value;
  document.getElementById("YourName").innerText = playerName;
  socket.emit("sendName", playerName);
  socket.emit("JoinPrivateRoom", roomID);
});
document.getElementById("CreateRoom").addEventListener("click", () => {
  const playerName = document.getElementById("playerNameInput").value;
  socket.emit("CreatePrivateRoom");
});
socket.on("getName", (data) => {
  console.log("Your oppenent name is " + data);
  document.getElementById("EnemyName").innerText = data;
  ////
});
socket.on("Room Joined", (data) => {
  Roomid = data;
  console.log(data);
  alert("joined room " + Roomid);
});
socket.on("opponentDisconnected", () => {
  alert("your opponent has disconnected , you win by default ");
});
socket.on("Player assign", (data) => {
  pl_number = data;
});
socket.on("InvalidRoomID", () => {
  alert("Invalid Room ID, please check and try again");
});
socket.on("invalidMapData", () => {
  alert("invalid map data sent ");
});
socket.on("connect_error", (error) => {
  if (error.message === "Server is full") {
    alert("Server is full. Please try again later.");
  } else {
    console.error("Connection error:", error);
  }
});
socket.on("alReadyhasRoom", () => alert("already joined a room "));
socket.on("Match_begin", () => {
  console.log("Entering game phase");
  document.getElementById("placementPhase").classList.add("hidden");
  document.getElementById("gamePhase").classList.remove("hidden");

  socket.on("hit", (data) => {
    alert("you hit an enemy ship");
    console.log(data.row, data.col);
    const r = parseInt(data.row);
    const c = parseInt(data.col);
    console.log(EnemyBoard.children.length);
    EnemyBoard.children.item(r * size + c).classList.add("hit");
  });
  socket.on("Won", () => {
    alert("Enemy Fleet has been destroyed ! You Win!");
  });
  socket.on("Lost", () => {
    alert("Your fleet has been destroyed ! You lose !");
  });
  socket.on("notYourTurn", () => {
    alert("Waiting for enemy turn");
  });
  socket.on("invalidShootPos", () => {
    alert("invalid shoot position ");
  });
  socket.on("EnemyshipDestroyed!", (data) => {
    alert("Enemy " + data + " has sunken!");
  });
  socket.on("YourshipDestroyed!", (data) => {
    alert("Your" + data + " has sunken!");
  });
  socket.on("alreadyShotPos", () => {
    alert("you has shoot this pos before! ");
  });
  socket.on("miss", (data) => {
    alert("missed ");
    console.log(data.row, data.col);
    const r = parseInt(data.row);
    const c = parseInt(data.col);
    console.log(EnemyBoard.children.length);
    const index = r * size + c;
    console.log(index);
    EnemyBoard.children.item(index).classList.add("miss");
  });
  socket.on("got hit", (data) => {
    alert("your fleet got damaged");
    const r = parseInt(data.row);
    const c = parseInt(data.col);
    YourBoard.children.item(r * size + c).classList.add("hit");
  });
  socket.on("got missed", (data) => {
    alert("opponent missed the shot");
    const r = parseInt(data.row);
    const c = parseInt(data.col);
    YourBoard.children.item(r * size + c).classList.add("miss");
  });
});
socket.on("placementPhase", () => {
  const playerName = document.getElementById("playerNameInput").value;
  document.getElementById("YourName").innerText = playerName;
  socket.emit("sendName", playerName);
  document.getElementById("placementPhase").classList.remove("hidden");
  document.getElementById("matchingPhase").classList.add("hidden");
  document.addEventListener("keydown", (e) => {
    console.log("r pressed");
    let cells = getCellsFor(current_ship, CurrentHoverEvent);
    current_ship.horizontal = !current_ship.horizontal;
    UnHover(cells);
    cells = getCellsFor(current_ship, CurrentHoverEvent);
    Hover(cells);
  });
  const placementBoard = document.getElementById("PlacementBoard");
  const FinishBtn = document.getElementById("startButton");
  const ReturnBtn = document.getElementById("return");
  generateBoard(
    clickListener,
    mouseoverListener,
    mouseoutListener,
    placementBoard
  );

  ReturnBtn.addEventListener("click", (e) => {
    removeShip(e);
  });

  FinishBtn.addEventListener("click", (e) => {
    if (!canFinish) {
      alert("you haven't finish placement yet");
      return;
    }
    parseMap(getMap(), YourBoard);
    console.log("emitting map data");
    console.log(Roomid);
    socket.emit("mapData", {
      map: getMap(),
      roomID: Roomid,
    });
  });
});

class vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}
class ship {
  constructor(index, name, length, horizontal, position) {
    this.index = index;
    this.name = name;
    this.length = length;
    this.horizontal = horizontal;
    this.position = position;
    this.Isplaced = false;
  }
  reset() {
    this.Isplaced = false;
    let cells = getCellsForShip(this);
    cells.forEach((cell) => {
      cell.dataset.index = water_index;
      cell.classList.remove("ship");
      console.log("removed ship at: " + cell.dataset.x + "; " + cell.dataset.y);
    });
  }
}

// declare ship
//#region ship declaration
let Carrier = new ship(1, "Carrier", 5, true, new vector(0, 0));
let Cruiser = new ship(2, "Carrier", 4, true, new vector(0, 0));
let Battleship = new ship(3, "Carrier", 3, true, new vector(0, 0));
let Submarine = new ship(4, "Carrier", 3, true, new vector(0, 0));
let Destroyer = new ship(5, "Carrier", 2, true, new vector(0, 0));
let Ships = [];
Ships.push(Carrier, Cruiser, Battleship, Submarine, Destroyer);
//#endregion
//placementBoard
//#region placement essential for placementphase
let current_index = 0;
let current_ship = Ships[current_index];
let canPlace = true;
//#endregion
//generateBoard
function Search(e) {
  socket.emit("Matching Request");
  console.log("sending matching request");
}
function removeShip(e) {
  if (current_index - 1 <= -1) {
    console.log("there is no ship on the map");
    return;
  } else {
    current_index--;
    current_ship = Ships[current_index];
    current_ship.reset();
  }
  canFinish = false;
}
function generateBoard(
  clickListener,
  mouseoverListener,
  mouseoutListener,
  board
) {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      let cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.x = c;
      cell.dataset.y = r;
      cell.dataset.index = water_index;
      board.appendChild(cell);
    }
  }
  board.addEventListener("click", clickListener);
  board.addEventListener("mouseover", mouseoverListener);
  board.addEventListener("mouseout", mouseoutListener);
}
function PlaceShip(e) {
  if (canPlace && !current_ship.Isplaced && current_index < Ships.length) {
    const r = e.target.dataset.y;
    const c = e.target.dataset.x;
    current_ship.position.x = c;
    current_ship.position.y = r;
    current_ship.Isplaced = true;
    getCellsFor(current_ship, e).forEach((cell) => {
      cell.classList.add("ship");
      cell.dataset.index = current_ship.index;
      cell.classList.remove("valid");
    });

    current_index++;
    if (current_index < Ships.length) {
      current_ship = Ships[current_index];
    }
  }
  if (current_index >= Ships.length) {
    canFinish = true;
  }
}

function Hover(cells) {
  if (!current_ship.Isplaced) {
    if (canPlace) {
      cells.forEach((cell) => cell.classList.add("valid"));
    } else {
      cells.forEach((cell) => cell.classList.add("invalid"));
    }
  }
}

function UnHover(cells) {
  cells.forEach((cell) => cell.classList.remove("valid", "invalid"));
}

function getCellsFor(ship, e) {
  const c = parseInt(e.target.dataset.x);
  const r = parseInt(e.target.dataset.y);

  let cells = [];
  if (!ship.horizontal) {
    for (let i = 0; i < ship.length; i++) {
      if (r + i >= size) {
        break;
      }
      let index = (r + i) * size + c;
      let cell = placementBoard.children.item(index);
      if (cell == null) {
        return;
      }
      cells.push(cell);
    }
  } else {
    for (let i = 0; i < ship.length; i++) {
      if (c + i >= size) {
        break;
      }
      let cell = placementBoard.children.item(r * size + c + i);
      if (cell == null) {
        return;
      }
      cells.push(cell);
    }
  }
  if (!cells) {
    alert("cells null");
  }
  if (
    cells.every((cell) => cell.dataset.index == water_index) &&
    cells.length == ship.length
  ) {
    canPlace = true;
  } else canPlace = false;
  return cells;
}
function getCellsForShip(shipw) {
  const c = parseInt(shipw.position.x);
  const r = parseInt(shipw.position.y);
  let cells = [];
  if (!shipw.horizontal) {
    for (let i = 0; i < shipw.length; i++) {
      if (r + i >= size) {
        break;
      }
      let cell = placementBoard.children.item((r + i) * size + c);
      cells.push(cell);
    }
  } else {
    for (let i = 0; i < shipw.length; i++) {
      if (c + i >= size) {
        break;
      }
      let cell = placementBoard.children.item(r * size + c + i);
      cells.push(cell);
    }
  }
  return cells;
}
function mouseoverListener(e) {
  let cells = getCellsFor(current_ship, e);
  if (e.target.classList.contains("cell")) {
    Hover(cells);
    CurrentHoverEvent = e;
  }
}
function mouseoutListener(e) {
  let cells = getCellsFor(current_ship, e);
  UnHover(cells);
}
function clickListener(e) {
  PlaceShip(e);
}

function getMap() {
  let map = [];
  for (let r = 0; r < size; r++) {
    map[r] = [];
    for (let c = 0; c < size; c++) {
      map[r][c] = placementBoard.children.item(r * size + c).dataset.index;
    }
  }
  return map;
}
function shoot(e) {
  const shot = {
    pl_num: pl_number,
    pos: new vector(e.target.dataset.x, e.target.dataset.y),
    roomID: Roomid,
  };
  socket.emit("shoot", shot);
  console.log("shoot at " + e.target.dataset.x + ";" + e.target.dataset.y);
}
function target(e) {
  e.target.classList.add("targeted");
}
function untarget(e) {
  e.target.classList.remove("targeted");
}
function checkInfo() {
  alert("can't shoot at your own fleet");
}
