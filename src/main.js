import {drawFrozenShip,drawFreezeBurst} from './rendering/FreezeEffects.js';
const R4_ICE_WRECKS=Object.freeze([{id:'r4-ice-wreck-1',x:920,y:1900},{id:'r4-ice-wreck-2',x:1830,y:2450},{id:'r4-ice-wreck-3',x:2870,y:3100},{id:'r4-ice-wreck-4',x:3450,y:1550},{id:'r4-ice-wreck-5',x:1360,y:3850}]);
import { R3_WRECKS, R3_LEVIATHAN_MISSION_ID, R3_LEVIATHAN_ENTITY_ID, R3_ABYSS_SECRET_MISSION_ID, R3_ABYSS_WRECKS, R3_FLAME_MISSION_ID, R3_FLAME_STOPS, R3_VARKOR_MISSION_ID, R3_REBUILD_MISSION_ID, R3_CLEANUP_MISSION_ID, R3_CLEANUP_RED_IDS } from './missions/RegionThreeCampaign.js';
import { R3_SILAS_MISSION_ID, exchangeR3SilasCargo, reconcileSilasAutomaticLoadout, verifySilasArsenalAtLeviathan } from './missions/R3SilasTrade.js';
import { expectedR3GoldenLoadout, r3GoldenReady, R3_FIRST_MISSION_ID } from './missions/RegionThreeCampaign.js';
import { campaignFor, boardFor, missionReady } from './missions/CampaignEngine.js';
import { getR2Board,acceptR2Mission,recordR2Event,claimR2Mission,advanceR2Story } from './missions/RegionTwoCampaign.js';
import { beginHullRecovery, advanceHullRecovery } from './combat/HullRepair.js';
import { getCampaignBoard, recordCampaignEvent } from './missions/RegionOneCampaign.js';
import { resolvePedagogicalAction, resolveMissionReward, activateNextRegion } from './gameplay/PedagogicalActions.js';
import { createMathGate } from './ui/MathGate.js';
import { getVisibleTreasures, findTreasureNearPoint } from './treasures/RegionTreasures.js';
import { TreasureRenderer } from './rendering/TreasureRenderer.js';
import { NavalBattleController } from './combat/NavalBattleController.js';
import { TERROR_ABYSS_HARPOON_ID, HORIZON_HARPOON_AMMO_ID } from './combat/HarpoonCatalog.js';
import { effectiveAmmo, armedCannons, cannonRange } from './combat/NavalBattleRules.js';
import { rollNpcAmmoLoot, grantNpcAmmoLoot } from './combat/NpcAmmoLoot.js';
import { NavalCombatWebGLRenderer } from './rendering/NavalCombatWebGLRenderer.mjs';
import { createNavalCombatHud } from './ui/NavalCombatHud.js';
import { SEA_GLINTS, collectSeaGlint } from './events/HalloweenSeaGlints.js';
import { EVENTS, CANNONS, isItemVisible } from './items/EquipmentCatalog.js';
import { isHalloweenAtmosphereActive } from './events/HalloweenAtmosphere.js';
import { HalloweenFogRenderer } from './rendering/HalloweenFogRenderer.js';
import { getMissionFlow } from './missions/MissionFlow.js';
import { recordLearningAnswer } from './education/LearningProgress.js';
import { GameLoop } from './core/GameLoop.js';
import { createGameState, setGameStatus, GAME_STATUS, advanceGameState } from './core/GameState.js';
import { renderLogin, renderLoading, renderConfigurationRequired } from './ui/Portal.js';
import { createSyncPreferenceStore, SYNC_MODE } from './persistence/SyncPreference.js';
import { createLocalSaveStore } from './persistence/LocalSaveStore.js';
import { formatMissionHudObjectives } from './ui/MissionHud.js';
import {createGuidedPointerImage,angleToGuidedTarget} from './ui/GuidedPointer.js';
import { computeOneVsOneFraming } from './world/BattleCamera.js';
import { DamageTextRenderer } from './rendering/DamageTextRenderer.js';
import { TreasureGlowWebGLRenderer } from './rendering/TreasureGlowWebGLRenderer.js';

// Ocean ambience is owned by the world lifecycle, never by individual shots.
const oceanAmbience = new Audio('https://raw.githubusercontent.com/juliano-souza-dev/tabuada-quest-2-dev/main/assets/sound/ocean_water.mp3');
oceanAmbience.loop = true;
oceanAmbience.volume = 0.28;
oceanAmbience.preload = 'auto';
function beginOceanAmbience() {
  if (document.hidden) return;
  oceanAmbience.play().catch(() => {});
}
function stopOceanAmbience() {
  oceanAmbience.pause();
  oceanAmbience.currentTime = 0;
}
document.addEventListener('pointerdown', () => {
  if (loop && oceanAmbience.paused) beginOceanAmbience();
}, { passive: true });

const root = document.getElementById('app');
if (!root) throw new Error('Elemento #app ausente');

const syncPreferences = createSyncPreferenceStore(window.localStorage);
const localSaves = createLocalSaveStore(window.localStorage);
let authService = null;
let currentUser = null;
let loop = null;
let oceanRenderer = null;
let halloweenFogRenderer = null;
let halloweenFogCanvas = null;
let spectralShipCanvas = null;
let spectralShipRenderer = null;
let cloudCanvas = null;
let cloudRenderer = null;
let shipCanvas = null;
let islandCanvas = null;
let npcCanvas = null;
let treasureCanvas = null;
let treasureGlowCanvas = null;
let treasureGlowRenderer = null;
let navalCanvas = null;
let damageTextCanvas = null;
let damageTextRenderer = null;
let navalBattle = null;
let minimapElement = null;
let islandPanelElement = null;
let clickNavigation = null;
let keyboardCamera = null;
let fireKeyCleanup = null;
let firstVoyageGuide = null;
let worldGeneration = 0;
const GUEST_UID = 'local-guest';
const LOCAL_SESSION_KEY = 'tq:local-session:v1';
let guestMode = false;

function stopWorld() {
  stopOceanAmbience();
  worldGeneration++;
  fireKeyCleanup?.();
  fireKeyCleanup = null;
  if (loop) loop.stop();
  loop = null;
  if (oceanRenderer) oceanRenderer.dispose();
  if (halloweenFogRenderer) halloweenFogRenderer.dispose();
  halloweenFogRenderer = null;
  if (halloweenFogCanvas) halloweenFogCanvas.remove();
  halloweenFogCanvas = null;
  spectralShipRenderer?.dispose();
  spectralShipRenderer = null;
  spectralShipCanvas?.remove();
  spectralShipCanvas = null;
  cloudRenderer?.dispose();
  cloudRenderer = null;
  cloudCanvas?.remove();
  cloudCanvas = null;
  if (navalBattle) navalBattle.dispose();
  navalBattle = null;
  if (navalCanvas) navalCanvas.remove();
  navalCanvas = null;
  damageTextRenderer?.clear();
  damageTextRenderer = null;
  if (damageTextCanvas) damageTextCanvas.remove();
  damageTextCanvas = null;
  oceanRenderer = null;
  if (keyboardCamera) keyboardCamera.dispose();
  if (firstVoyageGuide) firstVoyageGuide.dispose();
  firstVoyageGuide = null;
  keyboardCamera = null;
  if (clickNavigation) clickNavigation.dispose();
  clickNavigation = null;
  if (islandPanelElement) islandPanelElement.remove();
  islandPanelElement = null;
  if (minimapElement) minimapElement.remove();
  minimapElement = null;
  if (npcCanvas) npcCanvas.remove();
  npcCanvas = null;
  treasureGlowRenderer?.dispose();
  treasureGlowRenderer = null;
  if (treasureGlowCanvas) treasureGlowCanvas.remove();
  treasureGlowCanvas = null;
  if (treasureCanvas) treasureCanvas.remove();
  treasureCanvas = null;
  if (islandCanvas) islandCanvas.remove();
  islandCanvas = null;
  if (shipCanvas) shipCanvas.remove();
  shipCanvas = null;
}

function enterLocalMode() {
  stopWorld();
  guestMode = true;
  currentUser = { uid: GUEST_UID, displayName: 'Marujo local', isGuest: true };
  syncPreferences.set(GUEST_UID, SYNC_MODE.LOCAL);
  localStorage.setItem(LOCAL_SESSION_KEY, GUEST_UID);
  startWorld();
}

async function startWorld() {
  if (!currentUser) return;
  stopWorld();
  const generation = worldGeneration;
  const canvas = document.createElement('canvas');
  canvas.id = 'ocean';
  canvas.setAttribute('aria-label', 'Oceano da Região 1');
  root.replaceChildren(canvas);
  beginOceanAmbience();
  const [{ createWorldState }, { OceanRenderer }, { createAnalogJoystick }, { ShipRenderer }, { IslandRenderer }, { advanceNavigation, advanceTowardDestination }, { createClickNavigation }, { createKeyboardCameraInput }, { updateCamera }, { createMinimap }, { createIslandPanel }, { getIslandContact, collidesWithIsland, resolveIslandMovement }, { getShipSpeed }, { STARTER_SHIP }, { NpcRenderer }, { createCorsairPopulation, updateCorsairPopulation }, { findNpcAtPoint }] = await Promise.all([
    import('./world/WorldState.js'), import('./rendering/OceanRenderer.js'),
    import('./ui/AnalogJoystick.js'), import('./rendering/ShipRenderer.js'),
    import('./rendering/IslandRenderer.js'),
    import('./world/NavigationSystem.js'), import('./world/ClickNavigationInput.js'),
    import('./ui/KeyboardCameraInput.js'), import('./world/CameraSystem.js'),
    import('./ui/Minimap.js'), import('./ui/IslandPanel.js'),
    import('./world/IslandCollision.js'), import('./ships/ShipSpeed.js'),
    import('./ships/ShipRegistry.js'),
    import('./rendering/NpcRenderer.js'), import('./npcs/CorsairPopulation.js'),
    import('./npcs/NpcSelection.js'),
  ]);
  if (generation !== worldGeneration) return;
  // TEMPORÁRIO: replay único da missão 16 para validar a nova passagem.
  // V3 também restaura quando o save já foi trazido de volta para a R1.
  {
    const localDev=(globalThis.location?.protocol ?? '')!=='https:';
    const snapshot=localSaves.load(currentUser.uid)?.payload ?? {};
    const replayKey='devReplayR1FinaleOnceV4';
    const campaign=snapshot.campaign??{};
    const hasReachedFinale=(campaign.claimed??[]).includes('r1-finale')
      || (campaign.active??[]).includes('r1-finale')
      || (snapshot.progression?.activeRegion ?? 1)>=2
      || Boolean(snapshot.r2Campaign);
    if(localDev && !snapshot.devFlags?.[replayKey] && hasReachedFinale){
      localSaves.save(currentUser.uid,{
        ...snapshot,
        progression:{...(snapshot.progression??{}),
          activeRegion:1,
          unlockedRegion:Math.max(2,Number(snapshot.progression?.unlockedRegion)||1)},
        campaign:{
          ...campaign,
          active:[...new Set([...(campaign.active??[]).filter(id=>id!=='r1-finale'),'r1-finale'])],
          claimed:(campaign.claimed??[]).filter(id=>id!=='r1-finale'),
          progress:{...(campaign.progress??{}),'r1-finale':[0]},
          processedEvents:(campaign.processedEvents??[]).filter(id=>!String(id).startsWith('r1-finale:exit:')),
        },
        transitionFlags:{...(snapshot.transitionFlags??{}),r1FinalePending:false},
        playerPosition:{x:3660,y:3660},
        devFlags:{...(snapshot.devFlags??{}),[replayKey]:true},
      });
    }
  }

  // Reset de campanha: retorna obrigatoriamente ao ponto anterior ao Renascimento.
  {
    const snapshot=localSaves.load(currentUser.uid)?.payload??{};
    const campaign=snapshot.r3Campaign??{};
    const flag='r3BeforeRebirthHardResetV4';
    const reachedRebirth=(campaign.claimed??[]).includes(R3_VARKOR_MISSION_ID)
      || (campaign.claimed??[]).includes(R3_REBUILD_MISSION_ID)
      || (campaign.claimed??[]).includes(R3_CLEANUP_MISSION_ID)
      || [R3_REBUILD_MISSION_ID,R3_CLEANUP_MISSION_ID].includes(campaign.active);
    if(reachedRebirth&&!snapshot.devFlags?.[flag]){
      localSaves.save(currentUser.uid,{...snapshot,
        progression:{...(snapshot.progression??{}),activeRegion:3,unlockedRegion:3},
        r3Campaign:{...campaign,active:null,
          claimed:(campaign.claimed??[]).filter(id=>id!==R3_REBUILD_MISSION_ID&&id!==R3_CLEANUP_MISSION_ID),
          emeraldSpoken:false,emeraldWreckCollected:false,emeraldDeparted:false,
          cleanupSunkIds:[],cleanupReturned:false},
        devFlags:{...(snapshot.devFlags??{}),[flag]:true}});
    }
  }
  const storedRegion = localSaves.load(currentUser.uid)?.payload?.progression?.activeRegion ?? 1;
  const region = storedRegion >= 4
    ? (await import('./world/regions/r4.js')).R4
    : storedRegion >= 3
    ? (await import('./world/regions/r3.js')).R3
    : storedRegion >= 2 ? (await import('./world/regions/r2.js')).R2
    : (await import('./world/regions/r1.js')).R1;
  if (generation !== worldGeneration) return;
  // One-time replay of the Varkor battle for saves created before the wreck
  // position and navigation were reliably persisted. Never reset a claimed mission.
  if(region.id==='r3'){
    const snapshot=localSaves.load(currentUser.uid)?.payload??{};
    const mission=snapshot.r3Campaign??{};
    if(mission.active===R3_VARKOR_MISSION_ID&&mission.varkorDefeated
      && !mission.varkorWreckClaimed&&!mission.varkorWreckReplayResetV1){
      localSaves.save(currentUser.uid,{...snapshot,
        r3Campaign:{...mission,varkorSummoned:false,varkorDefeated:false,
          varkorWreckPosition:null,varkorWreckAnswers:0,varkorWreckClaimed:false,
          varkorReturned:false,varkorWreckReplayResetV1:true}});
    }
  }
  const world = createWorldState(region);
  const savedPosition = localSaves.load(currentUser.uid)?.payload?.playerPosition;
  // Migração dos pontos antigos de entrada da R2: próximos demais ao porto.
  // Não alterar posições conquistadas pelo jogador dentro da região.
  if (world.region.id === 'r2' && savedPosition &&
      (Math.hypot(savedPosition.x - 180, savedPosition.y - 1100) < 5 ||
       Math.hypot(savedPosition.x - 650, savedPosition.y - 1020) < 5 ||
       Math.hypot(savedPosition.x - 650, savedPosition.y - 950) < 5)) {
    savedPosition.x = world.region.spawn.x;
    savedPosition.y = world.region.spawn.y;
  }
  if (savedPosition && Number.isFinite(savedPosition.x) && Number.isFinite(savedPosition.y)) {
    const { collidesWithIsland } = await import('./world/IslandCollision.js');
    if (savedPosition.x >= 0 && savedPosition.x <= world.region.width && savedPosition.y >= 0 && savedPosition.y <= world.region.height && !collidesWithIsland(world.region, savedPosition.x, savedPosition.y, 32)) {
      world.camera.x = savedPosition.x;
      world.camera.y = savedPosition.y;
    }
  }
  createCorsairPopulation(world);
  const { createFugitiveFrigatePopulation, updateFugitiveFrigatePopulation, updateNegotiationFrigate, NEGOTIATION_APPROACH_RADIUS } =
    await import('./npcs/FugitiveFrigateNpc.js');
  const { createMonsterPopulation, updateMonsterPopulation, monsterGoldReward } = await import('./monsters/MonsterPopulation.js');
  createMonsterPopulation(world, Math.random, localSaves.load(currentUser.uid)?.payload??{});
  updateCamera(world, canvas.clientWidth, canvas.clientHeight);
  let selectedNpcId = null;
  let heading = 0;
  let glintElapsed = 0;
  let hudRefreshElapsed = 0;
  const readSave = () => localSaves.load(currentUser.uid)?.payload ?? {};
  // A derrota de Varkor é definitiva: nenhuma missão de destroços pode recriar o chefe.
  if(world.region.id==='r3'&&readSave().r3Campaign?.varkorDefeated){
    world.entities.delete(world.region.terrorBoss?.id);
  }

  const writePatch = patch => localSaves.save(currentUser.uid, { ...readSave(), ...patch });

  // A missão final da R1 só é concluída depois que o novo mapa já carregou.
  if(world.region.id==='r2' && readSave().transitionFlags?.r1FinalePending){
    const before=readSave();
    const progress=recordCampaignEvent(before,{type:'exit',id:'r1-exit-east-arrival'});
    if(progress)writePatch(progress);
    const arrived=readSave();
    const reward=resolveMissionReward(arrived,'r1-finale');
    if(reward)writePatch({
      ...reward.patch,
      transitionFlags:{...(arrived.transitionFlags??{}),r1FinalePending:false},
    });
    else writePatch({
      transitionFlags:{...(arrived.transitionFlags??{}),r1FinalePending:false},
    });
  }
  // Grant Veloz+ only once per player, never reset inventory on reload.
  {
    const save=readSave(),c=save.consumables??{};
    if(!c.starterSpeedGranted){
      writePatch({consumables:{...c,starterSpeedGranted:true,
        quantities:{...(c.quantities??{}),
          'speed-plus':(Number(c.quantities?.['speed-plus'])||0)+10}}});
    }
  }
  // One initial treasure map, granted only once per player.
  {
    const save=readSave(),c=save.consumables??{};
    if(!c.starterTreasureMapGranted)writePatch({consumables:{...c,starterTreasureMapGranted:true,
      quantities:{...(c.quantities??{}),'treasure-map':(Number(c.quantities?.['treasure-map'])||0)+1}}});
  }
  // One-time reward migration for missions claimed before treasure maps existed.
  {
    const save=readSave(),c=save.consumables??{},claimed=save.campaign?.claimed??[];
    const grants=['r1-treasure-i','r1-finale'].filter(id=>claimed.includes(id)
      && !save.rewardMigrations?.['treasureMap-'+id]);
    if(grants.length)writePatch({consumables:{...c,quantities:{...(c.quantities??{}),
      'treasure-map':(Number(c.quantities?.['treasure-map'])||0)+grants.length*2}},
      rewardMigrations:{...(save.rewardMigrations??{}),
        ...Object.fromEntries(grants.map(id=>['treasureMap-'+id,true]))}});
  }
  // Migração idempotente: jogadores que já resgataram a missão 10
  // recebem o Aetherion no lugar da recompensa antiga e 5000 orbes.
  {
    const save = readSave();
    const claimed = save.r2Campaign?.claimed?.includes('r2-equip-chaser');
    const migrationKey = 'aetherionRewardV2';
    if (claimed && !save.rewardMigrations?.[migrationKey]) {
      const equipment = save.equipment ?? {};
      const counts = {...(equipment.cannonCounts ?? {})};
      const oldReward = Math.min(1, Number(counts['royal-lion']) || 0);
      if (oldReward) counts['royal-lion'] -= oldReward;
      counts['aetherion-mk1'] = (Number(counts['aetherion-mk1']) || 0) + 1;
      const ownedCannonIds = [...new Set([...(equipment.ownedCannonIds ?? []), 'aetherion-mk1'])]
        .filter(id => id !== 'royal-lion' || counts['royal-lion'] > 0);
      const loadout = Object.fromEntries(Object.entries(equipment.loadout ?? {})
        .map(([ship,slots]) => [ship, Array.isArray(slots)
          ? slots.map(id => id === 'royal-lion' && oldReward ? 'aetherion-mk1' : id)
          : slots]));
      writePatch({
        equipment:{...equipment,cannonCounts:counts,ownedCannonIds,loadout},
        ammunition:{...(save.ammunition ?? {}),'aetherion-seeker':(Number(save.ammunition?.['aetherion-seeker']) || 0) + 5000},
        rewardMigrations:{...(save.rewardMigrations ?? {}),[migrationKey]:true},
      });
    }
  }
  // Upgrade previously claimed mission-10 rewards exactly once.
  {
    const save=readSave(),claimed=save.r2Campaign?.claimed?.includes('r2-equip-chaser');
    if(claimed&&!save.rewardMigrations?.aetherionRewardV3){
      const e=save.equipment??{},counts={...(e.cannonCounts??{})};
      counts['aetherion-mk1']=(Number(counts['aetherion-mk1'])||0)+1;
      const c=save.consumables??{},q=c.quantities??{};
      writePatch({
        equipment:{...e,cannonCounts:counts,ownedCannonIds:[...new Set([...(e.ownedCannonIds??[]),'aetherion-mk1'])]},
        ammunition:{...(save.ammunition??{}),'aetherion-seeker':(Number(save.ammunition?.['aetherion-seeker'])||0)+10000},
        consumables:{...c,quantities:{...q,'flame-5x':(Number(q['flame-5x'])||0)+10,
          shield:(Number(q.shield)||0)+10,'speed-plus':(Number(q['speed-plus'])||0)+10}},
        rewardMigrations:{...(save.rewardMigrations??{}),aetherionRewardV3:true},
      });
    }
  }
  // One-time retroactive Shadow Thief rewards for accounts that claimed it
  // before the new consumables, Aetherion ammo and armor-piercing harpoons.
  {
    const save=readSave();
    if(save.r2Campaign?.claimed?.includes('r2-destroy-thief')
      && !save.rewardMigrations?.shadowThiefRewardV2){
      const c=save.consumables??{},q=c.quantities??{};
      const bonus={'flame-5x':10,shield:10,'speed-plus':10,'treasure-map':10};
      writePatch({
        consumables:{...c,quantities:{...q,...Object.fromEntries(
          Object.entries(bonus).map(([id,amount])=>[id,(Number(q[id])||0)+amount]))}},
        ammunition:{...(save.ammunition??{}),
          'aetherion-seeker':(Number(save.ammunition?.['aetherion-seeker'])||0)+1500},
        harpoonAmmo:{...(save.harpoonAmmo??{}),
          'harpoon-armor-piercing':(Number(save.harpoonAmmo?.['harpoon-armor-piercing'])||0)+1500},
        rewardMigrations:{...(save.rewardMigrations??{}),shadowThiefRewardV2:true},
      });
    }
  }
  const needsR2CampaignMigration=(Number(readSave().r2Campaign?.schemaVersion)||0)<2;
  if(needsR2CampaignMigration){
  // Recover old Black Market completions that never granted the advertised cannons.
  // Roll the last two campaign stages back to the purchase; preserve all inventory.
  {
    const save=readSave(),state=save.r2Campaign??{};
    const claimed=state.claimed??[],counts=save.equipment?.cannonCounts??{};
    const marketCompleted=claimed.includes('r2-black-market')
      || claimed.includes('r2-golden-ii') || state.active==='r2-golden-ii';
    const missingPackage=(Number(counts['aetherion-mk1'])||0)<1
      || (Number(counts['royal-lion'])||0)<8;
    const postAmbushProgress=save.storyFlags?.pumpkinAmbushResolved===true
      || ['r2-search-clues','r2-do-me-favor','r2-hunt-prep','r2-monster-meat','r2-mystery-light','r2-dark-voyage'].includes(state.active)
      || claimed.some(id=>['r2-search-clues','r2-do-me-favor','r2-hunt-prep','r2-monster-meat','r2-mystery-light','r2-dark-voyage'].includes(id));
    if(marketCompleted && missingPackage && !postAmbushProgress && !save.rewardMigrations?.blackMarketRollbackV1){
      const rolledBack=['r2-black-market','r2-golden-ii'];
      writePatch({
        r2Campaign:{...state,active:'r2-black-market',
          claimed:claimed.filter(id=>!rolledBack.includes(id)),
          progress:{...(state.progress??{}),'r2-black-market':[0],'r2-golden-ii':[0]},
          processed:(state.processed??[]).filter(id=>id!=='black-market:market-trade-completed')},
        rewardMigrations:{...(save.rewardMigrations??{}),blackMarketRollbackV1:true},
      });
    }
  }
  // Golden II now unlocks the Terror da Tabuada, followed by a guided
  // equip mission before the rendezvous at the Forgotten Island.
  {
    const save=readSave(),state=save.r2Campaign??{},claimed=state.claimed??[];
    const terrorId='galeao-halloween-tabuada';
    const goldenDone=claimed.includes('r2-golden-ii');
    const later=['r2-meet-forgotten','r2-why-help','r2-search-clues','r2-do-me-favor',
      'r2-hunt-prep','r2-monster-meat','r2-mystery-light','r2-dark-voyage'];
    const skippedEquip=!claimed.includes('r2-equip-terror')
      && save.storyFlags?.pumpkinAmbushResolved!==true
      && (state.active==='r2-meet-forgotten'||later.slice(1).includes(state.active)
        || later.some(id=>claimed.includes(id)));
    if(goldenDone && !save.equipment?.ownedShipIds?.includes(terrorId)){
      const equipment=save.equipment??{};
      writePatch({equipment:{...equipment,
        ownedShipIds:[...new Set([...(equipment.ownedShipIds??[]),terrorId])]}});
    }
    if(goldenDone && skippedEquip){
      const latest=readSave(),campaign=latest.r2Campaign??state;
      writePatch({r2Campaign:{...campaign,active:'r2-equip-terror',
        claimed:(campaign.claimed??[]).filter(id=>!later.includes(id)),
        progress:{...(campaign.progress??{}),'r2-equip-terror':[0]},
        processed:(campaign.processed??[]).filter(id=>!id.startsWith('equip-ship:terror-'))}});
    }
  }

  // Retroactively enforce the new rendezvous even for players who already
  // reached "Em Busca de Pistas" through the older direct ambush flow.
  {
    const save=readSave(),state=save.r2Campaign??{},claimed=state.claimed??[];
    const later=['r2-why-help','r2-search-clues','r2-do-me-favor',
      'r2-monster-meat','r2-mystery-light','r2-dark-voyage'];
    const skippedMeeting=!claimed.includes('r2-meet-forgotten')
      && save.storyFlags?.pumpkinAmbushResolved!==true
      && (later.includes(state.active)||later.some(id=>claimed.includes(id)));
    if(skippedMeeting){
      const equipment=save.equipment??{};
      const terrorId='galeao-halloween-tabuada';
      writePatch({
        r2Campaign:{...state,active:'r2-meet-forgotten',
          claimed:claimed.filter(id=>!later.includes(id)),
          progress:{...state.progress,'r2-meet-forgotten':[0]},
          processed:(state.processed??[]).filter(id=>!id.startsWith('forgotten-meeting:'))},
        // Players caught by the old ambush must be able to sail to the island
        // on the required ship, without deleting their current inventory.
        equipment:{...equipment,equippedShipId:terrorId,
          ownedShipIds:[...new Set([...(equipment.ownedShipIds??[]),terrorId])]},
        storyFlags:{...save.storyFlags,pumpkinAmbushResolved:false,terrorTabuadaDestroyed:false},
        combat:{...save.combat,shipHealth:Math.max(100,Number(save.combat?.shipHealth)||0)},
      });
    }
  }
  // Repair saves that were accidentally pushed backwards after the Terror
  // was already destroyed. The ambush flag is authoritative story progress.
  {
    const save=readSave(),state=save.r2Campaign??{};
    const active=state.active;
    const preClue=['r2-black-market','r2-equip-market','r2-golden-ii',
      'r2-equip-terror','r2-meet-forgotten','r2-why-help'];
    if(save.storyFlags?.pumpkinAmbushResolved===true
      && preClue.includes(active)
      && !save.rewardMigrations?.postAmbushCampaignRepairV1){
      const completedThroughAmbush=[
        'r2-thieves','r2-informant','r2-map','r2-island','r2-admiral',
        'r2-false-admiral','r2-shadow-plans','r2-shadow-materials','r2-shadow-trials',
        'r2-equip-chaser','r2-destroy-thief','r2-golden-i','r2-strengthen-ship',
        'r2-black-market','r2-equip-market','r2-golden-ii','r2-equip-terror',
        'r2-meet-forgotten','r2-why-help'
      ];
      writePatch({
        r2Campaign:{...state,active:'r2-search-clues',
          claimed:[...new Set([...(state.claimed??[]),...completedThroughAmbush])],
          progress:{...(state.progress??{}),
            'r2-search-clues':state.progress?.['r2-search-clues']??[0]}},
        rewardMigrations:{...(save.rewardMigrations??{}),postAmbushCampaignRepairV1:true},
      });
    }
  }

  // Existing campaign saves that skipped the newly inserted hunt supply stop
  // return to the merchant without replaying completed older contracts.
  {
    const save=readSave(),c=save.r2Campaign??{},claimed=c.claimed??[];
    const later=['r2-monster-meat','r2-mystery-light','r2-dark-voyage'];
    if(!claimed.includes('r2-hunt-prep') &&
       (later.includes(c.active)||later.some(id=>claimed.includes(id)))){
      writePatch({r2Campaign:{...c,active:'r2-hunt-prep',
        claimed:claimed.filter(id=>!later.includes(id)),
        progress:{...c.progress,'r2-hunt-prep':[0]}}});
    }
  }
    const migrated=readSave(),campaign=migrated.r2Campaign??{};
    writePatch({r2Campaign:{...campaign,schemaVersion:2}});
  }

  // Repair legacy rewards: Caçadora das Sombras must be owned before
  // the subsequent Preparar a Caçada contract can be completed.
  {
    const save=readSave();
    const completed=save.r2Campaign?.claimed?.includes('r2-shadow-trials')
      || ['r2-equip-chaser','r2-destroy-thief'].includes(save.r2Campaign?.active)
      || save.r2Campaign?.claimed?.some(id=>['r2-equip-chaser','r2-destroy-thief'].includes(id));
    const equipment=save.equipment??{};
    if(completed&&!equipment.ownedShipIds?.includes('fragata-sombra-cacadora')){
      writePatch({equipment:{...equipment,
        ownedShipIds:[...new Set([...(equipment.ownedShipIds??[]),'fragata-sombra-cacadora'])]}});
    }
  }
  // The thief hunt requires a functional Aetherion MK-I in the Shadow Chaser.
  // Repair existing saves without granting duplicate cannons or touching other ships.
  function ensureThiefHuntCannon(){
    const save=readSave(),e=save.equipment??{},ship='fragata-sombra-cacadora';
    const cannon='aetherion-mk1';
    if(e.equippedShipId!==ship)return false;
    if(!e.ownedShipIds?.includes(ship))return false;
    if(!e.ownedCannonIds?.includes(cannon) && !(Number(e.cannonCounts?.[cannon])>0))return false;
    const slots=Array.isArray(e.loadout?.[ship])?[...e.loadout[ship]]:[];
    if(slots.includes(cannon))return true;
    slots[0]=cannon; // Shadow Chaser has one cannon slot.
    writePatch({equipment:{...e,loadout:{...(e.loadout??{}),[ship]:slots}}});
    return true;
  }
  if(readSave().r2Campaign?.active==='r2-destroy-thief')ensureThiefHuntCannon();
  // Reconcile once for older saves whose Silas trade left their active ship empty.
  // Never overwrite a battery the player has already arranged manually.
  if(world.region.id==='r3'){
    const recovered=reconcileSilasAutomaticLoadout(readSave());
    if(recovered)writePatch(recovered);
  }
  // O navio inicial já pertence ao jogador desde o primeiro acesso.
  // Normaliza saves antigos sem excluir equipamentos ou navios conquistados.
  const initialEquipment = readSave().equipment ?? {};
  const silasPactDone=Boolean(readSave().r3Campaign?.silasTradeCompleted);
  if (!initialEquipment.ownedShipIds?.includes(STARTER_SHIP.id)
      || (!silasPactDone&&!initialEquipment.ownedHarpoonIds?.includes('naval-harpoon-starter'))
      || !initialEquipment.equippedHarpoonId) {
    writePatch({ equipment: {
      ...initialEquipment,
      ownedShipIds: [...new Set([...(initialEquipment.ownedShipIds ?? []), STARTER_SHIP.id])],
      ownedHarpoonIds: silasPactDone
        ? [...(initialEquipment.ownedHarpoonIds??[])]
        : [...new Set([...(initialEquipment.ownedHarpoonIds ?? []), 'naval-harpoon-starter'])],
      equippedHarpoonId: initialEquipment.equippedHarpoonId || 'naval-harpoon-starter',
    } });
  }
  // Conceder os 500 arpões apenas uma vez. Estoque zero é válido e não é reposto.
  if (readSave().harpoonAmmo?.['harpoon-mariner'] === undefined) {
    writePatch({harpoonAmmo:{...(readSave().harpoonAmmo??{}),'harpoon-mariner':500}});
  }
  const { SHIP_CATALOG } = await import('./ships/ShipRegistry.js');
  const playableShips = [STARTER_SHIP, ...SHIP_CATALOG];
  const savedEquipment = readSave().equipment ?? {};
  const initialShip = playableShips.find(ship => ship.id === savedEquipment.equippedShipId &&
    (ship.id === STARTER_SHIP.id || savedEquipment.ownedShipIds?.includes(ship.id))) ?? STARTER_SHIP;
  let activeShip = initialShip;
  // Wide cinematic pursuit framing, local to R2 mission 11.
  const normalCameraZoom = world.camera.zoom;
  let pursuitCameraZoom = normalCameraZoom;
  let automaticBattleCameraActive = false;
  const pursuitHiddenEntities = new Map();
  function updatePursuitPopulation() {
    const mission=world.region.id==='r2' ? readSave().r2Campaign?.active : null;
    const hunting=mission==='r2-destroy-thief';
    const goldenBattle=mission==='r2-golden-ii';
    if(!hunting && !goldenBattle){
      for(const [id,entity] of pursuitHiddenEntities){
        if(!world.entities.has(id))world.entities.set(id,entity);
      }
      pursuitHiddenEntities.clear();
      return;
    }
    // Count hidden and visible NPCs together to avoid removing another 95%
    // every update. Keep the same stable 5% throughout the encounter.
    const protectedNpc=id=>goldenBattle
      ? ['r2-morbi','r2-pumpkin-ally','r2-black-market-merchant'].includes(id)
      : id==='r2-informant';
    const candidates=new Map([...pursuitHiddenEntities,...world.entities]);
    const ordinary=[...candidates.entries()]
      .filter(([id,n])=>n.type==='npc' && !protectedNpc(id)
        && !(hunting && n.archetype==='fugitive-frigate'))
      .sort(([a],[b])=>String(a).localeCompare(String(b)));
    const keep=new Set(ordinary.slice(0,Math.ceil(ordinary.length*.05)).map(([id])=>id));
    for(const [id,entity] of [...world.entities]){
      if(protectedNpc(id) || (hunting && entity.archetype==='fugitive-frigate'))continue;
      if(entity.type==='monster' || (entity.type==='npc'&&!keep.has(id))){
        pursuitHiddenEntities.set(id,entity);
        world.entities.delete(id);
      }
    }
    // Restore the chosen 5% if they were hidden during a prior update.
    for(const id of keep){
      const entity=pursuitHiddenEntities.get(id);
      if(entity && !world.entities.has(id))world.entities.set(id,entity);
      pursuitHiddenEntities.delete(id);
    }
  }

  function updatePursuitCamera(stepMs = 16) {
    const hunting = world.region.id === 'r2' && readSave().r2Campaign?.active === 'r2-destroy-thief';
    const thief = hunting ? [...world.entities.values()].find(n => n.archetype === 'fugitive-frigate' && n.health > 0) : null;
    // A Ilha Esquecida uses the same cinematic tracking camera as the thief hunt.
    const exploringIsland = world.region.id === 'r2'
      && readSave().r2Campaign?.active === 'r2-island';
    const forgottenIsland = exploringIsland
      ? world.region.islands.find(island => island.id === 'r2-scenery-north') : null;
    const selectedCombatTarget = navalBattle?.getCameraTarget?.() ?? null;
    // Hostile Leviathan can initiate combat without the player selecting it.
    // Dynamic framing must not depend on the player's shorter harpoon range.
    const leviathan=world.region.id==='r3'?world.entities.get('r3-leviathan'):null;
    // Keep the camera engaged through diving and resurfacing; the threat is
    // already active before the flame reaches the ship. Do not require a
    // selected target or a player weapon with enough range.
    const hostileLeviathan=leviathan?.health>0
      && leviathan.state==='retaliating'
      && Math.hypot(world.camera.x-leviathan.x,world.camera.y-leviathan.y)<=1100
      ? leviathan : null;
    const combatTarget=hostileLeviathan??selectedCombatTarget;
    // Manual camera input (WASD/drag) has priority whenever the player takes control.
    const activeR2Mission = world.region.id === 'r2' ? readSave().r2Campaign?.active : null;
    const combatCameraStatus = navalBattle?.getStatus?.() ?? null;
    const combatTargetDistance = combatTarget
      ? Math.hypot(world.camera.x-combatTarget.x, world.camera.y-combatTarget.y)
      : Infinity;
    const combatCameraRange = combatTarget?.archetype==='sea-monster-leviathan'
      ? 1100 : Math.max(0,Number(combatCameraStatus?.range)||0);
    const combatTargetInRange = Boolean(
      combatTarget?.health > 0
      && combatCameraRange > 0
      && (combatTargetDistance <= combatCameraRange
        || (navalBattle?.firing && combatTargetDistance<=1100))
    );
    // Selecting a distant target must not pull the camera into battle framing.
    // The Shadow Thief pursuit remains the intentional exception handled below.
    const oneVsOneTarget = combatTargetInRange
      && (combatTarget?.type === 'npc' || combatTarget?.type === 'monster')
        ? combatTarget : null;
    const cinematicTarget = thief ?? oneVsOneTarget ?? forgottenIsland;
    // On the transition into combat, restore the ship-focused dynamic camera.
    // An actively held WASD key keeps absolute priority; after the transition
    // deliberate manual panning remains detached until the player recenters.
    const activeBattleCamera=Boolean(oneVsOneTarget || thief);
    if(activeBattleCamera&&!automaticBattleCameraActive&&!r1ExitCinematic){
      const pan=keyboardCamera?.getVector?.()??{x:0,y:0};
      if(!pan.x&&!pan.y)world.manualCamera=null;
    }
    automaticBattleCameraActive=activeBattleCamera;
    const finalMission = world.region.id === 'r1'
      && readSave().campaign?.active?.includes('r1-finale')
      && !(readSave().campaign?.progress?.['r1-finale']?.[0] >= 1);
    const viewportW = canvas.clientWidth || 900;
    const viewportH = canvas.clientHeight || 600;
    const mobile = viewportW < 700;
    const separation = thief ? Math.hypot(world.camera.x-thief.x, world.camera.y-thief.y)
      : oneVsOneTarget ? Math.hypot(world.camera.x-oneVsOneTarget.x, world.camera.y-oneVsOneTarget.y) : 0;
    const oneVsOneFraming = oneVsOneTarget ? computeOneVsOneFraming({
      player:world.camera,target:oneVsOneTarget,
      viewportWidth:viewportW,viewportHeight:viewportH,normalZoom:normalCameraZoom,
    }) : null;
    const thiefFraming = thief ? computeOneVsOneFraming({
      player:world.camera,target:thief,
      viewportWidth:viewportW,viewportHeight:viewportH,normalZoom:normalCameraZoom,
      minZoomOverride:.12,
    }) : null;
    // The shortest equipped cannon range determines when close-combat framing begins.
    // The Shadow Chaser normally carries one Aetherion MK-I (840 world units).
    const equipment = hunting ? readSave().equipment ?? {} : null;
    const slots = equipment?.loadout?.[equipment.equippedShipId] ?? [];
    const ranges = slots.map(id=>CANNONS.find(c=>c.id===id)?.range)
      .filter(range=>Number.isFinite(range) && range>0);
    const effectiveRange = ranges.length ? Math.min(...ranges)
      : (CANNONS.find(c=>c.id==='aetherion-mk1')?.range ?? 840);
    const closeBattle = Boolean(thief && separation <= effectiveRange);
    // Fit both vessels with room for sprites and HUD. Portrait screens reserve
    // a wider margin, since overlays consume more of the playing area.
    const horizontalCoverage = mobile ? .61 : .76;
    const verticalCoverage = mobile ? .52 : .68;
    const fitZoom = thief ? Math.min(
      viewportW*horizontalCoverage / Math.max(320,Math.abs(thief.x-world.camera.x)+290),
      viewportH*verticalCoverage / Math.max(320,Math.abs(thief.y-world.camera.y)+290)
    ) : normalCameraZoom;
    const battleZoom = Math.min(normalCameraZoom,fitZoom);
    // Within cannon range the cap remains the ordinary camera zoom;
    // fitting both ships still takes priority if the screen is narrow.
    const targetZoom = thiefFraming ? thiefFraming.zoom
      : oneVsOneFraming ? oneVsOneFraming.zoom
      : cinematicTarget ? Math.max(.27, Math.min(.43,
          Math.min(viewportW, viewportH) /
          Math.max(1300, Math.hypot(world.camera.x-cinematicTarget.x, world.camera.y-cinematicTarget.y)*2.4))) * 1.05 * 1.06
      : finalMission ? Math.max(.27, Math.min(.43,
          Math.min(viewportW, viewportH) / 1300)) * 1.05 * 1.06
      : normalCameraZoom;
    const smoothing = 1-Math.exp(-Math.max(0,stepMs)/450);
    pursuitCameraZoom += (targetZoom-pursuitCameraZoom)*smoothing;
    world.camera.zoom = pursuitCameraZoom;
    // Follow the midpoint in a long pursuit, with smooth camera travel.
    // In close combat return near the player to keep the standard framing.
    const offsetTarget = thiefFraming && !world.manualCamera
      ? thiefFraming.offset
      : oneVsOneFraming && !world.manualCamera
        ? oneVsOneFraming.offset
      : cinematicTarget && !world.manualCamera
        ? {x:(cinematicTarget.x-world.camera.x)*.14,y:(cinematicTarget.y-world.camera.y)*.14}
        : {x:0,y:-65};
    const previousOffset = world.cameraOffset ?? {x:0,y:-65};
    world.cameraOffset = {
      x:previousOffset.x+(offsetTarget.x-previousOffset.x)*smoothing,
      y:previousOffset.y+(offsetTarget.y-previousOffset.y)*smoothing,
    };
  }

  const { spriteCannonMuzzle } = await import('./ships/CannonMuzzleMap.js');
  // Reward notifications belong to the ocean viewport, not the combat menu.
  const rewardToastLayer=document.createElement('div');
  rewardToastLayer.className='ocean-reward-toast-layer';
  rewardToastLayer.setAttribute('aria-live','polite');
  root.append(rewardToastLayer);
  function showOceanReward(message){
    const toast=document.createElement('div');
    toast.className='ocean-reward-toast';
    toast.textContent=String(message);
    rewardToastLayer.append(toast);
    setTimeout(()=>toast.remove(),3500);
  }
  const missionCompleteOverlay=document.createElement('div');
  missionCompleteOverlay.className='mission-complete-overlay';
  missionCompleteOverlay.hidden=true;
  const missionCompleteCard=document.createElement('section');
  missionCompleteCard.className='mission-complete-card';
  missionCompleteCard.setAttribute('role','dialog');
  missionCompleteCard.setAttribute('aria-modal','true');
  missionCompleteCard.setAttribute('aria-label','Missão concluída');
  const missionCompleteTitle=document.createElement('h2');
  const missionCompleteText=document.createElement('p');
  const goMissions=document.createElement('button');
  goMissions.className='primary-button';goMissions.type='button';
  goMissions.textContent='📜 Voltar às Missões';
  const keepSailing=document.createElement('button');
  keepSailing.className='secondary-button';keepSailing.type='button';
  keepSailing.textContent='Continuar navegando';
  // The illustrated asset already paints labels and buttons.
  // Real HTML controls remain above their painted counterparts.
  missionCompleteCard.append(missionCompleteTitle,missionCompleteText,goMissions,keepSailing);
  missionCompleteOverlay.append(missionCompleteCard);root.append(missionCompleteOverlay);
  keepSailing.addEventListener('click',()=>{
    missionCompleteOverlay.hidden=true;
    clearMissionNavigation();
  });
  function routeToMissionsPort({announce=true}={}){
    const island=world.region.islands.find(i=>i.kind==='missions');
    if(!island)return false;
    const horizontal=Math.abs(world.camera.x-island.x)>Math.abs(world.camera.y-island.y);
    const destination=horizontal
      ?{x:island.x+Math.sign(world.camera.x-island.x||1)*(Number(island.width||820)/2+20),y:island.y}
      :{x:island.x,y:island.y+Math.sign(world.camera.y-island.y||1)*(Number(island.height||690)/2+20)};
    pendingTreasureId=null;
    world.manualCamera=null;
    navalBattle.firing=false;
    clickNavigation?.setDestination(destination);
    void guideMissionTo('missions');
    if(announce)showOceanReward('⚓ Rota para o Porto das Missões definida!');
    return true;
  }
  goMissions.addEventListener('click',()=>{
    missionCompleteOverlay.hidden=true;
    routeToMissionsPort();
  });
  // Observe mission state, regardless of which gameplay action updates the save.
  // Seed ready contracts on load so reopening the game doesn't replay old popups.
  const readyAtLoad=boardFor(readSave(),world.region.id).missions.find(m=>m.status==='ready'&&!m.optional);
  const notifiedMissionIds=new Set(
    boardFor(readSave(),world.region.id).missions.filter(m=>m.status==='ready').map(m=>m.id)
  );
  if(readyAtLoad)queueMicrotask(()=>routeToMissionsPort({announce:false}));
  if(world.region.id==='r3')queueMicrotask(()=>{
    if(finishR3OutfitIfReady()){
      showOceanReward('✅ Galeão Dourado preparado. Primeira missão concluída. Vá ao Porto das Missões.');
    }else if(readSave().r3Campaign?.claimed?.includes(R3_FIRST_MISSION_ID)){
      void guideMissionTo('missions');
    }else{
      void guideMissionTo('shipyard');
      showOceanReward('⚓ Prepare seu Galeão Dourado no Estaleiro.');
    }
  });
  function disperseR4Raiders(){
    if(world.region.id!=='r4')return;
    for(const npc of world.entities.values()){
      if(npc.archetype!=='r4-ladrao-gelido'&&npc.id!=='r4-sombra-do-saque')continue;
      npc.retaliationActive=false;
      npc.aggression='flee';
      npc.state='escaping';
      npc.wanderTimeMs=0;
    }
  }
  function checkMissionCompletion(){
    const missions=boardFor(readSave(),world.region.id).missions;
    for(const mission of missions){
      // Completion is an objective event, not a port-interaction event.
      // Keep the claim at the port; show the completion dialog immediately.
      const objectives=mission.objectives??[];
      const objectivesComplete=mission.status==='active' && objectives.length>0 &&
        objectives.every((objective,index)=>
          Number(mission.progress?.[index]??0)>=Math.max(1,Number(objective.count)||1));
      if(mission.status!=='ready'&&!objectivesComplete){
        if(mission.status==='active'||mission.status==='available')notifiedMissionIds.delete(mission.id);
        continue;
      }
      if(notifiedMissionIds.has(mission.id))continue;
      notifiedMissionIds.add(mission.id);
      disperseR4Raiders();
      showOceanReward('🏆 Missão concluída: '+mission.name);
      announceMissionCompletion(mission.name);
      routeToMissionsPort({announce:false});
      break;
    }
  }
  function announceMissionCompletion(name){
    if(!missionCompleteOverlay.hidden)return;
    missionCompleteTitle.textContent='🏆 Missão concluída!';
    missionCompleteText.textContent=name+' · Objetivo alcançado. Sua recompensa aguarda resgate no Porto das Missões.';
    missionCompleteOverlay.hidden=false;
  }
  function recordMissionEvent(event) {
    const patch = campaignFor(world.region.id).record(readSave(), event);
    if (!patch) return false;
    writePatch(patch);
    updateMissionHud();
    return true;
  }
  const supplyChest = {x:2035,y:1550};
  const isSupplyChestAvailable = () => world.region.id === 'r2'
    && readSave().r2Campaign?.active === 'r2-destroy-thief'
    && !readSave().consumables?.chaseChestClaimed;
    function resolveMathAction(action, cleanAnswer) {
    if(action.kind==='r3-silas-trade'){
      const silas=world.entities.get('r3-mercador-do-breu');
      if(world.region.id!=='r3'||!silas
        ||readSave().r3Campaign?.active!==R3_SILAS_MISSION_ID
        ||readSave().r3Campaign?.silasTradeCompleted
        ||Math.hypot(world.camera.x-silas.x,world.camera.y-silas.y)>silas.interactionRadius)return false;
      return 'Multiplicação correta! Confira a proposta de Silas e confirme se deseja realizar a troca.';
    }
    const grantR3WreckAmmo=()=>{
      const draw=(min,max)=>min+Math.floor(Math.random()*(max-min+1));
      const rewards=[['halloween-purple-ball',draw(1,150)],['purple-pumpkin-orb',draw(100,350)],
        ['ocean-pearl',draw(159,199)],['violet-crystal',10],['terror-rose',draw(1,20)]];
      const current=readSave(),stock={...(current.ammunition??{})};
      for(const [id,n] of rewards)stock[id]=(Number(stock[id])||0)+n;
      writePatch({ammunition:stock});
      showOceanReward('🪵 Destroços: '+rewards.map(([id,n])=>'+'+n+' '+({
        'halloween-purple-ball':'Bolas Roxas','purple-pumpkin-orb':'Orbes de Abóbora Roxa',
        'ocean-pearl':'Pérolas Oceânicas','violet-crystal':'Cristais Violetas','terror-rose':'Rosas do Terror'}[id])).join(' · '));
    };
    if(action.kind==='r3-emerald-rebuild'){
      const state=readSave().r3Campaign??{},ghost=world.entities.get('r3-fantasma-esmeralda');
      if(world.region.id!=='r3'||state.active!==R3_REBUILD_MISSION_ID||state.emeraldSpoken||!ghost||Math.hypot(world.camera.x-ghost.x,world.camera.y-ghost.y)>180)return false;
      recordMissionEvent({type:'emerald-talk'});
      showOceanReward('💚 Fantasma Esmeralda: O Terror do Mar pode renascer. Recolha os destroços que preparei e leve-os ao Estaleiro!');
      updateMissionHud();
      return 'O Fantasma Esmeralda revelou o plano de construção.';
    }
    if(action.kind==='r3-varkor-wreck'){
      const state=readSave().r3Campaign??{},point=state.varkorWreckPosition;
      if(world.region.id!=='r3'||state.active!==R3_VARKOR_MISSION_ID||!state.varkorDefeated||state.varkorWreckClaimed||!point||Math.hypot(world.camera.x-point.x,world.camera.y-point.y)>180)return false;
      if(!recordMissionEvent({type:'varkor-wreck-math'}))return false;
      const updated=readSave();
      if(updated.r3Campaign?.varkorWreckClaimed){
        const stock={...(updated.ammunition??{})};
        for(const id of Object.keys(stock))stock[id]=(Number(stock[id])||0)+5000;
        const equipment=updated.equipment??{};
        writePatch({ammunition:stock,
          equipment:{...equipment,ownedHarpoonIds:[...new Set([...(equipment.ownedHarpoonIds??[]),TERROR_ABYSS_HARPOON_ID])]},
          harpoonAmmo:{...(updated.harpoonAmmo??{}),[HORIZON_HARPOON_AMMO_ID]:(Number(updated.harpoonAmmo?.[HORIZON_HARPOON_AMMO_ID])||0)+2000},
          shipBlueprints:{...(updated.shipBlueprints??{}),'terror-do-mar':true}});
        showOceanReward('🏴‍☠️ Destroços recuperados! Projeto do Terror do Mar, 5.000 de cada munição, Arpoeiro Terror do Abismo e 2.000 arpões!');
      }else showOceanReward('🪵 Destroços do Terror do Mar: '+(updated.r3Campaign?.varkorWreckAnswers??0)+'/4 multiplicações.');
      updateMissionHud();
      return 'Multiplicação correta!';
    }
    if(action.kind==='r3-flame-wreck'){
      const campaign=readSave().r3Campaign??{};
      if(world.region.id!=='r3'||campaign.active!==R3_FLAME_MISSION_ID)return false;
      const step=campaign.flameStep??0;
      const index=step===0?0:step===2?1:step===3?2:step===5?3:-1;
      const wreck=R3_FLAME_STOPS[index];
      if(!wreck||wreck.id!==action.id||Math.hypot(world.camera.x-wreck.x,world.camera.y-wreck.y)>180)return false;
      if(!recordMissionEvent({type:'flame-math',id:wreck.id}))return false;
      const updated=readSave().r3Campaign??{};
      if((updated.flameStep??0)>step){
        grantR3WreckAmmo();
        showOceanReward('🔥 Destroços recuperados: '+wreck.name+'. Recompensas adicionadas ao arsenal!');
      }else{
        showOceanReward('🔥 Conta resolvida! Continue recuperando os destroços.');
      }
      updateMissionHud();
      return 'Multiplicação correta! Continue a expedição.';
    }
    if(action.kind==='r3-abyss-fragment'){
      if(world.region.id!=='r3'||readSave().r3Campaign?.active!==R3_ABYSS_SECRET_MISSION_ID)return false;
      const wreck=R3_ABYSS_WRECKS.find(w=>w.id===action.id);
      if(!wreck||Math.hypot(world.camera.x-wreck.x,world.camera.y-wreck.y)>180)return false;
      if(!recordMissionEvent({type:'abyss-fragment',id:wreck.id}))return false;
      grantR3WreckAmmo();
      showOceanReward('🪵 Fragmento recuperado: '+wreck.name);
      return 'Fragmento recuperado! Continue sua missão.';
    }
    if(action.kind==='r3-wreck-diary'){
      if(world.region.id!=='r3'||readSave().r3Campaign?.active!=='r3-dark-waters-warning')return false;
      const wreck=R3_WRECKS.find(w=>w.id===action.id);
      if(!wreck||Math.hypot(world.camera.x-wreck.x,world.camera.y-wreck.y)>180)return false;
      if(!recordMissionEvent({type:'wreck-diary',id:wreck.id}))return false;
      grantR3WreckAmmo();
      showOceanReward('📜 Diário recuperado: '+wreck.name+'.');
      updateMissionHud();
      return 'Fragmento recuperado! Continue seguindo o guia.';
    }
    if(action.kind==='r2-mystery-light'){
      if(readSave().r2Campaign?.active!=='r2-mystery-light')return false;
      recordMissionEvent({type:'study',id:'dark-waters-revelation'});
      showOceanReward('🌑 A Frota do Mestre do Terror segue para as águas escuras do Capitão Terror. Fim da campanha do Mundo 2!');
      return 'Destino revelado: águas escuras do Capitão Terror!';
    }
    if(action.kind==='black-market'){
      if(world.region.id!=='r2'||!['r2-black-market','r2-hunt-prep'].some(id=>boardFor(readSave(),'r2').missions.find(m=>m.id===id)?.status==='active'))return false;
      blackMarketUnlocked=true;
      return 'Acesso ao Mercado Negro liberado!';
    }
    if (action.kind === 'chase-supply-chest') {
      if (!isSupplyChestAvailable() || Math.hypot(world.camera.x-supplyChest.x,world.camera.y-supplyChest.y)>170) return false;
      const save=readSave(),c=save.consumables??{},q=c.quantities??{};
      writePatch({consumables:{...c,chaseChestClaimed:true,
        quantities:{...q,'flame-5x':(Number(q['flame-5x'])||0)+10,shield:(Number(q.shield)||0)+10}}});
      navalHud?.refresh();
      showOceanReward('🧰 +10 5X em Chamas · +10 Escudos');
      return 'Baú resgatado: +10 5X em Chamas e +10 Escudos!';
    }
    const result = resolvePedagogicalAction(readSave(), {...action,regionId:world.region.id}, action.challenge, cleanAnswer);
    if (!result) return false;
    writePatch(result.patch);
    if (world.region.id === 'r2' && action.kind !== 'monster-assist') {
      const questPatch=campaignFor(world.region.id).record(readSave(),{
        type: action.kind === 'informant' ? 'informant' : 'study',
        id:action.challenge.id+':'+Date.now()
      });
      if(questPatch)writePatch(questPatch);
      if (action.kind === 'informant' && boardFor(readSave(),'r2').missions
        .find(m=>m.id==='r2-informant')?.progress?.[1] >= 3) {
        const save=readSave();
        writePatch({r2Campaign:{...save.r2Campaign,informantTruceUntil:0}});
        const npc=world.entities.get('r2-informant');
        if(npc){
          npc.name='Corsário das Velas Rubras';
          npc.informantProtected=false;
          npc.attackProtectedUntil=0;
        }
      }
      if(action.kind==='treasure') {
        const treasurePatch=campaignFor(world.region.id).record(readSave(),{type:'treasure',id:action.id});
        if(treasurePatch)writePatch(treasurePatch);
      }
    }
    updateMissionHud();
    navalHud?.refresh();
    if(action.kind==='treasure') pendingTreasureId=null;
    if (['treasure','repair','accept-mission'].includes(action.kind))showOceanReward(result.message);
    return result.message;
  }
  // Merchant trade is atomic and idempotent: only a confirmed exchange
  // advances the contract, never mere proximity to the merchant.
  let blackMarketUnlocked=false;
  let silasTradeAuthorized=false;
  let marketDismissedNearby=false;
  const marketOverlay=document.createElement('div');
  marketOverlay.className='black-market-overlay';
  marketOverlay.hidden=true;
  marketOverlay.setAttribute('role','dialog');
  marketOverlay.setAttribute('aria-modal','true');
  marketOverlay.setAttribute('aria-label','Mercado Negro');
  const marketCard=document.createElement('section');
  marketCard.className='black-market-card';
  const marketHeading=document.createElement('h2');
  marketHeading.textContent='☠️ Mercado Negro';
  const marketDetails=document.createElement('p');
  const marketPrice=document.createElement('p');
  const marketTrade=document.createElement('button');
  marketTrade.type='button';
  marketTrade.textContent='Confirmar troca';
  const marketClose=document.createElement('button');
  marketClose.type='button';
  marketClose.textContent='Voltar ao oceano';
  marketClose.addEventListener('click',()=>{marketOverlay.hidden=true;marketDismissedNearby=true;});
  marketCard.append(marketHeading,marketDetails,marketPrice,marketTrade,marketClose);
  marketOverlay.append(marketCard);
  root.append(marketOverlay);
  function showSilasTrade(){
    const save=readSave(),silas=world.entities.get('r3-mercador-do-breu');
    if(world.region.id!=='r3'||!silas
      ||save.r3Campaign?.active!==R3_SILAS_MISSION_ID
      ||save.r3Campaign?.silasTradeCompleted
      ||Math.hypot(world.camera.x-silas.x,world.camera.y-silas.y)>silas.interactionRadius)return;
    marketHeading.textContent='☠️ O Pacto de Silas Rubro';
    marketDetails.textContent='VOCÊ RECEBE: 2 Canhões Aetherion MK-I, 18 Terror da Abóbora, Arpoeiro Olho do Horizonte, 1.000 arpões, 2.000 Orbes Vulcânicos, 250 Rosas do Terror e 2.500 Orbes Autoguiados especiais.';
    marketPrice.textContent='SILAS RECEBE DEFINITIVAMENTE: todo o estoque atual de canhões (inclusive os equipados), munições, arpões, lançadores de arpão e consumíveis. Ouro, rubis, navios e outros pertences não entram nesta troca.';
    marketTrade.disabled=false;
    marketOverlay.hidden=false;
  }
  function showBlackMarket(){
    if(!['r2-black-market','r2-hunt-prep'].some(id=>boardFor(readSave(),'r2').missions.find(m=>m.id===id)?.status==='active'))return;
    const save=readSave();
    const gold=Math.max(0,Math.floor(Number(save.profile?.gold)||0));
    const iron=Math.max(0,Math.floor(Number(save.ammunition?.['rusted-iron'])||0));
    if(save.r2Campaign?.active==='r2-hunt-prep'){
      marketDetails.textContent='Pacote de Caça: 10 unidades de cada consumível, 2.000 Orbes Autoguiados, 1 Arpoeiro Quebra-Couraça e 1.000 arpões. O lançador causa 700 de dano e mais 25 a cada 3 segundos.';
      marketPrice.textContent='Preço: todo o ouro disponível ('+gold.toLocaleString('pt-BR')+'). Depois: 0 ouro.';
      marketTrade.disabled=false;
      marketOverlay.hidden=false;
      return;
    }
    marketDetails.textContent='Lote único: 1 Canhão Aetherion MK-I de energia, 10.000 Orbes Autoguiados e 8 Canhões Reais Dourados com Leão.';
    marketPrice.textContent='Preço da troca: '+gold.toLocaleString('pt-BR')+' ouro + '+iron.toLocaleString('pt-BR')+' munições comuns. Após a troca, ambos ficarão em 0.';
    marketTrade.disabled=gold===0&&iron===0;
    marketOverlay.hidden=false;
  }
  marketTrade.addEventListener('click',()=>{
    if(world.region.id==='r3' && readSave().r3Campaign?.active===R3_SILAS_MISSION_ID){
      if(!silasTradeAuthorized)return;
      const silas=world.entities.get('r3-mercador-do-breu');
      if(!silas||Math.hypot(world.camera.x-silas.x,world.camera.y-silas.y)>silas.interactionRadius)return;
      const tradePatch=exchangeR3SilasCargo(readSave());
      if(!tradePatch)return;
      navalBattle.firing=false;
      writePatch(tradePatch);
      navalBattle.selectedAmmoId=navalBattle.resolveSelectedAmmo();
      navalBattle.renderer.prepareAmmo?.(effectiveAmmo(navalBattle.selectedAmmoId));
      marketOverlay.hidden=true;
      marketDismissedNearby=true;
      silasTradeAuthorized=false;
      clearMissionNavigation();
      void guideMissionTo('missions');
      navalHud?.refresh();
      islandPanel?.refreshMissionBoard?.();
      updateMissionHud();
      showOceanReward('☠️ Pacto concluído! 2 Aetherion, 18 Terror da Abóbora, Arpoeiro Olho do Horizonte e novas munições. Volte ao Porto das Missões!');
      return;
    }
    if(blackMarketUnlocked && boardFor(readSave(),'r2').missions.find(m=>m.id==='r2-hunt-prep')?.status==='active'){
      const save=readSave(),e=save.equipment??{},q=save.consumables?.quantities??{};
      const items=['flame-5x','shield','speed-plus','treasure-map'];
      writePatch({
        profile:{...save.profile,gold:0},
        ammunition:{...save.ammunition,'aetherion-seeker':(Number(save.ammunition?.['aetherion-seeker'])||0)+2000},
        harpoonAmmo:{...save.harpoonAmmo,'harpoon-armor-piercing':(Number(save.harpoonAmmo?.['harpoon-armor-piercing'])||0)+1000},
        equipment:{...e,ownedHarpoonIds:[...new Set([...(e.ownedHarpoonIds??[]),'harpoon-armor-breaker-launcher'])],
          equippedHarpoonId:'harpoon-armor-breaker-launcher'},
        consumables:{...save.consumables,quantities:{...q,...Object.fromEntries(items.map(id=>[id,(Number(q[id])||0)+10]))}},
      });
      recordMissionEvent({type:'hunt-supplies',id:'hunt-prep-purchased'});
      marketOverlay.hidden=true;blackMarketUnlocked=false;marketDismissedNearby=true;
      navalHud?.refresh();updateMissionHud();
      showOceanReward('🐙 Caçada preparada! +2.000 orbes, +1.000 arpões e Arpoeiro Quebra-Couraça equipado!');
      return;
    }
    if(!blackMarketUnlocked||boardFor(readSave(),'r2').missions.find(m=>m.id==='r2-black-market')?.status!=='active')return;
    const save=readSave(),eq=save.equipment??{},counts=eq.cannonCounts??{};
    const gold=Math.max(0,Math.floor(Number(save.profile?.gold)||0));
    const iron=Math.max(0,Math.floor(Number(save.ammunition?.['rusted-iron'])||0));
    if(gold===0&&iron===0)return;
    const tradePatch={
      profile:{...save.profile,gold:0},
      ammunition:{...save.ammunition,'rusted-iron':0,
        'aetherion-seeker':(Number(save.ammunition?.['aetherion-seeker'])||0)+10000},
      equipment:{...eq,cannonCounts:{...counts,
        'aetherion-mk1':(Number(counts['aetherion-mk1'])||0)+1,
        'royal-lion':(Number(counts['royal-lion'])||0)+8},
        ownedCannonIds:[...new Set([...(eq.ownedCannonIds??[]),'aetherion-mk1','royal-lion'])]},
    };
    writePatch(tradePatch);
    // A single unique event is recorded only after the payment and items
    // have been persisted, preventing proximity from completing the quest.
    recordMissionEvent({type:'black-market',id:'market-trade-completed'});
    marketOverlay.hidden=true;
    blackMarketUnlocked=false;
    navalHud?.refresh();
    updateMissionHud();
    showOceanReward('☠️ Troca concluída! +1 Aetherion · +10.000 Orbes · +8 Canhões Reais');
  });
  const mathGate = createMathGate({
    getPedagogy: () => readSave().pedagogy ?? {},
    getRegion: () => world.region.id === 'r3' ? 3 : world.region.id === 'r2' ? 2 : 1,
    onSolved: (action, clean) => resolveMathAction(action, clean),
  });
  root.append(mathGate.element);
  let repairIsForced = Number(readSave().combat?.repairingFrom) === 0 && Boolean(readSave().combat?.repairingUntil);
  let repairTickMs = 0;
  const repairAura = document.createElement('div');
  repairAura.className = 'ship-repair-aura';
  repairAura.setAttribute('aria-hidden', 'true');
  repairAura.innerHTML = '<span>+</span><span>+</span><span>+</span><span>+</span><span>+</span>';
  repairAura.hidden = true;
  root.append(repairAura);
  function beginRepairSession(forced = false) {
    const health=Number(readSave().combat?.shipHealth??100);
    if(world.region.id==='r2' && readSave().r2Campaign?.active==='r2-why-help')return false;
    if(health>=100||readSave().combat?.repairingUntil)return false;
    repairIsForced=forced;
    return mathGate.open({
      kind:'repair',
      title:forced?'☠️ Navio afundado! Resolva para reparar':'🔧 Consertar o casco',
      description:'Acerte uma multiplicação para iniciar a recuperação automática de 10% da vida total por segundo.',
      repeatOnSuccess:false,
      // A successful answer dismisses the math gate automatically.
      locked:false,
      afterSuccess:()=>navalHud?.refresh(),
    });
  }
  let voyageDistance = 0;
  function trackVoyage(previousX, previousY) {
    voyageDistance += Math.hypot(world.camera.x - previousX, world.camera.y - previousY);
    if (voyageDistance < 30) return;
    const distance = voyageDistance;
    voyageDistance = 0;
    recordMissionEvent({ type: 'travel', amount: distance });
  }


  // Névoa verde: sazonal na R1, permanente e mais densa nas Águas Escuras.
  // Na R3 ela representa a contaminação do Terror, não um evento de Halloween.
  const useGreenMist = (world.region.id === 'r1' && isHalloweenAtmosphereActive(EVENTS))
    || world.region.id === 'r3';
  if (useGreenMist) {
    halloweenFogCanvas = document.createElement('canvas');
    halloweenFogCanvas.className = 'halloween-fog-layer';
    halloweenFogCanvas.setAttribute('aria-hidden', 'true');
    root.append(halloweenFogCanvas);
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    halloweenFogRenderer = new HalloweenFogRenderer(halloweenFogCanvas, {
      getReducedMotion: () => reducedMotion?.matches === true,
      intensityScale: world.region.id === 'r3' ? 1.22 : 1,
    });
    if (!halloweenFogRenderer.init()) {
      halloweenFogCanvas.classList.add('halloween-fog-fallback');
    }
  }

  if (world.region.id === 'r2') {
    const { CloudLayerRenderer } = await import('./rendering/CloudLayerRenderer.js');
    if (generation !== worldGeneration) return;
    cloudCanvas = document.createElement('canvas');
    cloudCanvas.className = 'cloud-layer';
    cloudCanvas.setAttribute('aria-hidden', 'true');
    root.append(cloudCanvas);
    cloudRenderer = new CloudLayerRenderer(cloudCanvas);
  }
  if (world.region.id === 'r3') {
    const [{ SpectralShipWebGLRenderer }, { EMERALD_GHOST_SHIP }] = await Promise.all([
      import('./rendering/SpectralShipWebGLRenderer.js'),
      import('./ships/EmeraldGhostShip.js'),
    ]);
    if (generation !== worldGeneration) return;
    spectralShipCanvas = document.createElement('canvas');
    spectralShipCanvas.className = 'spectral-ship-webgl';
    spectralShipCanvas.setAttribute('aria-hidden', 'true');
    root.append(spectralShipCanvas);
    spectralShipRenderer = new SpectralShipWebGLRenderer(spectralShipCanvas);
    if (!spectralShipRenderer.init()) {
      spectralShipCanvas.remove();
      spectralShipCanvas = null;
      spectralShipRenderer = null;
    } else {
      spectralShipRenderer.definition = EMERALD_GHOST_SHIP;
    }
  }

  const glintCanvas=document.createElement('canvas');
  glintCanvas.className='glint-layer';
  root.append(glintCanvas);
  const glintCtx=glintCanvas.getContext('2d');
  const frozenWreckImage=new Image();
  frozenWreckImage.src=new URL('../assets/treasures/destrocos_terras_gelidas.webp',import.meta.url).href;

  navalCanvas = document.createElement('canvas');
  navalCanvas.className = 'naval-combat-webgl';
  navalCanvas.setAttribute('aria-label', 'Animações de batalha naval');
  root.append(navalCanvas);
  const navalRenderer = new NavalCombatWebGLRenderer(navalCanvas);
  navalRenderer.setReducedFx(window.matchMedia?.('(max-width: 700px)').matches === true);

  let navalHud = null;
  navalBattle = new NavalBattleController({
    renderer: navalRenderer,
    shipId: activeShip.id,
    getRegionId: () => world.region.id,
    // Fallback automático no controlador quando não existe mapeamento de boca.
    getMappedMuzzle: ({ player, target, heading, slot }) => spriteCannonMuzzle(
      activeShip, player, target, heading, slot,
      shipRenderer.getFrameWorldSize(world.camera.zoom),
    ),
    readSave,
    writePatch,
    getPlayer: () => ({ x: world.camera.x, y: world.camera.y, heading }),
    getEntities: () => world.entities,
    onFeedback: message => navalHud?.setFeedback(message),
    onDamageVisual: event => damageTextRenderer?.add(event),
    onPlayerSunk: npcId => {
      disperseR4Raiders();
      if(npcId!=='r2-morbi'||readSave().r2Campaign?.active!=='r2-golden-i')return;
      const defeatedMorbi=world.entities.get('r2-morbi');
      if(defeatedMorbi){
        defeatedMorbi.escapeAfterSinking=true;
        defeatedMorbi.state='escaping';
        defeatedMorbi.aggression='flee';
        defeatedMorbi.speed=950;
        defeatedMorbi.escapeHeading=defeatedMorbi.heading;
      }
      recordMissionEvent({type:'morbi-defeat-player',id:'first-sinking'});
      missionCompleteOverlay.hidden=true;
      const outcome=campaignFor('r2').claim(readSave(),'r2-golden-i');
      if(outcome)writePatch(outcome.patch);
      const mission=campaignFor('r2').accept(readSave(),'r2-strengthen-ship');
      if(mission)writePatch(mission);
      const save=readSave();
      writePatch({combat:{...(save.combat??{}),shipHealth:100}});
      navalBattle.firing=false;
      showOceanReward('☠️ Morbi afundou seu navio! Reúna recursos para reforçá-lo.');
      updateMissionHud();
    },
    onVictory: npc => {
      const save = readSave();
      if (npc.type === 'monster') {
        const gold = monsterGoldReward();
        writePatch({ profile: { ...save.profile, gold: (Number(save.profile?.gold) || 0) + gold } });
        if (world.region.id==='r3' && npc.id===R3_LEVIATHAN_ENTITY_ID
          && save.r3Campaign?.active===R3_LEVIATHAN_MISSION_ID) {
          // A kill already proves the player discovered the actual monster.
          recordMissionEvent({type:'leviathan-found',id:npc.id});
          recordMissionEvent({type:'leviathan-defeated',id:npc.id});
          world.entities.delete(npc.id);
          showOceanReward('🐙 Leviathan derrotado! Retorne ao Porto das Missões. +'+gold+' ouro.');
        }else{
          recordMissionEvent({
            type: 'defeat', archetype: npc.archetype,
            id: npc.id + ':' + Date.now() + ':' + performance.now(),
          });
          showOceanReward('🐙 '+npc.name+' derrotado! +'+gold+' ouro');
        }
        return;
      }
      if(world.region.id==='r3'&&npc.archetype==='dark-waters-raider'){
        recordMissionEvent({type:'defeat',archetype:npc.archetype,id:npc.id+':'+Date.now()});
      }else if(world.region.id==='r3'&&npc.archetype==='terror-guardian'){
        recordMissionEvent({type:'cleanup-red-sunk',id:npc.id});
        recordMissionEvent({type:'abyss-red-sunk',archetype:npc.archetype,id:npc.id+':'+(npc.sinkSerial??0)});
        recordMissionEvent({type:'flame-enemy',archetype:npc.archetype,id:npc.id+':'+(npc.sinkSerial??0)});
      } else if (world.region.id === 'r3' && npc.archetype === 'terror-do-mar') {
        recordMissionEvent({type:'defeat',archetype:npc.archetype,id:npc.id+':'+Date.now(),x:npc.x,y:npc.y});
        world.entities.delete(npc.id);
        showOceanReward('🔥 Terror do Mar afundado! Capitão Varkor Tenebris foi derrotado.');
      } else if (world.region.id === 'r2' && npc.archetype === 'fugitive-frigate'
        && save.r2Campaign?.active === 'r2-destroy-thief') {
        recordMissionEvent({type:'thief',id:npc.id});
        showOceanReward('🏴‍☠️ Ladrão das Sombras afundado!');
      } else if (world.region.id === 'r2' && npc.id === 'r2-morbi' && save.r2Campaign?.active === 'r2-golden-ii') {
        recordMissionEvent({type:'morbi-defeat',id:npc.id});
        world.entities.delete('r2-morbi');
        world.entities.delete('r2-pumpkin-ally');
        navalBattle.setTarget(null);
        showOceanReward('🏆 Galeão Dourado afundado! Morbi foi derrotado.');
      } else if (world.region.id === 'r2' && npc.id === 'r2-admiral') {
        recordMissionEvent({type:'admiral',id:npc.id});
        recordMissionEvent({type:'defeat',id:npc.id+':'+Date.now()});
        showOceanReward('🏴‍☠️ Baltazar Ferrugem derrotado!');
      } else if (world.region.id === 'r1' && save.missions?.corsair === 'active' && npc.archetype === 'red-sail-corsair') {
        writePatch({ missions: { ...save.missions, corsair: 'complete' } });
        updateMissionHud();
        showOceanReward('🏆 '+npc.name+' afundado!');
      } else {
        recordMissionEvent({
          type: 'defeat', archetype: npc.archetype,
          id: npc.id + ':' + Date.now() + ':' + performance.now(),
        });
      }
      if(npc.type==='npc'&&npc.health<=0&&npc.merchantKind!=='black-market'&&!npc.lootGranted){
        npc.lootGranted=true;
        const loot=rollNpcAmmoLoot(world.region.id);
        const patch=grantNpcAmmoLoot(readSave(),loot);
        if(patch){writePatch(patch);showOceanReward('🎁 '+npc.name+': +'+loot.amount+' '+loot.name+' · +'+loot.gold+' ouro.');}
      }
    },
  });
  navalHud = createNavalCombatHud(navalBattle, {
    onRepair: () => beginRepairSession(false),
    isCameraDetached: () => world.manualCamera !== null && world.manualCamera !== undefined,
    onCenterShip: () => {
      world.manualCamera = null;
      updateCamera(world, canvas.clientWidth, canvas.clientHeight);
      return true;
    },
  });
  root.append(navalHud.element);
  // F inicia ou cancela o mesmo ciclo de ataque do HUD.
  // KeyboardEvent.code independe de maiúsculas, Shift e Caps Lock.
  const onFireKey = event => {
    if (event.code !== 'KeyF' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    navalBattle.toggleFire();
    navalHud.refresh();
  };
  document.addEventListener('keydown', onFireKey);
  fireKeyCleanup = () => document.removeEventListener('keydown', onFireKey);
  // A opção contextual não altera os botões existentes do HUD.
  const assistButton=document.createElement('button');
  assistButton.type='button';
  assistButton.className='monster-assist-button primary-button';
  assistButton.textContent='🤝 Receber ajuda';
  assistButton.hidden=true;
  root.append(assistButton);
  assistButton.addEventListener('click',()=>{
    if (!navalBattle.getAssistStatus().eligible || mathGate.isOpen)return;
    mathGate.open({
      kind:'monster-assist',
      title:'🤝 Receber ajuda',
      description:'Resolva uma multiplicação para pedir ajuda ao navegador mais próximo do monstro.',
      afterSuccess:()=>{navalBattle.enableMonsterAssist();assistButton.hidden=true;navalHud.refresh();},
    });
  });

  let pendingTreasureId = null;
  const visibleTreasures = () => (world.region.id === 'r2'
    && ['r2-destroy-thief','r2-golden-i','r2-golden-ii'].includes(readSave().r2Campaign?.active))
      ? [] : getVisibleTreasures(readSave(),Date.now(),world.region.id);
  const openTreasureChallenge = treasure => {
    if(!treasure || mathGate.isOpen || islandPanel?.isOpen)return false;
    clickNavigation?.cancel();
    navalBattle.firing=false;
    pendingTreasureId=treasure.id;
    return mathGate.open({
      kind:'treasure',id:treasure.id,
      title:'🪵 Resgatar destroços',
      description:'Resolva a continha para recolher o que restou do naufrágio.',
    });
  };

  clickNavigation = createClickNavigation(canvas, world, point => {
    const npc = findNpcAtPoint(world.entities, point.x, point.y);
    if (npc) {
      if(world.region.id==='r3' && readSave().r3Campaign?.active===R3_LEVIATHAN_MISSION_ID
        && npc.id!==R3_LEVIATHAN_ENTITY_ID)return true;
      if(!navalBattle.setTarget(npc.id, { manual: true })){
        if(world.region.id==='r2' && readSave().r2Campaign?.active==='r2-golden-ii')
          navalHud.setFeedback('🎯 Durante o Galeão Dourado II, apenas Morbi pode ser selecionado.');
        return true;
      }
      selectedNpcId = npc.id;
      // Selecionar um alvo no desktop encerra qualquer pan manual anterior,
      // permitindo que a câmera dinâmica de combate assuma imediatamente.
      world.manualCamera = null;
      navalHud.setFeedback('🎯 Alvo selecionado: ' + npc.name);
      navalHud.refresh();
      return true;
    }
    const treasure = findTreasureNearPoint(visibleTreasures(), point.x, point.y, 105);
    if (treasure) {
      pendingTreasureId=treasure.id;
      navalHud?.setFeedback('🧭 Navegando até os destroços...');
      return {destination:{x:treasure.x,y:treasure.y}};
    }
    pendingTreasureId=null;
    return false;
  });
  keyboardCamera = createKeyboardCameraInput();
  const joystick = createAnalogJoystick();
  treasureGlowCanvas = document.createElement('canvas');
  treasureGlowCanvas.className = 'treasure-glow-layer';
  treasureGlowCanvas.setAttribute('aria-hidden','true');
  treasureCanvas = document.createElement('canvas');
  treasureCanvas.className = 'treasure-layer';
  islandCanvas = document.createElement('canvas');
  islandCanvas.className = 'island-layer';
  npcCanvas = document.createElement('canvas');
  npcCanvas.className = 'npc-layer';
  shipCanvas = document.createElement('canvas');
  const npcFrontCanvas=document.createElement('canvas');
  npcFrontCanvas.className='npc-front-layer';
  shipCanvas.className = 'ship-layer';
  shipCanvas.setAttribute('aria-label', 'Navio do jogador');
  root.append(islandCanvas, treasureGlowCanvas, treasureCanvas, npcCanvas, shipCanvas, npcFrontCanvas, joystick.element);
  if(world.region.id==='r3'){
    const oceanGrade=document.createElement('div');
    oceanGrade.className='r3-ocean-grade';
    oceanGrade.setAttribute('aria-hidden','true');
    root.append(oceanGrade);
  }
  const shipRenderer = new ShipRenderer(shipCanvas, initialShip);
  const islandRenderer = new IslandRenderer(islandCanvas, world.region.islands ?? []);
  const treasureRenderer = new TreasureRenderer(treasureCanvas);
  treasureGlowRenderer = new TreasureGlowWebGLRenderer(treasureGlowCanvas);
  treasureGlowRenderer.init();
  const npcRenderer = new NpcRenderer(npcCanvas,npcFrontCanvas);
  const leviathanAura=document.createElement('div');
  leviathanAura.className='leviathan-aura';
  leviathanAura.hidden=true;
  leviathanAura.setAttribute('aria-hidden','true');
  root.append(leviathanAura);
  damageTextCanvas = document.createElement('canvas');
  damageTextCanvas.className = 'damage-text-layer';
  damageTextCanvas.setAttribute('aria-hidden','true');
  root.append(damageTextCanvas);
  damageTextRenderer = new DamageTextRenderer(damageTextCanvas);
  const minimap = createMinimap(world, {
    getPlayer: () => ({ x: world.camera.x, y: world.camera.y, heading }),
    getNpcs: () => [...world.entities.values()].filter(entity => entity.type === 'npc'),
    getTreasures: () => (world.region.id === 'r2' && ['r2-destroy-thief','r2-golden-i','r2-golden-ii'].includes(readSave().r2Campaign?.active)) ? [] : getVisibleTreasures(readSave(),Date.now(),world.region.id),
    hasTreasureSense: () => Boolean(world.treasureSenseActive || navalBattle?.isTreasureMapActive()),
  });
  minimapElement = minimap.element;
  root.append(minimapElement);

  const hasEquippedCannon = save => (save.equipment?.loadout?.[STARTER_SHIP.id] ?? []).some(Boolean);
  function reconcileTutorial() {
    const save = readSave();
    const missions = { ...save.missions };
    let changed = false;
    if (missions.firstMission === 'active' && hasEquippedCannon(save)) {
      missions.firstMission = 'equipped';
      changed = true;
    }
    if (missions.firstMission === 'equipped' && !hasEquippedCannon(save)) {
      missions.firstMission = 'active';
      changed = true;
    }
    if (changed) writePatch({ missions });
    return missions;
  }
  reconcileTutorial();
  const equipment = readSave().equipment ?? {};
  const missionHud = document.createElement('aside');
  missionHud.className = 'mission-progress-hud';
  missionHud.setAttribute('aria-live', 'polite');
  root.append(missionHud);
  const supplyChestEl=document.createElement('div');
  supplyChestEl.className='chase-supply-chest';
  supplyChestEl.innerHTML='<span class="chase-supply-arrow"></span><span class="chase-supply-icon">🧰</span>';
  supplyChestEl.querySelector('.chase-supply-arrow').append(createGuidedPointerImage('chase-supply-pointer'));
  supplyChestEl.hidden=true;
  supplyChestEl.setAttribute('aria-label','Baú de suprimentos da caçada');
  root.append(supplyChestEl);
  function updateSupplyChestMarker() {
    supplyChestEl.hidden=!isSupplyChestAvailable();
    if(supplyChestEl.hidden)return;
    const x=canvas.clientWidth/2+(supplyChest.x-world.cameraView.x)*world.camera.zoom;
    const y=canvas.clientHeight/2+(supplyChest.y-world.cameraView.y)*world.camera.zoom;
    supplyChestEl.hidden=x<0||y<0||x>canvas.clientWidth||y>canvas.clientHeight;
    supplyChestEl.style.left=x+'px';supplyChestEl.style.top=y+'px';
  }

  const targetHud = document.createElement('aside');
  targetHud.className = 'target-status-hud';
  targetHud.hidden = true;
  targetHud.innerHTML = '<div class="target-status-name"></div><div class="target-status-bar"><div class="target-status-fill"></div></div><div class="target-status-value"></div>';
  root.append(targetHud);
  const criticalHealthOverlay = document.createElement('div');
  criticalHealthOverlay.className = 'critical-health-viewport';
  criticalHealthOverlay.hidden = true;
  criticalHealthOverlay.setAttribute('aria-hidden', 'true');
  root.append(criticalHealthOverlay);
  function refreshTargetAndHealthHud() {
    const npc = navalBattle?.getTarget();
    targetHud.hidden = !npc || npc.health <= 0;
    if (!targetHud.hidden) targetHud.style.top = Math.ceil(missionHud.getBoundingClientRect().bottom + 7) + 'px';
    if (!targetHud.hidden) {
      const max = Math.max(1,Number(npc.maxHealth)||Number(npc.health)||1);
      const hp = Math.max(0,Number(npc.health)||0);
      const ratio = Math.min(100,100*hp/max);
      targetHud.querySelector('.target-status-name').textContent = '🎯 '+(npc.name || 'Alvo');
      targetHud.querySelector('.target-status-fill').style.width = ratio+'%';
      targetHud.querySelector('.target-status-value').textContent = Math.ceil(hp).toLocaleString('pt-BR')+' / '+Math.ceil(max).toLocaleString('pt-BR')+' PV';
    }
    criticalHealthOverlay.hidden = navalBattle.getHealth() >= 30;
  }

  const thiefGuide = document.createElement('div');
  thiefGuide.className = 'thief-guide';
  thiefGuide.hidden = true;
  thiefGuide.setAttribute('aria-label', 'Direção da fragata fugitiva');
  thiefGuide.innerHTML = '<span class="thief-guide-arrow"></span><span class="thief-guide-label">Ladrão</span>';
  thiefGuide.querySelector('.thief-guide-arrow').append(createGuidedPointerImage('thief-guide-image'));
  root.append(thiefGuide);
  const exitDialog = document.createElement('section');
  exitDialog.className = 'region-exit-dialog';
  exitDialog.hidden = true;
  exitDialog.setAttribute('role','dialog');
  exitDialog.setAttribute('aria-modal','true');
  exitDialog.setAttribute('aria-label','Passagem para a Costa dos Corsários');
  const exitCard = document.createElement('div');
  exitCard.className = 'region-exit-card';
  const exitHeading = document.createElement('h2');
  exitHeading.textContent = '🧭 Passagem liberada!';
  const exitDescription = document.createElement('p');
  exitDescription.textContent = 'Você encontrou a passagem para a Costa dos Corsários. Deseja navegar para o próximo mapa?';
  const exitActions = document.createElement('div');
  const exitStay = document.createElement('button');
  exitStay.type = 'button';
  exitStay.className = 'secondary-button';
  exitStay.textContent = 'Permanecer na Enseada';
  const exitTravel = document.createElement('button');
  exitTravel.type = 'button';
  exitTravel.className = 'primary-button';
  exitTravel.textContent = '⚓ Navegar para Costa dos Corsários';
  exitActions.append(exitStay,exitTravel);
  exitCard.append(exitHeading,exitDescription,exitActions);
  exitDialog.append(exitCard);
  root.append(exitDialog);
  const exitBeacon = document.createElement('div');
  exitBeacon.className = 'region-exit-beacon';
  exitBeacon.hidden = true;
  exitBeacon.setAttribute('aria-hidden','true');
  exitBeacon.innerHTML = '<span class="region-exit-beacon-ring">✦</span><span class="region-exit-beacon-label">Costa dos Corsários</span>';
  root.append(exitBeacon);
  function updateExitBeacon() {
    const mission = getCampaignBoard(readSave()).missions.find(item => item.id === 'r1-finale');
    const target = world.region.id === 'r1' && mission && ['active','ready','claimed'].includes(mission.status)
      ? world.region.exitPoint : null;
    if (!target) { exitBeacon.hidden = true; return; }
    const x = canvas.clientWidth / 2 + (target.x - world.cameraView.x) * world.camera.zoom;
    const y = canvas.clientHeight / 2 + (target.y - world.cameraView.y) * world.camera.zoom;
    if (x < -100 || x > canvas.clientWidth+100 || y < -100 || y > canvas.clientHeight+100) {
      exitBeacon.hidden = true;
      return;
    }
    exitBeacon.style.left = x + 'px';
    exitBeacon.style.top = y + 'px';
    exitBeacon.hidden = false;
  }

  let exitDismissed = false;
  let r1ExitCinematic=null;
  const R1_EXIT_CINEMATIC_ID='r1-exit-terror-do-mar';

  function completeR1PassageTransfer(){
    if(!r1ExitCinematic)return false;
    const save=readSave();
    world.entities.delete(R1_EXIT_CINEMATIC_ID);
    world.manualCamera=null;
    r1ExitCinematic=null;
    writePatch({
      progression:{...(save.progression??{}),activeRegion:2,unlockedRegion:Math.max(2,Number(save.progression?.unlockedRegion)||1)},
      playerPosition:{x:420,y:860},
      transitionFlags:{...(save.transitionFlags??{}),r1FinalePending:true},
    });
    exitDialog.hidden=true;
    startWorld();
    return true;
  }

  function beginR1ExitCinematic(){
    if(r1ExitCinematic || world.region.id!=='r1')return false;
    const board=getCampaignBoard(readSave());
    const mission=board.missions.find(m=>m.id==='r1-finale');
    if(!mission || mission.status!=='active' || board.mastery?.mastered!==true)return false;

    clickNavigation.cancel();
    navalBattle.firing=false;
    navalBattle.setTarget(null);
    selectedNpcId=null;
    exitDialog.hidden=true;
    exitDismissed=true;

    const exit=world.region.exitPoint;
    const spawnCandidates=[
      {x:520,y:2450},
      {x:1180,y:3860},
      {x:250,y:1650},
      {x:2150,y:240},
    ];
    const start=spawnCandidates.find(point=>!collidesWithIsland(world.region,point.x,point.y,52))
      ?? {x:520,y:2450};
    const end={x:world.region.width+240,y:exit.y};
    const dx=end.x-start.x,dy=end.y-start.y;
    const headingToExit=(Math.atan2(dx,-dy)*180/Math.PI+360)%360;
    const terror={
      id:R1_EXIT_CINEMATIC_ID,
      name:'Terror do Mar · Capitão Varkor Tenebris',
      type:'npc',archetype:'terror-do-mar',shipId:'terror-do-mar',
      x:start.x,y:start.y,heading:headingToExit,
      health:500000,maxHealth:500000,
      state:'idle',aggression:'neutral',attackProtectedUntil:Infinity,
      cannonSlots:0,damage:0,range:0,speed:0,
      cinematic:true,
    };
    world.entities.set(terror.id,terror);
    world.manualCamera={x:terror.x,y:terror.y};
    r1ExitCinematic={
      entityId:terror.id,start,end,elapsed:0,
      player:{x:world.camera.x,y:world.camera.y},
      speed:0,
      maxSpeed:260,
      acceleration:72,
      turnRate:68,
      blockedFor:0,
    };
    return true;
  }

  function updateR1ExitCinematic(stepMs){
    if(!r1ExitCinematic)return false;
    const scene=r1ExitCinematic;
    const terror=world.entities.get(scene.entityId);
    if(!terror){
      world.manualCamera=null;
      r1ExitCinematic=null;
      return false;
    }
    const dt=Math.min(64,Math.max(0,stepMs))/1000;
    scene.elapsed+=Math.max(0,stepMs);
    scene.speed=Math.min(scene.maxSpeed,scene.speed+scene.acceleration*dt);

    const dx=scene.end.x-terror.x,dy=scene.end.y-terror.y;
    const distance=Math.hypot(dx,dy);
    const directHeading=(Math.atan2(dx,-dy)*180/Math.PI+360)%360;
    const normalizeAngle=value=>((value+540)%360)-180;

    // Escolhe uma direção navegável. Se a rota direta encontra uma ilha,
    // tenta curvas progressivas para os dois bordos e mantém a opção que
    // ainda aproxima o navio do portal.
    const offsets=[0,-18,18,-35,35,-55,55,-78,78,-105,105];
    let desiredHeading=directHeading;
    let best=null;
    const lookAhead=Math.max(95,scene.speed*.9);
    for(const offset of offsets){
      const candidate=(directHeading+offset+360)%360;
      const rad=candidate*Math.PI/180;
      const probeX=terror.x+Math.sin(rad)*lookAhead;
      const probeY=terror.y-Math.cos(rad)*lookAhead;
      if(collidesWithIsland(world.region,probeX,probeY,52))continue;
      const score=Math.hypot(scene.end.x-probeX,scene.end.y-probeY)+Math.abs(offset)*1.1;
      if(!best||score<best.score)best={heading:candidate,score};
    }
    if(best)desiredHeading=best.heading;

    const turn=normalizeAngle(desiredHeading-terror.heading);
    const maxTurn=scene.turnRate*dt;
    terror.heading=(terror.heading+Math.max(-maxTurn,Math.min(maxTurn,turn))+360)%360;

    const radians=terror.heading*Math.PI/180;
    const step=Math.min(distance,scene.speed*dt);
    const targetX=terror.x+Math.sin(radians)*step;
    const targetY=terror.y-Math.cos(radians)*step;
    const moved=resolveIslandMovement(world.region,terror.x,terror.y,targetX,targetY,52);
    const movedDistance=Math.hypot(moved.x-terror.x,moved.y-terror.y);
    terror.x=moved.x;
    terror.y=moved.y;

    if(movedDistance<step*.2 && distance>180){
      scene.blockedFor+=stepMs;
      terror.heading=(terror.heading+(scene.blockedFor>450?82:46))%360;
      scene.speed=Math.max(85,scene.speed*.78);
    } else scene.blockedFor=0;

    world.camera.x=scene.player.x;
    world.camera.y=scene.player.y;
    world.manualCamera={
      x:Math.min(world.region.width,Math.max(0,terror.x)),
      y:Math.min(world.region.height,Math.max(0,terror.y)),
    };

    if(distance<=72 || terror.x>=world.region.width-18){
      completeR1PassageTransfer();
    }
    return true;
  }

  exitStay.addEventListener('click',()=>{exitDialog.hidden=true;exitDismissed=true;});
  exitTravel.addEventListener('click',()=>{ exitDialog.hidden=true; });

  const {createDarkWatersPortal}=await import('./rendering/DarkWatersPortal.js');
  const darkWatersExit={x:Math.min(world.region.width-160,3930),y:Math.min(world.region.height-180,3890)};
  let darkPortalTraveling=false;
  const darkPortal=document.createElement('canvas');
  darkPortal.className='dark-waters-portal';
  darkPortal.hidden=true;darkPortal.setAttribute('aria-label','Portal para as Águas Escuras');
  root.append(darkPortal);
  const darkPortalEffect=createDarkWatersPortal(darkPortal);
  function darkPortalUnlocked(){
    if(world.region.id!=='r2')return false;
    const m=getR2Board(readSave()).missions.find(item=>item.id==='r2-dark-voyage');
    return !!m && ['active','ready','claimed'].includes(m.status);
  }
  function updateDarkPortal(now){
    if(!darkPortalUnlocked()){darkPortal.hidden=true;return;}
    const x=canvas.clientWidth*.5+(darkWatersExit.x-world.cameraView.x)*world.camera.zoom;
    const y=canvas.clientHeight*.5+(darkWatersExit.y-world.cameraView.y)*world.camera.zoom;
    const diameter=Math.max(110,Math.min(420,260*world.camera.zoom));
    darkPortal.hidden=x< -diameter||y< -diameter||x>canvas.clientWidth+diameter||y>canvas.clientHeight+diameter;
    if(darkPortal.hidden)return;
    darkPortal.style.left=x+'px';darkPortal.style.top=y+'px';
    darkPortal.style.width=diameter+'px';darkPortal.style.height=diameter+'px';
    darkPortalEffect.render(now);
  }
  function updateThiefGuide() {
    const campaign = readSave().campaign ?? {};
    const thiefActive = campaign.active?.includes('r1-negotiation') && !campaign.negotiationRobbed && !mathGate.isOpen;
    const exitActive = campaign.active?.includes('r1-finale')
      && !(campaign.progress?.['r1-finale']?.[0] >= 1) && !mathGate.isOpen;
    const r2Board = world.region.id === 'r2' ? getR2Board(readSave()) : null;
    const r2 = r2Board?.active[0] ?? null;
    const darkPassageMission=r2Board?.missions.find(m=>m.id==='r2-dark-voyage');
    const darkPassageActive=!!darkPassageMission
      && ['active','ready','claimed'].includes(darkPassageMission.status);
    const guideTarget = r2?.id === 'r2-meet-forgotten' ? world.region.islands.find(i=>i.id==='r2-scenery-north')
      : darkPassageActive ? darkWatersExit
      : ['r2-black-market','r2-hunt-prep'].includes(r2?.id) ? {x:world.region.width/2,y:world.region.height/2}
      : r2?.id === 'r2-golden-i' || r2?.id === 'r2-golden-ii' ? world.entities.get('r2-morbi')
      : r2?.id === 'r2-destroy-thief'
      ? [...world.entities.values()].find(n => n.archetype === 'fugitive-frigate' && n.health > 0)
      : r2?.id === 'r2-informant' && (r2.progress?.[1] ?? 0)<3 ? world.entities.get('r2-informant')
      : r2?.id === 'r2-island' && !r2.ready && ((r2.progress?.[1] ?? 0) < 3) ? world.region.islands.find(i=>i.id==='r2-scenery-north')
      : r2?.id === 'r2-admiral' && (r2.progress?.[1] ?? 0) < 1 && (world.entities.get('r2-admiral')?.health ?? 0) > 0 ? world.entities.get('r2-admiral')
      : r2?.id === 'r2-equip-market' ? world.region.islands.find(i=>i.kind==='shipyard')
      : r2?.id === 'r2-equip-chaser' && (r2.progress?.[0] ?? 0) < 1 ? world.region.islands.find(i=>i.kind==='shipyard') : null;
    const target = guideTarget ?? (thiefActive
      ? [...world.entities.values()].find(npc => npc.archetype === 'fugitive-frigate' && npc.health > 0)
      : exitActive ? world.region.exitPoint : null);
    if (!target) { thiefGuide.hidden = true; return; }
    thiefGuide.classList.toggle('is-dark-voyage',Boolean(darkPassageActive));
    thiefGuide.setAttribute('aria-label', darkPassageActive ? 'Direção da passagem para as Águas Escuras' : exitActive ? 'Direção da saída para Costa dos Corsários' : 'Direção do alvo da missão');
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) { thiefGuide.hidden = true; return; }
    const x = width / 2 + (target.x - world.cameraView.x) * world.camera.zoom;
    const y = height / 2 + (target.y - world.cameraView.y) * world.camera.zoom;
    const compactMobile=width<700;
    const margin = Math.min(75, Math.max(35, Math.min(width,height)*.12));
    const safeLeft = compactMobile ? Math.max(92,margin) : margin;
    const safeRight = compactMobile ? Math.max(82,margin) : margin;
    const safeTop = compactMobile ? Math.max(96,margin) : margin;
    const safeBottom = compactMobile ? Math.max(210,margin) : margin;
    const inView = x > safeLeft && x < width - safeRight && y > safeTop && y < height - safeBottom;
    const px = inView ? x : Math.max(safeLeft, Math.min(width - safeRight, x));
    const py = inView ? Math.max(safeTop, y - 72) : Math.max(safeTop, Math.min(height - safeBottom, y));
    thiefGuide.style.left = px + 'px';
    thiefGuide.style.top = py + 'px';
    thiefGuide.classList.toggle('is-route-guide',!inView);
    thiefGuide.style.setProperty('--thief-angle',angleToGuidedTarget({
      pointerX:px,pointerY:py,targetX:x,targetY:y,
    })+'deg');
    thiefGuide.classList.toggle('is-visible-target', inView);
    thiefGuide.querySelector('.thief-guide-label').textContent =
      (guideTarget ? (r2?.id === 'r2-black-market' ? 'Mercado Negro' : r2?.id?.startsWith('r2-golden-') ? 'Galeão Dourado' : r2?.id === 'r2-informant' ? 'Informante' : r2?.id === 'r2-island' ? 'Ilha Esquecida' : r2?.id === 'r2-equip-market' ? 'Estaleiro · Equipar Canhões' : r2?.id === 'r2-equip-chaser' ? 'Estaleiro · Equipar Fragata' : r2?.id === 'r2-destroy-thief' ? 'Ladrão das Sombras' : darkPassageActive ? '🌑 Passagem · Águas Escuras' : r2?.id === 'r2-meet-forgotten' ? 'Ilha Esquecida' : r2?.id === 'r2-admiral' ? 'Baltazar Ferrugem' : 'Destino da missão') : exitActive ? 'Costa dos Corsários' : 'Ladrão') + ' · ' + Math.round(Math.hypot(target.x-world.camera.x,target.y-world.camera.y)) + ' m';
    thiefGuide.hidden = false;
    if(darkPassageActive){
      // Keep a persistent route cue even while the destination is off-screen.
      thiefGuide.style.zIndex='45';
      thiefGuide.title='Siga a mão caveirinha até a passagem para as Águas Escuras.';
    }else{
      thiefGuide.style.zIndex='';
      thiefGuide.title='';
    }
  }

  const updateMissionHud = () => {
    checkMissionCompletion();
    const activeEquipShipMission=boardFor(readSave(),world.region.id).active?.find(
      mission=>mission.objectives?.some(objective=>objective.kind==='equip-ship')
    );
    if(activeEquipShipMission){
      const equippedShipId=readSave().equipment?.equippedShipId ?? activeShip?.id;
      const objective=activeEquipShipMission.objectives.find(item=>item.kind==='equip-ship');
      if(objective?.ship===equippedShipId){
        const resolution=resolveAlreadyEquippedShipMission({announce:false});
        if(resolution.claimed)return;
      }
    }
    if (world.region.id === 'r2') {
      missionHud.hidden = false;
      const mission = boardFor(readSave(),world.region.id).active[0];
      const ready = missionReady(readSave(),world.region.id);
      missionHud.textContent = ready
        ? '🎁 Objetivos concluídos · Vá ao Porto das Missões'
        : mission ? '📜 '+formatMissionHudObjectives(mission)
        : !readSave().progression?.r2PortVisited ? '📜 Primeiro objetivo: vá ao Porto das Missões'
        : '📜 Vá ao Porto das Missões para receber seu próximo contrato';
      return;
    }
    if(world.region.id==='r3'){
      const save=readSave(),campaign=save.r3Campaign??{};
      const finished=campaign.claimed?.includes(R3_FIRST_MISSION_ID);
      const diaryMission=campaign.active==='r3-dark-waters-warning';
      const wrecksCollected=campaign.wreckDiaries??[];
      const nextWreck=R3_WRECKS.find(w=>!wrecksCollected.includes(w.id));
      missionHud.hidden=false;
      if(!finished){
        missionHud.textContent='⚓ Prepare o Galeão Dourado no Estaleiro';
        void guideMissionTo('shipyard');
      }else if(diaryMission && nextWreck){
        missionHud.textContent='📜 Investigue os destroços · '+wrecksCollected.length+'/3 diários';
        void guideMissionTo(nextWreck);
      }else if(diaryMission){
        missionHud.textContent='📜 Três diários recuperados · Retorne ao Porto das Missões';
        void guideMissionTo('missions');
      }else if(!campaign.claimed?.includes('r3-dark-waters-warning')){
        missionHud.textContent='📜 Porto das Missões · O Aviso das Águas Escuras';
        void guideMissionTo('missions');
      }else if(campaign.active===R3_SILAS_MISSION_ID && !campaign.silasTradeCompleted){
        missionHud.textContent='☠️ O Pacto de Silas Rubro · Navegue até o mercador';
        void guideMissionTo(world.region.blackMarketMerchant);
      }else if(campaign.silasTradeCompleted&&!campaign.claimed?.includes(R3_SILAS_MISSION_ID)){
        missionHud.textContent='🎁 Pacto concluído · Volte ao Porto das Missões';
        void guideMissionTo('missions');
      }else if(!campaign.claimed?.includes(R3_SILAS_MISSION_ID)){
        missionHud.textContent='📜 Porto das Missões · O Pacto de Silas Rubro';
        void guideMissionTo('missions');
      }else if(campaign.active===R3_LEVIATHAN_MISSION_ID){
        if(campaign.leviathanDefeated){
          missionHud.textContent=campaign.leviathanReturned
            ? '🎁 Caça ao Leviathan concluída · Resgate a descoberta no Porto'
            : '🐙 Leviathan derrotado · Retorne ao Porto das Missões';
          void guideMissionTo('missions');
        }else{
          const leviathan=world.entities.get(R3_LEVIATHAN_ENTITY_ID);
          missionHud.textContent=campaign.leviathanFound
            ? '⚔️ Caça ao Leviathan · Derrote a criatura das Águas Escuras'
            : '🐙 Caça ao Leviathan · Localize a criatura no oceano';
          if(leviathan?.health>0)void guideMissionTo(leviathan);
        }
      }else if(!campaign.claimed?.includes(R3_LEVIATHAN_MISSION_ID)){
        missionHud.textContent='📜 Porto das Missões · Caça ao Leviathan';
        void guideMissionTo('missions');
      }else if(campaign.active===R3_ABYSS_SECRET_MISSION_ID){
        const red=Math.min(5,Number(campaign.abyssRedSinks)||0),fragments=campaign.abyssFragments??[];
        missionHud.textContent='⚔️ Red '+red+'/5 · 🪵 Destroços '+fragments.length+'/3';
        if(red>=5&&fragments.length===3)void guideMissionTo('missions');
        else {
          const next=R3_ABYSS_WRECKS.find(w=>!fragments.includes(w.id));
          if(next)void guideMissionTo(next);
        }
      }else if(campaign.active===R3_FLAME_MISSION_ID){
        const step=campaign.flameStep??0;
        missionHud.textContent='🔥 A Chama do Abismo · Destroços '+(campaign.flameWrecks??0)+'/4 · Contas '+(campaign.flameMath??0)+'/7 · Red '+(campaign.flameKills??0)+'/2';
        if(step===6)void guideMissionTo('missions');
        else if(step===1||step===4){
          const targets=[...world.entities.values()].filter(n=>n.archetype==='terror-guardian'&&n.health>0);
          targets.sort((a,b)=>Math.hypot(a.x-world.camera.x,a.y-world.camera.y)-Math.hypot(b.x-world.camera.x,b.y-world.camera.y));
          if(targets[0])void guideMissionTo(targets[0]);
        }else{
          const index=step===0?0:step===2?1:step===3?2:3;
          void guideMissionTo(R3_FLAME_STOPS[index]);
        }
      }else if(!campaign.claimed?.includes(R3_ABYSS_SECRET_MISSION_ID)){
        missionHud.textContent='📜 Porto das Missões · O Segredo do Coração do Abismo';
        void guideMissionTo('missions');
      }else if(!campaign.claimed?.includes(R3_FLAME_MISSION_ID)){
        missionHud.textContent='📜 Porto das Missões · A Chama do Abismo';
        void guideMissionTo('missions');
        }else if(campaign.active===R3_REBUILD_MISSION_ID){
        const ghost=world.entities.get('r3-fantasma-esmeralda');
        missionHud.textContent=!campaign.emeraldSpoken?'💚 Encontre o Fantasma Esmeralda e resolva a multiplicação':!campaign.emeraldWreckCollected?'🪵 Recolha os destroços perto da Ilha Esquecida':'⚓ Vá ao Estaleiro e equipe o Terror do Mar';
        if(!campaign.emeraldSpoken)void guideMissionTo(ghost??{x:2710,y:3280});
        else if(!campaign.emeraldWreckCollected)void guideMissionTo({x:2350,y:4740,name:'Destroço'});
        else void guideMissionTo('shipyard');
      }else if(campaign.active===R3_VARKOR_MISSION_ID){
        missionHud.textContent=campaign.varkorWreckClaimed?'🏆 Destroços recuperados · Retorne ao Porto das Missões':campaign.varkorDefeated?'🪵 Recolha os destroços de Varkor · Multiplicações '+(campaign.varkorWreckAnswers??0)+'/4':'🌊 O Despertar do Terror do Mar · Derrote Varkor Tenebris';
        if(campaign.varkorWreckClaimed)void guideMissionTo('missions');
        else if(campaign.varkorDefeated&&campaign.varkorWreckPosition)void guideMissionTo({...campaign.varkorWreckPosition,name:'Destroço do Capitão'});
        else{
          const boss=world.entities.get(world.region.terrorBoss?.id);
          if(boss)void guideMissionTo(boss);
        }
       }else if(!campaign.claimed?.includes(R3_VARKOR_MISSION_ID)){

        missionHud.textContent='📜 Porto das Missões · O Despertar do Terror do Mar';
        void guideMissionTo('missions');
       }else if(!campaign.claimed?.includes(R3_REBUILD_MISSION_ID)){
        missionHud.textContent='📜 Porto das Missões · O Renascimento do Terror do Mar';
        void guideMissionTo('missions');
      }else if(campaign.active===R3_CLEANUP_MISSION_ID){
        const left=R3_CLEANUP_RED_IDS.filter(id=>!(campaign.cleanupSunkIds??[]).includes(id));
        missionHud.textContent='⚔️ Os Últimos Resíduos · '+(3-left.length)+'/3 Red afundados';
        if(!left.length)void guideMissionTo('missions');
        else {const target=left.map(id=>world.entities.get(id)).find(n=>n?.health>0);if(target)void guideMissionTo(target);}
      }else if(!campaign.claimed?.includes(R3_CLEANUP_MISSION_ID)){
        missionHud.textContent='📜 Porto das Missões · Os Últimos Resíduos';
        void guideMissionTo('missions');
      }else{
        missionHud.textContent='❄️ Águas limpas · Siga até a passagem para Terras Gélidas';
        void guideMissionTo({x:3930,y:3890});
      }
      return;
    }
    const board=boardFor(readSave(),world.region.id);
    const campaignMission=board.active?.[0] ?? null;
    const flow = getMissionFlow(readSave(), activeShip.id);
    missionHud.hidden = false;
    missionHud.textContent = campaignMission
      ? '📜 '+formatMissionHudObjectives(campaignMission)
      : flow.stage === 'combat' ? '📜 Afunde 1 Corsário das Velas Rubras · 0/1'
      : flow.stage === 'next' ? '📜 Corsário afundado · 1/1 · Retorne ao porto'
      : '📜 ' + flow.objective;

    const campaignDestination = campaignMission && campaignMission.status!=='ready'
      ? (['r1-shipyard-upgrade','r1-equip-roses'].includes(campaignMission.id) ? 'shipyard' : null)
      : null;
    if(campaignDestination) void guideMissionTo(campaignDestination);
    else if (firstVoyageGuide && flow.destination && flow.stage !== 'welcome') firstVoyageGuide.guideTo(flow.destination);
    else if (firstVoyageGuide && !flow.destination && !campaignMission) {
      firstVoyageGuide.finish();
      firstVoyageGuide.dispose();
      firstVoyageGuide = null;
    }
  };
  function clearMissionNavigation({disposeGuide=true}={}){
    pendingTreasureId=null;
    clickNavigation?.cancel();
    if(disposeGuide){
      firstVoyageGuide?.finish();
      firstVoyageGuide?.dispose();
      firstVoyageGuide=null;
    }
  }
  async function guideMissionTo(destination){
    if(!firstVoyageGuide){
      const { createFirstVoyageGuide } = await import('./ui/FirstVoyageGuide.js');
      if(generation!==worldGeneration)return;
      firstVoyageGuide=createFirstVoyageGuide(world);
      root.append(...firstVoyageGuide.elements);
    }
    firstVoyageGuide.guideTo(destination);
  }

  function resolveAlreadyEquippedShipMission({announce=true}={}){
    const save=readSave();
    const board=boardFor(save,world.region.id);
    const mission=board.active?.find(item=>item.objectives?.some(objective=>objective.kind==='equip-ship')) ?? null;
    if(!mission)return {handled:false,claimed:false};
    const equippedShipId=save.equipment?.equippedShipId ?? activeShip?.id;
    const objective=mission.objectives.find(item=>item.kind==='equip-ship');
    if(!objective?.ship || objective.ship!==equippedShipId)return {handled:false,claimed:false};

    const campaign=campaignFor(world.region.id);
    const event=campaign.record(readSave(),{
      type:'equip-ship',ship:equippedShipId,
      id:'already-equipped:'+mission.id+':'+equippedShipId,
    });
    if(event)writePatch(event);

    const ready=boardFor(readSave(),world.region.id).missions.find(item=>item.id===mission.id);
    if(ready?.status!=='ready')return {handled:true,claimed:false};

    const result=campaign.claim(readSave(),mission.id);
    if(!result)return {handled:true,claimed:false};
    writePatch(result.patch);
    clearMissionNavigation();
    islandPanel?.refreshMissionBoard?.();
    navalHud?.refresh?.();
    updateMissionHud();
    if(announce)showOceanReward('🎁 '+mission.name+' concluída: o navio já estava equipado. Recompensa recebida.');
    return {handled:true,claimed:true,mission:result.mission};
  }

  function marketCannonsEquipped(loadout=readSave().equipment?.loadout){
    const save=readSave();
    const shipId=save.equipment?.equippedShipId;
    const slots=shipId && loadout?.[shipId];
    return Array.isArray(slots) && slots.includes('aetherion-mk1') && slots.includes('royal-lion')
      && (Number(save.equipment?.cannonCounts?.['aetherion-mk1'])||0)>=1
      && (Number(save.equipment?.cannonCounts?.['royal-lion'])||0)>=8;
  }
  const islandPanel = createIslandPanel({
    getRegionId: () => world.region.id,
    missionBoardOptions: {
      getBoard: () => boardFor(readSave(),world.region.id),
      getPedagogy: () => readSave().pedagogy ?? {},
      onAccept: id => world.region.id === 'r3'
        ? (()=>{
          const patch=campaignFor('r3').accept(readSave(),id);
          if(!patch)return false;
          writePatch(patch);
          clearMissionNavigation();
          islandPanel.refreshMissionBoard();
          updateMissionHud();
          showOceanReward(id===R3_REBUILD_MISSION_ID
            ? '💚 O Fantasma Esmeralda espera perto da Ilha Esquecida. Resolva a multiplicação, recolha os destroços e reconstrua o Terror do Mar no Estaleiro!'
            : id===R3_VARKOR_MISSION_ID
            ? '🌊 A Chama rompeu o selo! O Terror do Mar desperta. A frota recua, mas o Ladrão Sombra continua. O Fantasma Esmeralda regressa para lutar ao seu lado. Enfrente Varkor Tenebris!'
            : id===R3_FLAME_MISSION_ID
            ? '🔥 Siga os destroços em ordem, resolva sete contas e derrote dois corsários Red.'
            : id===R3_ABYSS_SECRET_MISSION_ID
            ? '⚔️ Afunde cinco Red e investigue três destroços, em qualquer ordem.'
            : id===R3_LEVIATHAN_MISSION_ID
            ? '🐙 Caça ao Leviathan iniciada! Siga a mão caveirinha até a criatura.'
            : id===R3_SILAS_MISSION_ID
              ? '☠️ Siga o guia até Silas Rubro para negociar o arsenal.'
              : '📜 Siga o guia e investigue os três destroços das Águas Escuras.');
          return true;
        })()
        : world.region.id === 'r2'
        ? (()=>{
          if(['r2-meet-forgotten','r2-why-help'].includes(id)&&activeShip.id!=='galeao-halloween-tabuada'){
            showOceanReward('⚠️ Para descobrir quem o ajudou, equipe o Terror da Tabuada no Estaleiro.');
            return false;
          }
          if(id==='r2-destroy-thief'&&!ensureThiefHuntCannon()){
            showOceanReward('⚠️ Equipe a Fragata Caçadora das Sombras e tenha o Canhão Aetherion MK-I para iniciar.');
            return false;
          }
          const patch=campaignFor(world.region.id).accept(readSave(),id);
          if(!patch)return false;
          writePatch(patch);
          clearMissionNavigation();
          const equippedResolution=resolveAlreadyEquippedShipMission();
          if(!equippedResolution.handled && id==='r2-equip-terror') void guideMissionTo('shipyard');
          updateMissionHud();navalHud?.refresh();return true;
        })()
        : mathGate.open({
        kind: 'accept-mission', id,
        title: '📜 Aceitar contrato',
        description: 'Resolva uma continha para receber sua próxima missão.',
        afterSuccess: () => {
          clearMissionNavigation();
          const equippedResolution=resolveAlreadyEquippedShipMission();
          if(!equippedResolution.handled && ['r1-equip-roses'].includes(id)) void guideMissionTo('shipyard');
          islandPanel.refreshMissionBoard();
          navalHud.refresh();
          updateMissionHud();
        },
      }),
      onClaim: id => {
        const result = campaignFor(world.region.id).claim(readSave(), id);
        if (!result) return false;
        writePatch(result.patch);
        clearMissionNavigation();
        if(id===R3_REBUILD_MISSION_ID){
          // Story transition must remain readable, not disappear as a short action toast.
          // This is the SAME R3 sea after the corruption has been lifted, not a teleport.
          missionCompleteTitle.textContent='🌅 As Águas Escuras foram libertadas!';
          missionCompleteText.textContent='As águas voltaram à cor natural, mas ainda restam navios Red hostis. Volte ao Porto das Missões para iniciar a limpeza antes da travessia até Terras Gélidas.';
          missionCompleteOverlay.hidden=false;
          void guideMissionTo('missions');
        }
        if(result.mission.reward?.shipUpgrade){
          const upgraded=readSave();
          writePatch({shipUpgrades:{...(upgraded.shipUpgrades??{}),masterShipwright:true},
            combat:{...(upgraded.combat??{}),shipHealth:upgraded.equipment?.equippedShipId==='fragata-sombra-cacadora' ? Math.min(600,(Number(upgraded.combat?.shipHealth)||100)+500) : Math.max(1500,Number(upgraded.combat?.shipHealth)||0)}});
          showOceanReward('🔨 Mestre construtor contratado! Cascos reforçados e novos espaços de canhão.');
        }
        navalHud.refresh();
        updateMissionHud();
        showOceanReward(id===R3_LEVIATHAN_MISSION_ID
          ? '📜 Os registros da caçada revelam uma nova pista sobre o Coração do Abismo. A saga continua!'
          : result.region2Unlocked?'🎉 Região 2 desbloqueada!':'🎁 Recompensa recebida: '+result.mission.name);
        return true;
      },
      onPracticeAnswer: (challenge, firstTry) => {
        const result = resolvePedagogicalAction(readSave(), { kind:'practice' }, challenge, firstTry);
        if (!result) return false;
        writePatch(result.patch);
        updateMissionHud();
        return true;
      },
      // A travessia é feita exclusivamente no ponto de saída do mundo, nunca no quadro.
    },
    getMissionState: () => readSave().missions ?? {},
    getMissionFlow: () => getMissionFlow(readSave(), STARTER_SHIP.id),
    getLearningProgress: () => readSave().learning ?? {},
    onLearningAttempt: (correct, firstAttempt) => {
      const save = readSave();
      writePatch({ learning: recordLearningAnswer(save.learning, correct, firstAttempt) });
    },
    shipyardOptions: {
      ships: playableShips,
      loadout: equipment.loadout ?? {},
      ownedCannonIds: equipment.ownedCannonIds ?? [],
      getEquipment: () => ({...(readSave().equipment??{}),masterShipwright:Boolean(readSave().shipUpgrades?.masterShipwright)}),
      equippedShipId: initialShip.id,
      onEquipShip: async shipId => {
        const save = readSave();
        const ship = playableShips.find(item => item.id === shipId);
        if (!ship || (save.storyFlags?.terrorTabuadaDestroyed && shipId==='galeao-halloween-tabuada') || (ship.id !== STARTER_SHIP.id && !save.equipment?.ownedShipIds?.includes(shipId))) return false;
        if(world.region.id==='r2' && save.r2Campaign?.active==='r2-why-help' && ship.id!=='galeao-halloween-tabuada')return false;
        if (ship.id === activeShip.id) {
           if (world.region.id==='r2' && ['fragata-sombra-cacadora','galeao-halloween-tabuada'].includes(ship.id)) {
             recordMissionEvent({type:'equip-ship',ship:ship.id});
             if(readSave().r2Campaign?.active==='r2-equip-terror' && ship.id==='galeao-halloween-tabuada')
               void guideMissionTo('missions');
           }
           return true;
         }
        const previous = activeShip;
        try {
          shipRenderer.definition = ship;
          await shipRenderer.init();
          activeShip = ship;
          navalBattle.shipId = ship.id;
          navalBattle.firing = false;
          shipSpeed = getShipSpeed(ship);
          writePatch({ equipment: { ...save.equipment, equippedShipId: ship.id } });
          navalBattle.selectedAmmoId = navalBattle.resolveSelectedAmmo();
          navalBattle.renderer.prepareAmmo?.(effectiveAmmo(navalBattle.selectedAmmoId));
          recordMissionEvent({ type: 'equip-ship', ship: ship.id });
          if(world.region.id==='r2' && readSave().r2Campaign?.active==='r2-equip-terror'
            && ship.id==='galeao-halloween-tabuada') void guideMissionTo('missions');
          navalHud?.refresh();
          updateMissionHud();
          return true;
        } catch (error) {
          console.error('Não foi possível carregar o navio', error);
          shipRenderer.definition = previous;
          await shipRenderer.init().catch(console.error);
          return false;
        }
      },
      onLoadoutChange: loadout => {
        const save = readSave();
        const missions = { ...save.missions };
        if (missions.firstMission === 'active' && (loadout[STARTER_SHIP.id] ?? []).some(Boolean)) {
          missions.firstMission = 'equipped';
          firstVoyageGuide?.guideTo('missions');
        } else if (missions.firstMission === 'equipped' && !(loadout[STARTER_SHIP.id] ?? []).some(Boolean)) {
          missions.firstMission = 'active';
          firstVoyageGuide?.guideTo('shipyard');
        }
        writePatch({ equipment: { ...save.equipment, loadout }, missions });
        navalBattle.selectedAmmoId = navalBattle.resolveSelectedAmmo();
        navalBattle.renderer.prepareAmmo?.(effectiveAmmo(navalBattle.selectedAmmoId));
        navalHud?.refresh();
        if(world.region.id==='r2' && readSave().r2Campaign?.active==='r2-equip-market'
          && marketCannonsEquipped(loadout)){
          recordMissionEvent({type:'market-equip',id:'market-cannons-equipped'});
        }
        const slots = loadout[STARTER_SHIP.id] ?? [];
        if (slots.filter(Boolean).length >= STARTER_SHIP.cannonSlots)
          recordMissionEvent({ type: 'equip' });
        if (slots.includes('royal-lion'))
          recordMissionEvent({ type: 'equip', cannon: 'royal-lion' });
        updateMissionHud();
      },
    },
    onRequestNextMission: (answer, expectedAnswer) => {
      if (Number(answer) !== Number(expectedAnswer)) return false;
      const save = readSave();
      writePatch({ missions: { ...save.missions, firstMission: 'complete', corsair: 'active' } });
      firstVoyageGuide?.finish();
      firstVoyageGuide?.dispose();
      firstVoyageGuide = null;
      updateMissionHud();
      return true;
    },
    isFirstMissionAccepted: () => Boolean(localSaves.load(currentUser.uid)?.payload?.tutorial?.firstMissionAccepted),
    onAcceptFirstMission: () => {
      const save = localSaves.load(currentUser.uid)?.payload ?? {};
      const equipped = hasEquippedCannon(save);
      localSaves.save(currentUser.uid, {
        ...save, tutorial: { ...save.tutorial, firstMissionAccepted: true },
        missions: { ...save.missions, firstMission: equipped ? 'equipped' : 'active' },
      });
      firstVoyageGuide?.guideTo(equipped ? 'missions' : 'shipyard');
      updateMissionHud();
    },
  });
  islandPanelElement = islandPanel.element;
  root.append(islandPanelElement);
  let contactId = null;
  let shipSpeed = getShipSpeed(activeShip);
  function combatMissionBlocksPorts() {
    const save=readSave();
    if(world.region.id==='r2') {
      const active=save.r2Campaign?.active;
      // Only an unfinished combat contract blocks docking. Once its
      // objectives are complete, the player must be able to enter the
      // Mission Port to claim the reward and accept the next contract.
      const current=boardFor(save,world.region.id).missions.find(m=>m.id===active);
      if(!current || current.status!=='active')return false;
      return [
        'r2-thieves','r2-informant','r2-admiral','r2-shadow-materials',
        'r2-shadow-trials','r2-destroy-thief',
      ].includes(active);
    }
    return false;
  }
  let autoEquippingTerror=false;
  async function autoEquipTerrorAtShipyard(){
    if(autoEquippingTerror || world.region.id!=='r2' || readSave().r2Campaign?.active!=='r2-equip-terror')return false;
    const terrorId='galeao-halloween-tabuada';
    const ship=playableShips.find(item=>item.id===terrorId);
    const save=readSave();
    if(!ship || save.storyFlags?.terrorTabuadaDestroyed || !save.equipment?.ownedShipIds?.includes(terrorId))return false;
    if(activeShip.id===terrorId){
      recordMissionEvent({type:'equip-ship',ship:terrorId,id:'terror-auto-equipped'});
      void guideMissionTo('missions');
      updateMissionHud();
      navalHud?.refresh();
      showOceanReward('⚓ Terror da Tabuada equipado! Volte ao Porto das Missões.');
      return true;
    }
    autoEquippingTerror=true;
    const previous=activeShip;
    try{
      shipRenderer.definition=ship;
      await shipRenderer.init();
      activeShip=ship;
      navalBattle.shipId=ship.id;
      navalBattle.firing=false;
      shipSpeed=getShipSpeed(ship);
      writePatch({equipment:{...save.equipment,equippedShipId:ship.id}});
      navalBattle.selectedAmmoId=navalBattle.resolveSelectedAmmo();
      navalBattle.renderer.prepareAmmo?.(effectiveAmmo(navalBattle.selectedAmmoId));
      recordMissionEvent({type:'equip-ship',ship:ship.id,id:'terror-auto-equipped'});
      void guideMissionTo('missions');
      updateMissionHud();
      navalHud?.refresh();
      showOceanReward('⚓ Terror da Tabuada equipado automaticamente! Volte ao Porto das Missões.');
      return true;
    }catch(error){
      console.error('Não foi possível equipar automaticamente o Terror da Tabuada',error);
      shipRenderer.definition=previous;
      await shipRenderer.init().catch(console.error);
      return false;
    }finally{
      autoEquippingTerror=false;
    }
  }

  let autoEquippingR3=false;
  function finishR3OutfitIfReady(){
    if(world.region.id!=='r3'||!r3GoldenReady(readSave()))return false;
    const save=readSave();
    if(!save.r3Campaign?.claimed?.includes(R3_FIRST_MISSION_ID)){
      const result=campaignFor('r3').claim(save,R3_FIRST_MISSION_ID);
      if(result)writePatch(result.patch);
    }
    void guideMissionTo('missions');
    updateMissionHud();
    return true;
  }
  async function autoEquipR3AtShipyard(){
    if(autoEquippingR3||world.region.id!=='r3'||readSave().r3Campaign?.claimed?.includes(R3_FIRST_MISSION_ID))return false;
    const shipId='galeao-dourado';
    const ship=playableShips.find(item=>item.id===shipId);
    const save=readSave(),equipment=save.equipment??{};
    if(!ship||!equipment.ownedShipIds?.includes(shipId)){
      showOceanReward('⚠️ Galeão Dourado não está no inventário. Confira a recompensa da Região 2.');
      return false;
    }
    autoEquippingR3=true;
    const previous=activeShip;
    try{
      const capacity=Math.max(0,Number(ship.cannonSlots)||0)+(save.shipUpgrades?.masterShipwright?5:0);
      const slots=expectedR3GoldenLoadout(save,capacity);
      if(activeShip.id!==shipId){
        shipRenderer.definition=ship;
        await shipRenderer.init();
        activeShip=ship;
        navalBattle.shipId=shipId;
        navalBattle.firing=false;
        shipSpeed=getShipSpeed(ship);
      }
      const current=readSave();
      writePatch({equipment:{...(current.equipment??{}),equippedShipId:shipId,
        loadout:{...(current.equipment?.loadout??{}),[shipId]:slots}}});
      navalBattle.selectedAmmoId=navalBattle.resolveSelectedAmmo();
      navalBattle.renderer.prepareAmmo?.(effectiveAmmo(navalBattle.selectedAmmoId));
      navalHud?.refresh();
      finishR3OutfitIfReady();
      showOceanReward('⚓ Galeão Dourado preparado automaticamente! Primeira missão concluída. Siga ao Porto das Missões.');
      return true;
    }catch(error){
      console.error('Falha ao equipar o Galeão Dourado na Região 3',error);
      if(activeShip.id!==previous.id){
        shipRenderer.definition=previous;
        await shipRenderer.init().catch(console.error);
        activeShip=previous;
        navalBattle.shipId=previous.id;
        shipSpeed=getShipSpeed(previous);
      }
      return false;
    }finally{autoEquippingR3=false;}
  }

  let lastPortCombatBlockNoticeAt=-Infinity;
  let pendingCombatPortId=null;
  function openDockContact(contact){
    if(!contact || contact.kind==='decoration')return false;
    pendingCombatPortId=null;
    contactId = contact.id;
    clickNavigation.cancel();
    const autoR3Equip=world.region.id==='r3' && contact.kind==='shipyard'
      && !readSave().r3Campaign?.claimed?.includes(R3_FIRST_MISSION_ID);
    const autoTerrorEquip=world.region.id==='r2' && contact.kind==='shipyard'
      && readSave().r2Campaign?.active==='r2-equip-terror';
    if(world.region.id==='r3' && contact.kind==='shipyard'){
      const rebuild=readSave().r3Campaign??{};
      if(rebuild.active===R3_REBUILD_MISSION_ID&&rebuild.emeraldWreckCollected){
        const save=readSave(),equipment=save.equipment??{};
        if(!equipment.ownedShipIds?.includes('terror-do-mar')){
          writePatch({equipment:{...equipment,ownedShipIds:[...new Set([...(equipment.ownedShipIds??[]),'terror-do-mar'])]}});
          showOceanReward('⚓ O Fantasma Esmeralda concluiu a construção! Terror do Mar adicionado à sua frota. Equipe-o para continuar.');
        }
        islandPanel.open('shipyard');
      }else if(autoR3Equip)void autoEquipR3AtShipyard().then(equipped=>{
        if(!equipped)void guideMissionTo('shipyard');
      });
      else showOceanReward('🔒 O Estaleiro será liberado na missão de reconstrução do Terror do Mar.');
    } else if(autoTerrorEquip) {
      void autoEquipTerrorAtShipyard().then(equipped=>{
        if(!equipped) islandPanel.open('shipyard');
      });
    } else {
      islandPanel.open(contact.kind);
    }
    if(world.region.id==='r3'&&contact.kind==='missions'&&readSave().r3Campaign?.active===R3_CLEANUP_MISSION_ID){
      if(recordMissionEvent({type:'return-port',id:'r3-cleanup-return'}))showOceanReward('✅ Águas limpas! Resgate o acesso às Terras Gélidas.');
      islandPanel.refreshMissionBoard();
    }
    if(world.region.id==='r3'&&contact.kind==='missions'&&readSave().r3Campaign?.active===R3_VARKOR_MISSION_ID){
      if(recordMissionEvent({type:'return-port'}))showOceanReward('🏆 O Terror do Mar caiu! A lenda de Varkor termina aqui. Resgate sua recompensa.');
      islandPanel.refreshMissionBoard();
    }
    if(world.region.id==='r3'&&contact.kind==='missions'&&readSave().r3Campaign?.active===R3_FLAME_MISSION_ID){
      if(recordMissionEvent({type:'return-port'}))showOceanReward('🔥 Expedição concluída! Resgate a Chama 5×.');
      islandPanel.refreshMissionBoard();
    }
    if(world.region.id==='r3'&&contact.kind==='missions'&&readSave().r3Campaign?.active===R3_ABYSS_SECRET_MISSION_ID){
      if(recordMissionEvent({type:'return-port',id:'r3-abyss-return'}))showOceanReward('🗺️ Mapa reconstruído! Resgate a recompensa da missão.');
      islandPanel.refreshMissionBoard();
    }
    if(world.region.id==='r3' && contact.kind==='missions'
      && readSave().r3Campaign?.active===R3_LEVIATHAN_MISSION_ID
      && readSave().r3Campaign?.leviathanDefeated){
      if(recordMissionEvent({type:'return-port',id:'r3-leviathan-return'}))
        showOceanReward('📜 Caçada concluída! Resgate a pista sobre o Coração do Abismo.');
      islandPanel.refreshMissionBoard();
    }
    if(world.region.id==='r3' && contact.kind==='missions' &&
       readSave().r3Campaign?.active==='r3-dark-waters-warning' &&
       (readSave().r3Campaign?.wreckDiaries??[]).length===3){
      recordMissionEvent({type:'return-port',id:'r3-diaries-delivered'});
      islandPanel.refreshMissionBoard();
    }
    if(world.region.id==='r3' && contact.kind==='missions'
      && readSave().r3Campaign?.claimed?.includes(R3_FIRST_MISSION_ID)){
      const save=readSave();
      if(!save.progression?.r3PortVisited)
        writePatch({progression:{...(save.progression??{}),r3PortVisited:true}});
      clearMissionNavigation();
      if(!readSave().r3Campaign?.active && !readSave().r3Campaign?.claimed?.includes('r3-dark-waters-warning'))
        showOceanReward('📜 O Aviso das Águas Escuras está disponível no Porto das Missões.');
    }
    if (world.region.id === 'r2' && contact.kind === 'missions' && !readSave().progression?.r2PortVisited) {
      const save = readSave();
      writePatch({ progression: { ...save.progression, r2PortVisited: true } });
      firstVoyageGuide?.finish();
      firstVoyageGuide?.dispose();
      firstVoyageGuide = null;
    }
    if (world.region.id === 'r1') recordMissionEvent({ type: 'visit', island: contact.kind });
    if (world.region.id === 'r2' && contact.kind==='shipyard'
      && activeShip.id==='fragata-sombra-cacadora') {
      recordMissionEvent({type:'equip-ship',ship:activeShip.id});
    }
    if (world.region.id === 'r2' && contact.kind==='missions') islandPanel.refreshMissionBoard();
    updateMissionHud();
    return true;
  }
  function checkDockContact(fromX, fromY, inputX, inputY, stepMs) {
    if(combatMissionBlocksPorts()) { contactId=null; return; }
    const magnitude = Math.hypot(inputX, inputY);
    const step = shipSpeed * stepMs / 1000;
    const contact = magnitude > 0.01 ? getIslandContact(world.region,
      fromX + inputX / Math.max(1, magnitude) * step,
      fromY + inputY / Math.max(1, magnitude) * step) : null;
    if (!contact) {
      const nearby = getIslandContact(world.region, world.camera.x, world.camera.y, 42);
      if (!nearby) {
        contactId = null;
        pendingCombatPortId=null;
      }
      return;
    }
    if (contact.kind !== 'decoration' && contactId !== contact.id) {
      const protectedPort=contact.kind==='shipyard'||contact.kind==='missions';
      if(protectedPort && navalBattle?.isPortInteractionLocked?.()){
        contactId=null;
        pendingCombatPortId=contact.id;
        clickNavigation.cancel();
        const remaining=Math.max(1,Math.ceil(navalBattle.getCombatLockRemainingMs()/1000));
        const now=performance.now();
        if(now-lastPortCombatBlockNoticeAt>900){
          lastPortCombatBlockNoticeAt=now;
          showOceanReward('⚔️ Em combate. '+(contact.kind==='shipyard'?'Estaleiro':'Porto das Missões')+' liberado em '+remaining+'s.');
        }
        return;
      }
      openDockContact(contact);
    }
  }
  let renderer;
  try {
    renderer = new OceanRenderer(canvas);
    oceanRenderer = renderer;
    await Promise.all([renderer.init(world.region.ocean.texture), shipRenderer.init(), islandRenderer.init(), npcRenderer.init()]);
    if (generation !== worldGeneration) { renderer.dispose(); return; }
  } catch (error) {
    if (generation !== worldGeneration) return;
    console.error('Falha ao iniciar oceano WebGL', error);
    stopWorld();
    const message = document.createElement('p');
    message.className = 'error-message';
    message.textContent = 'Não foi possível iniciar o oceano: ' + error.message;
    root.replaceChildren(message);
    return;
  }
  // Só ativa o NPC quando seu sprite estiver realmente carregado.
  // Se o arquivo ainda não foi enviado ao GitHub, o oceano inicia normalmente.
  if (['r1', 'r2'].includes(world.region.id) && npcRenderer.hasShipSprite('fragata-sombra-fugitiva')) {
    createFugitiveFrigatePopulation(world);
  }
  const previousSave = localSaves.load(currentUser.uid);
  const flow = getMissionFlow(previousSave?.payload ?? {}, STARTER_SHIP.id);
  const r2GuidedMission=world.region.id==='r2' ? readSave().r2Campaign?.active : null;
  const needsR2Guide=world.region.id==='r2'
    && (!readSave().progression?.r2PortVisited || r2GuidedMission==='r2-equip-terror');
  const needsR4PortGuide=world.region.id==='r4' && !readSave().r4Campaign?.active && !(readSave().r4Campaign?.claimed??[]).includes('r4-ice-wreck-investigation');
  if (needsR2Guide || needsR4PortGuide || (world.region.id === 'r1' && flow.destination)) {
    const { createFirstVoyageGuide } = await import('./ui/FirstVoyageGuide.js');
    if (generation !== worldGeneration) return;
    firstVoyageGuide = createFirstVoyageGuide(world);
    root.append(...firstVoyageGuide.elements);
    if (needsR4PortGuide) firstVoyageGuide.guideTo('missions');
    else if (world.region.id === 'r2') {
      const equipTerror=boardFor(readSave(),'r2').missions.find(m=>m.id==='r2-equip-terror');
      firstVoyageGuide.guideTo(equipTerror?.status==='ready' ? 'missions'
        : r2GuidedMission==='r2-equip-terror' ? 'shipyard' : 'missions');
    } else if (flow.stage !== 'welcome') firstVoyageGuide.guideTo(flow.destination);
  }
  updateMissionHud();
  // The ambush must be transactional: inventory loss and campaign progress are
  // persisted together, so refreshing cannot repeat the destruction.
  let pumpkinAmbushElapsed=0;
  let pumpkinAmbushStarted=false;
  let pumpkinNextVolleyMs=1100;
  let pumpkinVolleyCount=0;
  function finishPumpkinAmbush(){
    const save=readSave();
    if(save.r2Campaign?.active!=='r2-why-help'||save.storyFlags?.pumpkinAmbushResolved)return;
    const shipId='galeao-halloween-tabuada';
    const rescueId='fragata-sombra-cacadora';
    const e=save.equipment??{};
    const nextOwned=[...new Set([...(e.ownedShipIds??[]).filter(id=>id!==shipId),rescueId])];
    const loadout={[rescueId]:['aetherion-mk1','aetherion-mk1']};
    const transition=advanceR2Story(save,'r2-why-help','r2-search-clues');
    if(!transition)return;
    writePatch({
      storyFlags:{...(save.storyFlags??{}),pumpkinAmbushResolved:true,terrorTabuadaDestroyed:true},
      ...transition,
      profile:{...save.profile,gold:0,rubies:0},
      ammunition:{'aetherion-seeker':1000,'rusted-iron':0},
      harpoonAmmo:{'harpoon-mariner':1000,'harpoon-armor-piercing':0},
      equipment:{...e,equippedShipId:rescueId,ownedShipIds:nextOwned,
        cannonCounts:{'aetherion-mk1':2},ownedCannonIds:['aetherion-mk1'],
        loadout,ownedHarpoonIds:['naval-harpoon-starter'],
        equippedHarpoonId:'naval-harpoon-starter'},
      consumables:{...save.consumables,quantities:{}},
      combat:{...save.combat,shipHealth:100},
      playerPosition:{x:world.region.islands.find(i=>i.kind==='shipyard')?.x+480||3400,
        y:world.region.islands.find(i=>i.kind==='shipyard')?.y+60||1620},
    });
    for(let i=0;i<4;i++)world.entities.delete('pumpkin-ambush-'+i);
    shipCanvas.style.transition='none';shipCanvas.style.opacity='1';
    const next=playableShips.find(ship=>ship.id===rescueId);
    if(next){
      activeShip=next;
      shipRenderer.definition=next;
      shipRenderer.init().catch(console.error);
      navalBattle.shipId=next.id;
      shipSpeed=getShipSpeed(next);
      navalBattle.firing=false;
      navalBattle.selectedAmmoId=navalBattle.resolveSelectedAmmo();
    }
    const dock=world.region.islands.find(i=>i.kind==='shipyard');
    if(dock){world.camera.x=Math.min(world.region.width-75,dock.x+480);world.camera.y=dock.y+60;}
    world.manualCamera=null;
    clickNavigation.cancel();
    missionCompleteOverlay.hidden=true;
    updateMissionHud();
    navalHud?.refresh();
    showOceanReward('☠️ O Terror da Tabuada foi destruído! Sua frota e suprimentos foram perdidos. Nova missão: Em Busca de Pistas.');
    islandPanel.open('shipyard');
  }
  function updatePumpkinAmbush(stepMs){
    if(world.region.id!=='r2'||readSave().r2Campaign?.active!=='r2-why-help')return;
    if(activeShip.id!=='galeao-halloween-tabuada')return;
    if(readSave().storyFlags?.pumpkinAmbushResolved)return;
    pumpkinAmbushElapsed+=Math.max(0,stepMs);
    if(Number(readSave().combat?.shipHealth??100)<=0 && shipCanvas.style.opacity!=='0'){
      shipCanvas.style.transition='opacity 900ms ease-in';
      shipCanvas.style.opacity='0';
      showOceanReward('💥 O Terror da Tabuada está afundando!');
    }
    if(!pumpkinAmbushStarted){
      pumpkinAmbushStarted=true;
      clickNavigation.cancel();navalBattle.firing=false;
      if(mathGate.isOpen && mathGate.activeKind==='repair')mathGate.close(true);
      const save=readSave();
      writePatch({combat:{...(save.combat??{}),repairingUntil:null,repairingFrom:null}});
      showOceanReward('🎃 Quatro galeões da frota abriram fogo! Fuja, capitão!');
    }
    const center=world.camera;
    for(let i=0;i<4;i++){
      const angle=i*Math.PI/2+Math.PI/4;
      const radius=780;
      const x=Math.max(75,Math.min(world.region.width-75,center.x+Math.cos(angle)*radius));
      const y=Math.max(75,Math.min(world.region.height-75,center.y+Math.sin(angle)*radius));
      const id='pumpkin-ambush-'+i;
      const npc=world.entities.get(id);
      if(npc){
        const dx=center.x-npc.x,dy=center.y-npc.y,dist=Math.hypot(dx,dy);
        // Real pursuit, not instantaneous relocation. Keep enough room to avoid ramming.
        if(dist>420){
          const step=Math.min(dist-420,Math.min(64,stepMs)*.52);
          npc.x=Math.max(75,Math.min(world.region.width-75,npc.x+dx/dist*step));
          npc.y=Math.max(75,Math.min(world.region.height-75,npc.y+dy/dist*step));
        }
        if(dist>1)npc.heading=(Math.atan2(dx,-dy)*180/Math.PI+360)%360;
      } else world.entities.set(id,{id,type:'npc',archetype:'pumpkin-ambush',shipId:'galeao-frota-das-aboboras',
        name:'Frota do Mestre do Terror',x,y,heading:0,health:100000,maxHealth:100000,
        aggression:'neutral',attackProtectedUntil:Infinity,damage:0,range:0,cannonSlots:0});
    }
    if(pumpkinAmbushElapsed>=pumpkinNextVolleyMs){
      pumpkinNextVolleyMs+=5000;
      const ammo=effectiveAmmo('rusted-iron');
      for(let i=0;i<4;i++){
        const attacker=world.entities.get('pumpkin-ambush-'+i);
        if(!attacker)continue;
        if(ammo)navalRenderer.fire({from:{x:attacker.x,y:attacker.y},
          to:{x:world.camera.x,y:world.camera.y},
          duration:700,ammo,impactKind:'ship',startTime:performance.now(),
          onImpact:()=>({kind:'ship'})});
      }
      const save=readSave();
      const health=Math.max(0,navalBattle.getHealth()-400);
      writePatch({combat:{...save.combat,shipHealth:health,repairingUntil:null,repairingFrom:null}});
      pumpkinVolleyCount++;
    }
    if(navalBattle.getHealth()<=0){
      finishPumpkinAmbush();
    }
  }
  let positionSaveElapsed = 0;
  function persistPlayerPosition(stepMs) {
    positionSaveElapsed += stepMs;
    if (positionSaveElapsed < 1500) return;
    positionSaveElapsed = 0;
    writePatch({ playerPosition: { x: world.camera.x, y: world.camera.y } });
  }
  let state = setGameStatus(createGameState({ seed: previousSave?.payload?.seed ?? 1 }), GAME_STATUS.RUNNING);
  const originalR3Ocean=world.region.id==='r3'?{...world.region.ocean}:null;
  let r3Purification=0;
  if(originalR3Ocean){
    const progress=readSave().r3Campaign??{};
    r3Purification=(progress.claimed??[]).includes(R3_CLEANUP_MISSION_ID)?1:
      progress.active===R3_CLEANUP_MISSION_ID
        ? Math.min(1,0.2+0.8*(progress.cleanupSunkIds??[]).length/3):0;
  }
  let polarCanvas=null,polarCtx=null;
  if(world.region.id==='r4'){
    polarCanvas=document.createElement('canvas');
    polarCanvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;';
    polarCanvas.setAttribute('aria-hidden','true');
    root.append(polarCanvas);
    polarCtx=polarCanvas.getContext('2d');
  }
  let oceanTimeMs = 0;
  let blackMarketMerchantOrbitAngle = 0;
  let leviathanArrivalArsenalChecked = false;
  loop = new GameLoop({
    update: (stepMs) => {
      state = advanceGameState(state, stepMs);
      oceanTimeMs += stepMs;
      if(r1ExitCinematic){
        updateR1ExitCinematic(stepMs);
        renderer.updatePlayerWake({x:world.camera.x,y:world.camera.y,heading},stepMs,oceanTimeMs);
        updateCamera(world,canvas.clientWidth,canvas.clientHeight);
        return;
      }
      if(world.region.id==='r3'&&readSave().r3Campaign?.claimed?.includes(R3_CLEANUP_MISSION_ID)){
        const exit={x:3930,y:3890};
        if(Math.hypot(world.camera.x-exit.x,world.camera.y-exit.y)<110){
          const save=readSave();
          writePatch({progression:{...save.progression,activeRegion:4,unlockedRegion:Math.max(4,Number(save.progression?.unlockedRegion)||1)},playerPosition:{x:420,y:860}});
          showOceanReward('❄️ Bem-vindo às Terras Gélidas!');
          startWorld();
          return;
        }
      }
      if(world.region.id==='r3'){
        const save=readSave();
        const hunting=save.r3Campaign?.active===R3_LEVIATHAN_MISSION_ID
          && !save.r3Campaign?.leviathanDefeated;
        const leviathan=hunting?world.entities.get(R3_LEVIATHAN_ENTITY_ID):null;
        const arrived=leviathan?.health>0
          && Math.hypot(world.camera.x-leviathan.x,world.camera.y-leviathan.y)<=950;
        if(!arrived)leviathanArrivalArsenalChecked=false;
        else{
          if(!leviathanArrivalArsenalChecked){
            leviathanArrivalArsenalChecked=true;
            // Restore only missing Silas delivery, then arm the current ship.
            // This is silent, once per approach, with no dialogue or reward toast.
            const patch=verifySilasArsenalAtLeviathan(save);
            if(patch){
              writePatch(patch);
              navalBattle.selectedAmmoId=navalBattle.resolveSelectedAmmo();
              navalBattle.renderer.prepareAmmo?.(effectiveAmmo(navalBattle.selectedAmmoId));
              navalHud?.refresh();
              islandPanel?.refreshMissionBoard?.();
            }
          }
          if(!readSave().r3Campaign?.leviathanFound
            && recordMissionEvent({type:'leviathan-found',id:leviathan.id}))
            showOceanReward('🐙 Leviathan avistado! O Fantasma Esmeralda vem ajudar: 250 de dano a cada 2 segundos!');
        }
      }
      if(world.region.id==='r3'&&readSave().r3Campaign?.active===R3_SILAS_MISSION_ID
        &&!readSave().r3Campaign?.silasTradeCompleted){
        const silas=world.entities.get('r3-mercador-do-breu');
        if(silas){
          const distance=Math.hypot(world.camera.x-silas.x,world.camera.y-silas.y);
          if(distance>silas.interactionRadius+55){
            marketDismissedNearby=false;
            silasTradeAuthorized=false;
          }
          if(distance<=silas.interactionRadius&&!marketDismissedNearby
            && !mathGate.isOpen && marketOverlay.hidden && !islandPanel.isOpen){
            clickNavigation.cancel();
            navalBattle.firing=false;
            if(silasTradeAuthorized)showSilasTrade();
            else mathGate.open({
              kind:'r3-silas-trade',title:'☠️ Pacto de Silas Rubro',
              description:'Resolva a multiplicação para negociar. Seu arsenal só será entregue após confirmar a troca.',
              onClose:()=>{if(!silasTradeAuthorized)marketDismissedNearby=true;},
              afterSuccess:()=>{
                silasTradeAuthorized=true;
                marketDismissedNearby=false;
                showSilasTrade();
              },
            });
          }
        }
      }
      if (world.region.id === 'r2') {
        const rendezvous=boardFor(readSave(),'r2').missions.find(m=>m.id==='r2-meet-forgotten');
        const forgotten=world.region.islands.find(i=>i.id==='r2-scenery-north');
        if(rendezvous?.status==='active' && forgotten
          && Math.hypot(world.camera.x-forgotten.x,world.camera.y-forgotten.y)<600
          && activeShip.id==='galeao-halloween-tabuada'){
          const transition=advanceR2Story(readSave(),'r2-meet-forgotten','r2-why-help');
          if(transition)writePatch(transition);
          clearMissionNavigation();
          updateMissionHud();
        }
        // Touching the portal automatically travels to R3. Earlier R2 missions
        // must be claimed; the final objective can be active, ready or claimed.
        const passageDistance=Math.hypot(world.camera.x-darkWatersExit.x,world.camera.y-darkWatersExit.y);
        if(passageDistance<105 && !darkPortalTraveling){
          const save=readSave(),board=getR2Board(save),last=board.missions.find(m=>m.id==='r2-dark-voyage');
          const prerequisites=board.missions.filter(m=>m.id!=='r2-dark-voyage')
            .every(m=>m.status==='claimed');
          if(prerequisites && last && ['active','ready','claimed'].includes(last.status)){
            darkPortalTraveling=true;
            let campaign=save.r2Campaign??{};
            if(last.status==='active'){
              const progress={...campaign.progress,'r2-dark-voyage':[1]};
              campaign={...campaign,progress};
            }
            campaign={...campaign,active:null,
              claimed:[...new Set([...(campaign.claimed??[]),'r2-dark-voyage'])]};
            writePatch({r2Campaign:campaign,
              progression:{...save.progression,activeRegion:3,unlockedRegion:3},
              playerPosition:{x:420,y:860}});
            showOceanReward('🌑 Portal atravessado! Bem-vindo às Águas Escuras.');
            startWorld();
            return;
          }
        }
        updatePumpkinAmbush(stepMs);
        const active = boardFor(readSave(),world.region.id).active[0];
        const island = world.region.islands.find(i=>i.id==='r2-scenery-north');
        // Fora das missões que exigem encontro em coordenada fixa, o mercador
        // navega lentamente em patrulha circular pela região.
        const marketAnchorX=world.region.width/2,marketAnchorY=world.region.height/2;
        const marketMissionFixed=['r2-black-market','r2-hunt-prep'].includes(active?.id)
          && active.status==='active';
        if(!world.entities.has('r2-black-market-merchant')){
          world.entities.set('r2-black-market-merchant',{
            id:'r2-black-market-merchant',name:'Mercador do Mercado Negro',
            type:'npc',archetype:'black-market-merchant',shipId:'mercado-negro',
            x:marketAnchorX,y:marketAnchorY,heading:90,health:100000,maxHealth:100000,
            state:'roaming',aggression:'neutral',attackProtectedUntil:Infinity,
            cannonSlots:0,speed:58,
          });
        }
        const marketMerchant=world.entities.get('r2-black-market-merchant');
        if(marketMerchant){
          if(marketMissionFixed){
            marketMerchant.x=marketAnchorX;
            marketMerchant.y=marketAnchorY;
            marketMerchant.heading=90;
            marketMerchant.state='idle';
          }else{
            marketMerchant.state='roaming';
            const orbitRadiusX=620,orbitRadiusY=430;
            blackMarketMerchantOrbitAngle=(blackMarketMerchantOrbitAngle+stepMs*0.000075)%(Math.PI*2);
            const nextX=marketAnchorX+Math.cos(blackMarketMerchantOrbitAngle)*orbitRadiusX;
            const nextY=marketAnchorY+Math.sin(blackMarketMerchantOrbitAngle)*orbitRadiusY;
            const dx=nextX-marketMerchant.x,dy=nextY-marketMerchant.y;
            marketMerchant.heading=(Math.atan2(dx,-dy)*180/Math.PI+360)%360;
            marketMerchant.x=nextX;
            marketMerchant.y=nextY;
          }
          if(Math.hypot(world.camera.x-marketMerchant.x,world.camera.y-marketMerchant.y)>220)marketDismissedNearby=false;
          if(marketMissionFixed
            && !marketDismissedNearby
            && Math.hypot(world.camera.x-marketMerchant.x,world.camera.y-marketMerchant.y)<=180
            && !mathGate.isOpen && marketOverlay.hidden && !islandPanel.isOpen){
            clickNavigation.cancel();
            navalBattle.firing=false;
            if(blackMarketUnlocked)showBlackMarket();
            else mathGate.open({
              kind:'black-market',title:'☠️ Senha do Mercado Negro',
              description:'Resolva a multiplicação para negociar com o mercador.',
              afterSuccess:()=>showBlackMarket(),
            });
          }
        }
        // A completed battle is no longer present on the ocean, even while
        // its reward is awaiting collection at the Missions port.
        const goldenIIReady=boardFor(readSave(),'r2').missions
          .some(m=>m.id==='r2-golden-ii' && (m.status==='ready'||m.status==='claimed'));
        if(goldenIIReady){
          world.entities.delete('r2-morbi');
          world.entities.delete('r2-pumpkin-ally');
        }
        // Stage-I Morbi enters the ocean physically, with 900,000 HP.
        const morbiStage=['r2-golden-i','r2-golden-ii'].includes(active?.id);
        if(morbiStage && !goldenIIReady && !world.entities.has('r2-morbi')){
          const savedMorbi=readSave().r2MorbiBoss;
          const savedMorbiHealth=Number(savedMorbi?.health);
          const restoredMorbiHealth=Number.isFinite(savedMorbiHealth) && savedMorbiHealth>0
            ? Math.min(900000,savedMorbiHealth)
            : 900000;
          if(Number.isFinite(savedMorbiHealth) && savedMorbiHealth<=0){
            writePatch({r2MorbiBoss:{
              health:restoredMorbiHealth,maxHealth:900000,
              x:Math.min(world.region.width-280,world.camera.x+650),
              y:Math.min(world.region.height-280,world.camera.y+430),
              heading:Number.isFinite(Number(savedMorbi?.heading))?Number(savedMorbi.heading):180,
              updatedAt:Date.now(),
            }});
          }
          world.entities.set('r2-morbi',{
            id:'r2-morbi',name:'Morbi · Galeão Dourado',type:'npc',
            archetype:'golden-galleon',shipId:'galeao-dourado',
            x:Math.min(world.region.width-280,world.camera.x+650),
            y:Math.min(world.region.height-280,world.camera.y+430),
            heading:Number.isFinite(Number(savedMorbi?.heading))?Number(savedMorbi.heading):180,
            health:restoredMorbiHealth,maxHealth:900000,
            state:'retaliating',aggression:'attack',cannonSlots:1,
            range:2400,damage:1200,
            specialCannon:Object.freeze({
              id:'morbi-golden-cannon',
              name:'Canhão Dourado de Morbi',
              damage:1200,
              reloadMs:45000,
              range:840,
              countBeforePhase:1,
              countAfterPhase:2,
            }),
            broadside:Object.freeze({
              unlockDamageTaken:300,
              regularCannons:18,
              regularDamage:300,
              reloadMs:3000,
              range:Math.max(...CANNONS.map(c=>Number(c.range)||0)),
            }),
          });
        }
        const morbi=world.entities.get('r2-morbi');
        if(morbi){
          const damageTaken=Math.max(0,(Number(morbi.maxHealth)||0)-(Number(morbi.health)||0));
          morbi.broadsideActive=damageTaken>=Math.max(0,Number(morbi.broadside?.unlockDamageTaken)||300);
          morbi.cannonSlots=morbi.broadsideActive
            ? Math.max(1,(Number(morbi.broadside?.regularCannons)||18)+(Number(morbi.specialCannon?.countAfterPhase)||2))
            : Math.max(1,Number(morbi.specialCannon?.countBeforePhase)||1);
          if(morbi.broadsideActive) morbi.range=Math.max(
            Number(morbi.specialCannon?.range)||0,
            Number(morbi.broadside?.range)||0,
          );
          if(morbi.escapeAfterSinking){
            // Morbi flees immediately after sinking the player, then leaves the map.
            const dt=Math.min(64,Math.max(0,stepMs))/1000;
            const awayX=morbi.x-world.camera.x,awayY=morbi.y-world.camera.y;
            const length=Math.max(1,Math.hypot(awayX,awayY));
            morbi.escapeHeading=(Math.atan2(awayX,-awayY)*180/Math.PI+360)%360;
            const radians=morbi.escapeHeading*Math.PI/180;
            morbi.heading=morbi.escapeHeading;
            morbi.x+=Math.sin(radians)*950*dt;
            morbi.y-=Math.cos(radians)*950*dt;
            morbi.state='escaping';
            morbi.aggression='flee';
            if(morbi.x < -350 || morbi.y < -350
              || morbi.x > world.region.width+350 || morbi.y > world.region.height+350)
              world.entities.delete('r2-morbi');
          } else {
            morbi.state=morbiStage?'retaliating':'idle';
            if(morbiStage){
            const dx=world.camera.x-morbi.x,dy=world.camera.y-morbi.y;
            const distance=Math.hypot(dx,dy);
            // Morbi nunca deve "acampar" fora do alcance. No segundo duelo ele
            // aproxima até ficar confortavelmente dentro do alcance do próprio canhão
            // e também dentro do alcance real da bateria equipada pelo jogador.
            const stageTwo=active?.id==='r2-golden-ii';
            const bossRange=Math.max(1,Number(morbi.specialCannon?.range)||840);
            const save=readSave();
            const equippedIds=save.equipment?.loadout?.[save.equipment?.equippedShipId]??[];
            const playerRanges=equippedIds
              .map(id=>CANNONS.find(c=>c.id===id)?.range)
              .filter(range=>Number.isFinite(range)&&range>0);
            // A área de combate deve considerar o canhão de menor alcance do jogador.
            // Assim Morbi continua avançando até que a bateria inteira esteja realmente em combate,
            // em vez de parar assim que apenas os canhões mais longos conseguem alcançá-lo.
            const playerCombatRange=playerRanges.length?Math.min(...playerRanges):bossRange;
            const preferredDistance=stageTwo
              ? Math.max(260,Math.min(bossRange*.88,playerCombatRange*.88))
              : 220;
            if(distance>preferredDistance){
              const chaseSpeed=stageTwo?320:220;
              const travel=Math.min(distance-preferredDistance,Math.max(0,stepMs)*chaseSpeed/1000);
              morbi.x+=dx/distance*travel;
              morbi.y+=dy/distance*travel;
            }
            if(distance>1)morbi.heading=(Math.atan2(dx,-dy)*180/Math.PI+360)%360;
            }
          }
        }
        if(active?.id==='r2-golden-ii' && !goldenIIReady && !world.entities.has('r2-pumpkin-ally')){
          world.entities.set('r2-pumpkin-ally',{
            id:'r2-pumpkin-ally',name:'Galeão da Frota das Abóboras',
            type:'npc',archetype:'pumpkin-ally',shipId:'galeao-frota-das-aboboras',
            x:(world.entities.get('r2-morbi')?.x??world.camera.x)-220,
            y:world.entities.get('r2-morbi')?.y??world.camera.y,
            heading:90,health:100000,maxHealth:100000,state:'ally',
            aggression:'ally',cannonSlots:8,
          });
        }
        if(active?.id==='r2-golden-ii'){
          const ally=world.entities.get('r2-pumpkin-ally');
          const boss=world.entities.get('r2-morbi');
          if(ally && boss?.health>0){
            const dx=boss.x-ally.x,dy=boss.y-ally.y;
            const distance=Math.hypot(dx,dy);
            const desiredDistance=220;
            if(distance>desiredDistance){
              const travel=Math.min(distance-desiredDistance,Math.max(0,stepMs)*.55);
              ally.x+=dx/distance*travel;
              ally.y+=dy/distance*travel;
            }
            ally.heading=(Math.atan2(boss.x-ally.x,-(boss.y-ally.y))*180/Math.PI+360)%360;
          }
        }
        if(active?.id!=='r2-golden-ii')world.entities.delete('r2-pumpkin-ally');
        if(active?.id==='r2-mystery-light' && active.status==='active' && !mathGate.isOpen && !islandPanel.isOpen){
          clickNavigation.cancel();navalBattle.firing=false;
          mathGate.open({kind:'r2-mystery-light',title:'🌑 Uma Luz para o Mistério',
            description:'A Frota do Mestre do Terror deixou um rastro. Resolva a multiplicação final para descobrir o caminho às águas escuras do Capitão Terror.'});
        }
        if (active?.id === 'r2-island' && island &&
            Math.hypot(world.camera.x-island.x,world.camera.y-island.y) <= 650) {
          if ((active.progress?.[0] ?? 0) < 1)
            recordMissionEvent({type:'discover',id:island.id});
          const stage = boardFor(readSave(),'r2').active[0];
          if (stage?.id === 'r2-island' && (stage.progress?.[1] ?? 0) < 3 &&
              !mathGate.isOpen && !islandPanel.isOpen) {
            clickNavigation.cancel();
            navalBattle.firing=false;
            mathGate.open({
              kind:'island-riddle',
              title:'🏝️ O Segredo da Ilha Esquecida',
              description:'Decifre três multiplicações para revelar a passagem escondida.',
              repeatOnSuccess:true,
              getContinue:()=> (boardFor(readSave(),'r2').active[0]?.progress?.[1] ?? 3)<3,
            });
          }
        }
        if (active?.id === 'r2-informant' && !world.entities.has('r2-informant')) {
          const ship=[...world.entities.values()].find(n=>n.archetype==='red-sail-corsair' && n.health>0);
          if (ship) {
            world.entities.delete(ship.id);
            ship.id='r2-informant';ship.name='Gaspar Sussurro';
            ship.x=2500;ship.y=900;ship.health=500;ship.maxHealth=500;
            ship.attackProtectedUntil=readSave().r2Campaign?.informantTruceUntil || Infinity;
            ship.informantProtected = true;
            world.entities.set(ship.id,ship);
          }
        }
        {
          const npc=world.entities.get('r2-informant');
          const completed=boardFor(readSave(),'r2').missions.find(m=>m.id==='r2-informant')?.progress?.[1]>=3;
          if (npc && completed) {
            npc.name='Corsário das Velas Rubras';
            npc.informantProtected = false;
            npc.attackProtectedUntil=0;
          }
        }
        if (active?.id === 'r2-informant') {
          const npc=world.entities.get('r2-informant');
          const count=active.progress[1]??0;
          if(npc && count<3 && Math.hypot(world.camera.x-npc.x,world.camera.y-npc.y)<130 && !mathGate.isOpen && !islandPanel.isOpen) {
            clickNavigation.cancel();
            navalBattle.firing=false;
            mathGate.open({
              kind:'informant',title:'🏴‍☠️ Gaspar Sussurro, o Informante',
              description:'O capitão só revelará a pista depois de três multiplicações corretas.',
              repeatOnSuccess:true,
              getContinue:()=> (boardFor(readSave(),world.region.id).active[0]?.progress[1]??3)<3,
            });
          }
        }
        if (active?.id === 'r2-admiral' && !world.entities.has('r2-admiral')) {
          const ship=[...world.entities.values()].find(n=>n.archetype==='red-sail-corsair' && n.health>0);
          if (ship) {
            world.entities.delete(ship.id);
            ship.id='r2-admiral';ship.name='Capitão Baltazar Ferrugem';
            ship.health=800;ship.maxHealth=800;
            world.entities.set(ship.id,ship);
          }
        }
      }
      updatePursuitPopulation();
      // The existing Fantasma Esmeralda joins only the Leviathan hunt.
      // This flag is derived from the active mission, never persisted as a new NPC.
      if(world.region.id==='r3'){
        const ghost=world.entities.get('r3-fantasma-esmeralda');
        if(ghost){
          ghost.leviathanHuntActive=readSave().r3Campaign?.active===R3_LEVIATHAN_MISSION_ID
            && !readSave().r3Campaign?.leviathanDefeated;
          if(readSave().r3Campaign?.active===R3_REBUILD_MISSION_ID){
            ghost.varkorAllyActive=false;
            ghost.x=2450;ghost.y=3880;ghost.heading=180;
            ghost.rebuildGuideActive=true;
          }else ghost.rebuildGuideActive=false;
        }
      }
      // Keep the defeated captain removed even if a population refresh recreates him.
      if(world.region.id==='r3'&&readSave().r3Campaign?.varkorDefeated){
        world.entities.delete(world.region.terrorBoss?.id);
      }
      // Varkor enters only after the Chama do Abismo has been claimed.
      // Clear ordinary R3 ships, but preserve the shadow thief and Emerald ally.
      if(world.region.id==='r3' && readSave().r3Campaign?.active===R3_VARKOR_MISSION_ID){
        const boss=world.entities.get(world.region.terrorBoss?.id);
        if(boss && boss.health>0){
          if(!readSave().r3Campaign?.varkorSummoned){
            recordMissionEvent({type:'varkor-summon'});
            showOceanReward('🌊 O oceano estremece! Varkor Tenebris, o Terror do Mar, desperta. A frota foge; o Fantasma Esmeralda retorna!');
          }
          boss.varkorBattleUnlocked=true;
          const battery=armedCannons(readSave(),navalBattle.shipId);
          boss.playerMaxCannonRange=battery.length?Math.max(...battery.map(({cannon})=>cannonRange(cannon))):0;
          boss.phasedOut=false;
          for(const [id,npc] of world.entities){
            if(id===boss.id || id==='r3-fantasma-esmeralda' ||
              (npc.archetype==='dark-waters-raider' && npc.aggression==='flee') || npc.type!=='npc')continue;
            world.entities.delete(id);
          }
          const ghost=world.entities.get('r3-fantasma-esmeralda');
          if(ghost)ghost.varkorAllyActive=true;
        }
      }
      if(world.region.id==='r3'){
        const state=readSave().r3Campaign??{};
        const cleaning=state.active===R3_CLEANUP_MISSION_ID||state.claimed?.includes(R3_CLEANUP_MISSION_ID);
        if(cleaning){
          world.entities.delete('r3-fantasma-esmeralda');
          for(const id of state.cleanupSunkIds??[])world.entities.delete(id);
          const thief=world.entities.get('r3-sombra-do-saque');
          if(thief){
            const goal={x:world.region.width-95,y:world.region.height-95};
            const dx=goal.x-thief.x,dy=goal.y-thief.y,dist=Math.hypot(dx,dy);
            if(dist<125)world.entities.delete(thief.id);
            else{const step=Math.min(dist,Math.max(0,stepMs)*.44);thief.x+=dx/dist*step;thief.y+=dy/dist*step;thief.heading=(Math.atan2(dx,-dy)*180/Math.PI+360)%360;}
            thief.escapingToR4=true;
          }
        }
      }
      if(world.region.id==='r4'){
        const fugitive=world.entities.get('r4-sombra-do-saque');
        if(fugitive){
          const savedExpiry=Number(readSave().r4RaidCooldownUntil)||0;
          fugitive.nextRaidAt=Math.max(Number(fugitive.nextRaidAt)||0,savedExpiry);
        }
      }
      const darkWaterRaids = updateCorsairPopulation(world, stepMs);
      for (const raider of darkWaterRaids ?? []) {
        if(world.region.id==='r4' && raider.id==='r4-sombra-do-saque'){
          writePatch({r4RaidCooldownUntil:Number(raider.nextRaidAt)||Date.now()+60000});
        }
        const save=readSave();
        const gold=Math.max(0,Math.floor(Number(save.profile?.gold)||0));
        const storedIron=save.ammunition?.['rusted-iron'];
        const iron=storedIron===undefined ? 20 : Math.max(0,Math.floor(Number(storedIron)||0));
        const stolenGold=Math.min(25,Math.max(0,Math.ceil(gold*.08)));
        const stolenIron=Math.min(40,Math.max(0,Math.floor(iron*.40)));
        if(stolenGold||stolenIron){
          writePatch({
            profile:{...(save.profile??{}),gold:Math.max(0,gold-stolenGold)},
            ammunition:{...(save.ammunition??{}),'rusted-iron':Math.max(0,iron-stolenIron)},
          });
          showOceanReward('☠️ '+raider.name+' saqueou '+stolenGold+' ouro e '+stolenIron+' munições de ferro!');
        } else {
          showOceanReward('☠️ '+raider.name+' tentou saquear, mas seu porão estava vazio.');
        }
      }
      updateNegotiationFrigate(world, readSave());
      updateFugitiveFrigatePopulation(world, stepMs);
      if (world.region.id === 'r2') {
        const thiefMission = readSave().r2Campaign?.active === 'r2-destroy-thief';
        for (const npc of world.entities.values()) {
          if (npc.archetype !== 'fugitive-frigate') continue;
          if (thiefMission) {
            // Inicializar uma única vez: nunca repor PV após os disparos.
            if (!npc.thiefBossInitialized) {
              const savedBoss=readSave().r2ThiefBoss;
              const hp=Number(savedBoss?.health);
              npc.maxHealth=100000;
              npc.health=savedBoss?.missionId==='r2-destroy-thief' && Number.isFinite(hp)
                ? Math.max(0,Math.min(100000,hp)) : 100000;
              if (savedBoss?.missionId==='r2-destroy-thief') {
                if(Number.isFinite(Number(savedBoss.x)))npc.x=Number(savedBoss.x);
                if(Number.isFinite(Number(savedBoss.y)))npc.y=Number(savedBoss.y);
                if(Number.isFinite(Number(savedBoss.heading)))npc.heading=Number(savedBoss.heading);
              }
              npc.thiefBossInitialized=true;
              if(npc.health<=0)npc.state='sunk';
            }
            npc.cannonSlots = 1;
            npc.range = 840;
            npc.damage = 3;
            npc.keepAwayFromEdges = true;
          } else {
            npc.keepAwayFromEdges = false;
          }
        }
      }
      if(world.region.id==='r3'){
        const leviathan=world.entities.get(R3_LEVIATHAN_ENTITY_ID);
        if(leviathan)leviathan.huntActive=readSave().r3Campaign?.active===R3_LEVIATHAN_MISSION_ID
          && !readSave().r3Campaign?.leviathanDefeated;
      }
      updateMonsterPopulation(world, stepMs);
      glintElapsed+=stepMs;
      if(world.region.id==='r4'){
        const save=readSave();
        const collected=save.r4CollectedWrecks??[];
        const wreck=R4_ICE_WRECKS.find(w=>!collected.includes(w.id)&&Math.hypot(w.x-world.camera.x,w.y-world.camera.y)<65);
        if(wreck){
          const amount=100+Math.floor(Math.random()*151);
          writePatch({r4CollectedWrecks:[...collected,wreck.id],ammunition:{...(save.ammunition??{}),'frozen-explosion':(Number(save.ammunition?.['frozen-explosion'])||0)+amount}});
          recordMissionEvent({type:'r4-wreck',id:wreck.id});
          showOceanReward('❄️ Destroços Gélidos: +'+amount+' Explosões Gélidas!');
        }
      }
      if(EVENTS.halloween && world.region.id!=='r4'){
        const save=readSave();
        const nearby=SEA_GLINTS.find(g=>!(save.collectedGlints??[]).includes(g.id)&&Math.hypot(g.x-world.camera.x,g.y-world.camera.y)<55);
        if(nearby){
          const result=collectSeaGlint(save,nearby.id);
          if(result){
            writePatch(result.patch);
            recordMissionEvent({ type:'collect', id:nearby.id });
            showOceanReward('🎃 +'+result.rewards.simple+' ferro · +'+result.rewards.special+' Halloween · +'+result.rewards.gold+' ouro');
          }
        }
      }
      if(world.region.id==='r3'&&readSave().r3Campaign?.active===R3_REBUILD_MISSION_ID&&!mathGate.isOpen&&!islandPanel.isOpen){
        const state=readSave().r3Campaign??{},ghost=world.entities.get('r3-fantasma-esmeralda');
        if(!state.emeraldSpoken&&ghost&&Math.hypot(world.camera.x-ghost.x,world.camera.y-ghost.y)<125){
          clickNavigation.cancel();navalBattle.firing=false;
          mathGate.open({kind:'r3-emerald-rebuild',id:'r3-fantasma-esmeralda',title:'💚 O segredo do Fantasma Esmeralda',description:'Resolva a multiplicação para descobrir como reconstruir o Terror do Mar.'});
        }else if(state.emeraldSpoken&&!state.emeraldWreckCollected&&Math.hypot(world.camera.x-2350,world.camera.y-4740)<125){
          recordMissionEvent({type:'emerald-wreck'});
          showOceanReward('🪵 Destroços recolhidos! O Fantasma Esmeralda pode reconstruir o navio. Siga para o Estaleiro.');
          void guideMissionTo('shipyard');
        }
      }
      if(world.region.id==='r3'&&readSave().r3Campaign?.active===R3_VARKOR_MISSION_ID&&!mathGate.isOpen&&!islandPanel.isOpen){
        const state=readSave().r3Campaign??{},point=state.varkorWreckPosition;
        if(state.varkorDefeated&&!state.varkorWreckClaimed&&point&&Math.hypot(world.camera.x-point.x,world.camera.y-point.y)<125){
          clickNavigation.cancel();navalBattle.firing=false;
          mathGate.open({kind:'r3-varkor-wreck',id:'r3-varkor-wreck',title:'🪵 Destroços do Terror do Mar',description:'Acerte quatro multiplicações para resgatar o arsenal de Varkor.'});
        }
      }
      if(world.region.id==='r3'&&readSave().r3Campaign?.active===R3_FLAME_MISSION_ID&&
        !mathGate.isOpen&&!islandPanel.isOpen){
        const campaign=readSave().r3Campaign,step=campaign.flameStep??0;
        const index=step===0?0:step===2?1:step===3?2:step===5?3:-1;
        const wreck=R3_FLAME_STOPS[index];
        if(wreck&&Math.hypot(world.camera.x-wreck.x,world.camera.y-wreck.y)<125){
          clickNavigation.cancel();navalBattle.firing=false;
          mathGate.open({kind:'r3-flame-wreck',id:wreck.id,title:'🔥 '+wreck.name,description:'Resolva a multiplicação para recuperar a pista.'});
        }
      }
      if(world.region.id==='r3'&&readSave().r3Campaign?.active===R3_ABYSS_SECRET_MISSION_ID&&
        !mathGate.isOpen&&!islandPanel.isOpen){
        const missing=R3_ABYSS_WRECKS.find(w=>!(readSave().r3Campaign?.abyssFragments??[]).includes(w.id)&&Math.hypot(world.camera.x-w.x,world.camera.y-w.y)<125);
        if(missing){clickNavigation.cancel();navalBattle.firing=false;
          mathGate.open({kind:'r3-abyss-fragment',id:missing.id,title:'🪵 '+missing.name,description:'Resolva a multiplicação para recuperar o fragmento do mapa.'});}
      }
      if(world.region.id==='r3'&&readSave().r3Campaign?.active==='r3-dark-waters-warning'&&
         !mathGate.isOpen&&!islandPanel.isOpen){
        const missing=R3_WRECKS.find(w=>!(readSave().r3Campaign?.wreckDiaries??[]).includes(w.id));
        if(missing&&Math.hypot(world.camera.x-missing.x,world.camera.y-missing.y)<125){
          clickNavigation.cancel();
          navalBattle.firing=false;
          mathGate.open({kind:'r3-wreck-diary',id:missing.id,title:'📜 '+missing.name,
            description:'Resolva a multiplicação para recuperar o diário perdido.'});
        }
      }
      const campaign = readSave().campaign ?? {};
      const negotiationActive = campaign.active?.includes('r1-negotiation') && !campaign.negotiationRobbed;
      if (negotiationActive && !mathGate.isOpen && !islandPanel.isOpen) {
        const thief = [...world.entities.values()].find(npc => npc.archetype === 'fugitive-frigate');
        if (thief && Math.hypot(world.camera.x - thief.x, world.camera.y - thief.y) <= NEGOTIATION_APPROACH_RADIUS) {
          clickNavigation.cancel();
          navalBattle.firing = false;
          mathGate.open({
            kind: 'negotiation',
            title: '🏴‍☠️ A Negociação, o Golpe',
            description: 'O capitão exige cinco multiplicações para liberar a passagem. Cada resposta certa aproxima o acordo.',
            repeatOnSuccess: true,
            locked: true,
            getLocked: () => (readSave().campaign?.progress?.['r1-negotiation']?.[0] ?? 0) < 5,
            getContinue: () => (readSave().campaign?.progress?.['r1-negotiation']?.[0] ?? 0) < 5,
            afterSuccess: () => { updateNegotiationFrigate(world, readSave()); updateMissionHud(); navalHud.refresh(); },
            onClose: () => { updateNegotiationFrigate(world, readSave()); updateMissionHud(); navalHud.refresh(); },
          });
        }
      }
      if(isSupplyChestAvailable() && !mathGate.isOpen && !islandPanel.isOpen
          && Math.hypot(world.camera.x-supplyChest.x,world.camera.y-supplyChest.y)<135) {
        clickNavigation.cancel();
        navalBattle.firing=false;
        mathGate.open({kind:'chase-supply-chest',title:'🧰 Baú da Caçada',
          description:'Resolva uma multiplicação para ganhar 10 consumíveis 5X em Chamas e 10 Escudos.'});
      }
            navalBattle.update(stepMs,performance.now());
      if(pendingCombatPortId && !islandPanel.isOpen && !navalBattle.isPortInteractionLocked()){
        const pending=world.region.islands.find(i=>i.id===pendingCombatPortId);
        const nearby=getIslandContact(world.region,world.camera.x,world.camera.y,42);
        if(pending && nearby?.id===pending.id && ['shipyard','missions'].includes(pending.kind)){
          openDockContact(pending);
        }else{
          pendingCombatPortId=null;
        }
      }
      repairTickMs += stepMs;
      if (repairTickMs >= 100) {
        repairTickMs = 0;
        const change = advanceHullRecovery(readSave());
        if (change) writePatch(change);
      }
      const repairState = readSave().combat ?? {};
      const recovering = Boolean(repairState.repairingUntil);
      repairAura.hidden = !recovering;
      const ambushed=world.region.id==='r2' && readSave().r2Campaign?.active==='r2-why-help';
      const sunk = Number(repairState.shipHealth ?? 100) <= 0;
      if (sunk && !ambushed && !recovering && (!mathGate.isOpen || mathGate.activeKind !== 'repair' || !repairIsForced)) {
        clickNavigation.cancel();
        navalBattle.firing = false;
        if (mathGate.isOpen) mathGate.close(true);
        beginRepairSession(true);
      }
      // Marcador visual acompanha a selecao automatica.
      selectedNpcId = navalBattle.targetId;
      hudRefreshElapsed += stepMs;
      if (hudRefreshElapsed >= 160) {
        hudRefreshElapsed = 0;
        navalHud.refresh();
        refreshTargetAndHealthHud();
        assistButton.hidden = !navalBattle.getAssistStatus().eligible || mathGate.isOpen || islandPanel.isOpen;
        if(pendingTreasureId && !mathGate.isOpen && !islandPanel.isOpen){
          const target=visibleTreasures().find(t=>t.id===pendingTreasureId);
          if(!target){
            pendingTreasureId=null;
            clickNavigation.cancel();
          } else if(Math.hypot(world.camera.x-target.x,world.camera.y-target.y)<=72){
            openTreasureChallenge(target);
          }
        }
      }
      persistPlayerPosition(stepMs);
      // Only a truly sunk ship that has NOT started regeneration is immobilized.
      // During recovery (including 0 HP immediately after solving), navigation stays enabled.
      if (sunk && !recovering) {
        clickNavigation.cancel();
        renderer.updatePlayerWake({x:world.camera.x,y:world.camera.y,heading},stepMs,oceanTimeMs);
        updateCamera(world, canvas.clientWidth, canvas.clientHeight);
        if (!recovering && !sunk) repairIsForced = false;
        return;
      }
      if (!recovering) repairIsForced = false;
      // Manual camera moves only while WASD is held; no inertia or ship movement.
      const cameraInput = keyboardCamera.getVector();
      if (cameraInput.x !== 0 || cameraInput.y !== 0) {
        if (!world.manualCamera) world.manualCamera = { ...world.cameraView };
        const distance = 320 * stepMs / 1000;
        const zoom = Math.max(world.camera.zoom, 0.01);
        const halfW = canvas.clientWidth / (2 * zoom);
        const halfH = canvas.clientHeight / (2 * zoom);
        const clamp = (value, extent, half) => extent <= 2 * half
          ? extent / 2 : Math.max(half, Math.min(extent - half, value));
        world.manualCamera.x = clamp(world.manualCamera.x + cameraInput.x * distance, world.region.width, halfW);
        world.manualCamera.y = clamp(world.manualCamera.y + cameraInput.y * distance, world.region.height, halfH);
      }
      if (islandPanel.isOpen) {
        renderer.updatePlayerWake({x:world.camera.x,y:world.camera.y,heading},stepMs,oceanTimeMs);
        updateCamera(world, canvas.clientWidth, canvas.clientHeight);
        return;
      }
      const input = Date.now()<(navalBattle?.playerFrozenUntil||0) ? {x:0,y:0} : joystick.getVector();
      if (Math.hypot(input.x, input.y) > 0.12) {
        clickNavigation.cancel();
        heading = (Math.atan2(input.x, -input.y) * 180 / Math.PI + 360) % 360;
        const fromX = world.camera.x, fromY = world.camera.y;
        advanceNavigation(world, input, stepMs, shipSpeed*(readSave().r2Campaign?.active==='r2-why-help' ? .55 : (navalBattle?.isSpeedActive()?1.1:1)));
        trackVoyage(fromX, fromY);
        persistPlayerPosition(stepMs);
        checkDockContact(fromX, fromY, input.x, input.y, stepMs);
      } else {
        const destination = clickNavigation.getDestination();
        if (destination && Date.now()>=(navalBattle?.playerFrozenUntil||0)) {
          const fromX = world.camera.x, fromY = world.camera.y;
          const dx = destination.x - fromX, dy = destination.y - fromY;
          const distance = Math.hypot(dx, dy);
          const result = advanceTowardDestination(world, destination, stepMs, shipSpeed*(readSave().r2Campaign?.active==='r2-why-help' ? .55 : (navalBattle?.isSpeedActive()?1.1:1)));
          trackVoyage(fromX, fromY);
          persistPlayerPosition(stepMs);
          if (distance > 0) checkDockContact(fromX, fromY, dx / distance, dy / distance, stepMs);
          if (result.heading !== null) heading = result.heading;
          if (result.arrived) clickNavigation.cancel();
        } else {
          // Desaceleração por inércia da cinemática do projeto anterior.
          if(Date.now()<(navalBattle?.playerFrozenUntil||0))world.navigationVelocity={vx:0,vy:0};
          else advanceNavigation(world, { x: 0, y: 0 }, stepMs, shipSpeed*(readSave().r2Campaign?.active==='r2-why-help' ? .55 : (navalBattle?.isSpeedActive()?1.1:1)));
        }
      }
      if (world.region.id === 'r1') {
        const exit = world.region.exitPoint;
        const distanceToExit = exit ? Math.hypot(world.camera.x-exit.x,world.camera.y-exit.y) : Infinity;
        if (distanceToExit > (exit?.radius ?? 0) + 45) exitDismissed = false;
        const board = getCampaignBoard(readSave());
        const finalMission = board.missions.find(m => m.id === 'r1-finale');
        const canUsePassage = finalMission?.status==='active' && board.mastery?.mastered===true;
        if (canUsePassage && distanceToExit <= exit.radius && !mathGate.isOpen && !islandPanel.isOpen && !r1ExitCinematic) {
          clickNavigation.cancel();
          beginR1ExitCinematic();
        }
      }
      if (world.region.id === 'r1' && (!exitDialog.hidden || r1ExitCinematic)) {
        clickNavigation.cancel();
      }
      renderer.updatePlayerWake({x:world.camera.x,y:world.camera.y,heading},stepMs,oceanTimeMs);
      updateCamera(world, canvas.clientWidth, canvas.clientHeight);
    },
    render: () => {
      updatePursuitCamera(16);
      updateCamera(world, canvas.clientWidth, canvas.clientHeight);
      firstVoyageGuide?.update();
      if(originalR3Ocean){
        const progress=readSave().r3Campaign??{};
        const kills=(progress.cleanupSunkIds??[]).length;
        const target=(progress.claimed??[]).includes(R3_CLEANUP_MISSION_ID)?1:
          progress.active===R3_CLEANUP_MISSION_ID?Math.min(1,0.2+0.8*kills/3):0;
        r3Purification+=Math.sign(target-r3Purification)*Math.min(Math.abs(target-r3Purification),1/360);
        const blend=(key,to)=>Math.round((Number(originalR3Ocean[key])||0)*(1-r3Purification)+to*r3Purification);
        world.region={...world.region,ocean:{...originalR3Ocean,
          brightness:blend('brightness',115),saturation:blend('saturation',110),
          contrast:blend('contrast',93),tintR:blend('tintR',99),
          tintG:blend('tintG',123),tintB:blend('tintB',133),
          speed:blend('speed',35),swell:blend('swell',32),
          foamMix:blend('foamMix',32),sparkleIntensity:blend('sparkleIntensity',28),
          corruption:{...originalR3Ocean.corruption,active:r3Purification<0.999,
            zones:r3Purification>=0.999?[]:originalR3Ocean.corruption?.zones??[]}}};
      }
      renderer.render(world, oceanTimeMs);
      if(halloweenFogCanvas){
        halloweenFogCanvas.hidden=world.region.id!=='r3'||r3Purification>=0.999;
        halloweenFogCanvas.style.opacity=String(Math.max(0,1-r3Purification));
      }
      if(world.region.id==='r3'&&r3Purification<0.999)
        halloweenFogRenderer?.render(world.cameraView,world.camera.zoom,oceanTimeMs);
      cloudRenderer?.render(world.cameraView, world.camera.zoom, oceanTimeMs);
      if(polarCtx&&polarCanvas){
        const w=canvas.clientWidth,h=canvas.clientHeight;
        if(polarCanvas.width!==w||polarCanvas.height!==h){polarCanvas.width=w;polarCanvas.height=h;}
        polarCtx.clearRect(0,0,w,h);
        polarCtx.fillStyle='rgba(211,233,244,0.27)';polarCtx.fillRect(0,0,w,h);
        // Snow exists in world coordinates, not on the camera lens.
        // Moving the ship changes which flakes are visible, while each
        // flake keeps falling independently through the frozen landscape.
        const t=oceanTimeMs*.001,z=Math.max(.01,world.camera.zoom);
        const cell=95,view=world.cameraView;
        const left=view.x-w/(2*z)-cell,right=view.x+w/(2*z)+cell;
        const top=view.y-h/(2*z)-cell,bottom=view.y+h/(2*z)+cell;
        const firstX=Math.floor(left/cell),lastX=Math.ceil(right/cell);
        const firstY=Math.floor(top/cell),lastY=Math.ceil(bottom/cell);
        for(let gy=firstY;gy<=lastY;gy++){
          for(let gx=firstX;gx<=lastX;gx++){
            const seed=Math.abs(Math.sin(gx*127.1+gy*311.7)*43758.5453)%1;
            const drift=(t*(8+seed*14))%cell;
            const fall=(t*(25+seed*40))%cell;
            const wx=gx*cell+seed*cell+drift;
            const wy=gy*cell+((seed*.73+.17)%1)*cell+fall;
            const x=w*.5+(wx-view.x)*z,y=h*.5+(wy-view.y)*z;
            if(x< -8||x>w+8||y< -8||y>h+8)continue;
            polarCtx.beginPath();polarCtx.arc(x,y,(1+seed*2.3)*Math.min(1.5,Math.max(.7,z)),0,Math.PI*2);
            polarCtx.fillStyle='rgba(255,255,255,'+(0.5+seed*.45)+')';polarCtx.fill();
          }
        }
      }

      islandRenderer.render(world.cameraView, world.camera.zoom);
      const hidePursuitTreasures = world.region.id === 'r2'
        && ['r2-destroy-thief','r2-golden-i','r2-golden-ii'].includes(readSave().r2Campaign?.active);
      const renderedTreasures=hidePursuitTreasures ? [] : getVisibleTreasures(readSave(),Date.now(),world.region.id);
      treasureGlowRenderer?.render(renderedTreasures,world.cameraView,world.camera.zoom,oceanTimeMs,pendingTreasureId);
      const flameStep=readSave().r3Campaign?.flameStep??0;
      const flameIndex=flameStep===0?0:flameStep===2?1:flameStep===3?2:flameStep===5?3:-1;
      const visibleFlameWreck=world.region.id==='r3'&&readSave().r3Campaign?.active===R3_FLAME_MISSION_ID&&flameIndex>=0?[R3_FLAME_STOPS[flameIndex]]:[];
      const visibleMissionWrecks=world.region.id==='r3' && readSave().r3Campaign?.active==='r3-dark-waters-warning'
        ?R3_WRECKS.filter(w=>!(readSave().r3Campaign?.wreckDiaries??[]).includes(w.id))
        :world.region.id==='r3'&&readSave().r3Campaign?.active===R3_ABYSS_SECRET_MISSION_ID
          ?R3_ABYSS_WRECKS.filter(w=>!(readSave().r3Campaign?.abyssFragments??[]).includes(w.id)):[];
      const varkorState=readSave().r3Campaign??{};
      const varkorWreck=world.region.id==='r3'&&varkorState.active===R3_VARKOR_MISSION_ID&&varkorState.varkorDefeated&&!varkorState.varkorWreckClaimed&&varkorState.varkorWreckPosition?[{id:'r3-varkor-wreck',name:'Destroço do Capitão',label:'Destroço do Capitão',...varkorState.varkorWreckPosition}]:[];
      const rebuildState=readSave().r3Campaign??{};
      const rebuildWreck=world.region.id==='r3'&&rebuildState.active===R3_REBUILD_MISSION_ID&&rebuildState.emeraldSpoken&&!rebuildState.emeraldWreckCollected?[{id:'r3-emerald-build-wreck',name:'Destroço',label:'Destroço',x:2350,y:4740},{id:'r3-emerald-build-wreck-2',name:'Destroço',label:'Destroço',x:2210,y:4740},{id:'r3-emerald-build-wreck-3',name:'Destroço',label:'Destroço',x:2490,y:4740}]:[];
      treasureRenderer.render([...renderedTreasures,...visibleMissionWrecks,...visibleFlameWreck,...varkorWreck,...rebuildWreck],world.cameraView,world.camera.zoom,oceanTimeMs,world.region.id);
      updateSupplyChestMarker();
      if (selectedNpcId && (world.entities.get(selectedNpcId)?.health ?? 0) <= 0) {
        selectedNpcId = null;
        navalBattle.setTarget(null);
      }
      const monster=world.entities.get('r3-leviathan');
      leviathanAura.hidden=!monster||monster.health<=0||monster.ambushPhase==='submerged';
      if(!leviathanAura.hidden){
        const z=world.camera.zoom,c=world.cameraView;
        leviathanAura.style.left=(canvas.clientWidth/2+(monster.x-c.x)*z)+'px';
        leviathanAura.style.top=(canvas.clientHeight/2+(monster.y-c.y)*z)+'px';
        leviathanAura.style.setProperty('--leviathan-aura-size',Math.min(470,240*z)+'px');
      }
      npcRenderer.render(world.entities, world.cameraView, world.camera.zoom, selectedNpcId, navalRenderer.getKrakenAttacks(), performance.now(), oceanTimeMs, world.camera.y);
      damageTextRenderer?.render(world.cameraView, world.camera.zoom, performance.now());
      spectralShipRenderer?.render(
        world.entities, world.cameraView, world.camera.zoom,
        performance.now(), spectralShipRenderer.definition,
      );
      // Rock the player ship only at the underwater impact, then damp the motion.
      const renderNow = performance.now();
      let krakenImpact = null;
      for (const attack of navalRenderer.getKrakenAttacks()) {
        const elapsed = renderNow - attack.startTime - 970;
        if (elapsed < 0 || elapsed > 620) continue;
        const distance = Math.hypot(world.camera.x - attack.to.x, world.camera.y - attack.to.y);
        if (distance > 65) continue;
        const strength = Math.sin(Math.PI * elapsed / 620) * (1 - elapsed / 620);
        if (!krakenImpact || strength > krakenImpact.strength) {
          krakenImpact = { strength, phase: elapsed / 100 };
        }
      }
      shipRenderer.render(heading, world.camera, world.cameraView, world.camera.zoom, krakenImpact);
      if (!repairAura.hidden) {
        const rect = canvas.getBoundingClientRect();
        const px = rect.left + rect.width / 2 + (world.camera.x - world.cameraView.x) * world.camera.zoom;
        const py = rect.top + rect.height / 2 + (world.camera.y - world.cameraView.y) * world.camera.zoom;
        const sprite = shipRenderer.getFrameWorldSize(world.camera.zoom);
        const auraSize = Math.max(54, Math.min(210, Math.max(sprite.width, sprite.height) * world.camera.zoom * .75));
        repairAura.style.left = px + 'px';
        repairAura.style.top = py + 'px';
        repairAura.style.width = auraSize + 'px';
        repairAura.style.height = auraSize + 'px';
      }
      navalBattle.render(performance.now(),world.cameraView,world.camera.zoom,canvas.clientWidth,canvas.clientHeight);
      minimap.render();
      updateThiefGuide();
      updateExitBeacon();
      updateDarkPortal(performance.now());
      const gr=glintCanvas.getBoundingClientRect(),gd=Math.min(window.devicePixelRatio||1,2);
      const gw=Math.max(1,Math.round(gr.width*gd)),gh=Math.max(1,Math.round(gr.height*gd));
      if(glintCanvas.width!==gw||glintCanvas.height!==gh){glintCanvas.width=gw;glintCanvas.height=gh;}
      glintCtx.clearRect(0,0,gw,gh);
      if(world.region.id==='r4'){
        const collected=readSave().r4CollectedWrecks??[];
        for(const wreck of R4_ICE_WRECKS){
          if(collected.includes(wreck.id))continue;
          const x=gw/2+(wreck.x-world.cameraView.x)*world.camera.zoom*gd;
          const y=gh/2+(wreck.y-world.cameraView.y)*world.camera.zoom*gd;
          if(x<0||x>gw||y<0||y>gh)continue;
          if(frozenWreckImage.complete&&frozenWreckImage.naturalWidth>0){
            const size=Math.max(28,Math.min(100,72*world.camera.zoom))*gd;
            glintCtx.save();
            glintCtx.shadowColor='#55eaff';glintCtx.shadowBlur=12*gd;
            glintCtx.drawImage(frozenWreckImage,x-size/2,y-size/2,size,size);
            glintCtx.restore();
          }
        }
      }
      // Frozen ships and AoE blast share the world-space overlay, keeping
      // their positions stable while the camera moves or zooms.
      const fxNow=performance.now();
      const iceScale=world.camera.zoom*gd;
      const frozenPlayerUntil=navalBattle?.playerFrozenUntil||0;
      if(Date.now()<frozenPlayerUntil){
        const px=gw/2+(world.camera.x-world.cameraView.x)*iceScale;
        const py=gh/2+(world.camera.y-world.cameraView.y)*iceScale;
        drawFrozenShip(glintCtx,px,py,Math.max(38,125*iceScale),fxNow,frozenPlayerUntil);
      }
      for(const npc of world.entities.values()){
        if(npc.type!=='npc'||npc.health<=0||Date.now()>=(npc.frozenUntil||0))continue;
        const px=gw/2+(npc.x-world.cameraView.x)*iceScale;
        const py=gh/2+(npc.y-world.cameraView.y)*iceScale;
        if(px< -140||px>gw+140||py< -140||py>gh+140)continue;
        drawFrozenShip(glintCtx,px,py,Math.max(38,125*iceScale),fxNow,npc.frozenUntil);
      }
      if(navalBattle?.freezeBursts){
        navalBattle.freezeBursts=navalBattle.freezeBursts.filter(b=>fxNow-b.startTime<1250);
        for(const burst of navalBattle.freezeBursts){
          drawFreezeBurst(glintCtx,gw/2+(burst.x-world.cameraView.x)*iceScale,
            gh/2+(burst.y-world.cameraView.y)*iceScale,burst.radius,fxNow,burst.startTime,iceScale);
        }
      }
      if(EVENTS.halloween && world.region.id!=='r4'){
        const collected=readSave().collectedGlints??[];
        for(const g of SEA_GLINTS){
          if(collected.includes(g.id))continue;
          const x=gw/2+(g.x-world.cameraView.x)*world.camera.zoom*gd;
          const y=gh/2+(g.y-world.cameraView.y)*world.camera.zoom*gd;
          if(x<0||x>gw||y<0||y>gh)continue;
          const pulse=1+0.24*Math.sin(glintElapsed/260+g.x);
          glintCtx.save();glintCtx.translate(x,y);glintCtx.scale(pulse,pulse);
          glintCtx.shadowColor='#ffcf6b';glintCtx.shadowBlur=26*gd;
          glintCtx.fillStyle='#fff2a0';glintCtx.beginPath();glintCtx.arc(0,0,6*gd,0,Math.PI*2);glintCtx.fill();
          glintCtx.strokeStyle='#fff6c7';glintCtx.lineWidth=2*gd;
          glintCtx.beginPath();glintCtx.moveTo(-16*gd,0);glintCtx.lineTo(16*gd,0);glintCtx.moveTo(0,-16*gd);glintCtx.lineTo(0,16*gd);glintCtx.stroke();glintCtx.restore();
        }
      }
    },
  });
  // Start immediately even if mobile Chrome reports the tab as hidden during
  // initial page activation. RAF will throttle naturally while hidden, and the
  // lifecycle handlers below restart the scheduler when the page becomes visible.
  loop.start();
  // This first local save contains only the minimal world metadata.
  // Gameplay state persistence will be extended alongside the systems.
  // Never overwrite mission/combat writes performed during async world startup
  // with an earlier snapshot of the same save.
  const latestSave=readSave();
  localSaves.save(currentUser.uid,{
    ...latestSave,seed:state.seed,regionId:world.region.id,
    profile:latestSave.profile??{level:1,gold:10},
  });
}

function showLogin(error = '') {
  stopWorld();
  renderLogin(root, {
    error,
    onLocal: enterLocalMode,
    onLogin: async () => {
      if (!authService) return;
      renderLogin(root, { busy: true, onLogin: () => {}, onLocal: enterLocalMode });
      try { await authService.signIn(); }
      catch (e) {
        console.error('Falha no login Google', e);
        showLogin('Não foi possível entrar com Google. Tente novamente.');
      }
    },
  });
}

renderLoading(root);
if (localStorage.getItem(LOCAL_SESSION_KEY) === GUEST_UID) {
  enterLocalMode();
} else try {
  // Optional local Firebase config is intentionally not committed.
  const { initializeAuthentication } = await import('./auth/firebase.js');
  authService = initializeAuthentication();
  authService.subscribe(user => {
    if (guestMode) return;
    currentUser = user;
    if (user) startWorld();
    else showLogin();
  });
} catch (error) {
  console.error('Firebase não configurado ou indisponível', error);
  renderLogin(root, { onLocal: enterLocalMode, onLogin: () => renderConfigurationRequired(root, { onLocal: enterLocalMode }) });
}

function resumeWorldLoop() {
  if (!loop || !currentUser || document.hidden) return;
  // Mobile browsers can drop the first RAF during tab/page activation while
  // still leaving our loop marked as running. A clean scheduler restart avoids
  // the frozen-on-open state without rebuilding the world.
  loop.stop();
  loop.start();
}

document.addEventListener('visibilitychange', () => {
  if (!loop) return;
  if (document.hidden) { loop.stop(); oceanAmbience.pause(); }
  else { resumeWorldLoop(); beginOceanAmbience(); }
});
window.addEventListener('pageshow', resumeWorldLoop);
window.addEventListener('focus', resumeWorldLoop);
window.addEventListener('pagehide', () => {
  if (loop) loop.stop();
});
