/**
 * This object represents a tileset used by a TiledMap.
 * There can be multiple Tilesets in a map
 *
 * @class TiledTileset
 * @extends gf.Texture
 * @namespace gf
 * @constructor
 * @param settings {Object} All the settings for the tileset
 */
//TODO: Support external tilesets (TSX files) via the "source" attribute
//see: https://github.com/bjorn/tiled/wiki/TMX-Map-Format#tileset
gf.TiledTileset = function(settings) {
    if(!gf.assetCache[settings.name + '_texture']) {
        throw 'You must preload the tileset images! Try loading the world file with the AssetLoader';
    }

    //initialize the base Texture class
    gf.Texture.call(this, gf.assetCache[settings.name + '_texture'].baseTexture);

    //Tiled Editor properties

    /**
     * The first tileId in the tileset
     *
     * @property firstgid
     * @type Number
     */
    this.firstgid = settings.firstgid;

    /**
     * The name of the tileset
     *
     * @property name
     * @type String
     */
    this.name = settings.name;

    /**
     * The size of a tile in the tileset
     *
     * @property tileSize
     * @type Vector
     */
    this.tileSize = new gf.Vector(settings.tilewidth, settings.tileheight);

    /**
     * The spacing around a tile in the tileset
     *
     * @property spacing
     * @type Number
     */
    this.spacing = settings.spacing || 0;

    /**
     * The margin around a tile in the tileset
     *
     * @property margin
     * @type Number
     */
    this.margin = settings.margin || 0;

    /**
     * The offset of tile positions when rendered
     *
     * @property tileoffset
     * @type Number
     */
    this.tileoffset = new gf.Vector(
        settings.tileoffset ? settings.tileoffset.x : 0,
        settings.tileoffset ? settings.tileoffset.y : 0
    );

    //TODO: Support for "tileoffset," "terraintypes," "image"
    //see: https://github.com/bjorn/tiled/wiki/TMX-Map-Format#tileset

    //Custom/Optional properties

    /**
     * The number of tiles calculated based on size, margin, and spacing
     *
     * @property numTiles
     * @type Vector
     */
    this.numTiles = new gf.Vector(
        ~~((this.baseTexture.source.width - this.margin) / (this.tileSize.x - this.spacing)), //75 / 
        ~~((this.baseTexture.source.height - this.margin) / (this.tileSize.y - this.spacing))
    );

    /**
     * The last tileId in the tileset
     *
     * @property lastgid
     * @type Number
     */
    this.lastgid = this.firstgid + (((this.numTiles.x * this.numTiles.y) - 1) || 0);

    /**
     * The properties of the tileset
     *
     * @property properties
     * @type Object
     */
    this.properties = settings.properties || {};

    /**
     * The properties of the tiles in the tileset (like collision stuff)
     *
     * @property tileproperties
     * @type Object
     */
    this.tileproperties = settings.tileproperties || {};

    /**
     * The size of the tileset
     *
     * @property size
     * @type Vector
     */
    this.size = new gf.Vector(settings.imagewidth, settings.imageheight);

    /**
     * The texture instances for each tile in the set
     *
     * @property textures
     * @type Array
     */
    this.textures = [];

    //massages strings into the values they should be
    //i.e. "true" becomes the value: true
    this.properties = gf.utils.parseTiledProperties(this.properties);

    //massage tile properties
    for(var k in this.tileproperties) {
        this.tileproperties[k] = gf.utils.parseTiledProperties(this.tileproperties[k]);
    }

    //generate tile textures
    for(var t = 0, tl = this.lastgid - this.firstgid + 1; t < tl; ++t) {
        //convert the tileId to x,y coords of the tile in the Texture
        var y = ~~(t / this.numTiles.x),
            x = (t - (y * this.numTiles.x));

        //get location in pixels
        x = (x * this.tileSize.x) + (x * this.spacing) + this.margin;
        y = (y * this.tileSize.y) + (y * this.spacing) + this.margin;

        this.textures.push(
            new gf.Texture(
                this.baseTexture,
                new PIXI.Rectangle(x, y, this.tileSize.x, this.tileSize.y)
            )
        );
    }
};

gf.inherits(gf.TiledTileset, gf.Texture, {
    /**
     * Gets the tile properties for a tile based on it's ID
     *
     * @method getTileProperties
     * @param tileId {Number} The id of the tile to get the properties for
     * @return {Object} The properties of the tile
     */
    getTileProperties: function(tileId) {
        if(tileId === undefined) return null;

        var flags = gf.TiledTileset.FLAGS,
            flippedX = tileId & flags.FlippedX,
            flippedY = tileId & flags.FlippedY,
            rotatedCW = tileId & flags.RotatedCW;

        //remove flags
        tileId &= ~(flags.FlippedX | flags.FlippedY | flags.RotatedCW);

        tileId = tileId - this.firstgid;

        //if less than 0, then this id isn't in this tileset
        if(tileId < 0) return null;

        var props = this.tileproperties[tileId] ?
                //get this value
                this.tileproperties[tileId] :
                //set this id to default values and cache
                this.tileproperties[tileId] = {
                    collidable: false,
                    breakable: false,
                    type: gf.Tile.TYPE.NONE
                };

        props.flippedX = flippedX;
        props.flippedY = flippedY;
        props.rotatedCW = rotatedCW;

        return props;
    },
    /**
     * Gets the tile texture for a tile based on it's ID
     *
     * @method getTileTexture
     * @param tileId {Number} The id of the tile to get the texture for
     * @return {Texture} The texture for the tile
     */
    getTileTexture: function(tileId) {
        if(tileId === undefined) return null;

        var flags = gf.TiledTileset.FLAGS;

        //remove flags
        tileId &= ~(flags.FlippedX | flags.FlippedY | flags.RotatedCW);

        //get the internal ID of the tile in this set (0 indexed)
        tileId = tileId - this.firstgid;

        //if less than 0, then this id isn't in this tileset
        if(tileId < 0) return null;

        return this.textures[tileId];
    },
    contains: function(tileId) {
        if(tileId === undefined) return false;

        var flags = gf.TiledTileset.FLAGS;

        //remove flags
        tileId &= ~(flags.FlippedX | flags.FlippedY | flags.RotatedCW);

        return (tileId >= this.firstgid && tileId <= this.lastgid);
    }
});

//Tileset GID flags
gf.TiledTileset.FLAGS = {
    FlippedX: 0x80000000,
    FlippedY: 0x40000000,
    RotatedCW: 0x20000000
};