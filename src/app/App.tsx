import "./app.scss";

import React from "react";
import { observer } from "mobx-react-lite";

import { AppState } from "./app-state";
import { LoadingScreen } from "../loading-screen/loading-screen";
import { PauseScreen } from "../pause-screen/pause-screen";

interface AppProps {
  appState: AppState;
}

export const App: React.FC<AppProps> = observer(({ appState }) => {
  return (
    <div id="canvas-root">
      {!appState.gameState && <LoadingScreen appState={appState} />}
      {appState.gameState?.paused && (
        <PauseScreen gameState={appState.gameState} />
      )}
    </div>
  );
});
