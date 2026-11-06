const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
require('sucrase/register');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, ...rest) {
  return resolve.call(this, request.startsWith('@/') ? path.join(__dirname, '..', request.slice(2)) : request, parent, ...rest);
};

const { useSceneStore } = require('../store/useSceneStore');
const { TRACK_END, resolveTrackTime } = require('../lib/tracks');
const s = useSceneStore.getState();
s.setDuration(8);
const id = useSceneStore.getState().activeTrackId;
s.patchTrack(id, { inFrame: 20, outFrame: 157, offset: 50, timeScale: 0.75, fade: 8 });
s.setActiveTemplate('coverflow-03');
let track = useSceneStore.getState().tracks[0];
assert.equal(track.inFrame, 0);
assert.equal(track.outFrame, TRACK_END);
assert.equal(track.offset, 0);
assert.equal(track.timeScale, 1);
assert.equal(track.fade, 0);
for (let frame = 0; frame < 240; frame++) {
  const time = resolveTrackTime(track, frame, 240);
  assert.equal(time.active, true);
  assert.equal(time.localFrame, frame);
  assert.equal(time.envelope, 1);
}
s.setDuration(12);
assert.equal(resolveTrackTime(track, 359, 360).active, true);
// Reselecting the current preset also repairs an already affected project.
s.patchTrack(id, { outFrame: 157 });
s.setActiveTemplate('coverflow-03');
assert.equal(useSceneStore.getState().tracks[0].outFrame, TRACK_END);
// Switching a template within a multi-layer composition preserves its edit.
s.addTrack('social-word-gather');
const second = useSceneStore.getState().activeTrackId;
const timing = { inFrame: 30, outFrame: 157, offset: 25, timeScale: 0.75, fade: 8 };
s.patchTrack(second, timing);
s.setActiveTemplate('coverflow-03');
track = useSceneStore.getState().tracks.find(t => t.id === second);
for (const [key, value] of Object.entries(timing)) assert.equal(track[key], value);
console.log('Template switching: standalone full-loop timing restored; composition trims preserved.');

// Image dimensions must survive every preset selection, including families
// that previously reset the shared crop to their reference aspect.
const { templateList } = require('../templates');
const { cardAspectFor } = require('../lib/crop');
for (const shape of ['800:1000', '1600:900', '1:1']) {
  const [w, h] = shape.split(':').map(Number);
  s.setCardShape(shape);
  for (const template of templateList) {
    s.setActiveTemplate(template.meta.id);
    const scene = useSceneStore.getState();
    assert.equal(scene.cardShape, shape, `${template.meta.id} reset image dimensions`);
    assert.equal(cardAspectFor(template.meta, scene.width, scene.height, scene.cardShape), w / h,
      `${template.meta.id} ignored image dimensions`);
  }
}
console.log(`Image dimensions: preserved and resolved across ${templateList.length} templates.`);
