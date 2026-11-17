import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BinaryBitmap,HybridBinarizer,RGBLuminanceSource} from '@zxing/library';
import {createProductCodeReader} from '../.test-build/barcodeReader.js';
import {productCode} from '../.test-build/scannedCode.js';

// Synthetic EAN-13 fixture (4006381333931), not a camera photo or a price.
// Decode real pixels through the SAME JavaScript reader used by live video.
test('live reader decodes EAN pixels without the native BarcodeDetector API',()=>{
 const L=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
 const G=['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
 const R=['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
 const code='4006381333931';const parity='LGLLGG';
 const bits='101'+[...code.slice(1,7)].map((n,i)=>(parity[i]==='L'?L:G)[Number(n)]).join('')+'01010'+[...code.slice(7)].map(n=>R[Number(n)]).join('')+'101';
 const width=640,height=360,pixels=new Uint8ClampedArray(width*height).fill(255),left=130;
 for(let y=60;y<300;y++)for(let x=0;x<bits.length;x++)if(bits[x]==='1')pixels.fill(0,y*width+left+x*4,y*width+left+(x+1)*4);
 assert.equal(globalThis.BarcodeDetector,undefined);
 const bitmap=new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels,width,height)));
 const result=createProductCodeReader().decodeBitmap(bitmap);
 assert.equal(productCode(result.getText()),code);
});
