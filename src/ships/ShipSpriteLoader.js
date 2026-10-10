import { getShipSpriteUrl } from './ShipRegistry.js';

const cache = new Map();
export function loadShipSprite(ship) {
  if (cache.has(ship.id)) return cache.get(ship.id);
  const task = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (!ship.sprite.chromaKey) { resolve(image); return; }
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = pixels.data, key = ship.sprite.chromaKey;
      for (let i = 0; i < data.length; i += 4) {
        const distance = Math.max(Math.abs(data[i] - key[0]), Math.abs(data[i + 1] - key[1]), Math.abs(data[i + 2] - key[2]));
        const alpha = Math.max(0, Math.min(255, (distance - 12) * 255 / 30));
        data[i + 3] = Math.min(data[i + 3], alpha);
      }
      ctx.putImageData(pixels, 0, 0);
      resolve(canvas);
    };
    image.onerror = () => {
      const fallback=ship.sprite?.fallbackPath;
      if(fallback && image.dataset.fallback!=='1'){
        image.dataset.fallback='1';
        const url=new URL(fallback,import.meta.url);
        if(globalThis.__TQ_ASSET_VERSION__)url.searchParams.set('v',globalThis.__TQ_ASSET_VERSION__);
        image.src=url.href;
        return;
      }
      reject(new Error('Falha ao carregar navio: ' + ship.id));
    };
    image.src = getShipSpriteUrl(ship);
  });
  cache.set(ship.id, task);
  return task;
}
