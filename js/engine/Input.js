export class Input {
  constructor(canvas) {
    this.keys = {};
    this.keysJustPressed = {};
    this.mouse = { x: 0, y: 0, left: false, leftJust: false, right: false, rightJust: false };
    this.scroll = 0;
    this._previousKeys = {};
    this._previousMouse = { left: false, right: false };
    this.canvas = canvas;

    this._onKeyDown = (e) => {
      if (e.key === 'Tab') e.preventDefault();
      if (!this.keys[e.key]) {
        this.keysJustPressed[e.key] = true;
      }
      this.keys[e.key] = true;
    };

    this._onKeyUp = (e) => {
      this.keys[e.key] = false;
    };

    this._onMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mouse.x = (e.clientX - rect.left) * scaleX;
      this.mouse.y = (e.clientY - rect.top) * scaleY;
    };

    this._onMouseDown = (e) => {
      const btn = e.button === 0 ? 'left' : 'right';
      if (!this.mouse[btn]) {
        this.mouse[`${btn}Just`] = true;
      }
      this.mouse[btn] = true;
    };

    this._onMouseUp = (e) => {
      const btn = e.button === 0 ? 'left' : 'right';
      this.mouse[btn] = false;
    };

    this._onWheel = (e) => {
      this.scroll = e.deltaY > 0 ? 1 : -1;
    };

    this._onContextMenu = (e) => e.preventDefault();

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    canvas.addEventListener('mouseup', this._onMouseUp);
    canvas.addEventListener('wheel', this._onWheel);
    canvas.addEventListener('contextmenu', this._onContextMenu);
  }

  update() {
    this.keysJustPressed = {};
    this.mouse.leftJust = false;
    this.mouse.rightJust = false;
    this.scroll = 0;
  }

  isDown(key) {
    return !!this.keys[key];
  }

  justPressed(key) {
    return !!this.keysJustPressed[key];
  }

  /** Devuelve vector de dirección WASD/arrows normalizado */
  getDir() {
    let x = 0, y = 0;
    if (this.isDown('w') || this.isDown('W') || this.isDown('ArrowUp')) y = -1;
    if (this.isDown('s') || this.isDown('S') || this.isDown('ArrowDown')) y = 1;
    if (this.isDown('a') || this.isDown('A') || this.isDown('ArrowLeft')) x = -1;
    if (this.isDown('d') || this.isDown('D') || this.isDown('ArrowRight')) x = 1;
    return { x, y };
  }

  isShootJustPressed() {
    return this.mouse.leftJust;
  }

  isShootHeld() {
    return this.mouse.left;
  }

  isMeleeJustPressed() {
    return this.justPressed('f') || this.justPressed('F') || this.mouse.rightJust;
  }

  isInteractJustPressed() {
    return this.justPressed('e') || this.justPressed('E');
  }

  isReloadJustPressed() {
    return this.justPressed('r') || this.justPressed('R');
  }
}
