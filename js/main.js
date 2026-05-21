import { Game } from './engine/Game.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);
game.start();
