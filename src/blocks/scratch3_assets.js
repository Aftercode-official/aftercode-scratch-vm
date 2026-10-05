const Cast = require('../util/cast');

class Scratch3AssetBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            assets_menu: this.assetsMenu,
            assets_file_as_type: this.fileAsType,
            assets_all: this.all,
            assets_metadata: this.metadata,
            assets_set: this.set,
            assets_write: this.write
        };
    }

    assetsMenu (args) {
        return args.ASSET_MENU;
    }

    all (args, util) {
        const target = this._getTarget(args.SPRITE, util);
        if (!target) return [];

        return this._getAssetsForTarget(target).map(asset => asset.name);
    }

    fileAsType (args, util) {
        const asset = this._getAsset(args.ASSET_MENU, util);
        if (!asset) return '';

        if (args.TYPE === 'data: uri') {
            if (/^data:/i.test(asset.content)) return asset.content;
            return `data:text/plain;charset=utf-8,${encodeURIComponent(asset.content)}`;
        }
        if (args.TYPE === 'text' && asset.type === 'text') {
            return asset.content;
        }
        return '';
    }

    metadata (args, util) {
        const asset = this._getAsset(args.ASSET_MENU, util);
        if (!asset) return '';

        switch (args.TYPE) {
        case 'name': return asset.name;
        case 'extension': return this._getExtension(asset.name);
        case 'content type': return asset.contentType || (asset.type === 'image' ? 'image/png' : 'text/plain');
        case 'last modified': return new Date(asset.lastModified || 0).toLocaleDateString();
        case 'md5': return asset.id;
        default: return '';
        }
    }

    set (args, util) {
        const asset = this._getAsset(args.ASSET_MENU, util);
        if (!asset) return;

        const value = Cast.toString(args.VALUE).trim();
        let updatedAsset;
        switch (args.TYPE) {
        case 'name': {
            const extension = this._getExtension(asset.name);
            const name = extension && !this._getExtension(value) ? `${value}.${extension}` : value;
            updatedAsset = Object.assign({}, asset, {name});
            break;
        }
        case 'extension': {
            const extension = value.replace(/^\./, '') || 'file';
            const nameWithoutExtension = asset.name.replace(/\.[^.]*$/, '');
            updatedAsset = Object.assign({}, asset, {name: `${nameWithoutExtension}.${extension}`});
            break;
        }
        case 'content type':
            updatedAsset = Object.assign({}, asset, {contentType: value});
            break;
        default:
            return;
        }
        this._updateAsset(asset.id, updatedAsset);
    }

    write (args, util) {
        const asset = this._getAsset(args.ASSET_MENU, util);
        if (!asset) return;

        const value = Cast.toString(args.VALUE);
        let changes;
        if (args.TYPE === 'data: uri') {
            if (!/^data:[^,]*,/i.test(value)) {
                throw new Error('Asset content must be a valid data URI.');
            }
            changes = {
                content: value,
                type: /^data:image\//i.test(value) ? 'image' : 'text'
            };
        } else {
            changes = {
                content: value,
                type: 'text'
            };
        }
        this._updateAsset(asset.id, Object.assign({}, asset, changes));
    }

    _getTarget (spriteName, util) {
        const name = Cast.toString(spriteName);
        if (!name || name === '_myself_') return util.target;
        if (name === 'Stage') return this.runtime.getTargetForStage();
        return this.runtime.getSpriteTargetByName(name);
    }

    _getTargetId (target) {
        const originalClone = target.sprite && target.sprite.clones && target.sprite.clones[0];
        return originalClone ? originalClone.id : target.id;
    }

    _getAssetsForTarget (target) {
        const assets = this.runtime.extensionStorage.assets || [];
        const targetId = this._getTargetId(target);
        return assets.filter(asset => !asset.scopeId || asset.scopeId === targetId);
    }

    _getAsset (assetName, util) {
        const name = Cast.toString(assetName);
        const assets = this._getAssetsForTarget(util.target);
        return assets.find(asset => asset.name === name || asset.id === name) || null;
    }

    _getExtension (name) {
        const extensionMatch = /\.([^.]+)$/.exec(name);
        return extensionMatch ? extensionMatch[1] : '';
    }

    _updateAsset (id, updatedAsset) {
        const assets = this.runtime.extensionStorage.assets || [];
        const updatedAssets = assets.map(asset => (
            asset.id === id ? Object.assign({}, updatedAsset, {lastModified: Date.now()}) : asset
        ));
        this.runtime.extensionStorage.assets = updatedAssets;
        this.runtime.emit('PROJECT_ASSETS_UPDATED', updatedAssets);
        this.runtime.emitProjectChanged();
    }
}

module.exports = Scratch3AssetBlocks;
