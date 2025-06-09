import MainScene from './scenes/MainScene.js';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: [MainScene],
    physics: {
        default: 'arcade',
        arcade: {
            // gravity: { y: 0 }, // Example: no global gravity
            debug: false // Set to true for physics debugging
        }
    }
};

const game = new Phaser.Game(config);
