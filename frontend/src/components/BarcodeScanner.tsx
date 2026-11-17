import { BrowserMultiFormatReader } from "@zxing/browser";
import {openCameraPreview,type CameraPreviewState} from "../lib/cameraPreview";
import { productCode } from "../lib/scannedCode";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { useEffect, useRef, useState, type FormEvent } from "react";

// Alguns navegadores oferecem um decodificador nativo especialmente eficiente
// para códigos EAN. ZXing continua funcionando nos navegadores sem essa API.
type NativeBarcode = { rawValue: string; format?: string };
type NativeDetector = { detect(source: HTMLVideoElement): Promise<NativeBarcode[]> };
type NativeDetectorCtor = new (options?: { formats?: string[] }) => NativeDetector;

type CameraCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
};

const allowedFormats = [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
];

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
  const [cameraState,setCameraState]=useState<CameraPreviewState>("opening");
  const [attempt,setAttempt]=useState(0);
  const [error, setError] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState("");
  const [cameraDetails, setCameraDetails] = useState("");

  useEffect(() => {
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
    const hints=new Map<DecodeHintType,unknown>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS,allowedFormats);
    hints.set(DecodeHintType.TRY_HARDER,true);
    const reader=new BrowserMultiFormatReader(hints,{delayBetweenScanAttempts:160});
    const stopDecoder=()=>{if(nativeTimer!==undefined)clearInterval(nativeTimer);controls?.stop();};
    const deliver=(raw:string)=>{
      if(cancelled||delivered)return;
      const code=productCode(raw);
      if(!code){setError("Este QR não identifica um produto. Use o código de barras da embalagem ou digite o EAN abaixo.");return;}
      delivered=true;stopDecoder();preview.stop();detectedRef.current(code);
    };
    const preview=openCameraPreview(video,navigator.mediaDevices,{
      onState(state,message){if(cancelled||delivered)return;setCameraState(state);setError(message||"");},
      onReady(stream){
        if(cancelled||delivered)return;
        // Capability inspection is optional: a Safari implementation that throws
        // here must not stop the actual video or the barcode decoder.
        try{
          const track=stream.getVideoTracks()[0];
          const settings=track?.getSettings?.();
          if(settings?.width&&settings.height)setCameraDetails(`Câmera: ${settings.width} × ${settings.height}`);
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
    return cleanup;
  },[attempt]);

  function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = productCode(manualCode);
    if (!code) {
      setManualError("Informe um EAN de 8, 12, 13 ou 14 números, ou um QR de produto com EAN.");
      return;
    }
    cleanupRef.current();
    onDetected(code);
  }

  return (
    <div className="scanner-overlay" role="presentation" onClick={()=>{cleanupRef.current();onClose();}}>
      <div className="scanner-box" role="dialog" aria-modal="true" aria-label="Ler código de barras ou QR Code" onClick={(event) => event.stopPropagation()}>
        <button className="auth-close" type="button" aria-label="Fechar" onClick={()=>{cleanupRef.current();onClose();}}>×</button>
        <h2>Ler código de barras ou QR Code</h2>
        <video ref={videoRef} className="scanner-video" muted playsInline autoPlay aria-label="Imagem da câmera" />
        {cameraState==="opening"&&<p className="form-hint" role="status">Abrindo a câmera…</p>}
        {cameraState==="blocked"&&<button className="primary-button scanner-resume" type="button" onClick={()=>resumeRef.current()}>Ativar câmera</button>}
        {cameraState==="error"&&<button className="outline-button" type="button" onClick={()=>{setError("");setCameraDetails("");setAttempt(value=>value+1);}}>Tentar abrir câmera novamente</button>}
        {error ? <p className="error-message" role="alert">{error}</p> : (
          <p className="form-hint">Enquadre o código de barras ou QR do produto, sem reflexos, e mantenha a embalagem parada. {cameraDetails}</p>
        )}
        <form className="scanner-manual" onSubmit={submitManual}>
          <label htmlFor="ean-manual">Ou digite o código</label>
          <input
            id="ean-manual"
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
