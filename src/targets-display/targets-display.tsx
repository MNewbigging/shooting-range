import { observer } from "mobx-react-lite";
import { GameState } from "../game/game-state";
import "./targets-display.scss";
import React from "react";

interface TargetsDisplayProps {
  gameState: GameState;
}

export const TargetsDisplay: React.FC<TargetsDisplayProps> = observer(
  ({ gameState }) => {
    const total = gameState.targetManager.targetsTotal;
    const hit = gameState.targetManager.targetsHit;

    return (
      <div className="targets-display">
        Targets {hit} / {total}
      </div>
    );
  }
);
