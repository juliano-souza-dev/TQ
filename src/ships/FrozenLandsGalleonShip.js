// Galeão das Terras Gélidas: atlas 4x4, orientação visual e baterias do casco.
// Coordenadas locais em pixels por quadro (400x400). Não altera a física do combate.
const battery = (a, b, count = 9) => Object.freeze(Array.from({length: count}, (_, i) =>
  Object.freeze([Math.round(a[0] + (b[0]-a[0])*i/(count-1)), Math.round(a[1] + (b[1]-a[1])*i/(count-1))])));
const muzzles = Object.freeze({
  0: {port:battery([70,223],[270,225])},
  1: {port:battery([375-315,225],[275,251])},
  2: {port:battery([65,196],[265,284])},
  3: {port:battery([65,172],[255,297])},
  4: {port:battery([115,192],[118,286]),starboard:battery([279,192],[280,286])},
  5: {starboard:battery([302,176],[176,301])},
  6: {starboard:battery([325,202],[165,304])},
  7: {starboard:battery([348,238],[130,292])},
  8: {starboard:battery([92,231],[306,230])},
  9: {starboard:battery([89,236],[302,286])},
  10:{starboard:battery([101,196],[299,301])},
  11:{starboard:battery([128,172],[294,305])},
  12:{port:battery([116,193],[119,284]),starboard:battery([279,193],[279,284])},
  13:{port:battery([105,302],[281,175])},
  14:{port:battery([91,307],[307,201])},
  15:{port:battery([75,285],[325,230])},
});
export const FROZEN_LANDS_GALLEON_SHIP = Object.freeze({
  id:'galeao-terras-gelidas',
  name:'Galeão das Terras Gélidas',
  description:'Galeão de guerra glacial com velas azuis e ornamentação de gelo.',
  status:'npc-active',
  cannonSlots:9,
  cannonLayout:Object.freeze({port:9,starboard:9,bow:0,stern:0}),
  visualGunports:Object.freeze({port:9,starboard:9}),
  speed:Object.freeze({min:250,initial:250,max:310}),
  playable:false,npcEnabled:true,shopEnabled:false,rewardEnabled:false,
  sprite:Object.freeze({
    path:'../../assets/ships/terras_gelidas_1600x1600_400x400.webp',
    frameWidth:400,frameHeight:400,columns:4,rows:4,frameCount:16,
    angleStepDegrees:22.5,headingZero:'north',clockwise:true,
    framesByHeading:Object.freeze([4,5,6,7,8,9,10,11,12,13,14,15,0,1,2,3]),
    cannonMuzzles:muzzles,
  }),
});
