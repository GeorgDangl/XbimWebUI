﻿
function xNavigationCube(locale) {
    this.TOP = 1600000;
    this.BOTTOM = 1600001;
    this.LEFT = 1600002;
    this.RIGHT = 1600003;
    this.FRONT = 1600004;
    this.BACK = 1600005;

    this.TOP_LEFT_FRONT = 1600006;
    this.TOP_RIGHT_FRONT = 1600007;
    this.TOP_LEFT_BACK = 1600008;
    this.TOP_RIGHT_BACK = 1600009;
    this.BOTTOM_LEFT_FRONT = 1600010;
    this.BOTTOM_RIGHT_FRONT = 1600011;
    this.BOTTOM_LEFT_BACK = 1600012;
    this.BOTTOM_RIGHT_BACK = 1600013;



    this._initialized = false;

    this.locale = typeof (locale) !== "undefined" ? locale : "en";
    if (typeof (xCubeTextures[this.locale]) === "undefined")
        throw new Error("Locale " + this.locale + " doesn't exist");
}

xNavigationCube.prototype.init = function (xviewer) {
    var self = this;
    this.viewer = xviewer;
    this.ratio = 0.1;
    var gl = this.viewer._gl;

    //create own shader 
    this._shader = null;
    this._initShader();

    this.alpha = 1.0;
    this.selection = 0.0;

    //set own shader for init
    gl.useProgram(this._shader);

    //create uniform and attribute pointers
    this._pMatrixUniformPointer = gl.getUniformLocation(this._shader, "uPMatrix");
    this._rotationUniformPointer = gl.getUniformLocation(this._shader, "uRotation");
    this._colourCodingUniformPointer = gl.getUniformLocation(this._shader, "uColorCoding");
    this._alphaUniformPointer = gl.getUniformLocation(this._shader, "uAlpha");
    this._selectionUniformPointer = gl.getUniformLocation(this._shader, "uSelection");
    this._textureUniformPointer = gl.getUniformLocation(this._shader, "uTexture");

    this._vertexAttrPointer = gl.getAttribLocation(this._shader, "aVertex"),
    this._texCoordAttrPointer = gl.getAttribLocation(this._shader, "aTexCoord"),
    this._idAttrPointer = gl.getAttribLocation(this._shader, "aId"),
    gl.enableVertexAttribArray(this._vertexAttrPointer);
    gl.enableVertexAttribArray(this._texCoordAttrPointer);
    gl.enableVertexAttribArray(this._idAttrPointer);

    //feed data into the GPU and keep pointers
    this._indexBuffer = gl.createBuffer();
    this._vertexBuffer = gl.createBuffer();
    this._texCoordBuffer = gl.createBuffer();
    this._idBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.txtCoords, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._idBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.ids(), gl.STATIC_DRAW);

    //create texture
    var txtData = xCubeTextures[this.locale];
    var txtImage = new Image();
    txtImage.src = txtData;
    this._texture = gl.createTexture();

    //load image texture into GPU
    gl.bindTexture(gl.TEXTURE_2D, this._texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, txtImage);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);


    //reset original shader program 
    gl.useProgram(this.viewer._shaderProgram);

    xviewer._canvas.addEventListener('mousemove', function (event) {
        startX = event.clientX;
        startY = event.clientY;

        //get coordinates within canvas (with the right orientation)
        var r = xviewer._canvas.getBoundingClientRect();
        var viewX = startX - r.left;
        var viewY = xviewer._height - (startY - r.top);

        //this is for picking
        var id = xviewer._getID(viewX, viewY);

        if (id >= self.TOP && id <= self.BACK) {
            self.alpha = 1.0;
            self.selection = id;
        } else {
            self.alpha = 0.6;
        }
    }, true);

    this._initialized = true;

}

xNavigationCube.prototype.onBeforeDraw = function () { };

xNavigationCube.prototype.onBeforePick = function (id) {
    if (id >= this.TOP && id <= this.BACK) {
        switch (id) {
            case this.TOP:
                this.viewer.show('top');
                return true;
            case this.BOTTOM:
                this.viewer.show('bottom');
                return true;
            case this.LEFT:
                this.viewer.show('left');
                return true;
            case this.RIGHT:
                this.viewer.show('right');
                return true;
            case this.FRONT:
                this.viewer.show('front');
                return true;
            case this.BACK:
                this.viewer.show('back');
                return true;
            default:
                return false;
        }
    }
};

xNavigationCube.prototype.onAfterDraw = function() {
    var gl = this.setActive();
    //set uniform for colour coding to false
    gl.uniform1i(this._colourCodingUniformPointer, 0);
    this.draw();
    this.setInactive();
};

xNavigationCube.prototype.onBeforeDrawId = function () { };

xNavigationCube.prototype.onAfterDrawId = function () {
    var gl = this.setActive();
    //set uniform for colour coding to false
    gl.uniform1i(this._colourCodingUniformPointer, 1);
    this.draw();
    this.setInactive();
};

xNavigationCube.prototype.onBeforeGetId = function(id) { }

xNavigationCube.prototype.setActive = function() {
    var gl = this.viewer._gl;
    //set own shader
    gl.useProgram(this._shader);

    return gl;
};

xNavigationCube.prototype.setInactive = function () {
    var gl = this.viewer._gl;
    //set viewer shader
    gl.useProgram(this.viewer._shaderProgram);
};

xNavigationCube.prototype.draw = function () {
    if (!this._initialized) return;

    var gl = this.viewer._gl;

    //set navigation data from xViewer to this shader
    var pMatrix = mat4.create();
    var height = 1.0 / this.ratio;
    var width = height / this.viewer._height * this.viewer._width;

    //create orthogonal projection matrix
    mat4.ortho(pMatrix,
        (this.ratio - 1.0) * width, //left
        this.ratio * width, //right
        this.ratio * -1.0 * height, //bottom
        (1.0 - this.ratio) * height,  //top
        -1,  //near
        1 ); //far

    //extract just a rotation from model-view matrix
    var rotation = mat3.fromMat4(mat3.create(), this.viewer._mvMatrix);
    gl.uniformMatrix4fv(this._pMatrixUniformPointer, false, pMatrix);
    gl.uniformMatrix3fv(this._rotationUniformPointer, false, rotation);
    gl.uniform1f(this._alphaUniformPointer, this.alpha);
    gl.uniform1f(this._selectionUniformPointer, this.selection);

    //bind data buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.vertexAttribPointer(this._vertexAttrPointer, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._idBuffer);
    gl.vertexAttribPointer(this._idAttrPointer, 1, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordBuffer);
    gl.vertexAttribPointer(this._texCoordAttrPointer, 2, gl.FLOAT, false, 0, 0);

    //bind texture
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this._texture);
    gl.uniform1i(this._textureUniformPointer, 1);

    var cfEnabled = gl.getParameter(gl.CULL_FACE);
    if (!cfEnabled) gl.enable(gl.CULL_FACE);

    //draw the cube as an element array
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);

    if (!cfEnabled) gl.disable(gl.CULL_FACE);

};

xNavigationCube.prototype._initShader = function () {

    var gl = this.viewer._gl;
    var viewer = this.viewer;
    var compile = function (shader, code) {
        gl.shaderSource(shader, code);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            viewer._error(gl.getShaderInfoLog(shader));
            return null;
        }
    }

    //fragment shader
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    compile(fragmentShader, xShaders.cube_fshader);

    //vertex shader (the more complicated one)
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    compile(vertexShader, xShaders.cube_vshader);

    //link program
    this._shader = gl.createProgram();
    gl.attachShader(this._shader, vertexShader);
    gl.attachShader(this._shader, fragmentShader);
    gl.linkProgram(this._shader);

    if (!gl.getProgramParameter(this._shader, gl.LINK_STATUS)) {
        viewer._error('Could not initialise shaders for a navigation cube plugin');
    }
};

//// Front face
//-0.5, -0.5, -0.5,
// 0.5, -0.5, -0.5,
// 0.5, -0.5, 0.5,
//-0.5, -0.5, 0.5,
//
//// Back face
//-0.5, 0.5, -0.5,
//-0.5, 0.5, 0.5,
// 0.5, 0.5, 0.5,
// 0.5, 0.5, -0.5,
//
//
//// Top face
//-0.5, -0.5, 0.5,
// 0.5, -0.5, 0.5,
// 0.5, 0.5, 0.5,
//-0.5, 0.5, 0.5,
//
//// Bottom face
//-0.5, -0.5, -0.5,
//-0.5, 0.5, -0.5,
// 0.5, 0.5, -0.5,
// 0.5, -0.5, -0.5,
//
//// Right face
// 0.5, -0.5, -0.5,
// 0.5, 0.5, -0.5,
// 0.5, 0.5, 0.5,
// 0.5, -0.5, 0.5,
//
//// Left face
//-0.5, -0.5, -0.5,
//-0.5, -0.5, 0.5,
//-0.5, 0.5, 0.5,
//-0.5, 0.5, -0.5,


xNavigationCube.prototype.vertices = new Float32Array([
      // Front face
      -0.4, -0.5, -0.4,
       0.4, -0.5, -0.4,
       0.4, -0.5,  0.4, 
      -0.4, -0.5,  0.4, 

      // Back face
      -0.4, 0.5, -0.4, 
      -0.4, 0.5,  0.4,  
       0.4, 0.5,  0.4,  
       0.4, 0.5, -0.4, 

      
      // Top face
      -0.4, -0.4, 0.5, 
       0.4, -0.4, 0.5, 
       0.4,  0.4, 0.5,  
      -0.4,  0.4, 0.5,  

      // Bottom face
      -0.4, -0.4, -0.5,
      -0.4,  0.4, -0.5, 
       0.4,  0.4, -0.5, 
       0.4, -0.4, -0.5,

      // Right face
       0.5, -0.4, -0.4,
       0.5,  0.4, -0.4, 
       0.5,  0.4,  0.4,  
       0.5, -0.4,  0.4, 

      // Left face
      -0.5, -0.4, -0.4,
      -0.5, -0.4,  0.4, 
      -0.5,  0.4,  0.4,  
      -0.5, 0.4, -0.4,

      //top - left - front (--+)
      -0.5, -0.5, 0.5, //corner
      -0.4, -0.5, 0.5,
      -0.4, -0.4, 0.5,
      -0.5, -0.4, 0.5,

      -0.5, -0.5, 0.4,
      -0.5, -0.5, 0.5, //corner
      -0.5, -0.4, 0.5,
      -0.5, -0.4, 0.4,

      -0.5, -0.5, 0.4,
      -0.4, -0.5, 0.4,
      -0.4, -0.5, 0.5,
      -0.5, -0.5, 0.5, //corner

      //top-right-front (+-+)
       0.4, -0.5, 0.5,
       0.5, -0.5, 0.5, //corner
       0.5, -0.4, 0.5,
       0.4, -0.4, 0.5,

      0.5, -0.5, 0.4,
      0.5, -0.4, 0.4,
      0.5, -0.4, 0.5,
      0.5, -0.5, 0.5, //corner

      0.4, -0.5, 0.4,
      0.5, -0.5, 0.4,
      0.5, -0.5, 0.5, //corner
      0.4, -0.5, 0.5,

      //top-left-back (-++)
      -0.5, 0.4, 0.5,
       -0.4, 0.4, 0.5,
       -0.4, 0.5, 0.5,
      -0.5, 0.5, 0.5,

      -0.5, 0.4, 0.4,
      -0.5, 0.4, 0.5,
      -0.5, 0.5, 0.5,
      -0.5, 0.5, 0.4,

      -0.5, 0.5, 0.4,
      -0.5, 0.5, 0.5,
      -0.4, 0.5, 0.5,
      -0.4, 0.5, 0.4,

]);

xNavigationCube.prototype.indices = new Uint16Array([
    0, 1, 2, 0, 2, 3, // Front face
    4, 5, 6, 4, 6, 7, // Back face
    8, 9, 10, 8, 10, 11, // Top face
    12, 13, 14, 12, 14, 15, // Bottom face
    16, 17, 18, 16, 18, 19, // Right face
    20, 21, 22, 20, 22, 23, // Left face

    //top - left - front (--+)
    0 + 24, 1 + 24, 2 + 24, 0 + 24, 2 + 24, 3 + 24,
    4 + 24, 5 + 24, 6 + 24, 4 + 24, 6 + 24, 7 + 24,
    8 + 24, 9 + 24, 10 + 24, 8 + 24, 10 + 24, 11 + 24,

    //top-right-front (+-+)
    0 + 36, 1 + 36, 2 + 36, 0 + 36, 2 + 36, 3 + 36,
    4 + 36, 5 + 36, 6 + 36, 4 + 36, 6 + 36, 7 + 36,
    8 + 36, 9 + 36, 10 + 36, 8 + 36, 10 + 36, 11 + 36,

    //top-left-back (-++)
    0 + 48, 1 + 48, 2 + 48, 0 + 48, 2 + 48, 3 + 48,
    4 + 48, 5 + 48, 6 + 48, 4 + 48, 6 + 48, 7 + 48,
    8 + 48, 9 + 48, 10 + 48, 8 + 48, 10 + 48, 11 + 48,

]);

//// Front face
//1.0 / 3.0, 0.0 / 3.0,
//2.0 / 3.0, 0.0 / 3.0,
//2.0 / 3.0, 1.0 / 3.0,
//1.0 / 3.0, 1.0 / 3.0,
//
//// Back face
//1.0, 0.0 / 3.0,
//1.0, 1.0 / 3.0,
//2.0 / 3.0, 1.0 / 3.0,
//2.0 / 3.0, 0.0 / 3.0,
//
//
//// Top face
//2.0 / 3.0, 1.0 / 3.0,
//1.0, 1.0 / 3.0,
//1.0, 2.0 / 3.0,
//2.0 / 3.0, 2.0 / 3.0,
//
//// Bottom face
//0.0, 1.0 / 3.0,
//0.0, 0.0 / 3.0,
//1.0 / 3.0, 0.0 / 3.0,
//1.0 / 3.0, 1.0 / 3.0,
//
//// Right face
//0.0, 1.0 / 3.0,
//1.0 / 3.0, 1.0 / 3.0,
//1.0 / 3.0, 2.0 / 3.0,
//0.0, 2.0 / 3.0,
//
//// Left face
//2.0 / 3.0, 1.0 / 3.0,
//2.0 / 3.0, 2.0 / 3.0,
//1.0 / 3.0, 2.0 / 3.0,
//1.0 / 3.0, 1.0 / 3.0

xNavigationCube.prototype.txtCoords = new Float32Array([
      // Front face
      1.0 / 3.0 + 1.0 / 15.0, 0.0 / 3.0 + 1.0 / 15.0,
      2.0 / 3.0 - 1.0 / 15.0, 0.0 / 3.0 + 1.0 / 15.0,
      2.0 / 3.0 - 1.0 / 15.0, 1.0 / 3.0 - 1.0 / 15.0,
      1.0 / 3.0 + 1.0 / 15.0, 1.0 / 3.0 - 1.0 / 15.0,

      // Back face
      1.0 - 1.0 / 15.0, 0.0 / 3.0 + 1.0 / 15.0,
      1.0 - 1.0 / 15.0, 1.0 / 3.0 - 1.0 / 15.0,
      2.0 / 3.0 + 1.0 / 15.0, 1.0 / 3.0 - 1.0 / 15.0,
      2.0 / 3.0 + 1.0 / 15.0, 0.0 / 3.0 + 1.0 / 15.0,

      
      // Top face
      2.0/3.0 + 1.0 / 15.0, 1.0/3.0 + 1.0 / 15.0,
      1.0     - 1.0 / 15.0,     1.0/3.0 + 1.0 / 15.0,
      1.0     - 1.0 / 15.0,     2.0/3.0 - 1.0 / 15.0,
      2.0/3.0 + 1.0 / 15.0, 2.0/3.0 - 1.0 / 15.0,

      // Bottom face
      0.0 + 1.0 / 15.0, 1.0 / 3.0 - 1.0 / 15.0,
      0.0 + 1.0 / 15.0, 0.0 / 3.0 + 1.0 / 15.0,
      1.0 / 3.0 - 1.0 / 15.0, 0.0 / 3.0 + 1.0 / 15.0,
      1.0 / 3.0 - 1.0 / 15.0, 1.0 / 3.0 - 1.0 / 15.0,

      // Right face
      0.0 + 1.0 / 15.0, 1.0 / 3.0 + 1.0 / 15.0,
      1.0 / 3.0 - 1.0 / 15.0, 1.0 / 3.0 + 1.0 / 15.0,
      1.0 / 3.0 - 1.0 / 15.0, 2.0 / 3.0 - 1.0 / 15.0,
      0.0 + 1.0 / 15.0, 2.0 / 3.0 - 1.0 / 15.0,

      // Left face
      2.0 / 3.0 - 1.0 / 15.0, 1.0 / 3.0 + 1.0 / 15.0,
      2.0 / 3.0 - 1.0 / 15.0, 2.0 / 3.0 - 1.0 / 15.0,
      1.0 / 3.0 + 1.0 / 15.0, 2.0 / 3.0 - 1.0 / 15.0,
      1.0 / 3.0 + 1.0 / 15.0, 1.0 / 3.0 + 1.0 / 15.0,

      //top - left - front (--+)
      2.0 / 3.0 + 1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,
      2.0 / 3.0 + 1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,
      2.0 / 3.0 + 1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,
      2.0 / 3.0 + 1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,

      1.0 / 3.0 + 1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,
      1.0 / 3.0 + 1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,
      1.0 / 3.0 + 1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,
      1.0 / 3.0 + 1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,

      1.0 / 3.0 + 1.0 / 30.0, 1.0 / 30.0,
      1.0 / 3.0 + 1.0 / 30.0, 1.0 / 30.0,
      1.0 / 3.0 + 1.0 / 30.0, 1.0 / 30.0,
      1.0 / 3.0 + 1.0 / 30.0, 1.0 / 30.0,

      //top-right-front (+-+)
      2.0 / 3.0 + 1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,
      2.0 / 3.0 + 1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,
      2.0 / 3.0 + 1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,
      2.0 / 3.0 + 1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,

      1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,
      1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,
      1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,
      1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,

      1.0 / 3.0 + 1.0 / 30.0, 1.0 / 30.0,
      1.0 / 3.0 + 1.0 / 30.0, 1.0 / 30.0,
      1.0 / 3.0 + 1.0 / 30.0, 1.0 / 30.0,
      1.0 / 3.0 + 1.0 / 30.0, 1.0 / 30.0,

      //top-left-back (-++)
      2.0 / 3.0 + 1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,
      2.0 / 3.0 + 1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,
      2.0 / 3.0 + 1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,
      2.0 / 3.0 + 1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,

      1.0 / 3.0 + 1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,
      1.0 / 3.0 + 1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,
      1.0 / 3.0 + 1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,
      1.0 / 3.0 + 1.0 / 30.0, 1.0 / 3.0 + 1.0 / 30.0,

      2.0 / 3.0 + 1.0 / 30.0, 1.0 / 30.0,
      2.0 / 3.0 + 1.0 / 30.0, 1.0 / 30.0,
      2.0 / 3.0 + 1.0 / 30.0, 1.0 / 30.0,
      2.0 / 3.0 + 1.0 / 30.0, 1.0 / 30.0,

]);

xNavigationCube.prototype.ids = function() {
    return new Float32Array([
        this.FRONT, // Front face
        this.FRONT,
        this.FRONT,
        this.FRONT,
        this.BACK, // Back face
        this.BACK,
        this.BACK,
        this.BACK,
        this.TOP, // Top face
        this.TOP,
        this.TOP,
        this.TOP,
        this.BOTTOM, // Bottom face
        this.BOTTOM,
        this.BOTTOM,
        this.BOTTOM,
        this.RIGHT, // Right face
        this.RIGHT,
        this.RIGHT,
        this.RIGHT,
        this.LEFT, // Left face
        this.LEFT,
        this.LEFT,
        this.LEFT,
        this.TOP_LEFT_FRONT,
        this.TOP_LEFT_FRONT,
        this.TOP_LEFT_FRONT,
        this.TOP_LEFT_FRONT,
        this.TOP_LEFT_FRONT,
        this.TOP_LEFT_FRONT,
        this.TOP_LEFT_FRONT,
        this.TOP_LEFT_FRONT,
        this.TOP_LEFT_FRONT,
        this.TOP_LEFT_FRONT,
        this.TOP_LEFT_FRONT,
        this.TOP_LEFT_FRONT,
        this.TOP_RIGHT_FRONT,
        this.TOP_RIGHT_FRONT,
        this.TOP_RIGHT_FRONT,
        this.TOP_RIGHT_FRONT,
        this.TOP_RIGHT_FRONT,
        this.TOP_RIGHT_FRONT,
        this.TOP_RIGHT_FRONT,
        this.TOP_RIGHT_FRONT,
        this.TOP_RIGHT_FRONT,
        this.TOP_RIGHT_FRONT,
        this.TOP_RIGHT_FRONT,
        this.TOP_RIGHT_FRONT,
        this.TOP_LEFT_BACK,
        this.TOP_LEFT_BACK,
        this.TOP_LEFT_BACK,
        this.TOP_LEFT_BACK,
        this.TOP_LEFT_BACK,
        this.TOP_LEFT_BACK,
        this.TOP_LEFT_BACK,
        this.TOP_LEFT_BACK,
        this.TOP_LEFT_BACK,
        this.TOP_LEFT_BACK,
        this.TOP_LEFT_BACK,
        this.TOP_LEFT_BACK,
    ]);
};