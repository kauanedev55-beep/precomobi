const KEY='precomobi_invite_return';
const isInvite=(path:string)=>/^\/convite\/[A-Za-z0-9_-]{32,64}$/.test(path);
export function rememberInvite(path:string){if(isInvite(path))try{sessionStorage.setItem(KEY,path);}catch{/* The original link remains usable. */}}
export function loginReturnPath(from?:string):string {
 let pending="";try{pending=sessionStorage.getItem(KEY)||"";sessionStorage.removeItem(KEY);}catch{/* Continue with router state. */}
 if(from?.startsWith('/') && !from.startsWith('//') && !from.includes('\\'))return from;
 return isInvite(pending) ? pending : '/';
}
