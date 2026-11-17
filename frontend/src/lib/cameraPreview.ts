export type CameraPreviewState = "opening" | "blocked" | "ready" | "error";
type Callbacks = {
  onState(state: CameraPreviewState, message?: string): void;
  onReady(stream: MediaStream): void;
};

function errorName(error: unknown): string {
  return error && typeof error === "object" && "name" in error ? String(error.name) : "";
}

function bounded<T>(pending: Promise<T>, milliseconds: number, signal: AbortSignal, late?: (value:T)=>void): Promise<T> {
  return new Promise((resolve,reject)=>{
    let finished=false;
    const clean=()=>{clearTimeout(timer);signal.removeEventListener("abort",cancel);};
    const finish=(error:DOMException)=>{if(finished)return;finished=true;clean();reject(error);};
    const cancel=()=>finish(new DOMException("Camera closed","AbortError"));
    const timer=setTimeout(()=>finish(new DOMException("Camera did not respond","TimeoutError")),milliseconds);
    signal.addEventListener("abort",cancel,{once:true});
    pending.then(value=>{if(finished){late?.(value);return;}finished=true;clean();resolve(value);},error=>{if(finished)return;finished=true;clean();reject(error);});
    if(signal.aborted)cancel();
  });
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
export function openCameraPreview(video: HTMLVideoElement, devices: Pick<MediaDevices, "getUserMedia">, callbacks: Callbacks, deadlines: {captureMs?:number;playMs?:number}={}) {
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
      await bounded(video.play(),deadlines.playMs??5000,abort.signal);
      if (stopped) return;
      await waitForFrame(video, abort.signal);
      if (stopped) return;
      ready = true;
      callbacks.onReady(stream);
      state("ready");
    } catch (error) {
      if (stopped) return;
      if (["NotAllowedError", "AbortError", "TimeoutError"].includes(errorName(error))) {
        state("blocked", "Toque em Ativar câmera ou fotografe o código.");
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
        acquired = await bounded(devices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } }),deadlines.captureMs??12000,abort.signal,late=>late.getTracks().forEach(track=>track.stop()));
      } catch (error) {
        if (stopped) return;
        if (!["OverconstrainedError", "ConstraintNotSatisfiedError"].includes(errorName(error))) throw error;
        acquired = await bounded(devices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" } } }),deadlines.captureMs??12000,abort.signal,late=>late.getTracks().forEach(track=>track.stop()));
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
      state("error", name === "TimeoutError" ? "A câmera não respondeu. Use Fotografar código ou tente pelo Safari."
        : name === "NotAllowedError" || name === "SecurityError"
        ? "O acesso à câmera não foi liberado. Verifique a permissão do navegador ou digite o código abaixo."
        : name === "NotReadableError" ? "A câmera está ocupada ou não pôde iniciar. Feche outros apps que usam a câmera e tente novamente."
        : name === "NotFoundError" ? "Nenhuma câmera foi encontrada. Digite o código abaixo."
        : "Não foi possível abrir a câmera. Tente novamente ou digite o código abaixo.");
    }
  }
  void acquire();
  return { resume, stop };
}
