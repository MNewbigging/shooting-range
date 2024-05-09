import "./app.scss";

import React from "react";
import { observer } from "mobx-react-lite";

import { AppState } from "./app-state";
import { LoadingScreen } from "../loading-screen/loading-screen";
import { PauseScreen } from "../pause-screen/pause-screen";
import { Reticle } from "../reticle/reticle";
import { GameScreen } from "../game-screen/game-screen";

interface AppProps {
  appState: AppState;
}

export const App: React.FC<AppProps> = observer(({ appState }) => {
  const { gameState } = appState;
  const gameStarted = gameState !== undefined;
  const gamePaused = gameState?.paused;

  return (
    <div id="canvas-root">
      {!gameStarted && <LoadingScreen appState={appState} />}

      {gameState && gamePaused && <PauseScreen gameState={gameState} />}

      {gameStarted && !gamePaused && <GameScreen gameState={gameState} />}
    </div>
  );
});
