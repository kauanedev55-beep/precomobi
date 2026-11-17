export type ShareableList={id:number;name:string;status?:"preparation"|"shopping"|"completed"};
export type PreparedListShare=ShareableList & {url:string;expiresAt:string};

// Sharing a draft persists its current snapshot before creating the invitation.
// Use the same list ID on every entry point; do not make duplicate lists.
export async function prepareListShare(resolveList:()=>Promise<ShareableList>,invite:(id:number)=>Promise<{token:string;expires_at:string}>,origin:string):Promise<PreparedListShare>{
 const list=await resolveList();
 const result=await invite(list.id);
 return {id:list.id,name:list.name,status:list.status,url:new URL(`/convite/${encodeURIComponent(result.token)}`,origin).href,expiresAt:result.expires_at};
}
export function listShareText(list:PreparedListShare){return `Vamos fazer a lista “${list.name}” juntos? ${list.url}`;}
