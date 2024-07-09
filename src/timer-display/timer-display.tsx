import { observer } from "mobx-react-lite";
import "./timer-display.scss";
import React from "react";
import { GameState } from "../game/game-state";

interface TimerDisplayProps {
  gameState: GameState;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = observer(
  ({ gameState }) => {
    const totalSeconds = gameState.targetManager.timerSeconds;

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);

    return (
      <div className="timer-display">
        {minutes}:{seconds}
      </div>
    );
  }
);
