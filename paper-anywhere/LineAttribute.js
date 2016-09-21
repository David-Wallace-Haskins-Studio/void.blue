/*jslint sloppy: true */
/*global SVGMatrix, requestAnimationFrame */
function LineAttribute(obj) {
    if (!(this instanceof LineAttribute)) {
        throw new TypeError('LineAttribute constructor called without "new".');
    }
    obj = obj || {};

    this.transform = new SVGMatrix(obj.transform);
    this.stroke = obj.stroke || "#ffffff";
    this.strokeWidth = obj.strokeWidth || 2;
    // the side effect of a 0 strokeWidth being reset to 2 is intentional
}

LineAttribute.prototype.applyToCanvas = function (context, view) {
    context.strokeStyle = this.stroke;
    context.lineWidth = this.strokeWidth;
    if (view) {
        view.multiply(this.transform).applyToCanvas(context);
    } else {
        this.transform.applyToCanvas(context);
    }
};
