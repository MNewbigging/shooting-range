import { observer } from "mobx-react-lite";
import { AmmoDisplay } from "../ammo-display/ammo-display";
import { GameState } from "../game/game-state";
import { Reticle } from "../reticle/reticle";
import "./game-screen.scss";
import React from "react";

interface GameScreenProps {
  gameState: GameState;
}

export const GameScreen: React.FC<GameScreenProps> = observer(
  ({ gameState }) => {
    return (
      <div className="game-screen">
        <div className="container">
          <Reticle />
          <AmmoDisplay gameState={gameState} />
        </div>
      </div>
    );
  }
);
