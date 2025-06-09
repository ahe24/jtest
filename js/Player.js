import Bullet from './Bullet.js';

export default class Player extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        // scene.add.existing(this); // Removed redundant call
        // scene.physics.add.existing(this); // Removed redundant call
        this.setCollideWorldBounds(true);

        this.score = 0;
        this.health = 100;
        this.maxHealth = 100;
        this.playerName = "Player1"; // Added playerName

        // Bullet group for this player
        this.bullets = this.scene.physics.add.group({
            classType: Bullet,
            runChildUpdate: true,
            maxSize: 50
        });

        this.weapons = [
            {
                name: "Pistol",
                baseFireRate: 5,
                baseMaxAmmo: 15,
                baseReloadTime: 1500,
                baseBulletDamage: 25,
                baseBulletSpeed: 600,
                fireRate: 5,
                ammo: 15, // Current ammo
                maxAmmo: 15,
                reloadTime: 1500,
                bulletDamage: 25,
                bulletSpeed: 600,
                bulletTexture: 'bullet_sprite', // Use new key
                lastFired: 0,
                isReloading: false,
                upgradeLevel: 0,
                upgradeCost: 100
            },
            {
                name: "Rifle",
                baseFireRate: 10,
                baseMaxAmmo: 30,
                baseReloadTime: 2500,
                baseBulletDamage: 20, // Rifles might do less damage per shot but fire faster
                baseBulletSpeed: 800,
                fireRate: 10,
                ammo: 30, // Current ammo
                maxAmmo: 30,
                reloadTime: 2500,
                bulletDamage: 20,
                bulletSpeed: 800,
                bulletTexture: 'bullet_sprite', // Use new key
                lastFired: 0,
                isReloading: false,
                upgradeLevel: 0,
                upgradeCost: 150
            }
        ];
        this.currentWeaponIndex = 0;
        this.isFiring = false;
    }

    takeDamage(amount) {
        if (!this.active) return;

        this.health -= amount;
        console.log(`Player health: ${this.health}/${this.maxHealth}`);
        if (this.scene && typeof this.scene.updateHealthUI === 'function') {
            this.scene.updateHealthUI(this.health);
        }
        this.scene.sound.play('player_hurt_sound', { volume: 0.6 }); // Play sound
        if (this.health <= 0) {
            this.health = 0;
            this.onDeath();
        }
    }

    onDeath() {
        if (!this.active) return;

        console.log("Player Died!");
        this.setAlpha(0.5);
        this.body.setEnable(false); // Disable physics
        this.setActive(false); // Set inactive to stop updates and input processing

        // Notify the scene to handle game over
        if (this.scene && typeof this.scene.gameOver === 'function') {
            this.scene.gameOver();
        }
    }

    resetPlayerState() {
        this.health = this.maxHealth;
        this.score = 0;
        if (this.scene && typeof this.scene.updateHealthUI === 'function') {
            this.scene.updateHealthUI(this.health); // Update UI on reset
        }
        this.setAlpha(1);
        this.setActive(true);
        // Reset weapons
        this.weapons.forEach(weapon => {
            weapon.ammo = weapon.baseMaxAmmo;
            weapon.fireRate = weapon.baseFireRate;
            weapon.maxAmmo = weapon.baseMaxAmmo;
            weapon.reloadTime = weapon.baseReloadTime;
            weapon.bulletDamage = weapon.baseBulletDamage;
            weapon.bulletSpeed = weapon.baseBulletSpeed;
            weapon.upgradeLevel = 0;
            // Reset upgrade cost to its initial value (might need to store initialUpgradeCost)
            // For now, let's assume a fixed formula or store it if this becomes complex
            // Example: weapon.upgradeCost = weapon.name === "Pistol" ? 100 : 150;
            // Or better: add baseUpgradeCost to weapon definition
            weapon.upgradeCost = weapon.name === "Pistol" ? 100 : 150; // Simplified reset
            weapon.isReloading = false;
            if(weapon.reloadTimer) weapon.reloadTimer.remove(false);
        });
        this.currentWeaponIndex = 0; // Reset to default weapon
        // Any other player-specific state
    }


    getCurrentWeapon() {
        return this.weapons[this.currentWeaponIndex];
    }

    upgradeCurrentWeapon() {
        const weapon = this.getCurrentWeapon();
        if (!this.active) return; // Don't allow upgrades if player is not active

        if (this.score >= weapon.upgradeCost) {
            this.score -= weapon.upgradeCost;
            weapon.upgradeLevel++;
            weapon.upgradeCost = Math.floor(weapon.upgradeCost * 1.75);

            // Apply stat improvements
            weapon.bulletDamage += 5 + weapon.upgradeLevel * 2;
            weapon.maxAmmo += 5;

            weapon.fireRate *= 1.05;
            weapon.reloadTime *= 0.95;
            weapon.reloadTime = Math.max(200, weapon.reloadTime); // Adjusted to 200ms minimum
            weapon.fireRate = Math.min(weapon.fireRate, weapon.baseFireRate * 2.5);

        // this.scene.sound.play('upgrade_sound'); // Optional: Add an upgrade sound
            console.log(
                `Upgraded ${weapon.name} to Level ${weapon.upgradeLevel}! ` +
                `Score: ${this.score}. Next upgrade cost: ${weapon.upgradeCost}. ` +
                `New Stats: Damage=${weapon.bulletDamage}, Ammo=${weapon.maxAmmo}, FireRate=${weapon.fireRate.toFixed(2)}, ReloadTime=${weapon.reloadTime.toFixed(0)}ms`
            );
        } else {
            console.log(
                `Not enough score to upgrade ${weapon.name}. ` +
                `Need ${weapon.upgradeCost}, have ${this.score}.`
            );
        }
    }

    update() {
        if (!this.active) return; // Stop updates if player is inactive

        const pointer = this.scene.input.activePointer;
        this.rotation = Phaser.Math.Angle.Between(this.x, this.y, pointer.worldX, pointer.worldY);

        this.isFiring = pointer.isDown;

        const currentWeapon = this.getCurrentWeapon();

        if (this.isFiring && !currentWeapon.isReloading && this.active) {
            const timeNow = this.scene.time.now;
            if (timeNow > currentWeapon.lastFired + (1000 / currentWeapon.fireRate)) {
                if (currentWeapon.ammo > 0) {
                    this.fire(currentWeapon);
                    currentWeapon.ammo--;
                    currentWeapon.lastFired = timeNow;
                    if (currentWeapon.ammo === 0) {
                        this.startReload(currentWeapon);
                    }
                } else {
                    if (!currentWeapon.isReloading) {
                        this.startReload(currentWeapon);
                    }
                }
            }
        }
    }

    fire(weapon) {
        // console.log(`${weapon.name} Bang! Ammo: ${weapon.ammo -1}`); // Already very verbose
        this.scene.sound.play('shoot_sound', { volume: 0.3 }); // Play shoot sound
        const bulletOffsetX = Math.cos(this.rotation) * (this.displayWidth * 0.6); // Adjust offset slightly
        const bulletOffsetY = Math.sin(this.rotation) * (this.displayHeight * 0.6);

        const bullet = this.bullets.get(undefined, undefined, weapon.bulletTexture);

        if (bullet) {
            bullet.fire(
                this.x + bulletOffsetX,
                this.y + bulletOffsetY,
                this.rotation,
                weapon.bulletSpeed,
                weapon.bulletDamage
            );
        }
    }

    startReload(weapon) {
        if (weapon.isReloading || weapon.ammo === weapon.maxAmmo) return;

        weapon.isReloading = true;
        console.log(`Reloading ${weapon.name}...`);
        this.scene.sound.play('weapon_reload_sound', { volume: 0.4 }); // Play reload sound
        if (weapon.reloadTimer) {
            weapon.reloadTimer.remove(false);
        }
        weapon.reloadTimer = this.scene.time.delayedCall(weapon.reloadTime, () => this.finishReload(weapon), [], this);
    }

    finishReload(weapon) {
        weapon.ammo = weapon.maxAmmo;
        weapon.isReloading = false;
        console.log(`${weapon.name} reload complete. Ammo: ${weapon.ammo}`);
        if (weapon.reloadTimer) {
            weapon.reloadTimer = null;
        }
    }

    switchWeapon() {
        const currentWeapon = this.getCurrentWeapon();
        if (currentWeapon.isReloading && currentWeapon.reloadTimer) {
            currentWeapon.reloadTimer.remove(false);
            currentWeapon.isReloading = false;
            console.log(`Reload cancelled for ${currentWeapon.name} due to weapon switch.`);
        }

        this.currentWeaponIndex = (this.currentWeaponIndex + 1) % this.weapons.length;
        const newWeapon = this.getCurrentWeapon();
        this.scene.sound.play('weapon_switch_sound', { volume: 0.3 }); // Play switch sound
        console.log(`Switched to ${newWeapon.name}. Ammo: ${newWeapon.ammo}/${newWeapon.maxAmmo}`);

        if (newWeapon.ammo === 0 && !newWeapon.isReloading) {
            this.startReload(newWeapon);
        }
    }
}
