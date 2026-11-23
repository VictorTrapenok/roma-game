/**
 * GameCanvas.tsx — native stub for the MVP.
 * The v1 prototype targets the web demo (GitHub Pages). The game core in
 * src/game (level/physics/entities) is platform-agnostic; a native build can
 * reuse it with a react-native-skia or GL renderer — see README roadmap.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function GameCanvas() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Pixel Jumper</Text>
      <Text style={styles.text}>
        MVP v1 — веб-прототип.{"\n"}
        Нативный рендерер запланирован в roadmap (README).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b0e12", alignItems: "center", justifyContent: "center", padding: 24 },
  title: { color: "#ffd94d", fontSize: 32, fontWeight: "bold", marginBottom: 16 },
  text: { color: "#cdd6f4", fontSize: 16, textAlign: "center", lineHeight: 24 },
});
