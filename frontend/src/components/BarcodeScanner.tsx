import "../styles/barcode-scanner.css";
import type { BrowserMultiFormatReader } from "@zxing/browser";
import {createProductCodeReader} from "../lib/barcodeReader";
import {openCameraPreview,bindCameraLifecycle,type CameraPreviewState} from "../lib/cameraPreview";
import { productCode } from "../lib/scannedCode";
import { useEffect, useRef, useState, type FormEvent } from "react";

// Alguns navegadores oferecem um decodificador nativo especialmente eficiente
// para códigos EAN. ZXing continua funcionando nos navegadores sem essa API.
type NativeBarcode = { rawValue: string; format?: string };
type NativeDetector = { detect(source: HTMLVideoElement): Promise<NativeBarcode[]> };
type NativeDetectorCtor = new (options?: { formats?: string[] }) => NativeDetector;

type CameraCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
};

export function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (ean: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cleanupRef=useRef<()=>void>(()=>undefined);
  const resumeRef=useRef<()=>void>(()=>undefined);
  const detectedRef=useRef(onDetected);
  detectedRef.current=onDetected;
  const startRef=useRef<()=>void>(()=>undefined);
  const completed=useRef(false);
  const [cameraState,setCameraState]=useState<CameraPreviewState|"idle">("idle");
  const [error, setError] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState("");

  useEffect(() => {
    const start=()=>{
    if(completed.current || document.visibilityState==="hidden")return;
    cleanupRef.current();
    setError("");
    const video = videoRef.current;
    if (!video || !navigator.mediaDevices?.getUserMedia) {
      setCameraState("error");
      setError("Câmera indisponível. Digite o código de barras abaixo.");
      return;
    }
    let cancelled=false;
    let delivered=false;
    let nativeTimer:ReturnType<typeof setInterval>|undefined;
    let controls:ReturnType<BrowserMultiFormatReader["scan"]>|null=null;
    let nativeBusy=false;
    const reader=createProductCodeReader();
    const stopDecoder=()=>{if(nativeTimer!==undefined)clearInterval(nativeTimer);controls?.stop();};
    const deliver=(raw:string)=>{
      if(cancelled||delivered||completed.current)return;
      const code=productCode(raw);
      if(!code){setError("Este QR não identifica um produto. Use o código de barras da embalagem ou digite o EAN abaixo.");return;}
      delivered=true;completed.current=true;stopDecoder();preview.stop();detectedRef.current(code);
    };
    const preview=openCameraPreview(video,navigator.mediaDevices,{
      onState(state,message){if(cancelled||delivered)return;setCameraState(state);setError(message||"");},
      onInterrupted:stopDecoder,
      onReady(stream){
        if(cancelled||delivered)return;
        // Capability inspection is optional: a Safari implementation that throws
        // here must not stop the actual video or the barcode decoder.
        try{
          const track=stream.getVideoTracks()[0];
          const capabilities=track?.getCapabilities?.() as CameraCapabilities|undefined;
          if(capabilities?.focusMode?.includes("continuous"))void track.applyConstraints({advanced:[{focusMode:"continuous"} as MediaTrackConstraintSet]}).catch(()=>undefined);
        }catch{/* Optional camera details are not required for scanning. */}
        const Detector=(window as Window & {BarcodeDetector?:NativeDetectorCtor}).BarcodeDetector;
        if(Detector){try{
          const detector=new Detector({formats:["qr_code","ean_13","ean_8","upc_a","upc_e","code_128"]});
          nativeTimer=setInterval(()=>{
            if(nativeBusy||cancelled||delivered||video.readyState<2)return;
            nativeBusy=true;
            void detector.detect(video).then(codes=>{const found=codes.find(c=>productCode(c.rawValue))??codes[0];if(found)deliver(found.rawValue);}).catch(()=>undefined).finally(()=>{nativeBusy=false;});
          },250);
        }catch{/* ZXing handles browsers without native barcode support. */}}
        controls=reader.scan(video,result=>{if(result)deliver(result.getText());});
        if(cancelled||delivered)controls.stop();
      },
    });
    resumeRef.current=()=>{void preview.resume();};
    const cleanup=()=>{cancelled=true;stopDecoder();preview.stop();};
    cleanupRef.current=cleanup;
    };
    startRef.current=start;
    // Start only in a direct tap, after the video is mounted and on screen.
    // Do not leave an iOS PWA capture running behind another app or keyboard.
    const pause=()=>{cleanupRef.current();setCameraState("idle");setError("");};
    const unbind=bindCameraLifecycle(document,window,pause);
    const key=(event:KeyboardEvent)=>{if(event.key==="Escape"){cleanupRef.current();onClose();}};
    window.addEventListener("keydown",key);
    return ()=>{cleanupRef.current();startRef.current=()=>undefined;unbind();window.removeEventListener("keydown",key);};
  },[]);

  function closeScanner(){completed.current=true;cleanupRef.current();onClose();}
  function pauseForTyping(){cleanupRef.current();setCameraState("idle");setError("");}

  function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = productCode(manualCode);
    if (!code) {
      setManualError("Informe um EAN de 8, 12, 13 ou 14 números, ou um QR de produto com EAN.");
      return;
    }
    completed.current=true;cleanupRef.current();
    onDetected(code);
  }

  return (
    <div className="scanner-overlay" role="presentation" onClick={closeScanner}>
      <div className="scanner-box" role="dialog" aria-modal="true" aria-label="Ler código de barras ou QR Code" onClick={(event) => event.stopPropagation()}>
        <button className="auth-close" type="button" aria-label="Fechar" onClick={closeScanner}>×</button>
        <h2>Ler código de barras ou QR Code</h2>
        <div className="scanner-preview">
          <video ref={videoRef} className="scanner-video" muted playsInline autoPlay aria-label="Imagem da câmera" />
          {cameraState==="idle"&&<button className="primary-button scanner-start" type="button" onClick={()=>startRef.current()}>Ativar câmera</button>}
        </div>
        {cameraState==="opening"&&<p className="form-hint" role="status">Abrindo a câmera…</p>}
        {cameraState==="blocked"&&<button className="primary-button scanner-camera-action" type="button" onClick={()=>resumeRef.current()}>Ativar câmera</button>}
        {cameraState==="error"&&<button className="outline-button scanner-camera-action" type="button" onClick={()=>startRef.current()}>Tentar novamente</button>}
        {cameraState==="ready"&&<button className="outline-button scanner-camera-action" type="button" onClick={()=>startRef.current()}>Reiniciar câmera</button>}
        {error?<p className={cameraState==="blocked"?"form-hint":"error-message"} role="status">{error}</p>:cameraState==="ready"&&<p className="form-hint">Enquadre o código da embalagem.</p>}
        <form className="scanner-manual" onSubmit={submitManual}>
          <label htmlFor="ean-manual">Ou digite o código</label>
          <input
            id="ean-manual"
            onFocus={pauseForTyping}
            inputMode="text"
            autoComplete="off"
            placeholder="EAN ou conteúdo do QR do produto"
            value={manualCode}
            onChange={(event) => { setManualCode(event.target.value); setManualError(""); }}
          />
          {manualError && <p className="error-message" role="alert">{manualError}</p>}
          <button className="primary-button" type="submit">Buscar produto</button>
        </form>
      </div>
    </div>
  );
}
