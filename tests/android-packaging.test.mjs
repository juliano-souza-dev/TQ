import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = relative => readFileSync(new URL('../' + relative, import.meta.url), 'utf8');

test('Android launcher remains landscape and GPU accelerated', () => {
  const manifest = source('android/app/src/main/AndroidManifest.xml');
  assert.match(manifest, /android:screenOrientation="sensorLandscape"/);
  assert.match(manifest, /android:hardwareAccelerated="true"/);
  assert.match(manifest, /android:exported="true"/);
});

test('GameActivity hides Android system bars and loads the game inside the APK', () => {
  const native = source('android/app/src/main/java/br/com/tabuadaquest/game/GameActivity.java');
  assert.match(native, /WindowInsets\.Type\.statusBars\(\)\s*\|\s*WindowInsets\.Type\.navigationBars\(\)/);
  assert.match(native, /SYSTEM_UI_FLAG_IMMERSIVE_STICKY/);
  assert.match(native, /WebViewAssetLoader/);
  assert.match(native, /https:\/\/.*APP_HOST/);
  assert.match(native, /WebSettings\.LOAD_NO_CACHE/);
  assert.match(native, /setDomStorageEnabled\(true\)/);
  assert.match(native, /setAllowFileAccess\(false\)/);
  assert.match(native, /"text\/javascript"/);
});

test('Gradle bundles all game JavaScript, styles and sprites rather than a remote URL', () => {
  const gradle = source('android/app/build.gradle');
  for (const location of ['index.html', 'src/**', 'assets/**']) {
    assert.ok(gradle.includes(location), 'Bundle must contain ' + location);
  }
  assert.match(gradle, /stageGameAssets/);
  assert.match(gradle, /merge.*Assets/);
});

test('Android application loads the offline guest profile without pop-up OAuth', () => {
  const main = source('src/main.js');
  assert.match(main, /window\.location\.hostname\s*===\s*'appassets\.androidplatform\.net'/);
  assert.match(main, /bundledAndroidApp\s*\|\|\s*localStorage/);
  const gradle = source('android/app/build.gradle');
  assert.match(gradle, /exclude 'src\/config\/firebase-config\.js'/);
});

test('CI produces a downloadable installable debug APK', () => {
  const workflow = source('.github/workflows/android-apk.yml');
  assert.match(workflow, /:app:assembleDebug/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /TabuadaQuest-Android-APK/);
});
