export function vibrateShort(): void {
  try {
    if (navigator.vibrate) navigator.vibrate(30);
  } catch {
    // ignore
  }
}

export function vibrateSuccess(): void {
  try {
    if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
  } catch {
    // ignore
  }
}

export function vibrateWarning(): void {
  try {
    if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
  } catch {
    // ignore
  }
}





