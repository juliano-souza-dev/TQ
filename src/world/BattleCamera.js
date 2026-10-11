const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

export function computeOneVsOneFraming({
  player,target,viewportWidth=900,viewportHeight=600,normalZoom=.88,minZoomOverride=null,
}={}) {
  if(!player||!target)return null;
  const dx=Number(target.x)-Number(player.x);
  const dy=Number(target.y)-Number(player.y);
  if(!Number.isFinite(dx)||!Number.isFinite(dy))return null;

  const distance=Math.hypot(dx,dy);
  const mobile=viewportWidth<700;

  // Three continuous framing zones: close duel, medium duel and pursuit.
  // Zoom opens first; camera translation is secondary so the player's ship
  // remains the visual anchor instead of the midpoint becoming empty ocean.
  // On large screens combat needs an explicit visual state too. Previously
  // desktop closeZoom was capped by normalZoom, so a nearby target could produce
  // virtually no camera change at all. Desktop now pushes in slightly for a duel,
  // then opens progressively as distance grows. Mobile keeps its safer framing.
  const closeZoom=mobile
    ? Math.min(normalZoom,.78)
    : Math.min(1.06,Math.max(normalZoom,normalZoom*1.12));
  const defaultMinZoom=mobile?.19:.24;
  // null is not an override: Number(null) === 0 previously forced 0.08.
  const minZoom=minZoomOverride!=null && Number.isFinite(Number(minZoomOverride))
    ? clamp(Number(minZoomOverride),.08,closeZoom)
    : defaultMinZoom;
  const distanceBlend=clamp((distance-460)/1050,0,1);
  const distanceZoom=closeZoom+(minZoom-closeZoom)*distanceBlend;

  // Start from the duel midpoint, then cap how far the camera may leave the
  // player. On portrait mobile the vertical cap is tighter because the combat
  // HUD occupies the lower screen.
  const playerScreenCapX=viewportWidth*(mobile?.20:.25);
  const playerScreenCapY=viewportHeight*(mobile?.17:.22);
  const safeZoom=Math.max(minZoom,distanceZoom);
  const maxOffsetX=playerScreenCapX/safeZoom;
  const maxOffsetY=playerScreenCapY/safeZoom;
  let offsetX=clamp(dx*.5,-maxOffsetX,maxOffsetX);
  let offsetY=clamp(dy*.5,-maxOffsetY,maxOffsetY);

  // Small upward composition bias keeps the ship clear of the lower HUD,
  // without allowing the bias itself to push the player out of the safe zone.
  const verticalBias=(mobile?24:18)/safeZoom;
  offsetY=clamp(offsetY-verticalBias,-maxOffsetY,maxOffsetY);

  // With the player anchored, make sure the target also fits. If necessary,
  // reduce zoom instead of dragging the camera farther away from the player.
  const targetFromCenterX=Math.abs(dx-offsetX);
  const targetFromCenterY=Math.abs(dy-offsetY);
  const usableHalfW=viewportWidth*(mobile?.37:.43);
  const usableHalfH=viewportHeight*(mobile?.32:.40);
  const fitTargetZoom=Math.min(
    usableHalfW/Math.max(180,targetFromCenterX+150),
    usableHalfH/Math.max(180,targetFromCenterY+150),
  );
  // Close encounters should not be filmed from far above the ocean.
  // When the vessels are already nearby, favor readable ship scale over
  // fitting the entire target inside the conservative HUD-safe rectangle.
  const closeCombatWeight=clamp((460-distance)/220,0,1);
  const minimumCloseZoom=closeZoom*(mobile?.84:.9);
  const fittedZoom=Math.min(distanceZoom,fitTargetZoom);
  const zoom=clamp(Math.max(fittedZoom,minimumCloseZoom*closeCombatWeight),minZoom,closeZoom);

  // Re-clamp at the final zoom so the player's safe-zone guarantee remains
  // true after any additional zoom-out needed to fit the target.
  const finalMaxOffsetX=playerScreenCapX/zoom;
  const finalMaxOffsetY=playerScreenCapY/zoom;
  offsetX=clamp(offsetX,-finalMaxOffsetX,finalMaxOffsetX);
  offsetY=clamp(offsetY,-finalMaxOffsetY,finalMaxOffsetY);

  return {
    distance,
    zoom,
    offset:{x:offsetX,y:offsetY},
    mode:distance<430?'close':distance<950?'medium':'far',
    playerScreenOffset:{
      x:-offsetX*zoom,
      y:-offsetY*zoom,
    },
  };
}
