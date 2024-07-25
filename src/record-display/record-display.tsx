import { observer } from "mobx-react-lite";
import { GameState } from "../game/game-state";
import "./record-display.scss";
import React from "react";
import { getTimeDisplayString } from "../utils/utils";

interface RecordDisplayProps {
  gameState: GameState;
}

export const RecordDisplay: React.FC<RecordDisplayProps> = observer(
  ({ gameState }) => {
    const bestTime = gameState.targetManager.bestTime;
    const bestTimeDisplayString = getTimeDisplayString(bestTime);

    const lastTime = gameState.targetManager.lastTime;
    const lastTimeDisplayString = getTimeDisplayString(lastTime);

    return (
      <div className="record-display">
        <div>Best time: {bestTimeDisplayString}</div>
        <div className="separator"></div>
        <div>Last time: {lastTimeDisplayString}</div>
      </div>
    );
  }
);
