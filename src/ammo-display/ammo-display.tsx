import { observer } from "mobx-react-lite";
import { GameState } from "../game/game-state";
import "./ammo-display.scss";
import React from "react";

interface HudProps {
  gameState: GameState;
}

export const AmmoDisplay: React.FC<HudProps> = observer(({ gameState }) => {
  const equippedGun = gameState.equipmentManager.equippedGun;
  if (!equippedGun) {
    return null;
  }

  return <div className="ammo-display">Ammo {equippedGun.magAmmo}</div>;
});
