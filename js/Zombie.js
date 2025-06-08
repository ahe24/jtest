export default class Zombie extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.health = 100;
        this.speed = 50; // Pixels per second

        this.setCollideWorldBounds(true); // Keep zombie within screen bounds
    }

    update(player) {
        if (!player || !this.active) return;

        // Rotate zombie to face the player
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        this.setRotation(angle);

        // Move towards the player
        this.scene.physics.moveToObject(this, player, this.speed);
    }

    // Method to handle damage (will be used later)
    takeDamage(amount) {
        if (!this.active) return; // Already dead or inactive

        this.health -= amount;

        if (this.health <= 0) {
            console.log("Zombie died");
            this.scene.sound.play('zombie_death_sound', { volume: 0.5 });
            this.scene.onZombieKilled();
            this.destroy();
        } else {
            // Zombie is hurt but not dead
            this.scene.sound.play('zombie_hurt_sound', { volume: 0.4 });
        }
    }
}
