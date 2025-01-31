let canvas = document.getElementById("demo"),
  canvas_container = document.getElementById("canvas_container");
let app = new PIXI.Application({
  view: canvas,
  width: canvas_container.offsetWidth,
  height: canvas_container.offsetHeight,
  backgroundColor: 0xffffff,
  antialias: true,
  autoDensity: true,
});
let stage = app.stage,
  renderer = app.renderer;
// renderer.resize(canvas_container.offsetWidth, canvas_container.offsetHeight);
let width = renderer.view.width,
  height = renderer.view.height;

let nodeid2index = []; // Convert node id (Acemap paper id, a random integer) to index in nodes_container.children

let nodes_container = new PIXI.Container(), // Nodes container
  edges_container = new PIXI.Container(), // Edges container
  labels_container = new PIXI.Container(), // Node labels container
  markers_container = new PIXI.Container(); // Markers container, used for search

let zoom_level = 1;
let edgeRenderTimer = null; // A timer for edge renderring during zooming and dragging
let DB_DELAY = 700,
  clicks = 0,
  dbTimer = null; // Double click event parameters (double click is not supported in Pixi.js)

let fontLoader = new PIXI.Loader();
fontLoader.add("Arial", "fonts/Arial.fnt");
fontLoader.load((loader, resources) => {
  init();
});

let init = () => {
  d3.json("./data/cs_top.json").then(function (graph) {
    console.log("graph---", graph);
    graph.nodes.forEach((node) => {
      node_gfx = new PIXI.Graphics();
      let x = node.x,
        y = node.y;
      node_gfx.beginFill(rgb2hex(node.color));
      node_gfx.drawCircle(0, 0, node.size);
      node_gfx.position.set(x, y);
      node_gfx.cursor = "pointer";
      node_gfx.interactive = true;
      node_gfx
        .on("mouseover", showPaperInfo) // Display tooltip when mouseover node
        .on("mouseout", hidePaperInfo) // No display tooltip
        .on("click", clickHandler); // Handle click/dbclick event
      node_gfx.attributes = node.attributes;
      (node_gfx.neighbors = []), (node_gfx.edges = []); // Neighbors in the network and edges assosiated with this node
      if (!node.attributes.normalizedname) node.attributes.normalizedname = ""; // node.attributes.normalizedname could be undefined in the data
      node_gfx.searchstr =
        node.attributes.normalizedname.toLowerCase() +
        "_" +
        node.attributes.title.toLowerCase(); // used for search
      nodes_container.addChild(node_gfx);
      nodeid2index[node.id] = nodes_container.children.length - 1;

      label = new PIXI.BitmapText(
        node.attributes.normalizedname + " (" + node.attributes.year + ")",
        {
          fontName: "Arial",
          fontSize: Math.max(10, node.size),
          align: "right",
        }
      );
      label.size = node.size;
      label.position.set(x, y);
      label.anchor.set(0.5, 0.5);
      if (node.size <= 95) label.visible = false;
      labels_container.addChild(label);
    });

    graph.edges.forEach((edge) => {
      edge_gfx = new PIXI.Graphics();
      edge_gfx.lineStyle(edge.size / 2, rgb2hex(edge.color), 0.8);
      let source = nodes_container.getChildAt(nodeid2index[edge.source]),
        target = nodes_container.getChildAt(nodeid2index[edge.target]);
      source.neighbors.push(target);
      target.neighbors.push(source);
      source.edges.push(edge_gfx);
      target.edges.push(edge_gfx);
      edge_gfx.moveTo(source.x, source.y);
      // Curved edges in Gephi-like style (TODO, could be time-consuming)
      // cpoints = bezierControlPoint(source.x, source.y, target.x, target.y);
      // edge_gfx.bezierCurveTo(
      //   cpoints[0],
      //   cpoints[1],
      //   cpoints[2],
      //   cpoints[3],
      //   target.x,
      //   target.y
      // );

      // Straight edges
      edge_gfx.lineTo(target.x, target.y);
      edges_container.addChild(edge_gfx);
    });

    stage.addChild(
      edges_container,
      nodes_container,
      labels_container,
      markers_container
    );

    let scale = Math.min(
      width / nodes_container.width,
      height / nodes_container.height
    );
    stage.scale.set(scale, scale); // Re-scale the stage to the size of nodes_container.
  });
};

function showPaperInfo(e) {
  $(".info-title").text(
    this.attributes.title +
      " (" +
      this.attributes.year +
      ") (Citation: " +
      this.attributes.citation_count +
      ")"
  );
  $(".info-author-data").text(this.attributes.normalizedname);
  $("#paper-info").css("display", "block");
}

function hidePaperInfo(params) {
  $("#paper-info").css("display", "none");
}

let lastPos = null;
$("canvas")
  .mousewheel(function (e) {
    zoom(e.deltaY, e.offsetX, e.offsetY);
  })
  .mousedown(function (e) {
    lastPos = { x: e.offsetX, y: e.offsetY };
  })
  .mouseup(function (event) {
    lastPos = null;
  })
  .mousemove(function (e) {
    if (lastPos) {
      edges_container.visible = false;
      clearTimeout(edgeRenderTimer);
      edgeRenderTimer = setTimeout(function () {
        edges_container.visible = true;
      }, 1000);
      stage.x += e.offsetX - lastPos.x;
      stage.y += e.offsetY - lastPos.y;
      lastPos = { x: e.offsetX, y: e.offsetY };
    }
  });

// zoom function
function zoom(s, x, y) {
  edges_container.visible = false;
  clearTimeout(edgeRenderTimer);
  edgeRenderTimer = setTimeout(function () {
    edges_container.visible = true;
  }, 1000);
  s = s > 0 ? 2 : 0.5;
  stage.scale.x.toFixed(4);
  stage.x.toFixed(4);
  stage.y.toFixed(4);
  let oldScale = { x: stage.scale.x, y: stage.scale.y };
  let worldPos = {
    x: (x - stage.x) / stage.scale.x,
    y: (y - stage.y) / stage.scale.y,
  };
  let newScale = { x: stage.scale.x * s, y: stage.scale.y * s };
  let newScreenPos = {
    x: worldPos.x * newScale.x + stage.x,
    y: worldPos.y * newScale.y + stage.y,
  };

  stage.x -= newScreenPos.x - x;
  stage.y -= newScreenPos.y - y;
  stage.scale.x = newScale.x;
  stage.scale.y = newScale.y;
  newScale.x.toFixed(4);
  stage.x.toFixed(4);
  stage.y.toFixed(4);

  zoom_level = zoom_level * s;
  adjustLabelVisibility(); // Adjust the visibility of label according to zoom level and node size
  adjustAnchorSize(); // Adjust the size of anchors (i.e. search results) w.r.t zoom level
}

// used in curved edge renderring, now deprecated
function bezierControlPoint(x1, y1, x2, y2) {
  let distance_s_t = distance(x1, y1, x2, y2);
  // distance(cp1, source) = sqrt(2) * 0.2 * distance(source, target)
  let distance_cp1_source = Math.sqrt(2) * 0.2 * distance_s_t;
  // sin(b) = sin(pi/4 + a) = sqrt(2)/2 * (cos a + sin a)
  // cos(b) = cos(pi/4 + a) = sqrt(2)/2 * (cos a - sin a)
  // b is the angle between cp1-source and x-axis, a is the angle between source-target and x-axis
  let sin_b =
      (Math.sqrt(2) / 2) *
      ((x2 - x1) / distance_s_t + (y2 - y1) / distance_s_t),
    cos_b =
      (Math.sqrt(2) / 2) *
      ((x2 - x1) / distance_s_t - (y2 - y1) / distance_s_t);
  let cp1_x = x1 + distance_cp1_source * cos_b,
    cp1_y = y1 + distance_cp1_source * sin_b;

  let distance_cp2_target = distance_cp1_source;
  let sin_c = cos_b,
    cos_c = sin_b;
  let cp2_x = x2 - distance_cp2_target * cos_c,
    cp2_y = y2 + distance_cp2_target * sin_c;

  return [cp1_x, cp1_y, cp2_x, cp2_y];
}

// used in curved edge renderring, now deprecated
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

// Convert rgb string to Pixi-readable hex format
function rgb2hex(rgb) {
  rgb = rgb.match(/\d+/g);
  let r = parseInt(rgb[0]),
    g = parseInt(rgb[1]),
    b = parseInt(rgb[2]);
  return "0x" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Prepare anchor sprite
let loader = new PIXI.Loader();
loader.add("img/icon-pin.png");
let anchor_height = 0,
  anchor_width = 0;

function setup(str, s) {
  nodes_container.children.forEach((node) => {
    if (node.searchstr.indexOf(str) >= 0) {
      (x = node.x), (y = node.y);
      let sprite = new PIXI.Sprite(
        loader.resources["img/icon-pin.png"].texture
      );

      (anchor_width = sprite.width), (anchor_height = sprite.height);
      (sprite.height = (sprite.height * 4) / s),
        (sprite.width = (sprite.width * 4) / s);
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

function clickHandler(e) {
  console.log('clickHandler', e);
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
