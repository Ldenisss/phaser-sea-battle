import { EventBus } from "../EventBus";
import { Scene } from "phaser";

export class Game extends Scene {
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;
    endButton: Phaser.GameObjects.Text;
    startGame: Phaser.GameObjects.Text;
    playerMap: Phaser.GameObjects.Image;
    marine: Phaser.GameObjects.Image;
    rotateButton: Phaser.GameObjects.Image;
    mapGrid: number[][];
    gridSize: number; // Size of each cell in the grid
    ships: {
        image: Phaser.GameObjects.Image;
        size: number;
        placed: boolean;
    }[] = []; // Array of ships with their sizes
    gridHighlights: Phaser.GameObjects.Rectangle[][]; // Array of rectangles for grid highlights
    shipCounts: { [key: number]: number };
    gridContainer: Phaser.GameObjects.Container; // Container for grid (matrix)

    constructor() {
        super("Game");

        this.gridSize = 50; // Each cell is 50x50 pixels
        this.mapGrid = Array.from({ length: 10 }, () => Array(10).fill(0)); // Initialize a 10x10 grid with zeros
        this.gridHighlights = [];
        this.shipCounts = { 4: 1, 3: 2, 2: 3, 1: 1 };
    }

    create() {
        this.camera = this.cameras.main;

        this.background = this.add.image(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            "background"
        );

        let scaleX = this.cameras.main.width / this.background.width;
        let scaleY = this.cameras.main.height / this.background.height;
        let scale = Math.max(scaleX, scaleY);
        this.background.setScale(scale).setScrollFactor(0);

        this.startGame = this.add
            .text(this.cameras.main.width - 600, 100, "Start Game", {
                fontFamily: "Arial Black",
                fontSize: 38,
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 8,
                align: "center",
            })
            .setOrigin(0.5)
            .setDepth(100);

        this.endButton = this.add
            .text(this.cameras.main.width - 200, 100, "End Game", {
                fontFamily: "Arial Black",
                fontSize: 38,
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 8,
                align: "center",
            })
            .setOrigin(0.5)
            .setDepth(100);

        this.playerMap = this.add
            .image(
                this.cameras.main.width / 2 - 500,
                this.cameras.main.height / 2,
                "playerMap"
            )
            .setInteractive();

        this.playerMap.setScale(1.25, 1.25).setScrollFactor(0);

        this.gridContainer = this.add.container(
            this.cameras.main.width / 2 - 220, // Offset from center of the screen
            this.cameras.main.height / 2 - 220 // Offset from center of the screen
        );

        // Create the grid (matrix) inside the container
        this.createGrid();

        this.createGridHighlights();

        const xShipContainer = this.cameras.main.width / 2 + 200;
        const yShipContainer = this.cameras.main.height / 2 - 200;

        // Add ships
        const shipData = [
            { x: xShipContainer, y: yShipContainer, size: 4, texture: "ship4" },
            { x: xShipContainer, y: yShipContainer, size: 3, texture: "ship3" },
            { x: xShipContainer, y: yShipContainer, size: 3, texture: "ship3" },
            { x: xShipContainer, y: yShipContainer, size: 2, texture: "ship2" },
            { x: xShipContainer, y: yShipContainer, size: 2, texture: "ship2" },
            { x: xShipContainer, y: yShipContainer, size: 2, texture: "ship2" },
            { x: xShipContainer, y: yShipContainer, size: 1, texture: "ship1" },
            { x: xShipContainer, y: yShipContainer, size: 1, texture: "ship1" },
            { x: xShipContainer, y: yShipContainer, size: 1, texture: "ship1" },
            { x: xShipContainer, y: yShipContainer, size: 1, texture: "ship1" },
        ];

        shipData.forEach((data, index) => {
            shipData[index].y +=index * 50
            const ship = this.add
                .image(data.x, data.y, data.texture)
                .setInteractive({ draggable: true })
                .setRotation(-1.5708);
            this.ships.push({ image: ship, size: data.size, placed: false });
        });

        // Enable dragging
        this.input.setDraggable(this.ships.map((ship) => ship.image));

        this.input.on(
            "dragstart",
            (pointer: any, gameObject: Phaser.GameObjects.Image) => {
                gameObject.input!.dragStartX = gameObject.x;
                gameObject.input!.dragStartY = gameObject.y;
            }
        );

        this.input.on(
            "drag",
            (
                pointer: any,
                gameObject: Phaser.GameObjects.Image,
                dragX: number,
                dragY: number
            ) => {
                gameObject.x = dragX;
                gameObject.y = dragY;

                const shipData = this.ships.find(
                    (ship) => ship.image === gameObject
                );
                if (shipData) {
                    this.updateGridHighlights(gameObject, shipData.size);
                }
            }
        );

        this.input.on(
            "dragend",
            (pointer: any, gameObject: Phaser.GameObjects.Image) => {
                const shipData = this.ships.find(
                    (ship) => ship.image === gameObject
                );
                if (shipData) {
                    const isValid = this.tryPlaceShip(
                        gameObject,
                        shipData.size
                    );
                    if (!isValid) {
                        // Reset ship position if placement is invalid
                        gameObject.x = gameObject.input!.dragStartX;
                        gameObject.y = gameObject.input!.dragStartY;
                    } else {
                        shipData.placed = true;
                    }
                }

                // Clear grid highlights
                this.clearGridHighlights();
            }
        );

        EventBus.emit("current-scene-ready", this);
    }

    createGrid() {
        const startX = 0;
        const startY = 0;

        // Create a 10x10 grid within the container
        for (let row = 0; row < 10; row++) {
            const gridRow: Phaser.GameObjects.Rectangle[] = [];
            for (let col = 0; col < 10; col++) {
                const rect = this.add
                    .rectangle(
                        startX + col * this.gridSize + this.gridSize / 2 - 470,
                        startY + row * this.gridSize + this.gridSize / 2 + 30,
                        this.gridSize,
                        this.gridSize,
                        0x00ff00,
                        0.2
                    )
                    .setVisible(false); // Set visibility off by default
                gridRow.push(rect);
                this.gridContainer.add(rect); // Add each grid cell to the container
            }
        }
    }

    createGridHighlights() {
        const startX = this.playerMap.x - 220; // Adjusted starting point of the grid
        const startY = this.playerMap.y - 220;

        for (let row = 0; row < 10; row++) {
            const gridRow: Phaser.GameObjects.Rectangle[] = [];
            for (let col = 0; col < 10; col++) {
                const rect = this.add
                    .rectangle(
                        startX + col * this.gridSize + this.gridSize / 2,
                        startY + row * this.gridSize + this.gridSize / 2,
                        this.gridSize,
                        this.gridSize,
                        0x00ff00,
                        0.2
                    )
                    .setVisible(false);
                gridRow.push(rect);
            }
            this.gridHighlights.push(gridRow);
        }
    }

    updateGridHighlights(ship: Phaser.GameObjects.Image, size: number) {
        const gridX = Math.floor(
            (ship.x - (this.playerMap.x - 220)) / this.gridSize
        );
        const gridY = Math.floor(
            (ship.y - (this.playerMap.y - 220)) / this.gridSize
        );

        this.clearGridHighlights();

        for (let i = 0; i < size; i++) {
            if (!(gridY < 0 || (gridY > 10 && gridX < 0) || gridX > 10)) {
                if (gridX + i < 10 && gridY < 10) {
                    this.gridHighlights[gridY][gridX + i]?.setVisible(true);
                }
            }
        }
    }

    clearGridHighlights() {
        for (const row of this.gridHighlights) {
            for (const rect of row) {
                rect.setVisible(false);
            }
        }
    }

    tryPlaceShip(ship: Phaser.GameObjects.Image, size: number): boolean {
        const gridX = Math.floor(
            (ship.x - (this.playerMap.x - 220)) / this.gridSize
        );
        const gridY = Math.floor(
            (ship.y - (this.playerMap.y - 220)) / this.gridSize
        );

        if (gridX < 0 || gridX >= 10 || gridY < 0 || gridY >= 10) {
            return false;
        }

        // Check if the ship can fit horizontally
        if (gridX + size > 10 || !this.checkCells(gridX, gridY, size, 0)) {
            return false;
        }

        // Place the ship
        this.placeShip(gridX, gridY, size, 0);

        ship.x =
            gridX * this.gridSize +
            this.playerMap.x -
            220 +
            this.gridSize / 2 +
            (size > 1 ? size * 15 : 0);
        ship.y =
            gridY * this.gridSize + this.playerMap.y - 220 + this.gridSize / 2;

        return true;
    }

    checkCells(
        gridX: number,
        gridY: number,
        size: number,
        direction: number
    ): boolean {
        for (let i = 0; i < size; i++) {
            const x = direction === 0 ? gridX + i : gridX;
            const y = direction === 1 ? gridY + i : gridY;
            if (this.mapGrid[y][x] !== 0) {
                return false;
            }
        }
        return true;
    }

    placeShip(
        gridX: number,
        gridY: number,
        size: number,
        direction: number
    ): void {
        for (let i = 0; i < size; i++) {
            const x = direction === 0 ? gridX + i : gridX;
            const y = direction === 1 ? gridY + i : gridY;
            this.mapGrid[y][x] = 1;
        }
    }
    changeScene() {
        this.scene.start("GameOver");
    }
}

