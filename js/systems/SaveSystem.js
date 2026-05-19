const STORAGE_KEY = 'climbingdungeon_save';
const OLD_STORAGE_KEY = 'lastbullet_save';

export class SaveSystem {
  constructor() {
    this.data = this.#load();
  }

  #load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(OLD_STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (raw === localStorage.getItem(OLD_STORAGE_KEY)) {
          localStorage.removeItem(OLD_STORAGE_KEY);
          localStorage.setItem(STORAGE_KEY, raw);
        }
        if (!data.unlockedPets) data.unlockedPets = ['dog', 'wolf', 'cat', 'crow'];
        if (!data.activePets) data.activePets = data.unlockedPets.slice(0, 2);
        return data;
      }
    } catch {}
    return this.#defaults();
  }

  #defaults() {
    return {
      coins: 0,
      unlockedChars: ['adventurer'],
      unlockedDungeons: ['catacombs'],
      unlockedPets: ['dog', 'wolf', 'cat', 'crow'],
      activePets: ['dog', 'wolf'],
    };
  }

  #save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {}
  }

  getCoins() {
    return this.data.coins;
  }

  addCoins(amount) {
    this.data.coins += Math.max(0, amount);
    this.#save();
  }

  spendCoins(amount) {
    if (this.data.coins < amount) return false;
    this.data.coins -= amount;
    this.#save();
    return true;
  }

  getUnlockedChars() {
    return [...this.data.unlockedChars];
  }

  unlockChar(charId) {
    if (!this.data.unlockedChars.includes(charId)) {
      this.data.unlockedChars.push(charId);
      this.#save();
    }
  }

  isCharUnlocked(charId) {
    return this.data.unlockedChars.includes(charId);
  }

  getUnlockedDungeons() {
    return [...this.data.unlockedDungeons];
  }

  unlockDungeon(dungeonId) {
    if (!this.data.unlockedDungeons.includes(dungeonId)) {
      this.data.unlockedDungeons.push(dungeonId);
      this.#save();
    }
  }

  isDungeonUnlocked(dungeonId) {
    return this.data.unlockedDungeons.includes(dungeonId);
  }

  getUnlockedPets() {
    return [...this.data.unlockedPets];
  }

  isPetUnlocked(petId) {
    return this.data.unlockedPets.includes(petId);
  }

  unlockPet(petId) {
    if (!this.data.unlockedPets.includes(petId)) {
      this.data.unlockedPets.push(petId);
      this.#save();
    }
  }

  getActivePets() {
    return [...this.data.activePets];
  }

  setActivePets(pets) {
    this.data.activePets = pets.slice(0, 2);
    this.#save();
  }

  isPetActive(petId) {
    return this.data.activePets.includes(petId);
  }

  reset() {
    this.data = this.#defaults();
    this.#save();
  }
}
