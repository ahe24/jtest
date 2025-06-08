import Player from '../js/Player.js';
import Zombie from '../js/Zombie.js';
// Bullet is not directly used in MainScene, but Player needs it.

export default class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        // Wave Management Properties
        this.currentWave = 1;
        this.zombiesPerWave = 3; // Base number
        this.waveDelay = 5000; // ms between waves
        this.zombiesRemaining = 0;
        this.isGameOver = false;
        this.gameOverText = null; // For displaying GAME OVER message
        this.restartKey = null; // For the restart listener
        this.waveTimer = null; // To store wave timer event
    }

    preload() {
        this.load.image('background', 'assets/placeholder_background.png');
        // Updated image asset keys
        this.load.image('player_sprite', 'assets/player_sprite.png');
        this.load.image('bullet_sprite', 'assets/actual_bullet.png');
        this.load.image('zombie_sprite', 'assets/zombie_sprite.png');

        // Placeholder audio loading (expect 404s for these, which is fine for this step)
        this.load.audio('shoot_sound', ['sounds/shoot.mp3', 'sounds/shoot.ogg']);
        this.load.audio('zombie_hurt_sound', ['sounds/zombie_hurt.mp3', 'sounds/zombie_hurt.ogg']);
        this.load.audio('zombie_death_sound', ['sounds/zombie_death.mp3', 'sounds/zombie_death.ogg']);
        this.load.audio('player_hurt_sound', ['sounds/player_hurt.mp3', 'sounds/player_hurt.ogg']);
        this.load.audio('weapon_reload_sound', ['sounds/reload.mp3', 'sounds/reload.ogg']);
        this.load.audio('weapon_switch_sound', ['sounds/switch.mp3', 'sounds/switch.ogg']);
    }

    create() {
        this.add.image(400, 300, 'background');
        this.loadingText = this.add.text(400, 300, 'Game Loading...', { fontSize: '32px', fill: '#fff', fontFamily: 'Arial' });
        this.loadingText.setOrigin(0.5, 0.5);
        this.time.delayedCall(1000, () => { this.loadingText.setVisible(false); });

        this.player = new Player(this, this.cameras.main.width / 2, this.cameras.main.height / 2, 'player_sprite'); // Use new key
        this.player.setActive(true); // Ensure player starts active

        // Zombie group
        this.zombies = this.physics.add.group({
            classType: Zombie,
            runChildUpdate: false,
            maxSize: 50 // Increased max size for later waves
        });

        // Start the first wave
        // this.spawnZombies(5); // Old way
        this.startWave(this.currentWave);


        // Weapon switching input
        this.input.keyboard.on('keydown-Q', () => {
            if (this.player.active) this.player.switchWeapon();
        });
        this.input.on('pointerdown', (pointer) => {
            if (pointer.rightButtonDown() && this.player.active) {
                this.player.switchWeapon();
            }
        });
        this.input.mouse.disableContextMenu();

        // Colliders
        if (this.player.bullets && this.zombies) {
             this.physics.add.collider(this.player.bullets, this.zombies, this.handleBulletZombieCollision, null, this);
        }
        this.physics.add.collider(this.player, this.zombies, this.handlePlayerZombieCollision, null, this);

        // Input for upgrading
        this.input.keyboard.on('keydown-U', () => {
            if (this.player && this.player.active && !this.isGameOver) { // Check isGameOver
                this.player.upgradeCurrentWeapon();
            }
        });

        // Restart listener - setup initially but only acts if isGameOver is true in the update loop
        this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

        // --- UI Text Elements ---
        const uiStyle = { fontSize: '18px', fill: '#fff', stroke: '#000000', strokeThickness: 3 };
        this.playerNameText = this.add.text(16, 16, 'Player: ' + this.player.playerName, uiStyle);
        this.waveText = this.add.text(16, 40, 'Wave: 1', uiStyle);
        this.scoreText = this.add.text(16, 64, 'Score: 0', uiStyle);
        this.healthText = this.add.text(16, 88, 'Health: ' + this.player.health, uiStyle);

        this.weaponInfoText = this.add.text(this.cameras.main.width - 16, 16, '', { ...uiStyle, align: 'right' }).setOrigin(1, 0);

        // Initial UI updates
        this.updateWeaponUI();
        this.updateHealthUI(this.player.health);
    }

    updateHealthUI(currentHealth) {
        if (this.healthText) {
            this.healthText.setText('Health: ' + Math.max(0, currentHealth));
        }
    }

    updateWeaponUI() {
        if (!this.player || !this.player.active || !this.weaponInfoText) return;

        const weapon = this.player.getCurrentWeapon();
        let weaponInfoString = `Weapon: ${weapon.name} | Ammo: ${weapon.ammo}/${weapon.maxAmmo}`;
        if (weapon.isReloading) {
            weaponInfoString += " | RELOADING...";
        }
        this.weaponInfoText.setText(weaponInfoString);
    }

    gameOver() {
        if (this.isGameOver) return;

        this.isGameOver = true;
        console.log("GAME OVER");

        if (this.waveTimer) {
            this.waveTimer.remove(false);
            this.waveTimer = null;
        }
        this.zombies.getChildren().forEach(zombie => {
            if (zombie.active) {
                zombie.body.setEnable(false);
            }
        });

        if (!this.gameOverText) {
            this.gameOverText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2,
                'GAME OVER\nPress R to Restart',
                { fontSize: '48px', fill: '#ff0000', align: 'center', backgroundColor: '#000000cc' }
            ).setOrigin(0.5).setDepth(100);
        }
        this.gameOverText.setVisible(true);
    }

    restartGame() {
        console.log("Restarting game...");
        this.isGameOver = false;

        this.player.resetPlayerState(); // This will call updateHealthUI via player method
        this.player.setPosition(this.cameras.main.width / 2, this.cameras.main.height / 2);
        this.player.body.setEnable(true);
        this.player.setActive(true);

        this.zombies.clear(true, true);
        this.zombiesRemaining = 0;

        if (this.gameOverText) {
            this.gameOverText.setVisible(false);
        }

        if (this.waveTimer) {
            this.waveTimer.remove(false);
            this.waveTimer = null;
        }

        this.currentWave = 1;
        this.startWave(this.currentWave); // Will update waveText
        if (this.scoreText) this.scoreText.setText('Score: 0'); // Reset score text
        this.updateWeaponUI(); // Update weapon UI
    }

    onZombieKilled() {
        if (!this.player || !this.player.active || this.isGameOver) return;

        this.zombiesRemaining--;
        this.player.score += 10;
        if (this.scoreText) this.scoreText.setText('Score: ' + this.player.score); // Update score text
        console.log(`Zombie killed! Zombies remaining: ${this.zombiesRemaining}. Score: ${this.player.score}`);

        if (this.zombiesRemaining <= 0 && !this.isGameOver) {
            this.startNextWave();
        }
    }

    startWave(waveNumber) {
        if (this.isGameOver) return;

        this.currentWave = waveNumber;
        if (this.waveText) this.waveText.setText('Wave: ' + waveNumber); // Update wave text
        const numZombiesToSpawn = this.zombiesPerWave + (waveNumber - 1) * 2;
        console.log(`Starting Wave: ${waveNumber} with ${numZombiesToSpawn} zombies.`);
        this.spawnZombies(numZombiesToSpawn);
    }

    startNextWave() {
        if (this.isGameOver) return; // Check at start of function

        console.log(`Wave ${this.currentWave} completed!`);
        const nextWaveNumber = this.currentWave + 1;
        if (this.waveTimer) this.waveTimer.remove(false);
        this.waveTimer = this.time.delayedCall(this.waveDelay, () => {
            if (!this.isGameOver) {  // Check again before starting
                 this.startWave(nextWaveNumber);
            }
        }, [], this);
    }


    spawnZombies(count) {
        if (this.isGameOver) return; // Check at start of function

        console.log(`Spawning ${count} zombies.`);
        this.zombiesRemaining += count;
        console.log(`Zombies remaining updated to: ${this.zombiesRemaining}`);
        for (let i = 0; i < count; i++) {
            let zombieX = Phaser.Math.Between(50, this.physics.world.bounds.width - 50);
            let zombieY = Phaser.Math.Between(50, this.physics.world.bounds.height - 50);

            while (this.player && this.player.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, zombieX, zombieY) < 150) {
                zombieX = Phaser.Math.Between(50, this.physics.world.bounds.width - 50);
                zombieY = Phaser.Math.Between(50, this.physics.world.bounds.height - 50);
            }
            const zombie = this.zombies.get(zombieX, zombieY, 'zombie_sprite'); // Use new key
            if (zombie) {
                 zombie.setActive(true).setVisible(true);
                 zombie.body.setEnable(true);
                 zombie.health = 100;
                 zombie.speed = 50 + Phaser.Math.Between(-10, 10) + (this.currentWave * 2);
            }
        }
    }

    handleBulletZombieCollision(bullet, zombie) {
        if (this.isGameOver || !bullet.active || !zombie.active) return; // Check isGameOver
        zombie.takeDamage(bullet.damage || 25);
        bullet.destroy();
    }

    handlePlayerZombieCollision(player, zombie) {
        if (this.isGameOver || !player.active || !zombie.active) return; // Check isGameOver

        console.log("Player hit by zombie!");
        const knockbackAngle = Phaser.Math.Angle.Between(zombie.x, zombie.y, player.x, player.y);
        zombie.setVelocity(Math.cos(knockbackAngle) * -60, Math.sin(knockbackAngle) * -60);

        if(zombie.speed > 0) {
            zombie.originalSpeed = zombie.speed;
        }
        zombie.speed = 0;

        if(zombie.pauseTimer) zombie.pauseTimer.remove(false); // Clear existing timer
        zombie.pauseTimer = this.time.delayedCall(300, () => {
            if (zombie.active && !this.isGameOver) { // Check isGameOver for zombie behavior too
                 zombie.speed = zombie.originalSpeed || 50;
            }
        }, [], this);

        player.takeDamage(10); // Player takes damage
    }

    update(time, delta) { // Added time, delta
        if (this.isGameOver) {
            if (Phaser.Input.Keyboard.JustDown(this.restartKey)) { // Use JustDown for single trigger
                this.restartGame();
            }
            return; // Stop main game updates if game over
        }

        // Regular game updates
        if (this.player && this.player.active) {
            this.player.update();
        }
        if (this.zombies && this.player && this.player.active) {
            this.zombies.getChildren().forEach(zombie => {
                if (zombie.active) {
                    zombie.update(this.player);
                }
            });
        }
        // Update weapon UI continuously for ammo changes etc.
        if (!this.isGameOver) {
            this.updateWeaponUI();
        }
    }
}
