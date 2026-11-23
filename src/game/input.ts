/**
 * input.ts — shared input state. Keyboard on web fills it; the on-screen
 * touch buttons (React Native Pressables) write the same fields, so the game
 * core never cares where input comes from.
 *
 * Mapping: A/← left, D/→ right, W/↑/Space jump, Esc pause, M mute.
 */

export type PressAction = "jump" | "confirm" | "pause" | "mute" | "restart";

class InputState {
  left = false;
  right = false;
  jumpHeld = false;
  private pressed = new Set<PressAction>();

  press(action: PressAction): void {
    this.pressed.add(action);
  }

  consume(action: PressAction): boolean {
    const has = this.pressed.has(action);
    if (has) this.pressed.delete(action);
    return has;
  }

  clearPressed(): void {
    this.pressed.clear();
  }

  get moveX(): number {
    return (this.right ? 1 : 0) - (this.left ? 1 : 0);
  }
}

export const input = new InputState();

const JUMP_KEYS = new Set(["Space", "KeyW", "ArrowUp"]);

/** Bind keyboard listeners (web only). Returns an unbind function. */
export function bindKeyboard(): () => void {
  const down = (e: KeyboardEvent) => {
    switch (e.code) {
      case "KeyA": case "ArrowLeft": input.left = true; break;
      case "KeyD": case "ArrowRight": input.right = true; break;
      case "Enter": input.press("confirm"); break;
      case "Escape": input.press("pause"); break;
      case "KeyM": input.press("mute"); break;
      case "KeyR": input.press("restart"); break;
      default: break;
    }
    if (JUMP_KEYS.has(e.code)) {
      input.jumpHeld = true;
      if (!e.repeat) {
        input.press("jump");
        if (e.code === "Space") input.press("confirm");
      }
      if (e.target === document.body) e.preventDefault(); // keep Space from scrolling
    }
  };
  const up = (e: KeyboardEvent) => {
    switch (e.code) {
      case "KeyA": case "ArrowLeft": input.left = false; break;
      case "KeyD": case "ArrowRight": input.right = false; break;
      default: break;
    }
    if (JUMP_KEYS.has(e.code)) input.jumpHeld = false;
  };
  const reset = () => {
    input.left = false;
    input.right = false;
    input.jumpHeld = false;
  };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", reset);
  document.addEventListener("visibilitychange", reset);
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", reset);
    document.removeEventListener("visibilitychange", reset);
  };
}
