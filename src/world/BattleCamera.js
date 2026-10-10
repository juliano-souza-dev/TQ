const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

export function computeOneVsOneFraming({
  player,target,viewportWidth=900,viewportHeight=600,normalZoom=.88,
}={}) {
  if(!player||!target)return null;
  const dx=Number(target.x)-Number(player.x);
  const dy=Number(target.y)-Number(player.y);
  if(!Number.isFinite(dx)||!Number.isFinite(dy))return null;

  const distance=Math.hypot(dx,dy);
  const mobile=viewportWidth<700;
  const horizontalCoverage=mobile?.58:.72;
  const verticalCoverage=mobile?.46:.64;
  const fitZoom=Math.min(
    viewportWidth*horizontalCoverage/Math.max(360,Math.abs(dx)+360),
    viewportHeight*verticalCoverage/Math.max(360,Math.abs(dy)+360),
  );

  const closeZoom=Math.min(normalZoom,mobile?.76:.88);
  const farZoom=clamp(Math.min(normalZoom,fitZoom),mobile?.18:.22,closeZoom);
  const blend=clamp((distance-360)/1100,0,1);
  const zoom=closeZoom+(farZoom-closeZoom)*blend;

  return {
    distance,
    zoom,
    offset:{
      x:dx*.5,
      y:dy*.5-(mobile?28:20),
    },
  };
}
