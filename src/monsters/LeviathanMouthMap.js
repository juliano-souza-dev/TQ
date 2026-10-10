// Mouth anchor is measured per atlas cell, in normalized source-frame coordinates.
// Frames are row-major in the existing 4x4 Leviathan sheet.
export const LEVIATHAN_MOUTH_UV=Object.freeze([
  [0.50,0.365],[0.675,0.345],[0.740,0.325],[0.805,0.305],
  [0.220,0.345],[0.275,0.325],[0.215,0.305],[0.165,0.300],
  [0.180,0.295],[0.500,0.235],[0.820,0.295],[0.835,0.305],
  [0.195,0.305],[0.285,0.330],[0.720,0.335],[0.500,0.365],
]);
export const LEVIATHAN_FRAME_BY_HEADING=Object.freeze([9,10,11,3,2,1,0,15,15,14,13,12,4,5,6,8]);
export function leviathanFrameForHeading(heading){
  const normalized=(((Number(heading)||0)%360)+360)%360;
  return LEVIATHAN_FRAME_BY_HEADING[Math.round(normalized/22.5)%16];
}
// Same sizing as NpcRenderer: base=min(32% viewport,185 CSS px), 2.6x for Leviathan.
// This is world-space size: camera zoom cancels between sprite and world projection.
export function leviathanSpriteWorldSize(width,height){
  return Math.min(Math.max(1,width)*.32,Math.max(1,height)*.32,185)*2.6;
}
export function leviathanMouthOrigin(monster,viewportWidth,viewportHeight){
  const frame=leviathanFrameForHeading(monster.heading);
  const [u,v]=LEVIATHAN_MOUTH_UV[frame];
  const size=leviathanSpriteWorldSize(viewportWidth,viewportHeight);
  return {x:monster.x+(u-.5)*size,y:monster.y+(v-.5)*size,frame};
}
