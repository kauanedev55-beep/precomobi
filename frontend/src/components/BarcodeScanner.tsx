import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
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

const EAN_PATTERN = /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/;
const normalizeEan = (text: string) => text.replace(/\s/g, "").trim();
const allowedFormats = [
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
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState("");
  const [cameraDetails, setCameraDetails] = useState("");

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !navigator.mediaDevices?.getUserMedia) {
      setError("Câmera indisponível. Digite o código de barras abaixo.");
      return;
    }
    const videoElement: HTMLVideoElement = video;

    let cancelled = false;
    let delivered = false;
    let nativeTimer: ReturnType<typeof setInterval> | undefined;
    let nativeBusy = false;
    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, allowedFormats);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });

    const deliver = (raw: string) => {
      const code = normalizeEan(raw);
      if (cancelled || delivered || !EAN_PATTERN.test(code)) return;
      delivered = true;
      if (nativeTimer !== undefined) clearInterval(nativeTimer);
      controlsRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      onDetected(code);
    };

    async function openCamera() {
      let stream: MediaStream;
      try {
        // Ideal, não obrigatório: notebooks sem câmera HD continuam funcionando.
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
      } catch {
        if (!cancelled) setError("Não foi possível iniciar a câmera. Verifique a permissão ou digite o EAN abaixo.");
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings();
        if (settings.width && settings.height) setCameraDetails(`Câmera: ${settings.width} × ${settings.height}`);
        // Foco contínuo, somente nos dispositivos que anunciam suporte.
        const capabilities = track.getCapabilities?.() as CameraCapabilities | undefined;
        if (capabilities?.focusMode?.includes("continuous")) {
          void track.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] }).catch(() => undefined);
        }
      }

      // Estratégia 1: BarcodeDetector nativo do Chrome/Edge, quando existir.
      const Detector = (window as Window & { BarcodeDetector?: NativeDetectorCtor }).BarcodeDetector;
      if (Detector) {
        try {
          const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
          nativeTimer = setInterval(() => {
            if (nativeBusy || cancelled || delivered || videoElement.readyState < 2) return;
            nativeBusy = true;
            void detector.detect(videoElement)
              .then((codes) => {
                const found = codes.find((item) => EAN_PATTERN.test(normalizeEan(item.rawValue)));
                if (found) deliver(found.rawValue);
              })
              .catch(() => undefined)
              .finally(() => { nativeBusy = false; });
          }, 250);
        } catch {
          // Navegador sem suporte a esses formatos: ZXing permanece ativo.
        }
      }

      // Estratégia 2: ZXing, sem depender do suporte nativo.
      try {
        const controls = await reader.decodeFromStream(stream, video, (result, _err, ctrl) => {
          if (result) {
            controlsRef.current = ctrl;
            deliver(result.getText());
          }
        });
        if (cancelled || delivered) controls.stop();
        else controlsRef.current = controls;
      } catch {
        if (!cancelled && !delivered) {
          setError("Não foi possível processar o vídeo. Digite o código de barras abaixo.");
        }
      }
    }

    void openCamera();
    return () => {
      cancelled = true;
      if (nativeTimer !== undefined) clearInterval(nativeTimer);
      controlsRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
    // Abrir a câmera uma única vez enquanto o modal estiver visível.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = normalizeEan(manualCode);
    if (!EAN_PATTERN.test(code)) {
      setManualError("Digite 8, 12, 13 ou 14 números do código de barras.");
      return;
    }
    controlsRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    onDetected(code);
  }

  return (
    <div className="scanner-overlay" role="presentation" onClick={onClose}>
      <div className="scanner-box" role="dialog" aria-modal="true" aria-label="Ler código de barras" onClick={(event) => event.stopPropagation()}>
        <button className="auth-close" type="button" aria-label="Fechar" onClick={onClose}>×</button>
        <h2>Ler código de barras</h2>
        <video ref={videoRef} className="scanner-video" muted playsInline autoPlay aria-label="Imagem da câmera" />
        {error ? <p className="error-message" role="alert">{error}</p> : (
          <p className="form-hint">Enquadre todas as barras, sem reflexos, e mantenha a embalagem parada. {cameraDetails}</p>
        )}
        <form className="scanner-manual" onSubmit={submitManual}>
          <label htmlFor="ean-manual">Ou digite o código</label>
          <input
            id="ean-manual"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ex.: 3017620422003"
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
