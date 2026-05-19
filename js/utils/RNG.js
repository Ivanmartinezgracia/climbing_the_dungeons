export class RNG {
  constructor(seed) {
    this._seed = seed ?? Date.now();
  }

  next() {
    this._seed = (this._seed * 16807 + 0) % 2147483647;
    return this._seed / 2147483647;
  }

  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min, max) {
    return this.next() * (max - min) + min;
  }

  pick(arr) {
    return arr[this.nextInt(0, arr.length - 1)];
  }

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  getSeed() {
    return this._seed;
  }
}
