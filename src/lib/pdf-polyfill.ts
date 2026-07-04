// src/lib/pdf-polyfill.ts
// MUST be imported before pdf-parse. Sets up browser APIs that pdfjs-dist
// expects but Node.js serverless environments (Vercel) don't provide.

// Polyfill DOMMatrix
if (typeof globalThis.DOMMatrix === "undefined") {
  class DOMMatrixPolyfill {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;

    constructor(init?: string | number[]) {
      if (Array.isArray(init)) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init;
      }
    }
    multiply() { return new DOMMatrixPolyfill(); }
    translate() { return new DOMMatrixPolyfill(); }
    scale() { return new DOMMatrixPolyfill(); }
    rotate() { return new DOMMatrixPolyfill(); }
    toString() { return "matrix(1, 0, 0, 1, 0, 0)"; }
  }

  interface GlobalWithDOMMatrix {
    DOMMatrix: typeof DOMMatrixPolyfill;
  }
  (globalThis as unknown as GlobalWithDOMMatrix).DOMMatrix = DOMMatrixPolyfill;
}

// Polyfill ImageData
if (typeof globalThis.ImageData === "undefined") {
  class ImageDataPolyfill {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    colorSpace = "srgb";

    constructor(
      dataOrWidth: Uint8ClampedArray | number,
      widthOrHeight: number,
      heightOrSettings?: number
    ) {
      if (typeof dataOrWidth === "number") {
        this.width = dataOrWidth;
        this.height = widthOrHeight;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      } else {
        this.data = dataOrWidth;
        this.width = widthOrHeight;
        this.height = heightOrSettings || 1;
      }
    }
  }

  interface GlobalWithImageData {
    ImageData: typeof ImageDataPolyfill;
  }
  (globalThis as unknown as GlobalWithImageData).ImageData = ImageDataPolyfill;
}

// Polyfill Path2D
if (typeof globalThis.Path2D === "undefined") {
  class Path2DPolyfill {
    addPath() {}
    closePath() {}
    moveTo() {}
    lineTo() {}
    bezierCurveTo() {}
    quadraticCurveTo() {}
    arc() {}
    arcTo() {}
    ellipse() {}
    rect() {}
    roundRect() {}
  }

  interface GlobalWithPath2D {
    Path2D: typeof Path2DPolyfill;
  }
  (globalThis as unknown as GlobalWithPath2D).Path2D = Path2DPolyfill;
}

export {};