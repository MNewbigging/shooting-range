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

  const ammo = equippedGun.magAmmo;

  return (
    <div className="ammo-display">
      {ammo === 0 && <span>RELOAD (r)</span>}
      {ammo !== 0 && <span>Ammo {ammo}</span>}
    </div>
  );
});
