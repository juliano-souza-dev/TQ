// World-space minimap: markers are data-driven and independent of region identity.
export function createMinimap(world, { getPlayer, getNpcs = () => [], getTreasures = () => [], hasTreasureSense = () => false }) {
  const root = document.createElement('section');
  root.className = 'minimap';
  root.setAttribute('aria-label', 'Minimapa');
  const canvas = document.createElement('canvas');
  canvas.width = 240; canvas.height = 240;
  canvas.setAttribute('aria-label', 'Posição do navio, ilhas e inimigos');
  root.append(canvas);
  const ctx = canvas.getContext('2d');
  const point = (x, y) => ({
    x: 28 + 184 * Math.max(0, Math.min(1, x / world.region.width)),
    y: 28 + 184 * Math.max(0, Math.min(1, y / world.region.height)),
  });
  const dot = (x, y, color, radius, outline = '#071829') => {
    const p = point(x, y);
    ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = outline; ctx.stroke();
  };
  function render() {
    ctx.clearRect(0, 0, 240, 240);
    ctx.fillStyle = 'rgba(4,35,51,.83)';
    ctx.beginPath(); ctx.arc(120,120,94,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#b58a4d'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(120,120,94,0,Math.PI*2); ctx.stroke();
    const corruption=world.region.ocean?.corruption;
    if(corruption?.active && Array.isArray(corruption.zones)){
      ctx.save();
      ctx.beginPath();ctx.arc(120,120,92,0,Math.PI*2);ctx.clip();
      for(const zone of corruption.zones){
        if(!zone?.intensity)continue;
        const p=point(zone.x,zone.y);
        const rx=184*Math.max(0,zone.radius)/Math.max(1,world.region.width);
        const ry=184*Math.max(0,zone.radius)/Math.max(1,world.region.height);
        const radius=Math.max(5,Math.max(rx,ry));
        const gradient=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);
        const alpha=Math.max(.05,Math.min(.32,Number(zone.intensity)*.26));
        gradient.addColorStop(0,'rgba(42,190,92,'+alpha+')');
        gradient.addColorStop(.55,'rgba(20,116,69,'+(alpha*.7)+')');
        gradient.addColorStop(1,'rgba(8,72,54,0)');
        ctx.fillStyle=gradient;
        ctx.beginPath();ctx.ellipse(p.x,p.y,Math.max(5,rx),Math.max(5,ry),0,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }
    for (const island of world.region.islands ?? []) {
      dot(island.x, island.y, island.kind === 'decoration' ? '#7b9988' : '#f0c66a', island.kind === 'decoration' ? 4 : 6);
    }
    for (const npc of getNpcs()) dot(npc.x, npc.y, '#ef665e', 4);
    // Treasure-map effect: unmistakable chest icons rather than generic green dots.
    if (hasTreasureSense()) for (const treasure of getTreasures()) {
      const p=point(treasure.x,treasure.y);
      ctx.save();ctx.translate(p.x,p.y);
      ctx.shadowColor='#ffc44c';ctx.shadowBlur=5;
      ctx.fillStyle='#5b3212';ctx.strokeStyle='#ffe18a';ctx.lineWidth=1.3;
      ctx.fillRect(-5,-2,10,8);ctx.strokeRect(-5,-2,10,8);
      ctx.beginPath();ctx.moveTo(-5,-2);ctx.quadraticCurveTo(0,-8,5,-2);ctx.closePath();
      ctx.fillStyle='#b76d20';ctx.fill();ctx.stroke();
      ctx.fillStyle='#ffe56e';ctx.fillRect(-1.2,-3,2.4,8);
      ctx.restore();
    }
    const player = getPlayer();
    if (player) {
      const p = point(player.x, player.y);
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.rotate((player.heading ?? 0) * Math.PI / 180);
      ctx.beginPath(); ctx.moveTo(0,-9); ctx.lineTo(7,7); ctx.lineTo(0,4); ctx.lineTo(-7,7); ctx.closePath();
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#07263c'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
  }
  render();
  return { element: root, render };
}
