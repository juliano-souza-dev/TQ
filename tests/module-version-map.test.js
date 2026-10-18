import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
function findModules(directory,relative='src'){
  const found=[];
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const relativePath=relative+'/'+entry.name;
    if(entry.isDirectory())found.push(...findModules(path.join(directory,entry.name),relativePath));
    else if(entry.isFile()&&/\.(?:js|mjs)$/.test(entry.name))found.push(relativePath);
  }
  return found;
}
test('every JavaScript module is covered by the versioned browser import map',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const declaration=html.match(/const modulePaths\s*=\s*(\[[^;]+\]);/);
  assert.ok(declaration,'A lista modulePaths deve existir no index.html');
  const paths=JSON.parse(declaration[1]);
  assert.equal(paths.length,new Set(paths).size,'Não duplicar caminhos de módulos');
  const covered=new Set(paths);
  const missing=findModules(path.join(root,'src')).filter(file=>!covered.has(file));
  assert.deepEqual(missing,[],'Módulos sem versionamento podem causar erro de exportação por cache desatualizado');
  assert.ok(covered.has('src/ships/FleetAutoEquipment.js'));
  assert.ok(covered.has('src/missions/FleetCampaign.js'));
  assert.ok(covered.has('src/npcs/FleetPopulation.js'));
  assert.ok(covered.has('src/world/regions/FutureFleetRegions.js'));
});
