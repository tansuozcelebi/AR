/**
 * Screenshot Manager
 * Captures the current AR/3D view and saves as PNG
 */

export class ScreenshotManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.flashEl = document.getElementById('screenshot-flash');
  }

  /**
   * Capture the current canvas view as PNG
   * @param {boolean} addWatermark - whether to add a watermark
   * @returns {Promise<Blob|null>}
   */
  capture(addWatermark = true) {
    return new Promise((resolve) => {
      // Need to call render first to ensure canvas has content
      // (WebXR might clear between frames)
      const canvas = this.renderer.domElement;

      if (addWatermark) {
        // Create a temporary canvas with watermark
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const ctx = tempCanvas.getContext('2d');

        // Draw the WebGL canvas
        ctx.drawImage(canvas, 0, 0);

        // Add watermark
        this.drawWatermark(ctx, tempCanvas.width, tempCanvas.height);

        tempCanvas.toBlob((blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          this.flash();
          this.downloadBlob(blob);
          resolve(blob);
        }, 'image/png');
      } else {
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          this.flash();
          this.downloadBlob(blob);
          resolve(blob);
        }, 'image/png');
      }
    });
  }

  /**
   * Draw a subtle watermark on the canvas
   */
  drawWatermark(ctx, width, height) {
    const padding = 16;
    const text = 'AR 3D Yerleştirme';
    const dateText = new Date().toLocaleString('tr-TR');

    ctx.save();

    // Background pill for watermark
    ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    const textWidth = Math.max(ctx.measureText(text).width, ctx.measureText(dateText).width);

    const boxW = textWidth + padding * 2 + 10;
    const boxH = 48;
    const boxX = width - boxW - padding;
    const boxY = height - boxH - padding;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    const r = 8;
    ctx.moveTo(boxX + r, boxY);
    ctx.lineTo(boxX + boxW - r, boxY);
    ctx.arcTo(boxX + boxW, boxY, boxX + boxW, boxY + r, r);
    ctx.lineTo(boxX + boxW, boxY + boxH - r);
    ctx.arcTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH, r);
    ctx.lineTo(boxX + r, boxY + boxH);
    ctx.arcTo(boxX, boxY + boxH, boxX, boxY + boxH - r, r);
    ctx.lineTo(boxX, boxY + r);
    ctx.arcTo(boxX, boxY, boxX + r, boxY, r);
    ctx.closePath();
    ctx.fill();

    // Title text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(text, boxX + padding, boxY + 20);

    // Date text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(dateText, boxX + padding, boxY + 38);

    ctx.restore();
  }

  /**
   * Download a blob as a file
   */
  downloadBlob(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ar-capture-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Flash effect for screenshot feedback
   */
  flash() {
    if (!this.flashEl) return;
    this.flashEl.classList.add('flash');
    setTimeout(() => {
      this.flashEl.classList.remove('flash');
    }, 150);
  }
}
