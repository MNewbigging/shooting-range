import { observer } from "mobx-react-lite";
import "./timer-display.scss";
import React from "react";
import { GameState } from "../game/game-state";
import { getTimeDisplayString } from "../utils/utils";

interface TimerDisplayProps {
  gameState: GameState;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = observer(
  ({ gameState }) => {
    const totalSeconds = gameState.targetManager.timerSeconds;

    const displayString = getTimeDisplayString(totalSeconds);

    return <div className="timer-display">{displayString}</div>;
  }
);
