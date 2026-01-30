
var canvas;
var gl;
var program;

var projectionMatrix; 
var modelViewMatrix;

var instanceMatrix;

var modelViewMatrixLoc;

var vertices = [

    vec4( -0.5, -0.5,  0.5, 1.0 ),
    vec4( -0.5,  0.5,  0.5, 1.0 ),
    vec4( 0.5,  0.5,  0.5, 1.0 ),
    vec4( 0.5, -0.5,  0.5, 1.0 ),
    vec4( -0.5, -0.5, -0.5, 1.0 ),
    vec4( -0.5,  0.5, -0.5, 1.0 ),
    vec4( 0.5,  0.5, -0.5, 1.0 ),
    vec4( 0.5, -0.5, -0.5, 1.0 )
];


// Body
var bodyId = 0;

// Head 1
var lowerNeck1Id = 1;
var upperNeck1Id = 2;
var head1Id = 3;
var jaw1Id = 4;

// Head 2
var lowerNeck2Id = 5;
var upperNeck2Id = 6;
var head2Id = 7;
var jaw2Id = 8;

// Head 3
var lowerNeck3Id = 9;
var upperNeck3Id = 10;
var head3Id = 11;
var jaw3Id = 12;

// Wings 
var leftUpperWingId = 13;
var leftLowerWingId = 14;
var leftHandId = 15;
var rightUpperWingId = 16;
var rightLowerWingId = 17;
var rightHandId = 18;

// Legs
var leftUpperLegId = 19;
var leftLowerLegId = 20;
var leftFootId = 21;
var rightUpperLegId = 22;
var rightLowerLegId = 23;
var rightFootId = 24;

// Tail
var upperTailId = 25;
var lowerTailId = 26;

var numNodes = 27;
var theta = Array(numNodes).fill(null).map(() => [0, 0, 0]);



var lowerBodyWidth = 2.0;
var lowerBodyHeight = 3.0;
var lowerBodyDepth = 5.0;

var upperBodyWidth = 1.6;
var upperBodyHeight = 2.6;
var upperBodyDepth = 3.0;

var neckWidth = 0.5;
var neckHeight = 1.0;
var neckDepth = 0.5;

var headWidth = 0.8;
var headHeight = 1.2;
var headDepth = 0.8;

var jawWidth = 0.6;
var jawHeight = 0.3;
var jawDepth = 0.6;


var cameraDistance = 30.0;  // distance from the dragon
var cameraAngleX = 0.0;
var cameraAngleY = 0.0;

var colors = [
    vec4(1.0, 0.0, 0.0, 1.0),  // Red
    vec4(0.0, 1.0, 0.0, 1.0),  // Green
    vec4(0.0, 0.0, 1.0, 1.0),  // Blue
    vec4(1.0, 1.0, 0.0, 1.0),  // Yellow
    vec4(1.0, 0.0, 1.0, 1.0),  // Magenta
    vec4(0.0, 1.0, 1.0, 1.0)   // Cyan
];

var stack = [];

var figure = [];

for( var i=0; i<numNodes; i++) figure[i] = createNode(null, null, null, null);

var vBuffer;
var modelViewLoc;

var pointsArray = [];

//-------------------------------------------
function scale4(a, b, c) {
   var result = mat4();
   result[0][0] = a;
   result[1][1] = b;
   result[2][2] = c;
   return result;
}
//--------------------------------------------
function createNode(transform, render, sibling, child){
    var node = {
    transform: transform,
    render: render,
    sibling: sibling,
    child: child,
    }
    return node;
}

var frames = [];
var currentFrameIndex = 0;
var isPlaying = false;
var animationSpeed = 1.5;
var transitionDuration = 1000;
var lastFrameTime;


function saveFrame() {
    frames.push(JSON.parse(JSON.stringify(theta)));
    console.log("Frame saved:", frames.length);
}
function interpolateFrames(fromFrame, toFrame, progress) {
    for (let i = 0; i < numNodes; i++) {
        for (let axis = 0; axis < 3; axis++) {
            theta[i][axis] = fromFrame[i][axis] + progress * (toFrame[i][axis] - fromFrame[i][axis]);
        }
    }
    for (let i = 0; i < numNodes; i++) {
        initNodes(i);
    }
}
function playFrames() {
    if (frames.length < 2) return;
    isPlaying = true;
    currentFrameIndex = 0;
    lastFrameTime = Date.now();

    function step() {
        if (!isPlaying) return;

        let currentTime = Date.now();
        let elapsed = currentTime - lastFrameTime;
        let progress = Math.min(elapsed / transitionDuration, 1.0);

        interpolateFrames(frames[currentFrameIndex], frames[(currentFrameIndex + 1) % frames.length], progress);

        if (progress >= 1.0) { // next frame
            lastFrameTime = currentTime;
            currentFrameIndex = (currentFrameIndex + 1) % frames.length;
        }

        if (isPlaying) requestAnimationFrame(step); // loop
    }

    requestAnimationFrame(step);
}
function stopPlayback() {
    isPlaying = false;
}
function deleteLastFrame() {
    if (frames.length > 0) {
        frames.pop();
        console.log("Last frame deleted", frames.length);
    } else {
        console.log("No frames to delete");
    }
}
function setAnimationSpeed(speed) {
    animationSpeed = speed;
    transitionDuration = 1000 / animationSpeed;
}
function resetPosture() {
    // reset to 0 every rotation
    for (let i = 0; i < theta.length; i++) {
        theta[i] = [0, 0, 0];
    }

    // render every node again
    for (let i = 0; i < numNodes; i++) {
        initNodes(i);
    }

    // to ensure sliders show 0
    document.getElementById("sliderX").value = 0;
    document.getElementById("sliderY").value = 0;
    document.getElementById("sliderZ").value = 0;
    document.getElementById("inputX").value = 0;
    document.getElementById("inputY").value = 0;
    document.getElementById("inputZ").value = 0;
}
function saveFramesToJSON() {
    const jsonData = JSON.stringify(frames);

    const a = document.createElement("a");
    a.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(jsonData));
    a.setAttribute("download", "frames.json");
    document.body.appendChild(a);

    a.click();
    document.body.removeChild(a);
    console.log("Frames saved");
}
function loadFramesFromJSON(event) {
    const file = event.target.files[0];
    if (!file) {
        alert("No file selected");
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const jsonData = JSON.parse(e.target.result);

            // validation
            if (Array.isArray(jsonData)) {
                frames = jsonData;

                console.log("Frames loaded successfully:", frames);
                if (frames.length > 0) {
                    theta = JSON.parse(JSON.stringify(frames[0]));

                    for (let i = 0; i < numNodes; i++) {
                        initNodes(i);
                    }

                    alert("Frames uploaded");
                }
            } else {
                alert("Invalid file");
            }
        } catch (err) {
            alert("Error reading file");
        }
    };

    reader.readAsText(file);
}

//HIERARCHY SWITCH CASE *************************************************************
function initNodes(Id) {
    var m = mat4();

    switch(Id) {
        case bodyId:
            m = mult(m, rotate(theta[bodyId][2], 0, 0, 1));
            m = mult(m, rotate(theta[bodyId][1], 0, 1, 0));
            m = mult(m, rotate(theta[bodyId][0], 1, 0, 0));
            figure[bodyId] = createNode(m, body, null, upperTailId);
            break;
        case upperTailId:
            m = translate(0.0, lowerBodyHeight - 1.8, -2.4);
            m = mult(m, rotate(15, 1, 0, 0));
            m = mult(m, rotate(theta[upperTailId][2], 0, 0, 1));
            m = mult(m, rotate(theta[upperTailId][1], 0, 1, 0));
            m = mult(m, rotate(theta[upperTailId][0], 1, 0, 0));
            figure[upperTailId] = createNode(m, upperTail, rightUpperLegId, lowerTailId);
            break;
        case lowerTailId:
            m = translate(0.0, 0.0, -2.1); 
            m = mult(m, rotate(30, 1, 0, 0));
            m = mult(m, rotate(theta[lowerTailId][2], 0, 0, 1));
            m = mult(m, rotate(theta[lowerTailId][1], 0, 1, 0));
            m = mult(m, rotate(theta[lowerTailId][0], 1, 0, 0));
            figure[lowerTailId] = createNode(m, lowerTail, null, null);
            break;
        case rightUpperLegId:
            m = translate(lowerBodyWidth-0.75, lowerBodyHeight - 2, -1); // 1.5 -0.25 
            m = mult(m, rotate(-120, 1, 0, 0));
            m = mult(m, rotate(theta[rightUpperLegId][1], 0, 0, 1));
            m = mult(m, rotate(theta[rightUpperLegId][2], 0, 1, 0));
            m = mult(m, rotate(theta[rightUpperLegId][0], 1, 0, 0));
            figure[rightUpperLegId] = createNode(m, rightUpperLeg, leftUpperLegId, rightLowerLegId);
            break;
        case rightLowerLegId:
            m = translate(0.0, 0, -2.25); 
            m = mult(m, rotate(150, 1, 0, 0)); 
            m = mult(m, rotate(theta[rightLowerLegId][2], 0, 0, 1));
            m = mult(m, rotate(theta[rightLowerLegId][1], 0, 1, 0));
            m = mult(m, rotate(theta[rightLowerLegId][0], 1, 0, 0));
            figure[rightLowerLegId] = createNode(m, rightLowerLeg, null, rightFootId);
            break;
        case rightFootId:
            m = translate(0.0, -2.0, 0.0);
            m = mult(m, rotate(theta[rightFootId][2], 0, 0, 1));
            m = mult(m, rotate(theta[rightFootId][1], 0, 1, 0));
            m = mult(m, rotate(theta[rightFootId][0], 1, 0, 0));
            figure[rightFootId] = createNode(m, rightFoot, null, null);
            break;
        case leftUpperLegId:
            m = translate(-lowerBodyWidth+0.75, lowerBodyHeight - 2, -1); // 1.5 -0.25 
            m = mult(m, rotate(-120, 1, 0, 0));
            m = mult(m, rotate(theta[leftUpperLegId][1], 0, 0, 1));
            m = mult(m, rotate(theta[leftUpperLegId][2], 0, 1, 0));
            m = mult(m, rotate(theta[leftUpperLegId][0], 1, 0, 0));
            figure[leftUpperLegId] = createNode(m, leftUpperLeg, rightUpperWingId, leftLowerLegId); // Lower leg is the child of upper leg
            break;
        case leftLowerLegId:
            m = translate(0.0, 0, -2.25); 
            m = mult(m, rotate(150, 1, 0, 0)); 
            m = mult(m, rotate(theta[leftLowerLegId][2], 0, 0, 1));
            m = mult(m, rotate(theta[leftLowerLegId][1], 0, 1, 0));
            m = mult(m, rotate(theta[leftLowerLegId][0], 1, 0, 0));
            figure[leftLowerLegId] = createNode(m, leftLowerLeg, null, leftFootId);
            break;
        case leftFootId:
            m = translate(0.0, -2.0, 0.0);
            m = mult(m, rotate(theta[leftFootId][2], 0, 0, 1));
            m = mult(m, rotate(theta[leftFootId][1], 0, 1, 0));
            m = mult(m, rotate(theta[leftFootId][0], 1, 0, 0));
            figure[leftFootId] = createNode(m, leftFoot, null, null);
            break;
        case rightUpperWingId:
            m = translate(lowerBodyWidth-0.4, lowerBodyHeight-0.2, 1.2,); 
            m = mult(m, rotate(30, 0, 0, 1)); 
            m = mult(m, rotate(30, 0, 1, 0)); 
            m = mult(m, rotate(theta[rightUpperWingId][2], 0, 0, 1)); 
            m = mult(m, rotate(theta[rightUpperWingId][1], 0, 1, 0)); 
            m = mult(m, rotate(theta[rightUpperWingId][0], 1, 0, 0)); 
            figure[rightUpperWingId] = createNode(m, rightUpperWing, leftUpperWingId, rightLowerWingId); 
            break;
        case rightLowerWingId:
            m = translate(3.0, 0.0, 0.0); 
            m = mult(m, rotate(-60, 0, 0, 1)); 
            m = mult(m, rotate(theta[rightLowerWingId][2], 0, 0, 1));
            m = mult(m, rotate(theta[rightLowerWingId][1], 0, 1, 0));
            m = mult(m, rotate(theta[rightLowerWingId][0], 1, 0, 0));
            figure[rightLowerWingId] = createNode(m, rightLowerWing, null, rightHandId); 
            break;
        case rightHandId:
            m = translate(2.5, 0.0, 0.0); 
            m = mult(m, rotate(theta[rightHandId][2], 0, 0, 1)); 
            m = mult(m, rotate(theta[rightHandId][1], 0, 1, 0)); 
            m = mult(m, rotate(theta[rightHandId][0], 1, 0, 0)); 
            figure[rightHandId] = createNode(m, rightHand, null, null); 
            break;
        case leftUpperWingId:
            m = translate(-lowerBodyWidth + 0.4, lowerBodyHeight - 0.2, 1.2); 
            m = mult(m, rotate(-30, 0, 0, 1)); 
            m = mult(m, rotate(-30, 0, 1, 0)); 
            m = mult(m, rotate(theta[leftUpperWingId][2], 0, 0, 1)); 
            m = mult(m, rotate(theta[leftUpperWingId][1], 0, 1, 0)); 
            m = mult(m, rotate(theta[leftUpperWingId][0], 1, 0, 0)); 
            figure[leftUpperWingId] = createNode(m, leftUpperWing, lowerNeck2Id, leftLowerWingId); 
            break;
        case leftLowerWingId:
            m = translate(-3.0, 0.0, 0.0); 
            m = mult(m, rotate(60, 0, 0, 1)); 
            m = mult(m, rotate(theta[leftLowerWingId][2], 0, 0, 1));
            m = mult(m, rotate(theta[leftLowerWingId][1], 0, 1, 0));
            m = mult(m, rotate(theta[leftLowerWingId][0], 1, 0, 0));
            figure[leftLowerWingId] = createNode(m, leftLowerWing, null, leftHandId); 
            break;
        case leftHandId:
            m = translate(-2.5, 0.0, 0.0); 
            m = mult(m, rotate(theta[leftHandId][2], 0, 0, 1)); 
            m = mult(m, rotate(theta[leftHandId][1], 0, 1, 0)); 
            m = mult(m, rotate(theta[leftHandId][0], 1, 0, 0)); 
            figure[leftHandId] = createNode(m, leftHand, null, null); 
            break;
        case lowerNeck2Id:
            m = translate(0, 3.5, 3);
            m = mult(m, rotate(100, 1, 0, 0)); 
            m = mult(m, rotate(theta[lowerNeck2Id][1], 0, 0, 1)); 
            m = mult(m, rotate(theta[lowerNeck2Id][2], 0, 1, 0)); 
            m = mult(m, rotate(theta[lowerNeck2Id][0], 1, 0, 0)); 
            figure[lowerNeck2Id] = createNode(m, lowerNeck2, lowerNeck1Id, upperNeck2Id); 
            break; 
        case upperNeck2Id:
            m = translate(0.0, 0.0, -1.8);
            m = mult(m, rotate(60, 1, 0, 0));
            m = mult(m, rotate(theta[upperNeck2Id][2], 0, 0, 1));
            m = mult(m, rotate(theta[upperNeck2Id][1], 0, 1, 0));
            m = mult(m, rotate(theta[upperNeck2Id][0], 1, 0, 0));
            figure[upperNeck2Id] = createNode(m, upperNeck2, null, head2Id);
            break;
        case head2Id:
            m = translate(0.0, -2, 0.25);
            m = mult(m, rotate(theta[head2Id][2], 0, 0, 1));
            m = mult(m, rotate(theta[head2Id][1], 0, 1, 0));
            m = mult(m, rotate(theta[head2Id][0], 1, 0, 0));
            figure[head2Id] = createNode(m, head2, null, jaw2Id);
            break;    
        case jaw2Id:
            m = translate(0.0, 0.5, -0.5);
            m = mult(m, rotate(120, 1, 0, 0));
            m = mult(m, rotate(theta[jaw2Id][2], 0, 0, 1));
            m = mult(m, rotate(theta[jaw2Id][1], 0, 1, 0));
            m = mult(m, rotate(theta[jaw2Id][0], 1, 0, 0));
            figure[jaw2Id] = createNode(m, jaw2, null, null);
            break;
        case lowerNeck1Id:
            m = translate(0.6, 3, 2.9);
            m = mult(m, rotate(100, 1, 0, 0)); 
            m = mult(m, rotate(-30, 0, 1, 0)); 
            m = mult(m, rotate(theta[lowerNeck1Id][1], 0, 0, 1)); 
            m = mult(m, rotate(theta[lowerNeck1Id][2], 0, 1, 0)); 
            m = mult(m, rotate(theta[lowerNeck1Id][0], 1, 0, 0)); 
            figure[lowerNeck1Id] = createNode(m, lowerNeck1, lowerNeck3Id, upperNeck1Id); 
            break; 
        case upperNeck1Id:
            m = translate(0.0, 0.0, -1.8);
            m = mult(m, rotate(60, 1, 0, 0));
            m = mult(m, rotate(theta[upperNeck1Id][2], 0, 0, 1));
            m = mult(m, rotate(theta[upperNeck1Id][1], 0, 1, 0));
            m = mult(m, rotate(theta[upperNeck1Id][0], 1, 0, 0));
            figure[upperNeck1Id] = createNode(m, upperNeck1, null, head1Id);
            break;
        case head1Id:
            m = translate(0.0, -2, 0.25);
            m = mult(m, rotate(theta[head1Id][2], 0, 0, 1));
            m = mult(m, rotate(theta[head1Id][1], 0, 1, 0));
            m = mult(m, rotate(theta[head1Id][0], 1, 0, 0));
            figure[head1Id] = createNode(m, head1, null, jaw1Id);
            break;    
        case jaw1Id:
            m = translate(0.0, 0.5, -0.5);
            m = mult(m, rotate(120, 1, 0, 0));
            m = mult(m, rotate(theta[jaw1Id][2], 0, 0, 1));
            m = mult(m, rotate(theta[jaw1Id][1], 0, 1, 0));
            m = mult(m, rotate(theta[jaw1Id][0], 1, 0, 0));
            figure[jaw1Id] = createNode(m, jaw1, null, null);
            break;
        case lowerNeck3Id:
            m = translate(-0.6, 3, 2.9);
            m = mult(m, rotate(100, 1, 0, 0)); 
            m = mult(m, rotate(30, 0, 1, 0)); 
            m = mult(m, rotate(theta[lowerNeck3Id][1], 0, 0, 1)); 
            m = mult(m, rotate(theta[lowerNeck3Id][2], 0, 1, 0)); 
            m = mult(m, rotate(theta[lowerNeck3Id][0], 1, 0, 0)); 
            figure[lowerNeck3Id] = createNode(m, lowerNeck3, null, upperNeck3Id); 
            break; 
        case upperNeck3Id:
            m = translate(0.0, 0.0, -1.8);
            m = mult(m, rotate(60, 1, 0, 0));
            m = mult(m, rotate(theta[upperNeck3Id][2], 0, 0, 1));
            m = mult(m, rotate(theta[upperNeck3Id][1], 0, 1, 0));
            m = mult(m, rotate(theta[upperNeck3Id][0], 1, 0, 0));
            figure[upperNeck3Id] = createNode(m, upperNeck3, null, head3Id);
            break;
        case head3Id:
            m = translate(0.0, -2, 0.25);
            m = mult(m, rotate(theta[head3Id][2], 0, 0, 1));
            m = mult(m, rotate(theta[head3Id][1], 0, 1, 0));
            m = mult(m, rotate(theta[head3Id][0], 1, 0, 0));
            figure[head3Id] = createNode(m, head3, null, jaw3Id);
            break;    
        case jaw3Id:
            m = translate(0.0, 0.5, -0.5);
            m = mult(m, rotate(120, 1, 0, 0));
            m = mult(m, rotate(theta[jaw3Id][2], 0, 0, 1));
            m = mult(m, rotate(theta[jaw3Id][1], 0, 1, 0));
            m = mult(m, rotate(theta[jaw3Id][0], 1, 0, 0));
            figure[jaw3Id] = createNode(m, jaw3, null, null);
            break;
        // Other cases...
    }
}

function traverse(Id) {
   
   if(Id == null) return; 
   stack.push(modelViewMatrix);
   modelViewMatrix = mult(modelViewMatrix, figure[Id].transform);
   figure[Id].render();
   if(figure[Id].child != null) traverse(figure[Id].child); 
    modelViewMatrix = stack.pop();
   if(figure[Id].sibling != null) traverse(figure[Id].sibling); 
}

//BODY PART FUNCTIONS *************************************************************
function body() {

    // lower body
    var bodyColor = vec4(0.5, 0.3, 0.0, 1.0);
    gl.uniform4fv(gl.getUniformLocation(program, "color"), bodyColor);   
     
    modifiedCube(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * lowerBodyHeight, 0.0));
    instanceMatrix = mult(instanceMatrix, rotate(-8, 1, 0, 0)); 
    instanceMatrix = mult(instanceMatrix, scale4(lowerBodyWidth, lowerBodyHeight-0.4, lowerBodyDepth));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);

    // upper body
    var upperBodyColor = vec4(0.4, 0.4, 0.0, 1.0);  
    gl.uniform4fv(gl.getUniformLocation(program, "color"), upperBodyColor);

    modifiedCube();  
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, lowerBodyHeight-0.5, 2.3));
    instanceMatrix = mult(instanceMatrix, rotate(120, 1, 0, 0)); 
    instanceMatrix = mult(instanceMatrix, scale4(upperBodyWidth, upperBodyHeight, upperBodyDepth));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}
function upperTail() {
    var tailColor = vec4(0.3, 0.3, 0.0, 1.0);
    gl.uniform4fv(gl.getUniformLocation(program, "color"), tailColor);

    modifiedCube();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.0, -1.0));
    instanceMatrix = mult(instanceMatrix, scale4(0.5, 1, 2.5));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}
function lowerTail() {
    var tailColor = vec4(0.15, 0.15, 0.0, 1.0);
    gl.uniform4fv(gl.getUniformLocation(program, "color"), tailColor);

    modifiedCube();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.0, -0.75));
    instanceMatrix = mult(instanceMatrix, scale4(0.25, 0.5, 1.5));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}
function rightUpperLeg() {
    var upperLegColor = vec4(0.2, 0.3, 0.0, 1.0);
    gl.uniform4fv(gl.getUniformLocation(program, "color"), upperLegColor);

    modifiedCube();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0, -1.25));
    instanceMatrix = mult(instanceMatrix, scale4(0.5, 1, 2.5));

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}
function rightLowerLeg() {
    var lowerLegColor = vec4(0.1, 0.5, 0.0, 1.0); 
    gl.uniform4fv(gl.getUniformLocation(program, "color"), lowerLegColor);

    regularCube(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, -1.0, 0.0)); 
    instanceMatrix = mult(instanceMatrix, scale4(0.4, 2.0, 0.4));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}
function rightFoot() {
    var footColor = vec4(0.55, 0.6, 0.55, 1.0); 
    gl.uniform4fv(gl.getUniformLocation(program, "color"), footColor);

    // Nail 1
    modifiedCube();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.15, 0.5));
    instanceMatrix = mult(instanceMatrix, rotate(-30, 1, 0, 0));
    instanceMatrix = mult(instanceMatrix, scale4(0.2, 0.5, 1.0));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);

    // Nail 2
    modifiedCube();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    instanceMatrix = mult(modelViewMatrix, translate(0.3 * Math.cos(radians(30)), 0.0, 0.5 * Math.sin(radians(30)))); // Position for nail 2
    instanceMatrix = mult(instanceMatrix, rotate(-30, 1, 0, 0));
    instanceMatrix = mult(instanceMatrix, rotate(30, 0, 1, 0));
    instanceMatrix = mult(instanceMatrix, scale4(0.2, 0.5, 1.0));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);

    // Nail 3
    modifiedCube();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    instanceMatrix = mult(modelViewMatrix, translate(-0.3 * Math.cos(radians(30)), 0.0, 0.5 * Math.sin(radians(30)))); // Position for nail 3
    instanceMatrix = mult(instanceMatrix, rotate(-30, 1, 0, 0)); 
    instanceMatrix = mult(instanceMatrix, rotate(-30, 0, 1, 0));
    instanceMatrix = mult(instanceMatrix, scale4(0.2, 0.5, 1.0));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}
function leftUpperLeg() {
    var upperLegColor = vec4(0.2, 0.3, 0.0, 1.0); 
    gl.uniform4fv(gl.getUniformLocation(program, "color"), upperLegColor);

    modifiedCube(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0, -1.25)); 
    instanceMatrix = mult(instanceMatrix, scale4(0.5, 1, 2.5)); 

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}
function leftLowerLeg() {
    var lowerLegColor = vec4(0.1, 0.5, 0.0, 1.0); 
    gl.uniform4fv(gl.getUniformLocation(program, "color"), lowerLegColor);

    regularCube(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, -1.0, 0.0)); 
    instanceMatrix = mult(instanceMatrix, scale4(0.4, 2.0, 0.4));

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}
function leftFoot() {
    var footColor = vec4(0.55, 0.6, 0.55, 1.0); 
    gl.uniform4fv(gl.getUniformLocation(program, "color"), footColor);

    // Nail 1
    modifiedCube();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.15, 0.5));
    instanceMatrix = mult(instanceMatrix, rotate(-30, 1, 0, 0));
    instanceMatrix = mult(instanceMatrix, scale4(0.2, 0.5, 1.0));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);

    // Nail 2
    modifiedCube();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    instanceMatrix = mult(modelViewMatrix, translate(0.3 * Math.cos(radians(30)), 0.0, 0.5 * Math.sin(radians(30)))); // Position for nail 2
    instanceMatrix = mult(instanceMatrix, rotate(-30, 1, 0, 0));
    instanceMatrix = mult(instanceMatrix, rotate(30, 0, 1, 0));
    instanceMatrix = mult(instanceMatrix, scale4(0.2, 0.5, 1.0));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);

    // Nail 3
    modifiedCube();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    instanceMatrix = mult(modelViewMatrix, translate(-0.3 * Math.cos(radians(30)), 0.0, 0.5 * Math.sin(radians(30)))); // Position for nail 3
    instanceMatrix = mult(instanceMatrix, rotate(-30, 1, 0, 0));
    instanceMatrix = mult(instanceMatrix, rotate(-30, 0, 1, 0));
    instanceMatrix = mult(instanceMatrix, scale4(0.2, 0.5, 1.0));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}
function rightUpperWing() {

    // arm
    gl.uniform4fv(gl.getUniformLocation(program, "color"), vec4(0.3, 0.1, 0.1, 1.0));
    cylinder(32, 0.3, 1.0); 
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.0, 0.0));
    instanceMatrix = mult(instanceMatrix, rotate(-90, 1, 0, 0));
    instanceMatrix = mult(instanceMatrix, rotate(-90, 0, 0, 1));
    instanceMatrix = mult(instanceMatrix, scale4(0.6, 3.0, 0.6));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (let i = 0; i < pointsArray.length; i += 3) gl.drawArrays(gl.TRIANGLES, i, 3);

    // wing
    gl.uniform4fv(gl.getUniformLocation(program, "color"), vec4(0.5, 0.0, 0.0, 1.0));
    regularCube();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(1.5, 0.0, -1.34));
    instanceMatrix = mult(instanceMatrix, scale4(2.999, 0.2, 2.5));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (let i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}
function rightLowerWing() {
    
    // arm
    gl.uniform4fv(gl.getUniformLocation(program, "color"), vec4(0.4, 0.1, 0.1, 1.0));
    cylinder(32, 0.3, 1.0);
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.0, 0.0)); 
    instanceMatrix = mult(instanceMatrix, rotate(-90, 1, 0, 0));
    instanceMatrix = mult(instanceMatrix, rotate(-90, 0, 0, 1));
    instanceMatrix = mult(instanceMatrix, scale4(0.5, 2.5, 0.5));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (let i = 0; i < pointsArray.length; i += 3) gl.drawArrays(gl.TRIANGLES, i, 3);

    // wing
    gl.uniform4fv(gl.getUniformLocation(program, "color"), vec4(0.6, 0.0, 0.0, 1.0));
    triangularPrism(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, -0.0, -0.1)); 
    instanceMatrix = mult(instanceMatrix, rotate(90, 1, 0, 0));
    instanceMatrix = mult(instanceMatrix, scale4(2.5, 5.0, 0.2));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (let i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}
function rightHand() {
    var handColor = vec4(0.5, 0.35, 0.2, 1.0); 
    gl.uniform4fv(gl.getUniformLocation(program, "color"), handColor);

    // palm
    regularCube();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.0, 0.15));
    instanceMatrix = mult(instanceMatrix, scale4(0.6, 0.2, 0.5)); 
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);

    // fingers
    var fingerColor = vec4(0.7, 0.5, 0.3, 1.0);
    gl.uniform4fv(gl.getUniformLocation(program, "color"), fingerColor);

    let positionFinger = -0.25;

    for (let i = 0; i < 3; i++) {
        regularCube();
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

        instanceMatrix = mult(modelViewMatrix, translate(positionFinger, -0.15, 0.45));
        positionFinger+= 0.25
        instanceMatrix = mult(instanceMatrix, scale4(0.1, 0.3, 0.1));
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
        for (var j = 0; j < 6; j++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * j, 4);
    }
}
function leftUpperWing() {
    // Cylinder
    gl.uniform4fv(gl.getUniformLocation(program, "color"), vec4(0.3, 0.1, 0.1, 1.0));
    cylinder(32, 0.3, 1.0);
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.0, 0.0));
    instanceMatrix = mult(instanceMatrix, rotate(-90, 1, 0, 0));
    instanceMatrix = mult(instanceMatrix, rotate(90, 0, 0, 1));
    instanceMatrix = mult(instanceMatrix, scale4(0.6, 3.0, 0.6));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (let i = 0; i < pointsArray.length; i += 3) gl.drawArrays(gl.TRIANGLES, i, 3);

    // Wing Cube
    gl.uniform4fv(gl.getUniformLocation(program, "color"), vec4(0.5, 0.0, 0.0, 1.0));
    regularCube();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(-1.5, 0.0, -1.34));
    instanceMatrix = mult(instanceMatrix, scale4(2.999, 0.2, 2.5));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (let i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}
function leftLowerWing() {
    // Cylinder
    gl.uniform4fv(gl.getUniformLocation(program, "color"), vec4(0.4, 0.1, 0.1, 1.0)); 
    cylinder(32, 0.3, 1.0); 
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.0, 0.0)); 
    instanceMatrix = mult(instanceMatrix, rotate(-90, 1, 0, 0)); 
    instanceMatrix = mult(instanceMatrix, rotate(90, 0, 0, 1)); 
    instanceMatrix = mult(instanceMatrix, scale4(0.5, 2.5, 0.5)); 
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (let i = 0; i < pointsArray.length; i += 3) gl.drawArrays(gl.TRIANGLES, i, 3);

    // Wing 
    gl.uniform4fv(gl.getUniformLocation(program, "color"), vec4(0.6, 0.0, 0.0, 1.0)); 
    triangularPrism();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, -0.0, 0.1)); 
    instanceMatrix = mult(instanceMatrix, rotate(180, 0, 0, 1)); 
    instanceMatrix = mult(instanceMatrix, rotate(90, 0, 1, 0)); 

    instanceMatrix = mult(instanceMatrix, rotate(-90, 1, 0, 0)); 
    instanceMatrix = mult(instanceMatrix, scale4(2.7, 5.4, 0.2)); 
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (let i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}
function leftHand() {
    gl.uniform4fv(gl.getUniformLocation(program, "color"), vec4(0.5, 0.35, 0.2, 1.0)); 

    // PALM
    regularCube(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.0, 0.15));
    instanceMatrix = mult(instanceMatrix, scale4(0.6, 0.2, 0.5)); 
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);

    // FINGERS
    gl.uniform4fv(gl.getUniformLocation(program, "color"), vec4(0.7, 0.5, 0.3, 1.0));
    let positionFinger = -0.25;

    for (let i = 0; i < 3; i++) {
        regularCube(); 
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

        instanceMatrix = mult(modelViewMatrix, translate(positionFinger, -0.15, 0.45));
        positionFinger += 0.25;
        instanceMatrix = mult(instanceMatrix, scale4(0.1, 0.3, 0.1));
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
        for (var j = 0; j < 6; j++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * j, 4);
    }
}
function lowerNeck2() {
    var upperLegColor = vec4(0.2, 0.3, 0.0, 1.0);
    gl.uniform4fv(gl.getUniformLocation(program, "color"), upperLegColor);

    modifiedCube();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0, -1));
    instanceMatrix = mult(instanceMatrix, scale4(0.5, 1, 2.0)); 

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}
function upperNeck2() {
    var lowerLegColor = vec4(0.1, 0.5, 0.0, 1.0); 
    gl.uniform4fv(gl.getUniformLocation(program, "color"), lowerLegColor);

    regularCube(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, -1, 0.0)); 
    instanceMatrix = mult(instanceMatrix, scale4(0.4, 2, 0.4));

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}
function head2() {
    
    // head
    var headColor = vec4(0.4, 0.3, 0.0, 1.0); 
    gl.uniform4fv(gl.getUniformLocation(program, "color"), headColor);

    modifiedCube(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0, -1));
    instanceMatrix = mult(instanceMatrix, rotate(10, 1, 0, 0)); 
    instanceMatrix = mult(instanceMatrix, scale4(0.7, 1.4, 2));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);

    // eyes
    var eyeColor = vec4(1.0, 1.0, 1.0, 1.0);
    gl.uniform4fv(gl.getUniformLocation(program, "color"), eyeColor);

    sphere(32, 0.2);
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    // left eye
    instanceMatrix = mult(modelViewMatrix, translate(-0.5, -0.4, -0.75));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (let i = 0; i < pointsArray.length; i += 3) gl.drawArrays(gl.TRIANGLES, i, 3);

    // right eye
    instanceMatrix = mult(modelViewMatrix, translate(0.5, -0.4, -0.75));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (let i = 0; i < pointsArray.length; i += 3) gl.drawArrays(gl.TRIANGLES, i, 3);

    // eye iris
    var eyeColor = vec4(0.0, 0.5, 0.0, 1.0);
    gl.uniform4fv(gl.getUniformLocation(program, "color"), eyeColor);

    sphere(32, 0.1);
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    // left iris
    instanceMatrix = mult(modelViewMatrix, translate(-0.65, -0.4, -0.85));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (let i = 0; i < pointsArray.length; i += 3) gl.drawArrays(gl.TRIANGLES, i, 3);

    // right iris
    instanceMatrix = mult(modelViewMatrix, translate(0.65, -0.4, -0.85));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (let i = 0; i < pointsArray.length; i += 3) gl.drawArrays(gl.TRIANGLES, i, 3);
}
function jaw2() {
    var lowerLegColor = vec4(0.3, 0.5, 0.0, 1.0); 
    gl.uniform4fv(gl.getUniformLocation(program, "color"), lowerLegColor);

    regularCube(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, -0.7, 0.0)); 
    instanceMatrix = mult(instanceMatrix, scale4(0.7, 1.4, 0.3));

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}
function lowerNeck1() {
    var upperLegColor = vec4(0.2, 0.0, 0.3, 1.0);
    gl.uniform4fv(gl.getUniformLocation(program, "color"), upperLegColor);

    modifiedCube();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0, -1));
    instanceMatrix = mult(instanceMatrix, scale4(0.5, 1, 2.0)); 

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}
function upperNeck1() {
    var lowerLegColor = vec4(0.1, 0.0, 0.5, 1.0); 
    gl.uniform4fv(gl.getUniformLocation(program, "color"), lowerLegColor);

    regularCube(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, -1, 0.0)); 
    instanceMatrix = mult(instanceMatrix, scale4(0.4, 2, 0.4));

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}
function head1() {
    
    // head
    var headColor = vec4(0.4, 0.0, 0.3, 1.0); 
    gl.uniform4fv(gl.getUniformLocation(program, "color"), headColor);

    modifiedCube(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0, -1));
    instanceMatrix = mult(instanceMatrix, rotate(10, 1, 0, 0)); 
    instanceMatrix = mult(instanceMatrix, scale4(0.7, 1.4, 2));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);

    // eyes
    var eyeColor = vec4(1.0, 1.0, 1.0, 1.0);
    gl.uniform4fv(gl.getUniformLocation(program, "color"), eyeColor);

    sphere(32, 0.2);
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    // left eye
    instanceMatrix = mult(modelViewMatrix, translate(-0.5, -0.4, -0.75));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (let i = 0; i < pointsArray.length; i += 3) gl.drawArrays(gl.TRIANGLES, i, 3);

    // right eye
    instanceMatrix = mult(modelViewMatrix, translate(0.5, -0.4, -0.75));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (let i = 0; i < pointsArray.length; i += 3) gl.drawArrays(gl.TRIANGLES, i, 3);

    // eye iris
    var eyeColor = vec4(0.0, 0.0, 0.5, 1.0);
    gl.uniform4fv(gl.getUniformLocation(program, "color"), eyeColor);

    sphere(32, 0.1);
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    // left iris
    instanceMatrix = mult(modelViewMatrix, translate(-0.65, -0.4, -0.85));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (let i = 0; i < pointsArray.length; i += 3) gl.drawArrays(gl.TRIANGLES, i, 3);

    // right iris
    instanceMatrix = mult(modelViewMatrix, translate(0.65, -0.4, -0.85));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (let i = 0; i < pointsArray.length; i += 3) gl.drawArrays(gl.TRIANGLES, i, 3);
}
function jaw1() {
    var lowerLegColor = vec4(0.3, 0.0, 0.5, 1.0); 
    gl.uniform4fv(gl.getUniformLocation(program, "color"), lowerLegColor);

    regularCube(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, -0.7, 0.0)); 
    instanceMatrix = mult(instanceMatrix, scale4(0.7, 1.4, 0.3));

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}
function lowerNeck3() {
    var upperLegColor = vec4(0.0, 0.3, 0.2, 1.0);
    gl.uniform4fv(gl.getUniformLocation(program, "color"), upperLegColor);

    modifiedCube();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0, -1));
    instanceMatrix = mult(instanceMatrix, scale4(0.5, 1, 2.0)); 

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}
function upperNeck3() {
    var lowerLegColor = vec4(0.0, 0.4, 0.2, 1.0); 
    gl.uniform4fv(gl.getUniformLocation(program, "color"), lowerLegColor);

    regularCube(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, -1, 0.0)); 
    instanceMatrix = mult(instanceMatrix, scale4(0.4, 2, 0.4));

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}
function head3() {
    
    // head
    var headColor = vec4(0.0, 0.3, 0.4, 1.0); 
    gl.uniform4fv(gl.getUniformLocation(program, "color"), headColor);

    modifiedCube(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0, -1));
    instanceMatrix = mult(instanceMatrix, rotate(10, 1, 0, 0)); 
    instanceMatrix = mult(instanceMatrix, scale4(0.7, 1.4, 2));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);

    // eyes
    var eyeColor = vec4(1.0, 1.0, 1.0, 1.0);
    gl.uniform4fv(gl.getUniformLocation(program, "color"), eyeColor);

    sphere(32, 0.2);
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    // left eye
    instanceMatrix = mult(modelViewMatrix, translate(-0.5, -0.4, -0.75));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (let i = 0; i < pointsArray.length; i += 3) gl.drawArrays(gl.TRIANGLES, i, 3);

    // right eye
    instanceMatrix = mult(modelViewMatrix, translate(0.5, -0.4, -0.75));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (let i = 0; i < pointsArray.length; i += 3) gl.drawArrays(gl.TRIANGLES, i, 3);

    // eye iris
    var eyeColor = vec4(0.5, 0.0, 0.0, 1.0);
    gl.uniform4fv(gl.getUniformLocation(program, "color"), eyeColor);

    sphere(32, 0.1);
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    // left iris
    instanceMatrix = mult(modelViewMatrix, translate(-0.65, -0.4, -0.85));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (let i = 0; i < pointsArray.length; i += 3) gl.drawArrays(gl.TRIANGLES, i, 3);

    // right iris
    instanceMatrix = mult(modelViewMatrix, translate(0.65, -0.4, -0.85));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (let i = 0; i < pointsArray.length; i += 3) gl.drawArrays(gl.TRIANGLES, i, 3);
}
function jaw3() {
    var lowerLegColor = vec4(0.0, 0.4, 0.3, 1.0); 
    gl.uniform4fv(gl.getUniformLocation(program, "color"), lowerLegColor);

    regularCube(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    instanceMatrix = mult(modelViewMatrix, translate(0.0, -0.7, 0.0)); 
    instanceMatrix = mult(instanceMatrix, scale4(0.7, 1.4, 0.3));

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}

//derived function from triangle
function triangularPrism() {
    pointsArray = [];

    var vertices = [
        vec4(0.0, 0.0, 0.5, 1.0),
        vec4(0.0, -0.5, 0.5, 1.0),
        vec4(1.0, 0.0, 0.5, 1.0),
        vec4(0.0, 0.0, -0.5, 1.0),
        vec4(0.0, -0.5, -0.5, 1.0),
        vec4(1.0, 0.0, -0.5, 1.0)
    ];

    pointsArray.push(vertices[0], vertices[1], vertices[2]);
    pointsArray.push(vertices[3], vertices[4], vertices[5]);
    pointsArray.push(vertices[0], vertices[1], vertices[4]);
    pointsArray.push(vertices[0], vertices[4], vertices[3]);
    pointsArray.push(vertices[0], vertices[2], vertices[5]);
    pointsArray.push(vertices[0], vertices[5], vertices[3]);
    pointsArray.push(vertices[1], vertices[2], vertices[5]);
    pointsArray.push(vertices[1], vertices[5], vertices[4]);
}
//normal cube
function regularCube() {
    pointsArray = [];

    var vertices = [
        vec4(-0.5, -0.5, 0.5, 1.0),
        vec4(-0.5,  0.5, 0.5, 1.0),
        vec4( 0.5,  0.5, 0.5, 1.0),
        vec4( 0.5, -0.5, 0.5, 1.0),
        vec4(-0.5, -0.5, -0.5, 1.0),
        vec4(-0.5,  0.5, -0.5, 1.0),
        vec4( 0.5,  0.5, -0.5, 1.0),
        vec4( 0.5, -0.5, -0.5, 1.0)
    ];

    quad(vertices, 1, 0, 3, 2);
    quad(vertices, 2, 3, 7, 6);
    quad(vertices, 3, 0, 4, 7);
    quad(vertices, 6, 5, 1, 2);
    quad(vertices, 4, 5, 6, 7);
    quad(vertices, 5, 4, 0, 1);
}
//modified cube that 1 face sides are half-sized
function modifiedCube() {
    pointsArray = [];  
    
    var vertices = [
        vec4(-1.0, -0.5, 0.5, 1.0),
        vec4(-1.0,  0.5, 0.5, 1.0),
        vec4( 1.0,  0.5, 0.5, 1.0),
        vec4( 1.0, -0.5, 0.5, 1.0),
        vec4(-0.5, -0.25, -0.5, 1.0),
        vec4(-0.5,  0.25, -0.5, 1.0),
        vec4( 0.5,  0.25, -0.5, 1.0),
        vec4( 0.5, -0.25, -0.5, 1.0)
    ];

    quad(vertices, 1, 0, 3, 2);
    quad(vertices, 2, 3, 7, 6);
    quad(vertices, 3, 0, 4, 7);
    quad(vertices, 6, 5, 1, 2);
    quad(vertices, 4, 5, 6, 7);
    quad(vertices, 5, 4, 0, 1);
}
// derived from WebGL fundementals and/or book files
function cylinder(resolution = 32, radius = 0.5, height = 1.0) {
    pointsArray = [];

    // side of the cylinder
    for (let i = 0; i < resolution; i++) {
        let angle1 = (i * 2 * Math.PI) / resolution;
        let angle2 = ((i + 1) * 2 * Math.PI) / resolution;

        let x1 = radius * Math.cos(angle1);
        let z1 = radius * Math.sin(angle1);
        let x2 = radius * Math.cos(angle2);
        let z2 = radius * Math.sin(angle2);

        // Triangle for the side
        pointsArray.push(vec4(x1, 0, z1, 1.0));
        pointsArray.push(vec4(x2, 0, z2, 1.0));
        pointsArray.push(vec4(x1, height, z1, 1.0));

        pointsArray.push(vec4(x2, height, z2, 1.0));
        pointsArray.push(vec4(x1, height, z1, 1.0));
        pointsArray.push(vec4(x2, 0, z2, 1.0));
    }

    for (let i = 0; i < resolution; i++) {
        let angle1 = (i * 2 * Math.PI) / resolution;
        let angle2 = ((i + 1) * 2 * Math.PI) / resolution;

        let x1 = radius * Math.cos(angle1);
        let z1 = radius * Math.sin(angle1);
        let x2 = radius * Math.cos(angle2);
        let z2 = radius * Math.sin(angle2);

        // Bottom cap
        pointsArray.push(vec4(0, 0, 0, 1.0));
        pointsArray.push(vec4(x1, 0, z1, 1.0));
        pointsArray.push(vec4(x2, 0, z2, 1.0));

        // Top cap
        pointsArray.push(vec4(0, height, 0, 1.0));
        pointsArray.push(vec4(x1, height, z1, 1.0));
        pointsArray.push(vec4(x2, height, z2, 1.0));
    }
}
// derived from WebGL fundementals and/or book files
function sphere(resolution = 32, radius = 0.5) {
    pointsArray = [];

    for (let i = 0; i <= resolution; i++) {
        let theta = (i * Math.PI) / resolution;
        for (let j = 0; j <= resolution; j++) {
            let phi = (j * 2 * Math.PI) / resolution;
            let x = radius * Math.sin(theta) * Math.cos(phi);
            let y = radius * Math.sin(theta) * Math.sin(phi);
            let z = radius * Math.cos(theta);
            pointsArray.push(vec4(x, y, z, 1.0));
        }
    }

    for (let i = 0; i < resolution; i++) {
        for (let j = 0; j < resolution; j++) {
            let first = i * (resolution + 1) + j;
            let second = first + resolution + 1;

            pointsArray.push(pointsArray[first]);
            pointsArray.push(pointsArray[second]);
            pointsArray.push(pointsArray[first + 1]);

            pointsArray.push(pointsArray[second]);
            pointsArray.push(pointsArray[second + 1]);
            pointsArray.push(pointsArray[first + 1]);
        }
    }
}
function quad(verticesArray, a, b, c, d) {
    pointsArray.push(verticesArray[a]);
    pointsArray.push(verticesArray[b]);
    pointsArray.push(verticesArray[c]);
    pointsArray.push(verticesArray[d]);
}

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );
    var isDragging = false;
    var previousMouseX = 0;
    var previousMouseY = 0;

    canvas.addEventListener("mousedown", function(event) {
        if (event.button === 2) {
            isDragging = true;
            previousMouseX = event.clientX;
            previousMouseY = event.clientY;
        }
    });

    canvas.addEventListener("mousemove", function(event) {
        if (isDragging) {
            var deltaX = event.clientX - previousMouseX;
            var deltaY = event.clientY - previousMouseY;
            
            cameraAngleY += deltaX * 0.01;
            cameraAngleX += deltaY * 0.01;
            
            cameraAngleX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraAngleX));

            previousMouseX = event.clientX;
            previousMouseY = event.clientY;

            updateCamera();
        }
    });

    canvas.addEventListener("contextmenu", function(event) {
        event.preventDefault();
    });
    canvas.addEventListener("mouseup", function(event) {
        if (event.button === 2) {
            isDragging = false;
        }
    });
    canvas.addEventListener("wheel", function (event) {
        event.preventDefault(); // no def behav

        if (event.deltaY < 0) {
            cameraDistance = Math.max(10, cameraDistance - 1); // in
        } else {
            cameraDistance = Math.min(100, cameraDistance + 1); // out
        }

        updateCamera();
    });

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
    gl.enable(gl.DEPTH_TEST);
    // gl.enable(gl.POLYGON_OFFSET_FILL);
    // gl.polygonOffset(1.0, 1.0);
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    program = initShaders( gl, "vertex-shader", "fragment-shader");
    gl.useProgram( program);
    instanceMatrix = mat4();
    projectionMatrix = perspective(45.0, canvas.width / canvas.height, 0.5, 100.0);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"), false, flatten(projectionMatrix));
        modelViewMatrix = mat4();   
    gl.uniformMatrix4fv(gl.getUniformLocation( program, "modelViewMatrix"), false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv( gl.getUniformLocation( program, "projectionMatrix"), false, flatten(projectionMatrix) );
    
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix")

    vBuffer = gl.createBuffer();
        
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    let selectedPartId = bodyId;

    document.getElementById("partDropdown").onchange = function (event) {
        const selectedValue = event.target.value;
        selectedPartId = eval(selectedValue);

        sliderX.value = theta[selectedPartId][0] || 0;
        sliderY.value = theta[selectedPartId][1] || 0;
        sliderZ.value = theta[selectedPartId][2] || 0;

        inputX.value = theta[selectedPartId][0] || 0;
        inputY.value = theta[selectedPartId][1] || 0;
        inputZ.value = theta[selectedPartId][2] || 0;
    };
    // slider and input for X-axis
    sliderX.oninput = function (event) {
        const value = parseFloat(event.target.value);
        theta[selectedPartId][0] = value;
        inputX.value = value;
        initNodes(selectedPartId);
    };
    inputX.oninput = function (event) {
        const value = parseFloat(event.target.value);
        if (!isNaN(value) && value >= -180 && value <= 180) {
            theta[selectedPartId][0] = value;
            sliderX.value = value;
            initNodes(selectedPartId);
        }
    };
    // slider and input for y-axis
    sliderY.oninput = function (event) {
        const value = parseFloat(event.target.value);
        theta[selectedPartId][1] = value;
        inputY.value = value;
        initNodes(selectedPartId);
    };
    inputY.oninput = function (event) {
        const value = parseFloat(event.target.value);
        if (!isNaN(value) && value >= -180 && value <= 180) {
            theta[selectedPartId][1] = value;
            sliderY.value = value;
            initNodes(selectedPartId);
        }
    };
    // slider and input for z-axis
    sliderZ.oninput = function (event) {
        const value = parseFloat(event.target.value);
        theta[selectedPartId][2] = value;
        inputZ.value = value;
        initNodes(selectedPartId);
    };
    inputZ.oninput = function (event) {
        const value = parseFloat(event.target.value);
        if (!isNaN(value) && value >= -180 && value <= 180) {
            theta[selectedPartId][2] = value;
            sliderZ.value = value;
            initNodes(selectedPartId);
        }
    };

    for(i=0; i<numNodes; i++) initNodes(i);
    render();
};
function createTrees() {
    // Tree 1
    drawTree(20, -5, -20, 1.0, 4, 1.0, 2.5, 2.5, 2.5);
    
    // Tree 2
    drawTree(-20, -5.5, 10, 1.0, 5, 1.0, 2.5, 2.5, 2.5);
}
function drawTree(x, y, z, trunkRadius, trunkHeight, trunkDepth, leavesRadius, leavesHeight, leavesDepth) {

    // Trunk
    gl.uniform4fv(gl.getUniformLocation(program, "color"), vec4(0.55, 0.27, 0.07, 1.0));
    cylinder(32, trunkRadius, trunkHeight); 
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    var trunkMatrix = mult(modelViewMatrix, translate(x, y + trunkHeight / 2, z));
    trunkMatrix = mult(trunkMatrix, scale4(trunkRadius, trunkHeight, trunkDepth));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(trunkMatrix));
    for (let i = 0; i < pointsArray.length; i += 3) gl.drawArrays(gl.TRIANGLES, i, 3);

    // Leaves
    gl.uniform4fv(gl.getUniformLocation(program, "color"), vec4(0.0, 0.8, 0.0, 1.0));
    sphere(32, leavesRadius);
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    var leavesMatrix = mult(modelViewMatrix, translate(x, y + trunkHeight*2+12 + leavesHeight / 2 , z));
    leavesMatrix = mult(leavesMatrix, scale4(leavesRadius, leavesHeight, leavesDepth));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(leavesMatrix));
    for (let i = 0; i < pointsArray.length; i += 3) gl.drawArrays(gl.TRIANGLES, i, 3);
}
function createGround() {
    gl.uniform4fv(gl.getUniformLocation(program, "color"), vec4(0.0, 1.0, 0.0, 1.0));
    regularCube();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    var groundMatrix = mult(modelViewMatrix, translate(0.0, -3, 0.0));
    groundMatrix = mult(groundMatrix, scale4(60, 0.1, 60));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(groundMatrix));
    for (let i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}
// code taken from WebGL fundementals and/or files for sphere
function updateCamera() {

    var eyeX = cameraDistance * Math.sin(cameraAngleY) * Math.cos(cameraAngleX);
    var eyeY = cameraDistance * Math.sin(cameraAngleX);
    var eyeZ = cameraDistance * Math.cos(cameraAngleY) * Math.cos(cameraAngleX);

    var eye = vec3(eyeX, eyeY, eyeZ);
    var at = vec3(0.0, 0.0, 0.0);  // dragon's center
    var up = vec3(0.0, 1.0, 0.0);

    modelViewMatrix = lookAt(eye, at, up);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
}

var render = function() {

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    //gl.clear(gl.COLOR_BUFFER_BIT);
    updateCamera();
    createTrees();
    createGround();
    traverse(bodyId);
    requestAnimFrame(render);
}