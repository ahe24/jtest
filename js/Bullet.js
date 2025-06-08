export default class Bullet extends Phaser.Physics.Arcade.Image {
    constructor(scene, x, y, texture) { // Angle is no longer passed directly here, set by player
        super(scene, x, y, texture);
        // scene.add.existing(this) and scene.physics.add.existing(this) are handled by group.create
        this.lifespan = 2000; // Default lifespan in milliseconds
        this.lifespanTimer = null; // To store the timer event
    }

    // Called by the player when a bullet is fired (or reused)
    fire(x, y, angle, speed, damage) {
        this.setPosition(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.setAngle(angle * (180 / Math.PI) + 90); // Visual angle
        this.rotation = angle; // Store radian angle for movement
        this.damage = damage; // Store the damage value

        this.scene.physics.velocityFromRotation(this.rotation, speed, this.body.velocity);

        // Ensure body is enabled
        this.body.setEnable(true);
        this.body.reset(x,y);


        // Clear previous timer if any and set a new one
        if (this.lifespanTimer) {
            this.lifespanTimer.remove(false);
        }
        this.lifespanTimer = this.scene.time.delayedCall(this.lifespan, () => {
            if (this.active) {
                this.destroy();
            }
        }, [], this);

        // Optional: World bounds collision (can be performance intensive if many bullets)
        // this.body.setCollideWorldBounds(true);
        // this.body.onWorldBounds = true;
        // Consider using a check in update or relying on lifespan for off-screen bullets
    }

    // Phaser calls this when a body is added to a group and reused via get()
    // or when created if classType is set.
    // We override it to ensure bullets are inactive when obtained from the group
    // before being explicitly fired.
    reuse(x, y, texture) {
        this.setPosition(x,y);
        this.setTexture(texture);
        this.setActive(false);
        this.setVisible(false);
        this.body.setEnable(false); // Disable physics body until fired
        if (this.lifespanTimer) {
            this.lifespanTimer.remove(false);
        }
    }


    // When a bullet is destroyed (e.g. by lifespan or collision)
    destroy(fromScene) {
        if (this.lifespanTimer) {
            this.lifespanTimer.remove(false);
        }
        // This will disable the game object, remove it from the display list,
        // and optionally remove it from the scene if 'fromScene' is true.
        // For group managed objects, this effectively returns it to the group if destroy is called without args.
        super.destroy(fromScene);
    }


    setSpeed(speed) { // This is now effectively part of fire()
        // If this method is still called directly, ensure it uses this.rotation
        this.scene.physics.velocityFromRotation(this.rotation, speed, this.body.velocity);
    }

    // Bullets typically don't need their own update unless for custom trajectory, etc.
    // preUpdate(time, delta) {
    //     super.preUpdate(time, delta);
    //     // Example: Check bounds manually if not using onWorldBounds
    //     if (this.x < 0 || this.x > this.scene.physics.world.bounds.width ||
    //         this.y < 0 || this.y > this.scene.physics.world.bounds.height) {
    //         if (this.active) this.destroy();
    //     }
    // }
}
