export type CameraPreviewState = "opening" | "blocked" | "ready" | "error";
type Callbacks = {
  onState(state: CameraPreviewState, message?: string): void;
  onReady(stream: MediaStream): void;
  onInterrupted?(): void;
  onStage?(stage: "capture" | "playback" | "frames"): void;
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

function waitForFrame(video: HTMLVideoElement, signal: AbortSignal, timeout=6000): Promise<void> {
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout>;
    const events = ["loadeddata", "canplay", "playing", "resize"];
    const clean = () => { clearTimeout(timer); events.forEach(event => video.removeEventListener(event, check)); signal.removeEventListener("abort", abort); };
    const check = () => { if (video.readyState >= 2 && video.videoWidth > 0 && !video.paused) { clean(); resolve(); } };
    const abort = () => { clean(); reject(new DOMException("Camera closed", "AbortError")); };
    events.forEach(event => video.addEventListener(event, check));
    signal.addEventListener("abort", abort, { once: true });
    timer = setTimeout(() => { clean(); reject(new DOMException("No camera frames", "TimeoutError")); }, timeout);
    if (signal.aborted) abort(); else check();
  });
}

// Own the preview separately from the barcode decoder. Safari may grant camera
// access but still require a fresh tap to play the muted inline video.
export function openCameraPreview(video: HTMLVideoElement, devices: Pick<MediaDevices, "getUserMedia">, callbacks: Callbacks, deadlines: {captureMs?:number;playMs?:number;frameMs?:number}={}) {
  let stream: MediaStream | null = null;
  let stopped = false;
  let playing = false;
  let ready = false;
  let reattach = false;
  const trackCleanups: Array<() => void> = [];
  const abort = new AbortController();
  const state = (value: CameraPreviewState, message?: string) => { if (!stopped) callbacks.onState(value, message); };
  function stop() {
    if (stopped) return;
    stopped = true;
    abort.abort();
    trackCleanups.forEach(clean=>clean());
    stream?.getTracks().forEach(track => track.stop());
    if (stream && video.srcObject === stream) { video.pause(); video.srcObject = null; }
  }
  // Keep play() before the first await: resume() can be called directly in a tap.
  async function resume() {
    if (stopped || !stream || playing || ready) return;
    playing = true;
    const frameAbort=new AbortController();
    const cancelFrame=()=>frameAbort.abort();
    abort.signal.addEventListener("abort",cancelFrame,{once:true});
    state("opening");
    callbacks.onStage?.("playback");
    try {
      // A failed WebKit play may leave its rendering layer attached to a stale
      // stream. Rebind the SAME stream on the next explicit tap, without a new
      // permission request or a hidden video. play() stays inside that gesture.
      if(reattach){video.pause();video.srcObject=null;video.srcObject=stream;reattach=false;}
      const playback=video.play();
      const frames=waitForFrame(video,frameAbort.signal,deadlines.frameMs??6000);
      // Some WebKit builds keep play() pending even after camera frames arrive.
      // Real visible pixels, not settlement of play(), determine readiness.
      await Promise.race([frames,bounded(playback,deadlines.playMs??7000,frameAbort.signal).then(()=>frames)]);
      if (stopped) return;
      callbacks.onStage?.("frames");
      ready = true;
      callbacks.onReady(stream);
      state("ready");
    } catch (error) {
      if (stopped) return;
      if (["NotAllowedError", "AbortError", "TimeoutError"].includes(errorName(error))) {
        reattach = true;
        state("blocked", "Toque em Ativar câmera para continuar.");
      } else {
        state("error", "Não foi possível mostrar a câmera. Tente novamente ou digite o código.");
        callbacks.onInterrupted?.();
        stop();
      }
    } finally { frameAbort.abort();abort.signal.removeEventListener("abort",cancelFrame);playing = false; }
  }
  async function acquire() {
    state("opening");
    callbacks.onStage?.("capture");
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;
    video.playsInline = true;
    for (const attribute of ["muted", "autoplay", "playsinline", "webkit-playsinline"]) video.setAttribute(attribute, "");
    try {
      let acquired: MediaStream;
      try {
        acquired = await bounded(devices.getUserMedia({ audio: false, video: {facingMode:{ideal:"environment"}} }),deadlines.captureMs??12000,abort.signal,late=>late.getTracks().forEach(track=>track.stop()));
      } catch (error) {
        if (stopped) return;
        if (!["OverconstrainedError", "ConstraintNotSatisfiedError"].includes(errorName(error))) throw error;
        acquired = await bounded(devices.getUserMedia({ audio: false, video: true }),deadlines.captureMs??12000,abort.signal,late=>late.getTracks().forEach(track=>track.stop()));
      }
      if (stopped) { acquired.getTracks().forEach(track => track.stop()); return; }
      stream = acquired;
      for(const track of stream.getTracks()){
        const ended=()=>{if(stopped)return;state("error","A câmera foi interrompida. Toque em Tentar novamente.");callbacks.onInterrupted?.();stop();};
        track.addEventListener?.("ended",ended);
        trackCleanups.push(()=>track.removeEventListener?.("ended",ended));
        if(track.readyState==="ended"){ended();return;}
      }
      video.srcObject = stream;
      await resume();
    } catch (error) {
      if (stopped) return;
      const name = errorName(error);
      state("error", name === "TimeoutError" ? "A câmera não respondeu. Tente novamente ou digite o código."
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

// Never keep a PWA camera session alive while its document is hidden. Resume is
// deliberately a fresh tap rather than another background permission request.
export function bindCameraLifecycle(page: EventTarget & {visibilityState:string}, windowEvents:EventTarget, pause:()=>void) {
  const visibility=()=>{if(page.visibilityState==="hidden")pause();};
  page.addEventListener("visibilitychange",visibility);
  windowEvents.addEventListener("pagehide",pause);
  return ()=>{page.removeEventListener("visibilitychange",visibility);windowEvents.removeEventListener("pagehide",pause);};
}
