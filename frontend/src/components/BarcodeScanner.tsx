import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";

/**
 * Leitor de código de barras pela câmera. 100% no navegador (biblioteca ZXing,
 * de código aberto e gratuita) — nenhum vídeo ou imagem é enviado a servidor
 * algum; só o código já decodificado (o EAN) sai daqui.
 */
export function BarcodeScanner({ onDetected, onClose }: { onDetected: (ean: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement | null>(null);
  const controls = useRef<IScannerControls | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Este navegador não permite acesso à câmera (tente Chrome ou Edge atualizados).");
      return;
    }
    const reader = new BrowserMultiFormatReader();
    let cancelled = false;
    reader
      .decodeFromVideoDevice(undefined, video.current!, (result, _err, ctrl) => {
        controls.current = ctrl;
        if (result && !cancelled) {
          cancelled = true;
          ctrl.stop();
          onDetected(result.getText());
        }
      })
      .catch(() => setError("Não foi possível acessar a câmera. Verifique a permissão no navegador."));
    return () => {
      cancelled = true;
      controls.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="scanner-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="scanner-box" onClick={(event) => event.stopPropagation()}>
        <button className="auth-close" type="button" aria-label="Fechar" onClick={onClose}>×</button>
        <h2>Ler código de barras</h2>
        {error ? (
          <p className="error-message" role="alert">{error}</p>
        ) : (
          <>
            <video ref={video} className="scanner-video" muted playsInline />
            <p className="form-hint">Aponte a câmera para o código de barras (EAN) do produto.</p>
          </>
        )}
      </div>
    </div>
  );
}
