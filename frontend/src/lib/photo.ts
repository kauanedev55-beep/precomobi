// Resize locally before upload/decoding. Drawing into a new canvas also avoids
// copying a phone photo's EXIF metadata into the public catalog image.
export async function preparePhoto(file: File, maxEdge=640):Promise<string> {
  if(!file.size||file.size>20*1024*1024)throw new Error("Escolha uma foto de até 20 MB.");
  if(file.type&&!file.type.startsWith("image/"))throw new Error("Escolha um arquivo de imagem.");
  const url=URL.createObjectURL(file);
  try{
    const image=new Image();
    await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error("Não foi possível abrir essa foto. Use uma imagem JPEG ou PNG."));image.src=url;});
    if(!image.naturalWidth||!image.naturalHeight)throw new Error("A foto está vazia.");
    const ratio=Math.min(1,maxEdge/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
    const context=canvas.getContext("2d");if(!context)throw new Error("Não foi possível preparar a foto.");
    context.fillStyle="#fff";context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
    return canvas.toDataURL("image/jpeg",maxEdge>640?.9:.8);
  }finally{URL.revokeObjectURL(url);}
}
export function isInstalledApple(navigatorInfo: Pick<Navigator,"userAgent"|"maxTouchPoints"> & {standalone?:boolean}, standalone:boolean):boolean {
  const apple=/iPhone|iPad|iPod/.test(navigatorInfo.userAgent)||(/Macintosh/.test(navigatorInfo.userAgent)&&navigatorInfo.maxTouchPoints>1);
  return apple&&(standalone||navigatorInfo.standalone===true);
}
