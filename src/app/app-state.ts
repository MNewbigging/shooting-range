import { GameLoader } from "../loaders/game-loader";
import { GameState } from "../game/game-state";
import { makeAutoObservable, observable } from "mobx";

export class AppState {
  readonly gameLoader = new GameLoader();
  @observable gameState?: GameState;

  constructor() {
    makeAutoObservable(this);

    // Give loading UI time to mount
    setTimeout(() => this.loadGame(), 10);
  }

  startGame = () => {
    this.gameState = new GameState(this.gameLoader);
  };

  private async loadGame() {
    this.gameLoader.load();
  }
}
