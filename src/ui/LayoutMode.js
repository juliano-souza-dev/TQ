// Shared viewport mode, independent of gameplay and player saves.
export function detectLayoutMode({width=0,coarse=false,portrait=true}={}){
 return !coarse&&Number(width)>=768?'desktop':portrait?'mobile-portrait':'mobile-landscape';
}
export function createLayoutMode(win=window){
 const subscribers=new Set();
 const coarse=win.matchMedia?.('(pointer: coarse)');
 const portraitQuery=win.matchMedia?.('(orientation: portrait)');
 let value='desktop';
 const update=()=>{
  const width=win.visualViewport?.width||win.innerWidth||0;
  const native=win.screen?.orientation?.type;
  const portrait=typeof native==='string'?native.startsWith('portrait')
    :portraitQuery?.matches??win.innerHeight>=width;
  const next=detectLayoutMode({width,coarse:!!coarse?.matches,portrait});
  const changed=next!==value;
  value=next;win.layoutMode=value;win.document.documentElement.dataset.tqLayout=value;
  if(changed)for(const fn of subscribers)fn(value);
 };
 const listen=(q)=>q?.addEventListener?.('change',update);
 const unlisten=(q)=>q?.removeEventListener?.('change',update);
 win.addEventListener('resize',update);win.addEventListener('orientationchange',update);
 win.visualViewport?.addEventListener?.('resize',update);
 win.screen?.orientation?.addEventListener?.('change',update);
 listen(coarse);listen(portraitQuery);update();
 return {get value(){return value;},subscribe(fn){subscribers.add(fn);fn(value);
   return ()=>subscribers.delete(fn);},dispose(){
   win.removeEventListener('resize',update);win.removeEventListener('orientationchange',update);
   win.visualViewport?.removeEventListener?.('resize',update);
   win.screen?.orientation?.removeEventListener?.('change',update);
   unlisten(coarse);unlisten(portraitQuery);subscribers.clear();
 }};
}
