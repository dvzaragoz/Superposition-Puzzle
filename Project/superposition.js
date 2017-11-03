// WebGL Variables
var canvas;
var gl;

// Constants
var canvasHeight = 8;
var canvasWidth = 18;
var cellHeight = 2/canvasHeight;
var cellWidth = 2/canvasWidth;
var hWallHeight = cellHeight/8;
var vWallWidth = cellWidth/8;
var hbOffset = cellHeight-hWallHeight;
var vrOffset = cellWidth-vWallWidth;
var dividerWidth;

// Current level
var currentLevel = 1;

// Object Cell Coordinate Arrays
var holes;
var goals;
var htWalls;
var hbWalls;
var vlWalls;
var vrWalls;
var blocks;
var divider;

// Object Vertex Arrays
var vertices;
var holeVertices;
var goalVertices;
var wallVertices;
var blockVertices;
var shapeVertices;

// Vertex Buffer and Offsets
var vertexBuffer;
var goalOffset;
var wallOffset;
var blockOffset;
var dividerOffset;

// Object colors
var holeColor;
var goalColor;
var wallColor;
var xBlockColor = vec4(0.00, 0.07, 0.48, 1.0);
var oBlockColor = vec4(0.59, 0.02, 0.03, 1.0);
var xColor = vec4(0.00, 0.04, 0.29, 1.0);
var oColor = vec4(0.37, 0.01, 0.02, 1.0);
var dividerColor = vec4(1.0, 1.0, 1.0, 1.0);

// Block Movespeed and Offsets
var moveSpeed = 1;
var speed = 8;
var moveVspeed = cellHeight/speed;
var moveHspeed = cellWidth/speed;
var block_X_xOffset = 0.0;
var block_X_yOffset = 0.0;
var block_O_xOffset = 0.0;
var block_O_yOffset = 0.0;
var now;
var elapsed;
var then = Date.now();

var xMoving = false;
var oMoving = false;
var youWin = false;

// Block Movement Limits
var block_X_up_limit;
var block_X_down_limit;
var block_X_left_limit;
var block_X_right_limit;
var block_O_up_limit;
var block_O_down_limit;
var block_O_left_limit;
var block_O_right_limit;


window.onload = function init() {
	// Set up canvas
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
		alert("WebGL isn't available");
	}

    //  Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    //  Load shaders and initialize attribute buffers
    var program = initShaders(gl, "shaders/v-shader.glsl", "shaders/f-shader.glsl");
    gl.useProgram(program);
	
	// Initialize level one items
	levelOne();
	
	// Calculate vertex data
	calculateVertices();
	
    // Load the data into the GPU	
	vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

	// Associate out shader variables with data buffer
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
	
	blockLoc = gl.getUniformLocation(program, "offset");
	colorLoc = gl.getUniformLocation(program, "color");
	
	// Initialize event handlers	
	document.addEventListener('keydown', function(event) {
		if (event.keyCode === 38) {
			xMoving = true;
			oMoving = true;
			while (xMoving || oMoving) {
				moveUp();
				checkHoles();
				if (!xMoving && !oMoving)
					checkGoals();
			}
		}
		else if (event.keyCode === 40) {
			xMoving = true;
			oMoving = true;
			
			while (xMoving || oMoving) {
				moveDown();
				checkHoles();
				if (!xMoving && !oMoving) {
					checkGoals();
				}
			}
		}
		else if (event.keyCode === 37) {
			xMoving = true;
			oMoving = true;
			while (xMoving || oMoving) {
				moveLeft();
				checkHoles();
				if (!xMoving && !oMoving)
					checkGoals();
			}
		}
		else if (event.keyCode === 39) {
			xMoving = true;
			oMoving = true;
			while (xMoving || oMoving) {
				moveRight();
				checkHoles();
				if (!xMoving && !oMoving)
					checkGoals();
			}
		}
		else if (event.keyCode === 32) {		// reset current level
			setLevel(currentLevel);
		}
		else if (event.keyCode === 65) {		// replay previous level
			console.log(currentLevel);
			if (currentLevel > 1) {
				setLevel(currentLevel-1);
			}
		}
	});
	
    render();
};

// Initialize Level One
function levelOne() {
	// Reset coordinate arrays
	holes = [];
	goals = [];
	htWalls = [];
	hbWalls = [];
	vlWalls = [];
	vrWalls = [];
	blocks = [];
	
	// Reset offsets
	block_X_xOffset = 0.0;
	block_X_yOffset = 0.0;
	block_O_xOffset = 0.0;
	block_O_yOffset = 0.0;

	// Set colors
	gl.clearColor(0.28, 0.22, 0.40, 1.0);
	holeColor = vec4(0.03, 0.00, 0.15, 1.0);
	goalColor = vec4(0.08, 0.02, 0.20, 1.0);
	wallColor = vec4(0.59, 0.59, 0.65, 1.0);
	goalMarkColor = vec4(0.18, 0.12, 0.30, 1.0);
	
	// Set movement limits
	block_X_up_limit = 4 * cellHeight;
	block_X_down_limit = -3 * cellHeight;
	block_X_left_limit = -3 * cellWidth;
	block_X_right_limit = 4 * cellWidth;
	
	block_O_up_limit = 5 * cellHeight;
	block_O_down_limit = -2 * cellHeight;
	block_O_left_limit = -1 * cellWidth;
	block_O_right_limit = 6 * cellWidth;
	
	// Hole coordinates
	holes.push(cellToWebGL(1, 6));
	holes.push(cellToWebGL(11, 1));			// B
	
	// Goal coordinates
	goals.push(cellToWebGL(0, 1));
	goals.push(cellToWebGL(10, 0));			// B
	
	// Horizontal top wall coordinates
	htWalls.push(cellToWebGL(2, 2));
	htWalls.push(cellToWebGL(3, 7));
	
	// Horizontal bottom wall coordinates
	hbWalls.push(cellToWebGL(7, 0));
	hbWalls.push(cellToWebGL(14, 1));		// B
	hbWalls.push(cellToWebGL(17, 2));
	hbWalls.push(cellToWebGL(10, 3));			
	hbWalls.push(cellToWebGL(10, 6));
	
	// Vertical left wall coordinates
	vlWalls.push(cellToWebGL(4, 4));
	vlWalls.push(cellToWebGL(15, 7));		// B
	
	// Vertical right wall coordinates
	vrWalls.push(cellToWebGL(6, 6));
	
	// Block coordinates		
	blocks.push(cellToWebGL(3, 4));
	blocks.push(cellToWebGL(11, 5));		// B
	
	// Divider coordinates
	dividerWidth = 2;
	divider = cellToWebGL(canvasWidth/2-dividerWidth/2, 0);
}

// Initialize Level Two
function levelTwo() {
	document.getElementById('Level').innerHTML = '<b>Level 2: Two Blocks One Stage</b>';
	
	// Reset coordinate arrays
	blocks = [];
	htWalls = [];
	hbWalls = [];
	vlWalls = [];
	vrWalls = [];
	holes = [];
	goals = [];
	
	// Reset offsets
	block_X_xOffset = 0.0;
	block_X_yOffset = 0.0;
	block_O_xOffset = 0.0;
	block_O_yOffset = 0.0;
	
	// Set colors
	gl.clearColor(0.19, 0.31, 0.25, 1.0);
	holeColor = vec4(0.00, 0.06, 0.00, 1.0);
	goalColor = vec4(0.00, 0.11, 0.05, 1.0);
	wallColor = vec4(0.40, 0.83, 0.41, 1.0);
	goalMarkColor = vec4(0.09, 0.21, 0.15, 1.0);
	
	// Set movement limits
	block_X_up_limit = 0 * cellHeight;
	block_X_down_limit = -7 * cellHeight;
	block_X_left_limit = 0 * cellWidth;
	block_X_right_limit = 17 * cellWidth;
	
	block_O_up_limit = 1 * cellHeight;
	block_O_down_limit = -6 * cellHeight;
	block_O_left_limit = 0 * cellWidth;
	block_O_right_limit = 17 * cellWidth;
	
	// Hole coordinates
	// holes.push(cellToWebGL(2, 4));
	holes.push(cellToWebGL(-100, -100));
	holes.push(cellToWebGL(-100, -100));
	
	// Goal coordinates
	goals.push(cellToWebGL(17, 7));
	goals.push(cellToWebGL(17, 6));
	
	// Horizontal top wall coordinates
	// none
	
	// Horizontal bottom wall coordinates
	// none
	
	// Vertical left wall coordinates
	vlWalls.push(cellToWebGL(8, 0));
	vlWalls.push(cellToWebGL(8, 4));
	vlWalls.push(cellToWebGL(8, 5));
	vlWalls.push(cellToWebGL(17, 5));
	
	// Vertical right wall coordinates
	vrWalls.push(cellToWebGL(0, 4));
	vrWalls.push(cellToWebGL(6, 6));
	vrWalls.push(cellToWebGL(13, 2));
	vrWalls.push(cellToWebGL(13, 3));
	
	// Vertical left wall coordinates
	// vlWalls.push(cellToWebGL(-100, -100));
	vlWalls.push(cellToWebGL(-100, -100));
	vlWalls.push(cellToWebGL(-100, -100));
	
	// Block coordinates		
	blocks.push(cellToWebGL(0, 0));
	blocks.push(cellToWebGL(0, 1));
	
	// Divider coordinates
	dividerWidth = 0;
	divider = cellToWebGL(canvasWidth/2-dividerWidth/2, 0);
}

// Initialize Level Three
function levelThree() {
	document.getElementById('Level').innerHTML = '<b>Level 3: Three\'s Company</b>';
	
	// Reset coordinate arrays
	blocks = [];
	htWalls = [];
	hbWalls = [];
	vlWalls = [];
	vrWalls = [];
	holes = [];
	goals = [];
	
	// Reset offsets
	block_X_xOffset = 0.0;
	block_X_yOffset = 0.0;
	block_O_xOffset = 0.0;
	block_O_yOffset = 0.0;
	
	// Set colors
	gl.clearColor(0.34, 0.13, 0.14, 1.0);
	holeColor = vec4(0.05, 0.0, 0.0, 1.0);
	goalColor = vec4(0.10, 0.0, 0.0, 1.0);
	wallColor = vec4(0.89, 0.79, 0.21, 1.0);
	goalMarkColor = vec4(0.24, 0.03, 0.04, 1.0);
	
	// Set movement limits
	block_X_up_limit = 0 * cellHeight;
	block_X_down_limit = -7 * cellHeight;
	block_X_left_limit = 0 * cellWidth;
	block_X_right_limit = 17 * cellWidth;
	
	block_O_up_limit = 1 * cellHeight;
	block_O_down_limit = -6 * cellHeight;
	block_O_left_limit = 0 * cellWidth;
	block_O_right_limit = 17 * cellWidth;
	
	// Hole coordinates
	holes.push(cellToWebGL(2, 4));
	holes.push(cellToWebGL(-100, -100));
	
	// Goal coordinates
	goals.push(cellToWebGL(17, 7));
	goals.push(cellToWebGL(17, 6));
	
	// Horizontal top wall coordinates
	// none
	
	// Horizontal bottom wall coordinates
	// none
	
	// Vertical left wall coordinates
	vlWalls.push(cellToWebGL(8, 0));
	vlWalls.push(cellToWebGL(8, 5));
	vlWalls.push(cellToWebGL(17, 5));
	
	// Vertical right wall coordinates
	vrWalls.push(cellToWebGL(0, 4));
	vrWalls.push(cellToWebGL(6, 6));
	vrWalls.push(cellToWebGL(13, 2));
	vrWalls.push(cellToWebGL(13, 3));
	
	// Vertical left wall coordinates
	vlWalls.push(cellToWebGL(-100, -100));
	vlWalls.push(cellToWebGL(-100, -100));
	vlWalls.push(cellToWebGL(-100, -100));
	
	// Block coordinates		
	blocks.push(cellToWebGL(0, 0));
	blocks.push(cellToWebGL(0, 1));
	
	// Divider coordinates
	dividerWidth = 0;
	divider = cellToWebGL(canvasWidth/2-dividerWidth/2, 0);
}

// Converts Cell Coordinates to WebGL Coordinates
function cellToWebGL(x, y) {
	var WebGL_x = -1 + x * cellWidth;
	var WebGL_y = 1 - y * cellHeight;
	
	return vec2(WebGL_x, WebGL_y);
}

// Calculate Object Vertices
function calculateVertices() {
	vertices = [];
	holeVertices = [];
	goalVertices = [];
	wallVertices = [];
	blockVertices = [];
	shapeVertices = []
	
	calculateHoles();
	calculateHoleBottoms();
	calculateGoals();
	calculateGoalMarks();
	calculateHTWalls();
	calculateHBWalls();
	calculateVLWalls();
	calculateVRWalls();
	calculateBlocks();
	calculateBlockMarks();
	calculateDivider();
}

// Calculate Vertex Data for Holes
function calculateHoles() {	
	holeBottomOffset = 0;
	
	for (var i = 0; i < holes.length; i++) {
		vertices.push(vec3(holes[i], 0.0));
		vertices.push(vec3(holes[i][0], holes[i][1]-cellHeight, 0.0));
		vertices.push(vec3(holes[i][0]+cellWidth, holes[i][1], 0.0));
		vertices.push(vec3(holes[i][0]+cellWidth, holes[i][1]-cellHeight, 0.0));
		
		holeVertices.push(vec3(holes[i], 0.0));
		holeVertices.push(vec3(holes[i][0], holes[i][1]-cellHeight, 0.0));
		holeVertices.push(vec3(holes[i][0]+cellWidth, holes[i][1], 0.0));
		holeVertices.push(vec3(holes[i][0]+cellWidth, holes[i][1]-cellHeight, 0.0));
		holeBottomOffset += 4;
	}
}

// Calculate Vertex Data for Hole Bottoms
function calculateHoleBottoms() {	
	goalOffset = holeBottomOffset;
	
	for (var i = 0; i < holes.length; i++) {
		vertices.push(vec3(holes[i][0] + cellWidth/6, holes[i][1] - cellHeight/6, 0.0));
		vertices.push(vec3(holes[i][0] + cellWidth/6, holes[i][1] - cellHeight + cellHeight/6, 0.0));
		vertices.push(vec3(holes[i][0] + cellWidth - cellWidth/6, holes[i][1] - cellHeight/6, 0.0));
		vertices.push(vec3(holes[i][0] + cellWidth - cellWidth/6, holes[i][1] - cellHeight + cellHeight/6, 0.0));
		goalOffset += 4;
	}
}

// Calculate Vertex Data for Goals
function calculateGoals() {
	goalMarkOffset = goalOffset;
	
	for (var i = 0; i < goals.length; i++) {
		vertices.push(vec3(goals[i], 0.0));
		vertices.push(vec3(goals[i][0], goals[i][1]-cellHeight, 0.0));
		vertices.push(vec3(goals[i][0]+cellWidth, goals[i][1], 0.0));
		vertices.push(vec3(goals[i][0]+cellWidth, goals[i][1]-cellHeight, 0.0));
		
		goalVertices.push(vec3(goals[i], 0.0));
		goalVertices.push(vec3(goals[i][0], goals[i][1]-cellHeight, 0.0));
		goalVertices.push(vec3(goals[i][0]+cellWidth, goals[i][1], 0.0));
		goalVertices.push(vec3(goals[i][0]+cellWidth, goals[i][1]-cellHeight, 0.0));
		goalMarkOffset += 4;
	}
}

// Calculate Vertex Data for Goal Markers
function calculateGoalMarks() {
	wallOffset = goalMarkOffset + 730;
	
	// X
	vertices.push(vec3(goalVertices[0][0] + cellWidth/6 - cellWidth/12, goalVertices[0][1] - cellHeight/6 - cellWidth/12, 0.0));
	vertices.push(vec3(goalVertices[0][0] + cellWidth/6 + cellWidth/12, goalVertices[0][1] - cellHeight/6 + cellWidth/12, 0.0));
	vertices.push(vec3(goalVertices[3][0] - cellWidth/6 - cellWidth/12, goalVertices[3][1] + cellHeight/6 - cellWidth/12, 0.0));
	vertices.push(vec3(goalVertices[3][0] - cellWidth/6 + cellWidth/12, goalVertices[3][1] + cellHeight/6 + cellWidth/12, 0.0));
	vertices.push(vec3(goalVertices[1][0] + cellWidth/6 - cellWidth/12, goalVertices[1][1] + cellHeight/6 + cellWidth/12, 0.0));
	vertices.push(vec3(goalVertices[1][0] + cellWidth/6 + cellWidth/12, goalVertices[1][1] + cellHeight/6 - cellWidth/12, 0.0));
	vertices.push(vec3(goalVertices[2][0] - cellWidth/6 - cellWidth/12, goalVertices[2][1] - cellHeight/6 + cellWidth/12, 0.0));
	vertices.push(vec3(goalVertices[2][0] - cellWidth/6 + cellWidth/12, goalVertices[2][1] - cellHeight/6 - cellWidth/12, 0.0));
	
	// O
	var centerX = goalVertices[4][0] + cellWidth/2;
	var centerY = goalVertices[4][1] - cellHeight/2;
	for (var i = 0; i < 2*Math.PI; i += Math.PI/180) {
		vertices.push(vec3(centerX + Math.cos(i) * cellWidth*5/12, centerY + Math.sin(i) * cellHeight*5/12, 0.0));
	}
	for (var i = 0; i < 2*Math.PI; i += Math.PI/180) {
		vertices.push(vec3(centerX + Math.cos(i) * cellWidth*3.5/12, centerY + Math.sin(i) * cellHeight*3.5/12, 0.0));
	}
}

// Calculate Vertex Data for Horizontal Top Walls
function calculateHTWalls() {	
	blockOffset = wallOffset;
	
	for (var i = 0; i < htWalls.length; i++) {
		vertices.push(vec3(htWalls[i], 0.0));
		vertices.push(vec3(htWalls[i][0], htWalls[i][1]-hWallHeight, 0.0));
		vertices.push(vec3(htWalls[i][0]+cellWidth, htWalls[i][1], 0.0));
		vertices.push(vec3(htWalls[i][0]+cellWidth, htWalls[i][1]-hWallHeight, 0.0));
		
		wallVertices.push(vec3(htWalls[i], 0.0));
		wallVertices.push(vec3(htWalls[i][0], htWalls[i][1]-hWallHeight, 0.0));
		wallVertices.push(vec3(htWalls[i][0]+cellWidth, htWalls[i][1], 0.0));
		wallVertices.push(vec3(htWalls[i][0]+cellWidth, htWalls[i][1]-hWallHeight, 0.0));
		blockOffset += 4;
	}
}

// Calculate Vertex Data for Horizontal Bottom Walls
function calculateHBWalls() {	
	for (var i = 0; i < hbWalls.length; i++) {
		vertices.push(vec3(hbWalls[i][0], hbWalls[i][1]-hbOffset, 0.0));
		vertices.push(vec3(hbWalls[i][0], hbWalls[i][1]-cellHeight, 0.0));
		vertices.push(vec3(hbWalls[i][0]+cellWidth, hbWalls[i][1]-hbOffset, 0.0));
		vertices.push(vec3(hbWalls[i][0]+cellWidth, hbWalls[i][1]-cellHeight, 0.0));
		
		wallVertices.push(vec3(hbWalls[i][0], hbWalls[i][1]-hbOffset, 0.0));
		wallVertices.push(vec3(hbWalls[i][0], hbWalls[i][1]-cellHeight, 0.0));
		wallVertices.push(vec3(hbWalls[i][0]+cellWidth, hbWalls[i][1]-hbOffset, 0.0));
		wallVertices.push(vec3(hbWalls[i][0]+cellWidth, hbWalls[i][1]-cellHeight, 0.0));
		blockOffset += 4;
	}
}

// Calculate Vertex Data for Vertical Left Walls
function calculateVLWalls() {	
	for (var i = 0; i < vlWalls.length; i++) {
		vertices.push(vec3(vlWalls[i], 0.0));
		vertices.push(vec3(vlWalls[i][0], vlWalls[i][1]-cellHeight, 0.0));
		vertices.push(vec3(vlWalls[i][0]+vWallWidth, vlWalls[i][1], 0.0));
		vertices.push(vec3(vlWalls[i][0]+vWallWidth, vlWalls[i][1]-cellHeight, 0.0));
		
		wallVertices.push(vec3(vlWalls[i], 0.0));
		wallVertices.push(vec3(vlWalls[i][0], vlWalls[i][1]-cellHeight, 0.0));
		wallVertices.push(vec3(vlWalls[i][0]+vWallWidth, vlWalls[i][1], 0.0));
		wallVertices.push(vec3(vlWalls[i][0]+vWallWidth, vlWalls[i][1]-cellHeight, 0.0));
		blockOffset += 4;
	}
}

// Calculate Vertex Data for Vertical Right Walls
function calculateVRWalls() {	
	for (var i = 0; i < vrWalls.length; i++) {
		vertices.push(vec3(vrWalls[i][0]+vrOffset, vrWalls[i][1], 0.0));
		vertices.push(vec3(vrWalls[i][0]+vrOffset, vrWalls[i][1]-cellHeight, 0.0));
		vertices.push(vec3(vrWalls[i][0]+cellWidth, vrWalls[i][1], 0.0));
		vertices.push(vec3(vrWalls[i][0]+cellWidth, vrWalls[i][1]-cellHeight, 0.0));
		
		wallVertices.push(vec3(vrWalls[i][0]+vrOffset, vrWalls[i][1], 0.0));
		wallVertices.push(vec3(vrWalls[i][0]+vrOffset, vrWalls[i][1]-cellHeight, 0.0));
		wallVertices.push(vec3(vrWalls[i][0]+cellWidth, vrWalls[i][1], 0.0));
		wallVertices.push(vec3(vrWalls[i][0]+cellWidth, vrWalls[i][1]-cellHeight, 0.0));
		blockOffset += 4;
	}
}

// Calculate Vertex Data for Blocks
function calculateBlocks() {
	blockMarkOffset = blockOffset;
	
	for (var i = 0; i < blocks.length; i++) {
		vertices.push(vec3(blocks[i], 0.0));
		vertices.push(vec3(blocks[i][0], blocks[i][1]-cellHeight, 0.0));
		vertices.push(vec3(blocks[i][0]+cellWidth, blocks[i][1], 0.0));
		vertices.push(vec3(blocks[i][0]+cellWidth, blocks[i][1]-cellHeight, 0.0));
		
		blockVertices.push(vec3(blocks[i], 0.0));
		blockVertices.push(vec3(blocks[i][0], blocks[i][1]-cellHeight, 0.0));
		blockVertices.push(vec3(blocks[i][0]+cellWidth, blocks[i][1], 0.0));
		blockVertices.push(vec3(blocks[i][0]+cellWidth, blocks[i][1]-cellHeight, 0.0));
		blockMarkOffset += 4;
	}
}

// Calculate Vertex Data for Block Markers
function calculateBlockMarks() {
	dividerOffset = blockMarkOffset + 730;
	
	// X
	vertices.push(vec3(blockVertices[0][0] + cellWidth/6 - cellWidth/12, blockVertices[0][1] - cellHeight/6 - cellWidth/12, 0.0));
	vertices.push(vec3(blockVertices[0][0] + cellWidth/6 + cellWidth/12, blockVertices[0][1] - cellHeight/6 + cellWidth/12, 0.0));
	vertices.push(vec3(blockVertices[3][0] - cellWidth/6 - cellWidth/12, blockVertices[3][1] + cellHeight/6 - cellWidth/12, 0.0));
	vertices.push(vec3(blockVertices[3][0] - cellWidth/6 + cellWidth/12, blockVertices[3][1] + cellHeight/6 + cellWidth/12, 0.0));
	vertices.push(vec3(blockVertices[1][0] + cellWidth/6 - cellWidth/12, blockVertices[1][1] + cellHeight/6 + cellWidth/12, 0.0));
	vertices.push(vec3(blockVertices[1][0] + cellWidth/6 + cellWidth/12, blockVertices[1][1] + cellHeight/6 - cellWidth/12, 0.0));
	vertices.push(vec3(blockVertices[2][0] - cellWidth/6 - cellWidth/12, blockVertices[2][1] - cellHeight/6 + cellWidth/12, 0.0));
	vertices.push(vec3(blockVertices[2][0] - cellWidth/6 + cellWidth/12, blockVertices[2][1] - cellHeight/6 - cellWidth/12, 0.0));
	
	// O
	var centerX = blockVertices[4][0] + cellWidth/2;
	var centerY = blockVertices[4][1] - cellHeight/2;
	for (var i = 0; i < 2*Math.PI; i += Math.PI/180) {
		vertices.push(vec3(centerX + Math.cos(i) * cellWidth*5/12, centerY + Math.sin(i) * cellHeight*5/12, 0.0));
	}
	for (var i = 0; i < 2*Math.PI; i += Math.PI/180) {
		vertices.push(vec3(centerX + Math.cos(i) * cellWidth*3.5/12, centerY + Math.sin(i) * cellHeight*3.5/12, 0.0));
	}
}

// Calculate Vertex Data for Divider
function calculateDivider() {
	vertices.push(vec3(divider, 0.0));
	vertices.push(vec3(divider[0], -1));
	vertices.push(vec3(divider[0]+dividerWidth*cellWidth, 1));
	vertices.push(vec3(divider[0]+dividerWidth*cellWidth, -1));
}

// Move Blocks Up
function moveUp() {
	if (xMoving) {
		if (wallCollisionX("up")){
			playSFX("move");
			xMoving = false;
		}
		else {
			if (block_X_yOffset + moveVspeed <= block_X_up_limit)
				block_X_yOffset += moveVspeed;
			else {
				block_X_yOffset = block_X_up_limit;
				playSFX("move");
				xMoving = false;
			}
		}
	}
	
	if (oMoving) {
		if (wallCollisionO("up")){
			playSFX("move");
			oMoving = false;
		}
		else{
			if (block_O_yOffset + moveVspeed <= block_O_up_limit)
				block_O_yOffset += moveVspeed;
			else {
				block_O_yOffset = block_O_up_limit;
				playSFX("move");
				oMoving = false;
			}
		}
	}
}

// Move Blocks Down
function moveDown() {
	if (xMoving) {
		if (wallCollisionX("down") || blockCollisionX("down")){
			playSFX("move");
			xMoving = false;
		}
		else {
			if (block_X_yOffset - moveVspeed >= block_X_down_limit)
				block_X_yOffset -= moveVspeed;
			else {
				block_X_yOffset = block_X_down_limit;
				playSFX("move");
				xMoving = false;
			}
		}
	}
	
	if (oMoving) {
		if (wallCollisionO("down") || blockCollisionO("down")){
			playSFX("move");
			oMoving = false;
		}
		else{
			if (block_O_yOffset - moveVspeed >= block_O_down_limit)
				block_O_yOffset -= moveVspeed;
			else {
				block_O_yOffset = block_O_down_limit;
				playSFX("move");
				oMoving = false;
			}
		}
	}
}

// Move Blocks Left
function moveLeft() {
	if (xMoving) {
		if (wallCollisionX("left") || blockCollisionX("left")){
			playSFX("move");
			xMoving = false;
		}
		else {
			if (block_X_xOffset - moveHspeed >= block_X_left_limit)
				block_X_xOffset -= moveHspeed;
			else {
				block_X_xOffset = block_X_left_limit;
				playSFX("move");
				xMoving = false;
			}
		}
	}
	
	if (oMoving) {
		if (wallCollisionO("left") || blockCollisionO("left")){
			playSFX("move");
			oMoving = false;
		}
		else{
			if (block_O_xOffset - moveHspeed >= block_O_left_limit)
				block_O_xOffset -= moveHspeed;
			else {
				block_O_xOffset = block_O_left_limit;
				playSFX("move");
				oMoving = false;
			}
		}
	}
}

// Move Blocks Right
function moveRight() {
	if (xMoving) {
		if (wallCollisionX("right")){
			playSFX("move");
			xMoving = false;
		}
		else {
			if (block_X_xOffset + moveHspeed <= block_X_right_limit)
				block_X_xOffset += moveHspeed;
			else {
				block_X_xOffset = block_X_right_limit;
				playSFX("move");
				xMoving = false;
			}
		}
	}
	
	if (oMoving) {
		if (wallCollisionO("right")){
			playSFX("move");
			oMoving = false;
		}
		else{
			if (block_O_xOffset + moveHspeed <= block_O_right_limit)
				block_O_xOffset += moveHspeed;
			else {
				block_O_xOffset = block_O_right_limit;
				playSFX("move");
				oMoving = false;
			}
		}
	}
}

// Check For X Block Collisions With Other Blocks
function blockCollisionX(direction) {
	if (oMoving)
		return false;
	
	switch (direction) {
		case "up":
			if ((blockVertices[0][0] + block_X_xOffset).toFixed(3) == (blockVertices[4][0] + block_O_xOffset).toFixed(3)) {
				if ((blockVertices[0][1] + block_X_yOffset).toFixed(3) == (blockVertices[4][1] + block_O_yOffset - cellHeight).toFixed(3) && !oMoving)
						return true;
			}
			return false;
		case "down":
			if ((blockVertices[0][0] + block_X_xOffset).toFixed(3) == (blockVertices[4][0] + block_O_xOffset).toFixed(3)) {
				if ((blockVertices[0][1] + block_X_yOffset).toFixed(3) == (blockVertices[4][1] + block_O_yOffset + cellHeight).toFixed(3) && !oMoving)
						return true;
			}
			return false;
		case "left":
			if ((blockVertices[0][1] + block_X_yOffset).toFixed(3) == (blockVertices[4][1] + block_O_yOffset).toFixed(3)) {
				if ((blockVertices[0][0] + block_X_xOffset).toFixed(3) == (blockVertices[4][0] + block_O_xOffset + cellWidth).toFixed(3) && !oMoving)
						return true;
			}
			return false;
		case "right":
			if ((blockVertices[0][1] + block_X_yOffset).toFixed(3) == (blockVertices[4][1] + block_O_yOffset).toFixed(3)) {
				if ((blockVertices[0][0] + block_X_xOffset).toFixed(3) == (blockVertices[4][0] + block_O_xOffset - cellWidth).toFixed(3) && !oMoving)
						return true;
			}
			return false;
	}
}

// Check For O Block Collisions With Other Blocks
function blockCollisionO(direction) {
	if (xMoving)
		return false;
	
	switch (direction) {
		case "up":
			if ((blockVertices[4][0] + block_O_xOffset).toFixed(3) == (blockVertices[0][0] + block_X_xOffset).toFixed(3)) {
				if ((blockVertices[4][1] + block_O_yOffset).toFixed(3) == (blockVertices[0][1] + block_X_yOffset - cellHeight).toFixed(3) && !xMoving)
						return true;
			}
			return false;
		case "down":
			if ((blockVertices[4][0] + block_O_xOffset).toFixed(3) == (blockVertices[0][0] + block_X_xOffset).toFixed(3)) {
				if ((blockVertices[4][1] + block_O_yOffset).toFixed(3) == (blockVertices[0][1] + block_X_yOffset + cellHeight).toFixed(3) && !xMoving)
						return true;
			}
			return false;
		case "left":
			if ((blockVertices[4][1] + block_O_yOffset).toFixed(3) == (blockVertices[0][1] + block_X_yOffset).toFixed(3)) {
				if ((blockVertices[4][0] + block_O_xOffset).toFixed(3) == (blockVertices[0][0] + block_X_xOffset + cellWidth).toFixed(3) && !xMoving)
					return true;
			}
			return false;
		case "right":
			if ((blockVertices[4][1] + block_O_yOffset).toFixed(3) == (blockVertices[0][1] + block_X_yOffset).toFixed(3)) {
				if ((blockVertices[4][0] + block_O_xOffset).toFixed(3) == (blockVertices[0][0] + block_X_xOffset - cellWidth).toFixed(3) && !xMoving)
					return true;
			}
			return false;
	}
}

// Check for X Block Collisions With Walls
function wallCollisionX(direction) {
	switch (direction) {
		case "up":
			for (var i = 0; i < wallVertices.length; i+=4){
				if ((blockVertices[0][0] + block_X_xOffset).toFixed(3) == (wallVertices[i][0]).toFixed(3)) {
					if ((blockVertices[0][1] + block_X_yOffset).toFixed(3) == (wallVertices[i][1] - hWallHeight).toFixed(3)) {
						return true;
					}
					if ((blockVertices[0][1] + block_X_yOffset).toFixed(3) == (wallVertices[i][1] - cellHeight).toFixed(3)) {
						if ((blockVertices[2][0] + block_X_xOffset).toFixed(3) == (wallVertices[i+2][0] + cellWidth - vWallWidth).toFixed(3)) {
							return true;
						}
					}
				}
				if ((blockVertices[0][0] + block_X_xOffset).toFixed(3) == (wallVertices[i][0] - vrOffset).toFixed(3)) {
					if ((blockVertices[0][1] + block_X_yOffset).toFixed(3) == (wallVertices[i][1] - cellHeight).toFixed(3)) {
						return true;
					}
				}
			}
			return false;
		case "down":
			for (var i = 0; i < wallVertices.length; i+=4){
				if ((blockVertices[0][0] + block_X_xOffset).toFixed(3) == (wallVertices[i][0]).toFixed(3)) {
					if ((blockVertices[0][1] + block_X_yOffset).toFixed(3) == (wallVertices[i][1] + cellHeight).toFixed(3)) {
						return true;
					}
				}
				if ((blockVertices[0][0] + block_X_xOffset).toFixed(3) == (wallVertices[i][0] - vrOffset).toFixed(3)) {
					if ((blockVertices[0][1] + block_X_yOffset).toFixed(3) == (wallVertices[i][1] + cellHeight).toFixed(3)) {
						return true;
					}
				}
			}
			return false;
		case "left":
			for (var i = 0; i < wallVertices.length; i+=4){
				if ((blockVertices[0][1] + block_X_yOffset).toFixed(3) == (wallVertices[i][1]).toFixed(3)) {
					if ((blockVertices[0][0] + block_X_xOffset).toFixed(3) == (wallVertices[i][0] + vWallWidth).toFixed(3)) {
						return true;
					}
					if ((blockVertices[0][0] + block_X_xOffset).toFixed(3) == (wallVertices[i][0] + cellWidth).toFixed(3)) {
						if ((blockVertices[2][0] + block_X_xOffset).toFixed(3) == (wallVertices[i+2][0] + cellWidth).toFixed(3)) {
							return true;
						}
					}
				}
				if ((blockVertices[0][1] + block_X_yOffset).toFixed(3) == (wallVertices[i][1] + hbOffset).toFixed(3)) {
					if ((blockVertices[0][0] + block_X_xOffset).toFixed(3) == (wallVertices[i][0] + cellWidth).toFixed(3)) {
						return true;
					}
				}
			}
			return false;
		case "right":
			for (var i = 0; i < wallVertices.length; i+=4){
				if ((blockVertices[0][0] + block_X_xOffset).toFixed(3) == (wallVertices[i][0] - cellWidth).toFixed(3)) {
					if ((blockVertices[0][1] + block_X_yOffset).toFixed(3) == (wallVertices[i][1]).toFixed(3)) {
						return true;
					}
				}
				if ((blockVertices[0][0] + block_X_xOffset).toFixed(3) == (wallVertices[i][0] - cellWidth).toFixed(3)) {
					if ((blockVertices[0][1] + block_X_yOffset).toFixed(3) == (wallVertices[i][1] + hbOffset).toFixed(3)) {
						return true;
					}
				}
			}
			return false;
	}
}

// Check for O Block Collisions With Walls
function wallCollisionO(direction) {
	switch (direction) {
		case "up":
			for (var i = 0; i < wallVertices.length; i+=4){
				if ((blockVertices[4][0] + block_O_xOffset).toFixed(3) == (wallVertices[i][0]).toFixed(3)) {
					if ((blockVertices[4][1] + block_O_yOffset).toFixed(3) == (wallVertices[i][1] - hWallHeight).toFixed(3)) {
						return true;
					}
					if ((blockVertices[4][1] + block_O_yOffset).toFixed(3) == (wallVertices[i][1] - cellHeight).toFixed(3)) {
						if ((blockVertices[6][0] + block_O_xOffset).toFixed(3) == (wallVertices[i+2][0] + cellWidth - vWallWidth).toFixed(3)) {
							return true;
						}
					}
				}
				if ((blockVertices[4][0] + block_O_xOffset).toFixed(3) == (wallVertices[i][0] - vrOffset).toFixed(3)) {
					if ((blockVertices[4][1] + block_O_yOffset).toFixed(3) == (wallVertices[i][1] - cellHeight).toFixed(3)) {
						return true;
					}
				}
			}
			return false;
		case "down":
			for (var i = 0; i < wallVertices.length; i+=4){
				if ((blockVertices[4][0] + block_O_xOffset).toFixed(3) == (wallVertices[i][0]).toFixed(3)) {
					if ((blockVertices[4][1] + block_O_yOffset).toFixed(3) == (wallVertices[i][1] + cellHeight).toFixed(3)) {
						return true;
					}
				}
				if ((blockVertices[4][0] + block_O_xOffset).toFixed(3) == (wallVertices[i][0] - vrOffset).toFixed(3)) {
					if ((blockVertices[4][1] + block_O_yOffset).toFixed(3) == (wallVertices[i][1] + cellHeight).toFixed(3)) {
						return true;
					}
				}
			}
			return false;
		case "left":
			for (var i = 0; i < wallVertices.length; i+=4){
				if ((blockVertices[4][1] + block_O_yOffset).toFixed(3) == (wallVertices[i][1]).toFixed(3)) {
					if ((blockVertices[4][0] + block_O_xOffset).toFixed(3) == (wallVertices[i][0] + vWallWidth).toFixed(3)) {
						return true;
					}
					if ((blockVertices[4][0] + block_O_xOffset).toFixed(3) == (wallVertices[i][0] + cellWidth).toFixed(3)) {
						if ((blockVertices[6][0] + block_O_xOffset).toFixed(3) == (wallVertices[i+2][0] + cellWidth).toFixed(3)) {
							return true;
						}
					}
				}
				if ((blockVertices[4][1] + block_O_yOffset).toFixed(3) == (wallVertices[i][1] + hbOffset).toFixed(3)) {
					if ((blockVertices[4][0] + block_O_xOffset).toFixed(3) == (wallVertices[i][0] + cellWidth).toFixed(3)) {
						return true;
					}
				}
			}
			return false;
		case "right":
			for (var i = 0; i < wallVertices.length; i+=4){
				if ((blockVertices[4][0] + block_O_xOffset).toFixed(3) == (wallVertices[i][0] - cellWidth).toFixed(3)) {
					if ((blockVertices[4][1] + block_O_yOffset).toFixed(3) == (wallVertices[i][1]).toFixed(3)) {
						return true;
					}
				}
				if ((blockVertices[4][0] + block_O_xOffset).toFixed(3) == (wallVertices[i][0] - cellWidth).toFixed(3)) {
					if ((blockVertices[4][1] + block_O_yOffset).toFixed(3) == (wallVertices[i][1] + hbOffset).toFixed(3)) {
						return true;
					}
				}
			}
	}
}

// Check If Any Block Is In A Hole
function checkHoles() {
	for (var i = 0; i < holeVertices.length; i+=4) {		
		if ((blockVertices[0][0] + block_X_xOffset).toFixed(3) == (holeVertices[i][0]).toFixed(3)) {
			if ((blockVertices[0][1] + block_X_yOffset).toFixed(3) == (holeVertices[i][1]).toFixed(3)) {
				xMoving = false;
				oMoving = false;
				playSFX("hole");
				setLevel(currentLevel);
			}
		}
		
		if ((blockVertices[4][0] + block_O_xOffset).toFixed(3) == (holeVertices[i][0]).toFixed(3)) {
			if ((blockVertices[4][1] + block_O_yOffset).toFixed(3) == (holeVertices[i][1]).toFixed(3)) {
				xMoving = false;
				oMoving = false;
				playSFX("hole");
				setLevel(currentLevel);
			}
		}
	}
}

// Check If All Blocks Are In Respective Goals
function checkGoals() {
	if ((blockVertices[0][0] + block_X_xOffset).toFixed(3) == (goalVertices[0][0]).toFixed(3)) {
		if ((blockVertices[0][1] + block_X_yOffset).toFixed(3) == (goalVertices[0][1]).toFixed(3)) {
			if ((blockVertices[4][0] + block_O_xOffset).toFixed(3) == (goalVertices[4][0]).toFixed(3)) {
				if ((blockVertices[4][1] + block_O_yOffset).toFixed(3) == (goalVertices[4][1]).toFixed(3)) {
					playSFX("victory");
					setLevel(currentLevel + 1);
				}
			}
		}
	}
}

// Set Level Data
function setLevel(level) {	
	if (level == currentLevel) {
		block_X_xOffset = 0.0;
		block_X_yOffset = 0.0;
		block_O_xOffset = 0.0;
		block_O_yOffset = 0.0;
	}
	else {
		currentLevel = level;
		
		if (level == 1)
			levelOne();
		else if (level == 2)
			levelTwo();
		else if (level == 3)
			levelThree();
		else if (level == 4)
			youWin = true;
		
		calculateVertices();
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(vertices));
	}
}

// Play Sound Effect
function playSFX(context) {
	var audio;
	
	switch (context) {
		case "move":
			audio = new Audio('sfx/drop_fork.mp3');
			audio.play();
			break;
		case "hole":
			audio = new Audio('sfx/fall.mp3');
			audio.play();
			break;
		case "victory":
			audio = new Audio("sfx/kids_cheering.mp3");
			audio.play();
			break;
	}
}

// Utility Drawing Function
function drawSquareObjects(low, high) {
	for (var i = low; i < high; i+=4) {
		gl.drawArrays(gl.TRIANGLE_STRIP, i, 4);
	}
}

// Render Function
function render() {		
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.uniform4fv(blockLoc, vec4(0.0, 0.0, 0.0, 0.0));
	
	// Holes
	gl.uniform4fv(colorLoc, holeColor);
	drawSquareObjects(0, holeBottomOffset);
	
	// Hole Bottoms
	gl.uniform4fv(colorLoc, vec4(0.0, 0.0, 0.0, 1.0));
	drawSquareObjects(holeBottomOffset, goalOffset);

	// Goal X
	gl.uniform4fv(colorLoc, goalColor);
	drawSquareObjects(goalOffset, goalOffset+4);
	
	// Goal O
	gl.uniform4fv(colorLoc, goalColor);
	drawSquareObjects(goalOffset+4, goalMarkOffset);
	
	// Goal Marks
	// X
	gl.uniform4fv(colorLoc, goalMarkColor);
	gl.uniform4fv(blockLoc, vec4(0.0, 0.0, 0.0, 0.0));
	drawSquareObjects(goalMarkOffset, goalMarkOffset+4);
	drawSquareObjects(goalMarkOffset+4, goalMarkOffset+8);
	// O
	gl.drawArrays(gl.TRIANGLE_FAN, goalMarkOffset+8, 361);
	gl.uniform4fv(colorLoc, goalColor);
	gl.drawArrays(gl.TRIANGLE_FAN, goalMarkOffset+369, 361);
	
	// Walls
	gl.uniform4fv(colorLoc, wallColor);
	drawSquareObjects(wallOffset, blockOffset);
	
	// X Block
	gl.uniform4fv(colorLoc, xBlockColor);
	gl.uniform4fv(blockLoc, vec4(block_X_xOffset, block_X_yOffset, 0.0, 0.0));
	drawSquareObjects(blockOffset, blockOffset+4);

	// O Block
	gl.uniform4fv(colorLoc, oBlockColor);
	gl.uniform4fv(blockLoc, vec4(block_O_xOffset, block_O_yOffset, 0.0, 0.0));
	drawSquareObjects(blockOffset+4, blockMarkOffset);
	
	// Block Marks
	// X
	gl.uniform4fv(colorLoc, xColor);
	gl.uniform4fv(blockLoc, vec4(block_X_xOffset, block_X_yOffset, 0.0, 0.0));
	drawSquareObjects(blockMarkOffset, blockMarkOffset+4);
	drawSquareObjects(blockMarkOffset+4, blockMarkOffset+8);
	//O
	gl.uniform4fv(colorLoc, oColor);
	gl.uniform4fv(blockLoc, vec4(block_O_xOffset, block_O_yOffset, 0.0, 0.0));
	gl.drawArrays(gl.TRIANGLE_FAN, blockMarkOffset+8, 361);
	gl.uniform4fv(colorLoc, oBlockColor);
	gl.drawArrays(gl.TRIANGLE_FAN, blockMarkOffset+369, 361);
	
	// Divider
	gl.uniform4fv(colorLoc, dividerColor);
	gl.uniform4fv(blockLoc, vec4(0.0, 0.0, 0.0, 0.0));
	gl.drawArrays(gl.TRIANGLE_STRIP, dividerOffset, 4);
	
	requestAnimFrame(render, canvas);
}