import "./loading-screen.scss";
import React from "react";
import { Spinner } from "@blueprintjs/core";
import { SpinnerSize } from "@blueprintjs/core/lib/esm/components";
import { observer } from "mobx-react-lite";
import { AppState } from "../app/app-state";

interface LoadingScreenProps {
  appState: AppState;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = observer(
  ({ appState }) => {
    return (
      <div className="loading-screen">
        {appState.gameLoader.loading && <Spinner size={SpinnerSize.LARGE} />}
        {!appState.gameLoader.loading && (
          <div className="start-button" onClick={appState.startGame}>
            Start
          </div>
        )}
      </div>
    );
  }
);
