// Atmospheric canvas background for Siege UI: dust motes, light beams, tactical scanlines
export class BackgroundCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.scanlineY = 0;
    this.animId = null;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.initParticles();
    this.start();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  initParticles() {
    const count = Math.floor(window.innerWidth / 22);
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 0.6,
        speedX: (Math.random() - 0.5) * 0.35,
        speedY: -Math.random() * 0.5 - 0.1, // Float gently upwards like hangar dust
        opacity: Math.random() * 0.6 + 0.15,
        fadeSpeed: (Math.random() * 0.01 + 0.005) * (Math.random() > 0.5 ? 1 : -1)
      });
    }
  }

  start() {
    const loop = () => {
      this.render();
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animId) cancelAnimationFrame(this.animId);
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Subtle tactical vignette
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.45, w * 0.2, w * 0.5, h * 0.5, w * 0.85);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(10, 12, 16, 0.7)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Floating particles (dust motes)
    for (let p of this.particles) {
      p.x += p.speedX;
      p.y += p.speedY;
      p.opacity += p.fadeSpeed;

      if (p.opacity > 0.7) p.fadeSpeed = -Math.abs(p.fadeSpeed);
      if (p.opacity < 0.1) p.fadeSpeed = Math.abs(p.fadeSpeed);

      if (p.y < 0) {
        p.y = h;
        p.x = Math.random() * w;
      }
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;

      ctx.fillStyle = `rgba(255, 230, 200, ${p.opacity * 0.5})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Occasional subtle military scanline
    this.scanlineY += 1.8;
    if (this.scanlineY > h) this.scanlineY = -50;

    const scanGrad = ctx.createLinearGradient(0, this.scanlineY, 0, this.scanlineY + 40);
    scanGrad.addColorStop(0, 'rgba(255, 60, 30, 0)');
    scanGrad.addColorStop(0.5, 'rgba(255, 60, 30, 0.03)');
    scanGrad.addColorStop(1, 'rgba(255, 60, 30, 0)');
    ctx.fillStyle = scanGrad;
    ctx.fillRect(0, this.scanlineY, w, 40);
  }
}
