// Item availability and ownership are separate concerns.
// An event becoming active never awards an event item.
export const EVENTS = Object.freeze({ halloween: true });
export const CANNONS = Object.freeze([
  { id:'blue-gold-pirate', name:'Canhão Pirata Ornamentado em Azul e Ouro', asset:'Canhão Pirata Ornamentado em Azul e Ouro.webp', reloadSeconds:1.2, accuracy:0.8, damageMultiplier:1, caliberPounder:20, range:595, acquisition:{type:'starter'}, event:null },
  { id:'spiked-war', name:'Canhão de Guerra Espinhoso Fantástico', asset:'Canhão de Guerra Espinhoso Fantástico.webp', reloadSeconds:1.25, accuracy:0.8, damageMultiplier:1.6, caliberPounder:24, range:770, acquisition:{type:'unconfigured'}, event:null },
  { id:'royal-lion', name:'Canhão Real Dourado com Leão', asset:'Canhão Real Dourado com Leão.webp', reloadSeconds:1.15, accuracy:0.85, damageMultiplier:2, caliberPounder:28, range:840, acquisition:{type:'unconfigured'}, event:null },
  { id:'spectral-necromancer', name:'Canhão Espectral Necromântico', asset:'Canhão Espectral Necromântico.webp', reloadSeconds:1, accuracy:0.84, damageMultiplier:2.2, caliberPounder:26, range:735, acquisition:{type:'event-reward',event:'halloween',condition:null}, event:'halloween' },
  { id:'pumpkin-terror', name:'Canhão Terror da Abóbora', asset:'canhao terror da abóbora.webp', reloadSeconds:1, accuracy:0.84, damageMultiplier:2.2, caliberPounder:26, range:735, acquisition:{type:'event-reward',event:'halloween',condition:null}, event:'halloween' },
].map(item=>Object.freeze(item)));
export const AMMUNITION = Object.freeze([
  {id:'rusted-iron',name:'Bola de Canhão de Ferro Enferrujado',asset:'Bola de Canhão de Ferro Enferrujado.webp',event:null,acquisition:{type:'unconfigured'}},
  {id:'violet-crystal',name:'Orbe Mágico de Cristal Violeta',asset:'Orbe Mágico de Cristal Violeta.webp',event:null,acquisition:{type:'unconfigured'}},
  {id:'ocean-pearl',name:'Orbe Mágico de Pérola Oceânica',asset:'Orbe Mágico de Pérola Oceânica.webp',event:null,acquisition:{type:'unconfigured'}},
  {id:'volcanic-lava',name:'Orbe Vulcânico de Lava Incandescente',asset:'Orbe Vulcânico de Lava Incandescente.webp',event:null,acquisition:{type:'unconfigured'}},
  {id:'purple-pumpkin-orb',name:'Orbe Místico de Abóbora Roxa',asset:'Orbe Místico de Abóbora Roxa.webp',event:'halloween',acquisition:{type:'event-reward',event:'halloween',condition:null}},
  {id:'halloween-purple-ball',name:'Bola de Canhão Halloween Roxa',asset:'bola_canhao_halloween_roxa (2).webp',event:'halloween',acquisition:{type:'event-reward',event:'halloween',condition:null}},
  {id:'terror-rose',name:'Rosa do Terror',asset:'rosa do terror.webp',event:'halloween',acquisition:{type:'event-reward',event:'halloween',condition:null}},
].map(item=>Object.freeze(item)));
export function isItemVisible(item,events=EVENTS) { return !item.event || events[item.event] === true; }
export function isItemOwned(item,ownedIds=[]) { return item.acquisition.type==='starter' || ownedIds.includes(item.id); }
export function getCannonAssetUrl(item) { return new URL('../../assets/cannons/'+item.asset,import.meta.url).href; }
export function getAmmunitionAssetUrl(item) { return new URL('../../assets/cannonball/'+item.asset,import.meta.url).href; }
