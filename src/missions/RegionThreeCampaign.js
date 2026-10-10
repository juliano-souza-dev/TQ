// Region 3 mission catalogue intentionally empty until new missions are approved.
export const R3_MISSIONS=Object.freeze([]);
export function getR3Board(){
  return {missions:[],essentialClaimed:0,unlockedRegion:3,activeRegion:3,
    active:[],claimable:[],available:[]};
}
export function acceptR3Mission(){return null;}
export function recordR3Event(){return null;}
export function claimR3Mission(){return null;}
