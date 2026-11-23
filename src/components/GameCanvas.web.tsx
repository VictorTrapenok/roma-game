/**
 * GameCanvas.web.tsx — web host for the game: a plain <canvas> rendered through
 * React DOM, plus React Native touch controls (left / right / jump) that write
 * into the shared input state. The game itself is imperative and lives in src/game.
 */

import React, { createElement, useEffect, useRef, useState } from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { startGame, type GameHandle } from "../game/game";
import { input } from "../game/input";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameHandle | null>(null);
  const [muted, setMuted] = useState(false);
  // touch controls only make sense on touch devices
  const isTouch = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = startGame(canvas, setMuted);
    gameRef.current = game;
    return () => {
      game.stop();
      gameRef.current = null;
    };
  }, []);

  return (
    <View style={styles.root}>
      {createElement("canvas", {
        ref: canvasRef,
        style: { position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "none" },
        onPointerDown: () => gameRef.current?.tap(),
      })}

      {/* touch controls */}
      {isTouch && (
      <View style={styles.controls} pointerEvents="box-none">
        <View style={styles.cluster}>
          <HoldButton
            label="◀"
            onDown={() => { input.left = true; }}
            onUp={() => { input.left = false; }}
          />
          <HoldButton
            label="▶"
            onDown={() => { input.right = true; }}
            onUp={() => { input.right = false; }}
          />
        </View>
        <View style={styles.cluster}>
          <Pressable style={styles.smallBtn} onPress={() => gameRef.current?.toggleMute()}>
            <Text style={styles.smallBtnText}>{muted ? "🔇" : "🔊"}</Text>
          </Pressable>
          <HoldButton
            label="⤒"
            big
            onDown={() => { input.jumpHeld = true; input.press("jump"); input.press("confirm"); }}
            onUp={() => { input.jumpHeld = false; }}
          />
        </View>
      </View>
      )}
    </View>
  );
}

function HoldButton({
  label, onDown, onUp, big,
}: { label: string; onDown: () => void; onUp: () => void; big?: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.btn, big && styles.btnBig, pressed && styles.btnPressed]}
      onPressIn={onDown}
      onPressOut={onUp}
    >
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b0e12" },
  controls: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 18,
  },
  cluster: { flexDirection: "row", alignItems: "flex-end", gap: 14 },
  btn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center", justifyContent: "center",
  },
  btnBig: { width: 84, height: 84, borderRadius: 42 },
  btnPressed: { backgroundColor: "rgba(255,255,255,0.32)" },
  btnText: { color: "#fff", fontSize: 28 },
  smallBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  smallBtnText: { fontSize: 20 },
});
