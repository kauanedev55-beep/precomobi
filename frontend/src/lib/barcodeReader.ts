import {BrowserMultiFormatReader} from "@zxing/browser";
import {BarcodeFormat,DecodeHintType} from "@zxing/library";

// The JS decoder is always available; native BarcodeDetector is optional.
export function createProductCodeReader(){
  const hints=new Map<DecodeHintType,unknown>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS,[BarcodeFormat.QR_CODE,BarcodeFormat.EAN_13,BarcodeFormat.EAN_8,BarcodeFormat.UPC_A,BarcodeFormat.UPC_E,BarcodeFormat.CODE_128]);
  hints.set(DecodeHintType.TRY_HARDER,true);
  return new BrowserMultiFormatReader(hints,{delayBetweenScanAttempts:160});
}
