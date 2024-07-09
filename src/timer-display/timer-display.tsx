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

    let displayString = ``;

    if (totalSeconds === 0) {
      displayString = "-- : --";
    } else {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.floor(totalSeconds % 60);

      const minString = minutes < 10 ? `0${minutes}` : `${minutes}`;
      const secString = seconds < 10 ? `0${seconds}` : `${seconds}`;

      displayString = `${minString}:${secString}`;
    }

    return <div className="timer-display">{displayString}</div>;
  }
);
