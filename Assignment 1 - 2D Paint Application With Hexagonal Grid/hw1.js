var hexagon_list=[];
for (let layer = 0; layer < 3; layer++) {
    hexagon_list.push([]);
    for(let column = 0; column < 47; column++){
        hexagon_list[layer].push([]);
        for (let row = 0; row < 35; row++) {
            hexagon_list[layer][column].push(-1);        
        }
    }
}
var canvas, gl, index = 0;
var hexSize = 0.04; // Size of hexagons
var maxNumVertices = 6 * 10000; // Max number of vertices
var eraseMode = false;
var drawMode = true;
var isMouseDown = false;
var lineMode = false;
var undoStack = [];
var redoStack = [];
const MAX_STACK_SIZE = 20; 
var found = false;
var startPoint;
var endPoint;
var s_matrix = mat4(1);
var t_matrix = mat4(1);
var uniform;
var isSelecting = false;
var startX, startY, endX, endY;
var indexChange = 0;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    //button listeners
    document.getElementById('undo-button').addEventListener('click', undoAction);
    document.getElementById('redo-button').addEventListener('click', redoAction);
    document.getElementById("swap1_3_button").addEventListener("click", swap1_3);
    document.getElementById("swap1_2_button").addEventListener("click", swap1_2);
    document.getElementById("swap2_3_button").addEventListener("click", swap2_3);
    document.getElementById("save").addEventListener("click", function () {
        var stringified = JSON.stringify({grid: hexagon_list});
        document.getElementById("save").href = "data:application/xml;charset=utf-8," + stringified;
    });
    document.getElementById("load").addEventListener("change", function (e) { 
        var reader = new FileReader();
        reader.readAsText(e.target.files[0], "utf-8");
        reader.onload = readerEvent => {
            var content = readerEvent.target.result;
            var data = JSON.parse(content);

            hexagon_list = data.grid;
            index = 0; 
            for(let column = 0; column < 47; column++){
                for (let row = 0; row < 35; row++) {
                    for (let layer = 0; layer < 3; layer++) {
                        if(hexagon_list[layer][column][row] !== -1){
                            var hexVertices = getHexagonVertices({ q: column-23, r: row-17  });
                            gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
                            for (var i = 0; i < hexVertices.length; i++) {
                                gl.bufferSubData(gl.ARRAY_BUFFER, 8 * (index + i), flatten(hexVertices[i]));
                            }
                            gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
                            for (var i = 0; i < 6; i++) {
                                gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (index + i), flatten(hexagon_list[layer][column][row]));
                            }
                            index += 6;
                            break;
                        }
                    }       
                }
            }  
        }
     });

    //click
    canvas.addEventListener("mousedown", function (event) {
        const copiedHexagonList = hexagon_list.map(layer => layer.map(column => column.slice()));

        undoStack.push(copiedHexagonList);   
        if (undoStack.length > MAX_STACK_SIZE) {
            undoStack.shift(); 
        }     
        redoStack.length = 0;
        isMouseDown = true;

        lineMode = document.getElementById("line-mode").checked;

        if (lineMode) {
            startPoint = getMousePosition(event);
        }else
            stroke(event);
    });

    //moving after click
    canvas.addEventListener("mousemove", function(event){
        lineMode = document.getElementById("line-mode").checked;
        if(isMouseDown && !lineMode)
        {
            stroke(event);
        }else if(isMouseDown && lineMode){
            endPoint = getMousePosition(event);

            index -= indexChange;
            drawLine(startPoint, endPoint);
        }

    });

    //click end
    canvas.addEventListener("mouseup", function(event){
        lineMode = document.getElementById("line-mode").checked;

        isMouseDown = false;
        if (lineMode) {
            endPoint = getMousePosition(event);
            index -= indexChange;
            indexChange = 0;
            drawLine(startPoint, endPoint);
        }
    });
    
    //wheel to zoom in/out
    canvas.addEventListener("wheel", function (event) {
        event.preventDefault();

        var direction = event.deltaY > 0 ? -1 : 1;

        var end = s_matrix[0][0] + direction * 0.1;
        if (end <= 0.1 || end >= 10) {
            return;
        }

        s_matrix[0][0] += direction * 0.05;
        s_matrix[1][1] += direction * 0.05;
        s_matrix[2][2] += direction * 0.05;

    });

    //keyboard listener to pan movement
    document.addEventListener('keydown', (event) => {
        let speed = 0.2;  
    
        if (event.key === 'ArrowUp') {
            t_matrix = mult(translate(0, -speed, 0), t_matrix); // Pan up
        } else if (event.key === 'ArrowDown') {
            t_matrix = mult(translate(0, speed, 0), t_matrix); // Pan down
        } else if (event.key === 'ArrowLeft') {
            t_matrix = mult(translate(speed, 0, 0), t_matrix);  // Pan left
        } else if (event.key === 'ArrowRight') {
            t_matrix = mult(translate(-speed, 0, 0), t_matrix);  // Pan right
        }
    });
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1, 1, 1, 1);

    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Set up position buffer
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 8 * maxNumVertices, gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Set up color buffer
    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 16 * maxNumVertices, gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
    
    uniform = gl.getUniformLocation(program, "matrix");

    // brush/erase stroke calculator 
    function stroke(event) {
        var drawMode = document.getElementById("draw-mode").checked;
        var eraseMode = document.getElementById("erase-mode").checked;

        const selectedLayer = parseInt(document.querySelector('input[name="layer"]:checked').value);

        var redSlider = document.getElementById("red-slider").value / 255;
        var greenSlider = document.getElementById("green-slider").value / 255;
        var blueSlider = document.getElementById("blue-slider").value / 255;

        var mousePos = getMousePosition(event);
        var hex = pixelToHex(mousePos.x, mousePos.y);
        var hexVertices = getHexagonVertices(hex);

        for (let higherLevel = 0; higherLevel < selectedLayer; higherLevel++) {
            let hexColor = hexagon_list[higherLevel][hex.q + 23][hex.r + 17];
            if (hexColor && hexColor !== -1) {
                if (eraseMode) {
                    hexagon_list[selectedLayer][hex.q + 23][hex.r + 17]=-1;
                } else {
                    hexagon_list[selectedLayer][hex.q + 23][hex.r + 17]=[redSlider,greenSlider,blueSlider,1] 
                }
                return;
            }
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        for (var i = 0; i < hexVertices.length; i++) {
            gl.bufferSubData(gl.ARRAY_BUFFER, 8 * (index + i), flatten(hexVertices[i]));
        }

        // Assign color
        gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
        if(drawMode){
            hexagon_list[selectedLayer][hex.q+23][hex.r+17] = [redSlider, greenSlider, blueSlider,1];
            var color = vec4(redSlider, greenSlider, blueSlider,1); // Color for each hexagon
        }
        else if(eraseMode){
            hexagon_list[selectedLayer][hex.q+23][hex.r+17] = -1;
            if(selectedLayer==2){
                var color = vec4(1,1,1,1);
            }else{
                for (let lowerLayer = selectedLayer+1; lowerLayer < 3; lowerLayer++) {
                    let hexColor = hexagon_list[lowerLayer][hex.q + 23][hex.r + 17];
                    if (hexColor && hexColor !== -1) { 
                        var color = vec4(hexColor);   
                        break;  
                    }
                    var color = vec4(1,1,1,1);
                }
            }
        }

        for (var i = 0; i < 6; i++) {
            gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (index + i), flatten(color));
        }
        index += 6; 
    }

    //draw line from start and end point
    function drawLine(startPoint, endPoint) {

        const startHex = pixelToHex(startPoint.x, startPoint.y);
        const endHex = pixelToHex(endPoint.x, endPoint.y);

        const dx = endHex.q - startHex.q;
        const dy = endHex.r - startHex.r;

        const steps = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dx + dy));

        const incrementQ = dx / steps;
        const incrementR = dy / steps;
        
        let currentQ = startHex.q;
        let currentR = startHex.r;
        let firstIndex = index;
        for (let i = 0; i <= steps; i++) {
            // nearest hex
            
            const hex = axialRound({ q: currentQ, r: currentR });
            var hexVertices = getHexagonVertices(hex);
    
            // color pick
            const selectedLayer = parseInt(document.querySelector('input[name="layer"]:checked').value);
            const redSlider = document.getElementById("red-slider").value / 255;
            const greenSlider = document.getElementById("green-slider").value / 255;
            const blueSlider = document.getElementById("blue-slider").value / 255;
            
            let skip = false;
            for (let higherLevel = 0; higherLevel < selectedLayer; higherLevel++) {
                if (hexagon_list[higherLevel][hex.q + 23][hex.r + 17] !== -1) { // Assuming -1 indicates no color
                    if (!isMouseDown) {
                        hexagon_list[selectedLayer][hex.q + 23][hex.r + 17]=[redSlider,greenSlider,blueSlider,1];
                        skip = true;
                    } 
                }
            }
            if (skip) {
                currentQ += incrementQ;
                currentR += incrementR;
                continue;
            }
            // vertices
            gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
            for (var j = 0; j < hexVertices.length; j++) {
                gl.bufferSubData(gl.ARRAY_BUFFER, 8 * (index + j), flatten(hexVertices[j]));
            }
            // color
            gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
            if (!isMouseDown) {
                hexagon_list[selectedLayer][hex.q+23][hex.r+17] = [redSlider, greenSlider, blueSlider,1];
            }
            var color = vec4(redSlider, greenSlider, blueSlider,1); 
    
            for (var j = 0; j < 6; j++) {
                gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (index + j), flatten(color));
            }
            index += 6; 

            currentQ += incrementQ;
            currentR += incrementR;
        }
        indexChange = index-firstIndex;
        if (!isMouseDown) {
            indexChange=0;
        }
    }


    // undo from undostack and send current to redo
    function undoAction() {
        if (undoStack.length === 0)
            return;
        const lastStroke = undoStack.pop();  
        if (lastStroke.type === 'swap') {
            
            swapLayers(lastStroke.layer1, lastStroke.layer2);
            redoStack.push({
                type: 'swap',
                layer1: lastStroke.layer1,
                layer2: lastStroke.layer2
            });
            if (redoStack.length > MAX_STACK_SIZE) {
                redoStack.shift(); 
            }
            return;
        }
        redoStack.push(hexagon_list.map(layer => layer.map(column => column.slice()))); 
        if (redoStack.length > MAX_STACK_SIZE) {
            redoStack.shift(); 
        }

        var lastLayer = -1;
        for (let layer = 0; layer < 3; layer++) {
            for (let column = 0; column < 47; column++) {
                for (let row = 0; row < 35; row++) {
                    if (lastStroke[layer][column][row] !== hexagon_list[layer][column][row]) {
                        lastLayer=layer;
                    }
                }
            }
        }
        if (lastLayer!==-1) {
            for (let column = 0; column < 47; column++) {
                for (let row = 0; row < 35; row++) {
                    if (lastStroke[lastLayer][column][row] !== hexagon_list[lastLayer][column][row]) {
                        if (lastStroke[lastLayer][column][row] !== hexagon_list[lastLayer][column][row]) {//hexagon_list[column][row]
                            for (let higherLevel = 0; higherLevel < lastLayer; higherLevel++) {
                                let hexColor = hexagon_list[higherLevel][column][row];
                                if (hexColor && hexColor !== -1) {
                                    found= true;
                                }
                            }
                            if(found){
                                found=false;
                                continue;
                            }
                            if (lastStroke[lastLayer][column][row] === -1) {
                                
                                var hexVertices = getHexagonVertices({ q: column-23, r: row-17 });
                                gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
                                for (var i = 0; i < hexVertices.length; i++) {
                                    gl.bufferSubData(gl.ARRAY_BUFFER, 8 * (index + i), flatten(hexVertices[i]));
                                }
                                gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);    
                                for (var i = 0; i < 6; i++) {
                                    gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (index + i), flatten([1,1,1,1]));
                                }
                                index += 6;
                            } else {

                                var hexVertices = getHexagonVertices({ q: column-23, r: row-17  });
            
                                gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
                                for (var i = 0; i < hexVertices.length; i++) {
                                    gl.bufferSubData(gl.ARRAY_BUFFER, 8 * (index + i), flatten(hexVertices[i]));
                                }
                                gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
                                for (var i = 0; i < 6; i++) {
                                    gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (index + i), flatten(lastStroke[lastLayer][column][row]));
                                }
                                index += 6;
                            }
                            
                        }                    
                    }
                }
            }
        }
        hexagon_list = lastStroke;
    }

    // redo from redostack and send current to undo
    function redoAction() {
        if (redoStack.length === 0)
            return;
        const lastStroke = redoStack.pop();  
        if (lastStroke.type === 'swap') {
            swapLayers(lastStroke.layer1, lastStroke.layer2);
            undoStack.push({
                type: 'swap',
                layer1: lastStroke.layer1,
                layer2: lastStroke.layer2
            });
            if (undoStack.length > MAX_STACK_SIZE) {
                undoStack.shift(); 
            }
            return;
        }
        undoStack.push(hexagon_list.map(layer => layer.map(column => column.slice()))); 
        if (undoStack.length > MAX_STACK_SIZE) {
            undoStack.shift(); 
        }

        var lastLayer = -1;
        for (let layer = 0; layer < 3; layer++) {
            for (let column = 0; column < 47; column++) {
                for (let row = 0; row < 35; row++) {
                    if (lastStroke[layer][column][row] !== hexagon_list[layer][column][row]) {
                        lastLayer=layer;
                    }
                }
            }
        }
        if (lastLayer!==-1) {
            for (let column = 0; column < 47; column++) {
                for (let row = 0; row < 35; row++) {
                    if (lastStroke[lastLayer][column][row] !== hexagon_list[lastLayer][column][row]) {
                        if (lastStroke[lastLayer][column][row] !== hexagon_list[lastLayer][column][row]) {//hexagon_list[column][row]
                            for (let higherLevel = 0; higherLevel < lastLayer; higherLevel++) {
                                let hexColor = hexagon_list[higherLevel][column][row];
                                if (hexColor && hexColor !== -1) {
                                    found= true;
                                }
                            }
                            if(found){
                                found=false;
                                continue;
                            }
                            if (lastStroke[lastLayer][column][row] === -1) {
                                
                                var hexVertices = getHexagonVertices({ q: column-23, r: row-17 });
                                gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
                                for (var i = 0; i < hexVertices.length; i++) {
                                    gl.bufferSubData(gl.ARRAY_BUFFER, 8 * (index + i), flatten(hexVertices[i]));
                                }
                                gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);    
                                for (var i = 0; i < 6; i++) {
                                    gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (index + i), flatten([1,1,1,1]));
                                }
                                index += 6;
                            } else {
                                var hexVertices = getHexagonVertices({ q: column-23, r: row-17  });
            
                                gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
                                for (var i = 0; i < hexVertices.length; i++) {
                                    gl.bufferSubData(gl.ARRAY_BUFFER, 8 * (index + i), flatten(hexVertices[i]));
                                }
                                gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
                                for (var i = 0; i < 6; i++) {
                                    gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (index + i), flatten(lastStroke[lastLayer][column][row]));
                                }
                                index += 6;
                            }        
                        }                    
                    }
                }
            }
        }

        hexagon_list = lastStroke; 
    }


    function swapLayers(layerIndex1, layerIndex2) {
        // Swap layers 
        [hexagon_list[layerIndex1], hexagon_list[layerIndex2]] = [hexagon_list[layerIndex2], hexagon_list[layerIndex1]]
        
        for(let column = 0; column < 47; column++){
            for (let row = 0; row < 35; row++) {
                if(hexagon_list[layerIndex1][column][row] !== -1 || hexagon_list[layerIndex2][column][row] !== -1){
                    for (let layer = 0; layer < 3; layer++) {
                        if (hexagon_list[layer][column][row] !== -1) {
                            var hexVertices = getHexagonVertices({ q: column-23, r: row-17  });                
                            gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
                            for (var i = 0; i < hexVertices.length; i++) {
                                gl.bufferSubData(gl.ARRAY_BUFFER, 8 * (index + i), flatten(hexVertices[i]));
                            }
                            gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
                            for (var i = 0; i < 6; i++) {
                                gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (index + i), flatten(hexagon_list[layer][column][row]));
                            }
                            index += 6;
                            break;
                        }
                    }
                }        
            }
        }
                
    }
    // swap for each state
    function swap1_3() {
        undoStack.push({
            type: 'swap',
            layer1: 0,
            layer2: 2
        });
        if (undoStack.length > MAX_STACK_SIZE) {
            undoStack.shift(); 
        }
        redoStack.length = 0;
        swapLayers(0, 2); 
    }
    
    function swap1_2() {
        undoStack.push({
            type: 'swap',
            layer1: 0,
            layer2: 1
        });
        if (undoStack.length > MAX_STACK_SIZE) {
            undoStack.shift(); 
        }
        redoStack.length = 0;
        swapLayers(0, 1); 
    }
    
    function swap2_3() {
        undoStack.push({
            type: 'swap',
            layer1: 1,
            layer2: 2
        });
        if (undoStack.length > MAX_STACK_SIZE) {
            undoStack.shift(); 
        }
        redoStack.length = 0;
        swapLayers(1, 2); 
    }
    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT);

        //view
        var matrix = mult(t_matrix, mult(s_matrix, mat4(1)));
        gl.uniformMatrix4fv(uniform, false, flatten(matrix));
        //hexagons
        for (var i = 0; i < index; i += 6) {
            gl.drawArrays(gl.TRIANGLE_FAN, i, 6);
        }

        window.requestAnimFrame(render);
    }
    render();
};

// pixel to hex coordinates
function pixelToHex(x, y) {
    var q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / hexSize;
    var r = (2 / 3 * y) / hexSize;
    
    return axialRound({ q: q, r: r });
}


// nearest hex rounder
function axialRound(h) {
    var q = Math.round(h.q);
    var r = Math.round(h.r);
    var s = -q - r;

    var q_diff = Math.abs(q - h.q);
    var r_diff = Math.abs(r - h.r);
    var s_diff = Math.abs(s - (-h.q - h.r));

    if (q_diff > r_diff && q_diff > s_diff) {
        q = -r - s;
    } else if (r_diff > s_diff) {
        r = -q - s;
    }

    return { q: q, r: r };
}

// hex vertices from hex coordinates
function getHexagonVertices(hex) {


    var x = hexSize * Math.sqrt(3) * (hex.q + hex.r / 2);
    var y = hexSize * 3 / 2 * hex.r;
    var vertices = [];
    for (var i = 0; i < 6; i++) {
        var angle = 2 * Math.PI / 6 * (i + 0.5);
        var vx = x + hexSize * Math.cos(angle);
        var vy = y + hexSize * Math.sin(angle);
        vertices.push(vec2(vx, vy));
    }
    return vertices;
}


// get webgl coordinates from mouse click
function getMousePosition(event) {
    var area = canvas.getBoundingClientRect();
    var x = ((event.clientX - area.left) / canvas.width) * 2 - 1;
    var y = ((canvas.height - (event.clientY - area.top)) / canvas.height) * 2 - 1;
    return { x: x, y: y };
}