// New file for fight mechanics
export class FightSystem {
    constructor(app) {
        this.app = app;
        this.attackLinePosition = 0;
        this.attackDirection = 1;
        this.attackSpeed = 3;
        this.attacking = false;
        this.attackInterval = null;
    }

    startFightAction() {
        this.attacking = true;
        this.attackLinePosition = 0;
        this.attackDirection = 1;
        this.app.battleState = 'fightAction';

        this.attackInterval = setInterval(() => {
            this.attackLinePosition += this.attackSpeed * this.attackDirection;
            
            if (this.attackLinePosition >= 100) {
                this.attackDirection = -1;
            } else if (this.attackLinePosition <= 0) {
                this.attackDirection = 1;
            }
        }, 16);

        // Add one-time attack handler
        window.addEventListener('keydown', this.handleAttack.bind(this));
    }

    handleAttack = (e) => {
        if (!this.attacking || e.key !== 'z') return;
        
        this.attacking = false;
        clearInterval(this.attackInterval);
        window.removeEventListener('keydown', this.handleAttack);
        
        // Calculate damage based on how close to center the attack bar is
        const centerDistance = Math.abs(this.attackLinePosition - 50);
        let damageMultiplier = 1;
        let hitType = '';
        
        if (centerDistance < 5) {
            damageMultiplier = 2.5; // Super critical
            hitType = 'PERFECT';
        } else if (centerDistance < 10) {
            damageMultiplier = 2; // Critical
            hitType = 'Critical';
        } else if (centerDistance < 20) {
            damageMultiplier = 1.5; // Good
            hitType = 'Good';
        } else if (centerDistance < 30) {
            damageMultiplier = 1; // Normal
            hitType = 'Hit';
        } else {
            damageMultiplier = 0.5; // Bad
            hitType = 'Miss';
        }

        const baseDamage = Math.floor(this.app.player.lv * 4);
        const finalDamage = Math.floor(baseDamage * damageMultiplier);
        
        // Apply defense reduction
        const reducedDamage = Math.max(1, finalDamage - (this.app.currentMonster.defense || 0));
        this.app.currentMonster.hp -= reducedDamage;

        // Show damage effect
        this.showDamageEffect(hitType, reducedDamage);

        // Check if monster defeated
        if (this.app.currentMonster.hp <= 0) {
            this.app.currentMonster.hp = 0;
            setTimeout(() => {
                this.app.showMonsterDialog('defeat');
                setTimeout(() => {
                    this.app.endBattle('defeat');
                }, 2000);
            }, 1000);
        } else {
            // Continue to enemy turn
            setTimeout(() => {
                this.app.startEnemyTurn();
            }, 2000);
        }
    }

    showDamageEffect(hitType, damage) {
        this.app.showDialog = true;
        
        const messages = [];
        switch(hitType) {
            case 'PERFECT':
                messages.push(
                    "* PERFECT HIT!",
                    `* You deal ${damage} damage!`,
                    "* The monster looks severely wounded!"
                );
                break;
            case 'Critical':
                messages.push(
                    "* Critical hit!",
                    `* You deal ${damage} damage!`
                );
                break;
            case 'Good':
                messages.push(`* Good hit! You deal ${damage} damage!`);
                break;
            case 'Hit':
                messages.push(`* You deal ${damage} damage.`);
                break;
            case 'Miss':
                messages.push(
                    "* Your timing was off.",
                    `* You only deal ${damage} damage.`
                );
                break;
        }
        
        this.app.dialogQueue = messages;
        this.app.showNextDialog();
    }

    getAttackLinePosition() {
        return this.attackLinePosition;
    }

    cleanup() {
        if (this.attackInterval) {
            clearInterval(this.attackInterval);
            this.attackInterval = null;
        }
        window.removeEventListener('keydown', this.handleAttack);
        this.attacking = false;
    }
}