// Prepare anchor sprite
let loader = new PIXI.Loader();
loader.add("img/icon-pin.png");
let anchor_height = 0, anchor_width = 0;

function setup(str, s) {
  nodes_container.children.forEach((node) => {
    if (node.searchstr.indexOf(str) >= 0) {
      (x = node.x), (y = node.y);
      let sprite = new PIXI.Sprite(loader.resources["img/icon-pin.png"].texture);
      
      (anchor_width = sprite.width), (anchor_height = sprite.height);
      (sprite.height = (sprite.height * 4) / s), (sprite.width = (sprite.width * 4) / s);
      (sprite.x = x - sprite.width / 2), (sprite.y = y - sprite.height);
      (sprite.x_ = x), (sprite.y_ = y);

      markers_container.addChild(sprite);
    }
  });
}

// A demo for search function, you can try this function in chrome console like "search('jiawei han')"
// This function will add a marker to any node whose search_str contains str
function search(str = "") {
  markers_container.removeChildren();
  s = zoom_level;
  if (str == "") {
    return;
  }
  if (s < 1) s = 1;
  loader.load(setup(str, s));
}

function adjustLabelVisibility() {
  labels_container.children.forEach((label) => {
    if (label.size * zoom_level >= 95) label.visible = true;
    else label.visible = false;
  });
}

function adjustAnchorSize() {
  let s = zoom_level;
  if (s < 1) s = 1;
  markers_container.children.forEach((anchor) => {
    (anchor.height = (anchor_height * 4) / s),
    (anchor.width = (anchor_width * 4) / s);
    (anchor.x = anchor.x_ - anchor.width / 2),
    (anchor.y = anchor.y_ - anchor.height);
  });
}

function clickHandler() {
  let tar = this;
  clicks++; // Count clicks
  if (clicks === 1) {
    dbTimer = setTimeout(function () {
      highlightNeighbors(tar); // Perform single-click action, here we highlight all neighbors of this node
      clicks = 0; // After action performed, reset counter
    }, DB_DELAY);
  } else {
    clearTimeout(dbTimer); // Prevent single-click action
    alert("Double Click"); // Perform double-click action, can be replace by any function
    clicks = 0; // After action performed, reset counter
  }
}

function highlightNeighbors(tar) {
  for (var ix in nodes_container.children) {
    nodes_container.children[ix].alpha = 0.2;
  }
  for (var ix in edges_container.children) {
    edges_container.children[ix].alpha = 0;
  }
  for (var nx in tar.neighbors) {
    tar.neighbors[nx].alpha = 1;
  }
  for (var nx in tar.edges) {
    tar.edges[nx].alpha = 1;
  }
  tar.alpha = 1;
}

function showAll(params) {
  for (var ix in nodes_container.children) {
    nodes_container.children[ix].alpha = 1;
  }
  for (var ix in edges_container.children) {
    edges_container.children[ix].alpha = 1;
  }
}

document.getElementById("demo").addEventListener("contextmenu", (e) => {
  e.preventDefault();
});
let showAllInteraction = new PIXI.InteractionManager(renderer);
showAllInteraction.on("rightup", showAll); // right click to cancel neighbor highlight