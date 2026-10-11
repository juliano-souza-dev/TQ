// 16 quadros de 400x400 em atlas 4x4. Norte = quadro 4.
const line=(a,b)=>Object.freeze(Array.from({length:4},(_,i)=>Object.freeze([Math.round(a[0]+(b[0]-a[0])*i/3),Math.round(a[1]+(b[1]-a[1])*i/3)])));
const sides=Object.freeze(Array.from({length:16},(_,i)=>Object.freeze({
 ...(i<=4||i>=12?{port:line([92,205],[274,248])}:{}),
 ...(i>=4&&i<=12?{starboard:line([305,205],[135,255])}:{})
})));
export const NORTHERN_THIEF_SHIP=Object.freeze({
 id:'ladrao-do-norte',name:'Ladrão do Norte',status:'npc-active',
 description:'Saqueador rápido e resistente das Terras Gélidas.',
 playable:false,npcEnabled:true,shopEnabled:false,rewardEnabled:false,
 cannonSlots:4,cannonLayout:Object.freeze({port:4,starboard:4,bow:0,stern:0}),
 visualGunports:Object.freeze({port:4,starboard:4}),
 speed:Object.freeze({min:300,initial:360,max:430}),
 sprite:Object.freeze({path:'../../assets/ships/navio_pirata_sombrio_400x400.webp',
 frameWidth:400,frameHeight:400,columns:4,rows:4,frameCount:16,
 angleStepDegrees:22.5,headingZero:'north',clockwise:true,
 framesByHeading:Object.freeze([4,5,6,7,8,9,10,11,12,13,14,15,0,1,2,3]),
 cannonMuzzles:Object.freeze(Object.fromEntries(sides.map((entry,i)=>[i,entry])))})
});