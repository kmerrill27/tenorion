/**
 *
 * A playable Tenori-on built for the HTML5 canvas.
 *
 * @author Kim Merrill 
 *
 **/
var switchSize = 25, switchSpace = 5, switchOffset = 35, numSwitches = 16;
var mouseX, mouseY;
var xCoord, yCoord;
var whiteCanvas, rippleCanvas, whiteCtx, rippleCtx;
var canvasSize;
var offColor = "#424559", onColor = "#A9AECC", playColor = "#EDEFFF", strokeColor = "#343854";
var rippleColor = "rgba(237, 239, 255, 0.03)"
var tonePause = 150, ripplePause = 40;
var dragging = false, turningOn = false;
var rippleOffset = 50;
var whiteSwitches = new Array(numSwitches);
var currTones;
var tonesDir = "tones/", tonesExt = ".wav";
var lowTones = ["4C", "4B", "4A", "3G", "3F", "3E", "3D", "3C", "3B", "3A",
	"2G", "2F", "2E", "2D", "2C", "2B"];
var midTones = ["5C", "5B", "5A", "4G", "4F", "4E", "4D", "4C", "4B", "4A",
	"3G", "3F", "3E", "3D", "3C", "3B"];
var highTones = ["6C", "6B", "6A", "5G", "5F", "5E", "5D", "5C", "5B", "5A",
	"4G", "4F", "4E", "4D", "4C", "4B"];

$(document).ready(function() {
	whiteCanvas = $("#whiteCanvas");
	whiteCtx = whiteCanvas[0].getContext("2d");
	whiteCtx.strokeStyle = strokeColor;
	canvasSize = whiteCanvas.width();
	rippleCanvas = $("#rippleCanvas");
	rippleCtx = rippleCanvas[0].getContext("2d");
	rippleCtx.strokeStyle = rippleColor;
	rippleCtx.lineWidth = 20;

	// Draw the Tenori-on
	initBoard();

	// Turn off all notes when the clear button is pressed
	$("#clearButton").mousedown(function() {
		for (var y = 0; y < numSwitches; y++) {
			for (var x = 0; x < numSwitches; x++) {
				turnOff(whiteSwitches[y][x]);
			}
		}
	});

	// If the mouse is pressed, toggle the current switch and set up
	// the current drag
	rippleCanvas.mousedown(function(event) {
			dragging = true;
			coords = getSwitch(event.pageX, event.pageY);

			if (coords != null) {
				var currSwitch = whiteSwitches[coords[1]][coords[0]];
				turningOn = currSwitch.on;
			}	

			trackMouse(event);
			toggle();
	});

	// If the mouse is being dragged, toggle the switches passed over
	rippleCanvas.mousemove(function(event) {
		if (dragging) {
			trackMouse(event);
			toggle();
		}
	});

	// End current drag when mouse is released, even outside of the canvas
	$(document).mouseup(function() {
		dragging = false;
	});

	// Reset all switches so that they can be toggled by the next drag
	rippleCanvas.mouseup(function(event) {
		for (var y = 0; y < numSwitches; y++) {
			for (var x = 0; x < numSwitches; x++) {
				whiteSwitches[y][x].draggedOver = false;
			}
		}
	});
});

// Create Tenori-on, which is a 16x16 grid of LED switches
function initBoard() {
	// Load middle octave tones
	for (var i = 0; i < numSwitches; i++) {
		midTones[i] = new Audio(tonesDir + midTones[i] + tonesExt);
	}
	currTones = midTones;

	for (var y = 0; y < numSwitches; y++) {
		whiteSwitches[y] = new Array(numSwitches);
		for (var x = 0; x < numSwitches; x++) {
			xCoord = switchOffset + switchSize*x + switchSpace*x;
			yCoord = switchOffset + switchSize*y + switchSpace*y;
			drawSwitch(xCoord, yCoord, offColor);
			whiteSwitches[y][x] = new ledSwitch(xCoord, yCoord);
		}
	}

	// Set board to repeatedly play through its columns
	setInterval(function(){playTenorion()}, tonePause*numSwitches);

	// Load other tones later so playback can start with middle octave tones
	for (var i = 0; i < numSwitches; i++) {
		lowTones[i] = new Audio(tonesDir + lowTones[i] + tonesExt);
		highTones[i] = new Audio(tonesDir + highTones[i] + tonesExt);
	}
};

// Turn off the given switch
function turnOff(currSwitch) {
	currSwitch.on = false;
	// Pause before turning off switch to ensure timeout in playSwitch() has passed
	setTimeout(function(){drawSwitch(currSwitch.x, currSwitch.y, offColor)}, 275);
	clearInterval(currSwitch.interval);
	currSwitch.interval = null;
};

// Turn on the given switch
function turnOn(currSwitch) {
	currSwitch.on = true;
	drawSwitch(currSwitch.x, currSwitch.y, onColor);
};

// Turn the switch at the given coordinates on or off if appropriate
function toggle() {
	// Determine on which switch the user clicked
	coords = getSwitch(mouseX, mouseY);

	// If the user clicked on a switch, toggle it on or off
	if (coords != null) {
		row = coords[0];
		col = coords[1];

		var currSwitch = whiteSwitches[col][row];

		// Only toggle each switch once during a single drag
		if (!currSwitch.draggedOver) {
			// If the switch is currently on and the current drag began
			// on a turned-on note, turn the switch off
			if (currSwitch.on && turningOn) {
				turnOff(currSwitch);
			} else if (!currSwitch.on && !turningOn) {
				turnOn(currSwitch);
			}
		}

		currSwitch.draggedOver = true;
		whiteSwitches[col][row] = currSwitch;
	}
};

// Play through the turned-on notes by iterating over the columns
function playTenorion() {
	var pause = 0;
	for (var col = 0; col < numSwitches; col++) {
		nextColumn(col, pause);
		pause = pause + tonePause;
	}
};

// Move to the next column to be played
function nextColumn(col, pause) {
	setTimeout(function(){playColumn(col)}, pause);
};

// Simultaneously play all turned-on switches in the given column
function playColumn(col) {
	for (var row = 0; row < numSwitches; row++) {
		if (whiteSwitches[row][col].on) {
			playSwitch(whiteSwitches[row][col], currTones[row]);
		}
	}
};

// Flash the current switch and play its tone
function playSwitch(currSwitch, tone) {
	drawSwitch(currSwitch.x, currSwitch.y, playColor, 0.5);
	tone.play();
	ripple(currSwitch.x, currSwitch.y, switchSize);
	setTimeout(function(){drawSwitch(currSwitch.x, currSwitch.y, onColor)}, 250);
};

// Draw a switch at the given location
function drawSwitch(xCoord, yCoord, color, offset) {
	// If no offset specified, set it to zero.
	if (offset == null) {
		offset = 0;
	}
	whiteCtx.fillStyle = color;
	whiteCtx.beginPath();
	whiteCtx.clearRect(xCoord-1, yCoord-1, switchSize+2, switchSize+2);
	whiteCtx.arc(xCoord+switchSize/2, yCoord+switchSize/2, switchSize/2 + offset, 0,
		Math.PI*2, true);
	whiteCtx.fill();
	whiteCtx.stroke();
};

// Save x and y coordinates of mouse click
function trackMouse(event) {
	mouseX = event.pageX;
	mouseY = event.pageY;
};

// Create new LED switch
function ledSwitch(xCoord, yCoord) {
	this.x = xCoord;
	this.y = yCoord;
	this.on = false;
	this.interval = null;
	this.draggedOver = false;
};

// Use mouse coordinates to determine on which switch the user clicked
function getSwitch(xCoord, yCoord) {
	// Calculate canvas element offset from top and left of window
	var xOffset = whiteCanvas[0].offsetLeft + whiteCanvas[0].clientLeft +
		whiteCanvas[0].scrollLeft;
	var yOffset = whiteCanvas[0].offsetTop + whiteCanvas[0].clientTop +
		whiteCanvas[0].scrollTop;

	// Estimate of clicked switch's column and row in grid
	xCoord = (xCoord - switchOffset - xOffset) / (switchSize + switchSpace);
	yCoord = (yCoord - switchOffset - yOffset) / (switchSize + switchSpace);
	var col = Math.floor(xCoord);
	var row = Math.floor(yCoord);

	// If user did not click on a switch - i.e. in the gridlines or on the outer
	// border - return null
	if (((xCoord - col) > .9) || ((yCoord - row) > .9) || 
		row > (numSwitches-1) || col > (numSwitches-1) || row < 0 || col < 0) {
		return null;
	} 

	// If user clicked on a switch, return the switch's column and row
	return [col, row];
};


// Draw light rippling out from the given location
function ripple(xCoord, yCoord, size) {
	// Stop drawing ripples when the diameter exceeds 4/5 of the canvas size
	if (size < 4*canvasSize/5) {
		rippleCtx.beginPath();
		rippleCtx.clearRect(xCoord+switchSize/2-((size-rippleOffset)*2)/2, 
			yCoord+switchSize/2-((size-rippleOffset)*2)/2, 
			(size-rippleOffset)*2, (size-rippleOffset)*2);
 		rippleCtx.arc(xCoord+switchSize/2, yCoord+switchSize/2, size, 0, Math.PI*2, true);
 		rippleCtx.stroke();
 		// Recursively draw ripples
 		setTimeout(function(){ripple(xCoord, yCoord, size + rippleOffset)}, ripplePause);
 	} else {
 		// Erase all remaining ripples from canvas
 		rippleCtx.clearRect(1, 1, canvasSize, canvasSize);
 	}
 };

// Make drag and drop permissible
function allowDrop(event) {
	event.preventDefault();
};

// Save image to be dropped
function drag(event) {
	event.dataTransfer.setData("Image", event.target.id);
};

// Move image to selected element
function drop(event) {
 	event.preventDefault();
 	var treble = event.dataTransfer.getData("Image");
 	event.target.appendChild($("#" + treble)[0]);
 	// Change tones to selected octave 
 	if (event.target.id == "highOct") {
 		currTones = highTones;
 	} else if (event.target.id == "midOct") {
 		currTones = midTones;
 	} else {
 		currTones = lowTones;
 	}
};
