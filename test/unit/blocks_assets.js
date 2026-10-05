const test = require('tap').test;
const Scratch3AssetBlocks = require('../../src/blocks/scratch3_assets');

test('Assets blocks read and update assets exposed to the Assets tab', t => {
    const target = {
        id: 'sprite-1',
        sprite: {
            clones: [{id: 'sprite-1'}]
        }
    };
    let updatedAssets;
    let projectChanged = false;
    const runtime = {
        extensionStorage: {
            assets: [{
                id: 'text-1',
                scopeId: 'sprite-1',
                name: 'notes.txt',
                type: 'text',
                content: 'before'
            }, {
                id: 'other-asset',
                scopeId: 'sprite-2',
                name: 'other.txt',
                type: 'text',
                content: 'not visible'
            }]
        },
        emit (event, assets) {
            if (event === 'PROJECT_ASSETS_UPDATED') updatedAssets = assets;
        },
        emitProjectChanged () {
            projectChanged = true;
        },
        getTargetForStage: () => null,
        getSpriteTargetByName: () => null
    };
    const blocks = new Scratch3AssetBlocks(runtime);
    const util = {target};

    t.same(blocks.all({SPRITE: '_myself_'}, util), ['notes.txt']);
    t.equal(blocks.fileAsType({ASSET_MENU: 'notes.txt', TYPE: 'text'}, util), 'before');

    blocks.write({ASSET_MENU: 'notes.txt', TYPE: 'text', VALUE: 'after'}, util);

    t.equal(blocks.fileAsType({ASSET_MENU: 'notes.txt', TYPE: 'text'}, util), 'after');
    t.equal(updatedAssets[0].content, 'after');
    t.equal(runtime.extensionStorage.assets[1].content, 'not visible');
    t.equal(projectChanged, true);
    t.end();
});
