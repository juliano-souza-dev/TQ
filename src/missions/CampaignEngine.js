import { getCampaignBoard, acceptCampaignMission, recordCampaignEvent, claimCampaignMission } from './RegionOneCampaign.js';
import { getR2Board, acceptR2Mission, recordR2Event, claimR2Mission } from './RegionTwoCampaign.js';

// Um contrato compartilhado entre regiões: estado, aceitação, eventos e resgate.
// Somente catálogos e regras dos objetivos mudam por região.
const catalogs = Object.freeze({
  r1: { board: getCampaignBoard, accept: acceptCampaignMission, record: recordCampaignEvent, claim: claimCampaignMission },
  r2: { board: getR2Board, accept: acceptR2Mission, record: recordR2Event, claim: claimR2Mission },
});
export const campaignFor = regionId => catalogs[regionId] ?? catalogs.r1;
export const boardFor = (save, regionId) => campaignFor(regionId).board(save);
export const missionReady = (save, regionId) => boardFor(save, regionId).claimable.find(m => !m.optional) ?? null;
