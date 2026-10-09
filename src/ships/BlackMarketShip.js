// Navio estacionário e neutro do Mercado Negro (Mundo 2).
export const BLACK_MARKET_SHIP=Object.freeze({
  id:'mercado-negro',name:'Mercador do Mercado Negro',
  playable:false,npcEnabled:true,
  sprite:Object.freeze({
    path:'../../assets/ships/mercado-negro.png',
    frameWidth:400,frameHeight:400,columns:1,rows:1,
    angleStepDegrees:360,framesByHeading:Object.freeze([0]),
  }),
});
