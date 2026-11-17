export type CameraPreviewState = "opening" | "blocked" | "ready" | "error";
type Callbacks = {
  onState(state: CameraPreviewState, message?: string): void;
  onReady(stream: MediaStream): void;
};

function errorName(error: unknown): string {
  return error && typeof error === "object" && "name" in error ? String(error.name) : "";
}

function waitForFrame(video: HTMLVideoElement, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout>;
    const events = ["loadeddata", "canplay", "playing", "resize"];
    const clean = () => { clearTimeout(timer); events.forEach(event => video.removeEventListener(event, check)); signal.removeEventListener("abort", abort); };
    const check = () => { if (video.readyState >= 2 && video.videoWidth > 0 && !video.paused) { clean(); resolve(); } };
    const abort = () => { clean(); reject(new DOMException("Camera closed", "AbortError")); };
    events.forEach(event => video.addEventListener(event, check));
    signal.addEventListener("abort", abort, { once: true });
    timer = setTimeout(() => { clean(); reject(new DOMException("No camera frames", "TimeoutError")); }, 6000);
    if (signal.aborted) abort(); else check();
  });
}

// Own the preview separately from the barcode decoder. Safari may grant camera
// access but still require a fresh tap to play the muted inline video.
export function openCameraPreview(video: HTMLVideoElement, devices: Pick<MediaDevices, "getUserMedia">, callbacks: Callbacks) {
  let stream: MediaStream | null = null;
  let stopped = false;
  let playing = false;
  let ready = false;
  const abort = new AbortController();
  const state = (value: CameraPreviewState, message?: string) => { if (!stopped) callbacks.onState(value, message); };
  function stop() {
    if (stopped) return;
    stopped = true;
    abort.abort();
    stream?.getTracks().forEach(track => track.stop());
    if (stream && video.srcObject === stream) { video.pause(); video.srcObject = null; }
  }
  // Keep play() before the first await: resume() can be called directly in a tap.
  async function resume() {
    if (stopped || !stream || playing || ready) return;
    playing = true;
    state("opening");
    try {
      await video.play();
      if (stopped) return;
      await waitForFrame(video, abort.signal);
      if (stopped) return;
      ready = true;
      callbacks.onReady(stream);
      state("ready");
    } catch (error) {
      if (stopped) return;
      if (["NotAllowedError", "AbortError", "TimeoutError"].includes(errorName(error))) {
        state("blocked", "A permissão foi recebida. Toque em Ativar câmera para mostrar a imagem.");
      } else {
        state("error", "Não foi possível mostrar a câmera. Tente abrir novamente ou digite o código abaixo.");
      }
    } finally { playing = false; }
  }
  async function acquire() {
    state("opening");
    try {
      let acquired: MediaStream;
      try {
        acquired = await devices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } });
      } catch (error) {
        if (stopped) return;
        if (!["OverconstrainedError", "ConstraintNotSatisfiedError"].includes(errorName(error))) throw error;
        acquired = await devices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" } } });
      }
      if (stopped) { acquired.getTracks().forEach(track => track.stop()); return; }
      stream = acquired;
      video.muted = true;
      video.defaultMuted = true;
      video.autoplay = true;
      video.playsInline = true;
      for (const attribute of ["muted", "autoplay", "playsinline", "webkit-playsinline"]) video.setAttribute(attribute, "");
      video.srcObject = stream;
      await resume();
    } catch (error) {
      if (stopped) return;
      const name = errorName(error);
      state("error", name === "NotAllowedError" || name === "SecurityError"
        ? "O acesso à câmera não foi liberado. Verifique a permissão do navegador ou digite o código abaixo."
        : name === "NotReadableError" ? "A câmera está ocupada ou não pôde iniciar. Feche outros apps que usam a câmera e tente novamente."
        : name === "NotFoundError" ? "Nenhuma câmera foi encontrada. Digite o código abaixo."
        : "Não foi possível abrir a câmera. Tente novamente ou digite o código abaixo.");
    }
  }
  void acquire();
  return { resume, stop };
}
