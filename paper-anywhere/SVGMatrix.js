/*jslint sloppy: true */
// Transform matrices are imitating the matrices from the SVG DOM
// http://www.w3.org/TR/SVG/coords.html#TransformAttribute
// http://www.w3.org/TR/SVG/coords.html#InterfaceSVGMatrix
function SVGMatrix() {
    if (!(this instanceof SVGMatrix)) {
        throw new TypeError('SVGMatrix constructor called without "new".');
    }
    var args = Array.prototype.slice.call(arguments);
    // inputs an array, object with a-f properties, or a 6 argument call.
    if (Array.isArray(args[0])) {
        args = args[0];
    }
    if (args.length !== 6) {
        args = [1, 0, 0, 1, 0, 0];
    }
    this.a = args[0];
    this.b = args[1];
    this.c = args[2];
    this.d = args[3];
    this.e = args[4];
    this.f = args[5];
}

SVGMatrix.prototype.multiply = function (secondMatrix) {
    // Multiplier should be a SVGMatrix
    return new SVGMatrix(
        this.a * secondMatrix.a + this.c * secondMatrix.b, // + this.e * 0
        this.b * secondMatrix.a + this.d * secondMatrix.b, // + this.f * 0
        this.a * secondMatrix.c + this.c * secondMatrix.d, // + this.e * 0
        this.b * secondMatrix.c + this.d * secondMatrix.d, // + this.f * 0
        this.a * secondMatrix.e + this.c * secondMatrix.f + this.e, // * 1
        this.b * secondMatrix.e + this.d * secondMatrix.f + this.f  // * 1
    );
};

SVGMatrix.prototype.inverse = function () {
    var determinant = this.getDeterminant();
    // if the determinant of matrix is 0, output will an ill formed matrix
    return new SVGMatrix(
        this.d / determinant,
        -this.b / determinant,
        -this.c / determinant,
        this.a / determinant,
        (this.c * this.f - this.e * this.d) / determinant,
        (this.e * this.b - this.a * this.f) / determinant
    );
};

SVGMatrix.prototype.translate = function (x, y) {
    y = y || 0;
    return new SVGMatrix(
        this.a,
        this.b,
        this.c,
        this.d,
        this.a * x + this.c * y + this.e,
        this.b * x + this.d * y + this.f
    );
};

SVGMatrix.prototype.scale = function (scaleFactor, cx, cy) {
    cx = cx || 0;
    cy = cy || 0;
    return new SVGMatrix(
        this.a * scaleFactor,
        this.b * scaleFactor,
        this.c * scaleFactor,
        this.d * scaleFactor,
        (this.a - this.a * scaleFactor) * cx +
            (this.c - this.c * scaleFactor) * cy + this.e,
        (this.b - this.b * scaleFactor) * cx +
            (this.d - this.d * scaleFactor) * cy + this.f
    );
};

SVGMatrix.prototype.scaleNonUniform = function (scaleFactorX, scaleFactorY, cx, cy) {
    scaleFactorY = scaleFactorY || scaleFactorX;
    cx = cx || 0;
    cy = cy || 0;
    return new SVGMatrix(
        this.a * scaleFactorX,
        this.b * scaleFactorX,
        this.c * scaleFactorY,
        this.d * scaleFactorY,
        (this.a - this.a * scaleFactorX) * cx +
            (this.c - this.c * scaleFactorY) * cy + this.e,
        (this.b - this.b * scaleFactorX) * cx +
            (this.d - this.d * scaleFactorY) * cy + this.f
    );
};

SVGMatrix.prototype.rotate = function (angle, cx, cy) {
    var sine = Math.sin(angle * Math.PI / 180),
        cosine = Math.cos(angle * Math.PI / 180); //input is in Degrees
    cx = cx || 0;
    cy = cy || 0;
    return new SVGMatrix(
        this.a * cosine + this.c * sine,
        this.b * cosine + this.d * sine,
        this.a * -sine + this.c * cosine,
        this.b * -sine + this.d * cosine,
        (this.a * sine - this.c * cosine + this.c) * cy +
            (-this.c * sine - this.a * cosine + this.a) * cx + this.e,
        (this.b * sine - this.d * cosine + this.d) * cy +
            (-this.d * sine - this.b * cosine + this.b) * cx + this.f
    );
};

SVGMatrix.prototype.rotateFromVector = function (x, y) {
    var hypotenuse = Math.sqrt(x * x + y * y);
    // if the vector is (0,0), output will be an ill formed matrix.
    return new SVGMatrix(
        (this.a * x + this.c * y) / hypotenuse,
        (this.b * x + this.d * y) / hypotenuse,
        (this.a * -y + this.c * x) / hypotenuse,
        (this.b * -y + this.d * x) / hypotenuse,
        this.e,
        this.f
    );
};

SVGMatrix.prototype.flipX = function () {
    return new SVGMatrix(-this.a, -this.b, this.c, this.d, this.e, this.f);
};

SVGMatrix.prototype.flipY = function () {
    return new SVGMatrix(this.a, this.b, -this.c, -this.d, this.e, this.f);
};

SVGMatrix.prototype.skewX = function (angle) {
    var tangent = Math.tan(angle * Math.PI / 180); //input is in Degrees
    return new SVGMatrix(
        this.a,
        this.b,
        this.a * tangent + this.c,
        this.b * tangent + this.d,
        this.e,
        this.f
    );
};

SVGMatrix.prototype.skewY = function (angle) {
    var tangent = Math.tan(angle * Math.PI / 180); //input is in Degrees
    return new SVGMatrix(
        this.a + this.c * tangent,
        this.b + this.d * tangent,
        this.c,
        this.d,
        this.e,
        this.f
    );
};

SVGMatrix.prototype.getDeterminant = function () {
    return this.a * this.d - this.b * this.c;
};

SVGMatrix.prototype.toJSON = function () {
    return [this.a, this.b, this.c, this.d, this.e, this.f];
};

SVGMatrix.prototype.applyToCanvas = function (context) {
    context.transform(this.a, this.b, this.c, this.d, this.e, this.f);
};

SVGMatrix.prototype.applyToPoint = function (point) {
    return {
        x: this.a * point.x + this.c * point.y + this.e,
        y: this.b * point.x + this.d * point.y + this.f
    };
};
