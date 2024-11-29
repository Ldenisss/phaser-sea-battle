import { GameObjects, Scene } from "phaser";

import { EventBus } from "../EventBus";

export class MainMenu extends Scene {
    background: GameObjects.Image;
    startButton: GameObjects.Image;
    title: GameObjects.Text;
    logoTween: Phaser.Tweens.Tween | null;

    constructor() {
        super("MainMenu");
    }

    create() {
        this.background = this.add.image(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            "bg2"
        );

        let scaleX = this.cameras.main.width / this.background.width;
        let scaleY = this.cameras.main.height / this.background.height;
        let scale = Math.max(scaleX, scaleY);
        this.background.setScale(scale).setScrollFactor(0);

        this.startButton = this.add
            .image(
                this.cameras.main.width / 2,
                this.cameras.main.height / 2,
                "buttonStart"
            )
            .setDepth(100)
            .setInteractive()
            .on("pointerdown", () => this.changeScene())
            .setScale(1.5);

        EventBus.emit("current-scene-ready", this);
    }

    changeScene() {
        this.scene.start("Game");
    }
}

