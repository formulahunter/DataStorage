/** @file `DataStorage` class and types
 *  @author Hunter Gayden
 *  @since 3/3/2019
 */

/** The `DataStorage` class provides an abstract interface to an advanced data storage pattern designed to be both fast and robust
 *
 * @since 11/25/2018
 */
class DataStorage {
    /** @constructor
     *
     * @param {string} key - The key to be used for storing data in localStorage
     * @param {function[]} types - The class objects (constructor functions) of each data type to be managed by this `DataStorage` instance
     */
    constructor(key, types) {
        this.key = key;

        /** **JavaScript** `Map` storing containers for all data types
         *
         * @property {Map} _created
         *
         * @private
         */
        this._types = new Map();
        /** **JavaScript** `Map` storing containers for all data types
         *
         * @property {Map} _deleted
         *
         * @private
         */
        this._deleted = new Map();
        for(let cls of types) {
            this._types.set(cls, []);
            this._deleted.set(cls, []);
        }

        /** The greatest ID assigned to any data instance, for ensuring all data instances are assigned unique ID's during batch save processes
         *
         * @property {number} _maxID
         *
         * @private
         */
        this._maxID = 0;
    }


    /** #PUBLIC API
     *   init()
     *
     *   save()
     *   edit()
     *   delete()
     */


    /** ##SECTION - Data initialization
     *
     *  init()
     */

    /** Sync data automatically and return parsed JSON data objects
     *
     * @returns {object}
     */
    init() {}


    /** ##SECTION - Incremental data manipulation
     *
     */

    /** Save new data instance
     * @param {ModelClass} inst - The data instance to be saved
     *
     * @returns {Promise<SyncResult>}
     */
    save(inst) {}

    /** Edit existing data instance
     * @param {ModelClass} inst
     *
     * @returns {Promise<SyncResult>}
     */
    edit(inst) {}

    /** Delete data instance
     * @param {ModelClass} inst
     *
     * @returns {Promise<SyncResult>}
     */
    delete(inst) {}


    /** #PRIVATE API
     *  Local storage
     *   _read()
     *   _write()
     *
     *   _sync()
     *   _compareHash()
     *   _reconcile()
     *   _resolve()
     *
     *  _hash()
     *  _buffString()
     *
     *  _xhrGet()
     *  _xhrPost()
     *
     *  _encrypt()
     *  _decrypt()
     *
     *  _parse()
     *  _serialize
     *  get _dataString()
     *
     *   get _lastSync()
     *   set _lastSync()
     *
     *   get _dataString()
     *
     *   get _newID()
     */


    /** ##SECTION - Local storage interface
     *   _read()
     *   _write()
     */

    /** Read items from local storage
     *    Returns `null` if data in local storage is not truthy
     *    Otherwise returns result of decrypt()
     * @param {string} key
     *
     * @returns {(string|null)}
     *
     * @private
     */
    _read(key) {}

    /** Write items to local storage
     *
     * @param {string} key
     * @param {object} data
     *
     * @private
     */
    _write(key, data) {}


    /** ##SECTION - Sync local storage with remote data file
     *
     *   _sync()
     *   _compareHash()
     *   _reconcile()
     *   _resolve()
     */

    /** Initialize sync-reconcile procedure
     *    Compare hash digests from both sources
     *    Initiate reconciliation if digests don't match
     *
     *    On success, return a Promise resolving to an object summarizing the sync
     *    On failure throws an exception
     *
     * @param {string} local
     * @param {string} remote
     *
     * @returns {Promise<SyncResult>}
     *
     * @private
     */
    _sync(local, remote) {}

    /** Compare two hash values for equality
     *
     * @param {string[]} hashes - Remote and local hash digests to compare
     *
     * @returns {Promise<SyncResult>} - An object summarizing the result of the sync operation
     *
     * @private
     */
    _compareHash([remote, local]) {}

    /** Reconcile discrepancies
     *    Aggregate all data activity since last sync
     *    Send to server's reconciliation script
     *    Process result by updating local data file
     *    Pass any conflicts along to `_reconcile()`
     *
     * @param {object} result
     *
     * @returns {Promise<SyncResult>}
     *
     * @private
     */
    _reconcile(result) {}

    /** Resolve server's reconciliation response
     *
     * @param {object} response
     *
     * @returns {Promise<SyncResult>}
     *
     * @private
     */
    _resolve(response) {}


    /** ##SECTION - Compute cryptographic hash digests
     *
     *  _hash()
     *  _getString()
     */

    /** Initiate hash digest of string values
     *    String to be hashed may be provided
     *    If not, data in memory
     *    Hash algorithm may be specified; defaults to SHA-256
     *
     *    Adopted from MDN SubtleCrypto.digest() reference:
     *    https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#Example
     *
     * @param {string} [str=`_dataString`] - The string to be hashed
     * @param {string} [algo=SHA-256] - The hash algorithm to be used (see https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest)
     *
     * @returns {Promise<string>} Resolves to the string hash digest
     *
     * @private
     */
    async _hash(str = this._dataString, algo = 'SHA-256') {
        // console.debug(`Compute hash digest of ${typeof str === 'string' ? `string (length ${str.length})` : `${typeof str}`} using ${alg} algorithm\nvalue: ${str}`);

        //  SubtleCrypto.digest() returns a Promise, so this function needs only to return that promise
        let buf = new TextEncoder('utf-8').encode(str);

        try {
            let digest = await window.crypto.subtle.digest(algo, buf);
            return toHexString(digest);
        }
        catch(er) {
            throw new Error(`Error computing hash digest:\n${er}`);
        }
    }


    /** ##SECTION - Dispatch XHR GET and POST requests
     *
     *  _xhrGet()
     *  _xhrPost()
     */

    /** Dispatch XMLHttpRequests with the GET method
     *
     * @param {string} url - The URL of the request target file
     * @param {string[]} [headers=[]] - An array of request headers to be set on the XHR object before it is sent
     *
     * @returns {Promise<object>} Resolves to the value of the server response
     *
     * @private
     */
    _xhrGet(url, headers = []) {}

    /** Dispatch XMLHttpRequests with the POST method
     *
     * @param {string} data - The body of the request to be sent
     * @param {string} url - The URL of the request target file
     * @param {string[]} [headers=[]] - An array of key-value string pairs as request headers to be set on the XHR object before it is sent
     *
     * @returns {Promise<object>} Resolves to the value of the server response
     *
     * @private
     */
    _xhrPost(data, url, headers = []) {}


    /** ##SECTION - Encryption
     *
     *  _encrypt()
     *  _decrypt()
     */

    /** AES-GCM cipher object
     *
     * @typedef {object} AesGcmCipher
     *
     * @property {string} salt
     * @property {string} iv
     * @property {string} text
     */

    /** Encrypt a string with a given password
     *    `deriveKey()` call copied with minor adjustments from example on [MDN's `SubtleCrypto.deriveKey()` reference][deriveKey() ref]
     *    `encrypt()` call copied with minor adjustments from example on [MDN's `SubtleCrypto.encrypt()` reference][encrypt() ref]
     *    MDN's references didn't explain what the "salt" parameter is; that was found on [the linked **GitHub** example][github example]
     *
     * [deriveKey() ref]: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey
     *     "SubtleCrypto.deriveKey() - MDN - March 5, 2019"
     * [encrypt() ref]: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt
     *     "SubtleCrypto.encrypt() - MDN - March 5, 2019"
     * [github example]: https://github.com/mdn/dom-examples/blob/master/web-crypto/derive-key/pbkdf2.js
     *     "MDN/DOM examples/pbkdf2.js - GitHub - March 5, 2019"
     *
     * @param {string} plaintext - Data string to be encrypted
     * @param {string} [password='password'] - The password to be used as the cryptographic key
     *
     * @returns {PromiseLike<AesGcmCipher>} The encrypted cipher object
     */
    static async encrypt(plaintext, password = 'password') {
        let enc = new TextEncoder();

        let keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            enc.encode(password),
            {name: 'PBKDF2'},
            false,
            ['deriveBits', 'deriveKey']
        );

        let salt = window.crypto.getRandomValues(new Uint8Array(16));
        let key = await window.crypto.subtle.deriveKey(
            {
                'name': 'PBKDF2',
                salt: salt,
                'iterations': 100000,
                'hash': 'SHA-256'
            },
            keyMaterial,
            { 'name': 'AES-GCM', 'length': 256},
            true,
            [ 'encrypt', 'decrypt' ]
        );

        let iv = window.crypto.getRandomValues(new Uint8Array(12));
        let cipher = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            enc.encode(plaintext)
        );

        //  Print `cipher` to console/output for debugging
        console.debug(cipher);

        //  Return cipher text and parameters
        return DataStorage.serialize({
            salt: toHexString(salt),
            iv: toHexString(iv),
            text: toHexString(cipher)
        });
    }

    /** Decrypt a cipher with a given password
     *    Presently just an alias for `sjcl.decrypt()`
     *
     * @param {(AesGcmCipher|string<AesGcmCipher>)} cipher - Cipher object to be decrypted
     * @param {string} [password='password'] - The password to be used as the cryptographic key
     *
     * @returns {PromiseLike<string>} The decrypted text
     */
    static async decrypt(cipher, password = 'password') {
        //  Parsed `cipher` into an `object` if it is not already
        if(typeof cipher === 'string')
            cipher = DataStorage.parse(cipher);

        if(!cipher.salt && cipher.iv && cipher.text)
            throw new TypeError(`Cannot decrypt ${cipher}: missing 'salt', 'iv', and/or 'text' property`);

        let enc = new TextEncoder();
        let keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            enc.encode(password),
            {name: 'PBKDF2'},
            false,
            ['deriveBits', 'deriveKey']
        );

        let key = await window.crypto.subtle.deriveKey(
            {
                'name': 'PBKDF2',
                salt: fromHexString(cipher.salt),
                'iterations': 100000,
                'hash': 'SHA-256'
            },
            keyMaterial,
            { 'name': 'AES-GCM', 'length': 256},
            true,
            [ 'encrypt', 'decrypt' ]
        );

        let buff = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: fromHexString(cipher.iv)
            },
            key,
            fromHexString(cipher.text)
        );

        let dec = new TextDecoder();
        return dec.decode(buff);
    }


    /** ##SECTION - JSON conversions
     *
     *  _parse()
     *  _serialize
     *  get _dataString()
     */

    /** Parse a JSON string into an Javascript Object
     *    Presently just an alias for `JSON.parse()`
     *
     * @param {string} jstr - The string to be parsed
     * @param {function} [reviver] - A function that parses given JSON text in a specific way
     *
     * @returns {*}
     *
     * @throws DSErrorParseJSON
     */
    static parse(jstr, reviver) {
            try {
                return JSON.parse(jstr);
            }
            catch(er) {
                throw new Error(`JSON parse() error:\n${er}`);
            }
        }

    /** Serialize a JavaScrip Object into a string
     *    Presently just an alias for `JSON.parse()`
     *
     * @param {string} val - The string to be parsed
     * @param {function} [replacer] - A function that replaces property values with alternate data for parsing
     *
     * @returns {string}
     *
     * @throws DSErrorSerializeJSON
     */
    static serialize(val, replacer) {
        try {
            return JSON.stringify(val);
        }
        catch(er) {
            throw new Error(`JSON stringify() error:\n${er}`);
        }
    }

    /** Serializing all data instances in a consistent format
     *
     * @returns {string} JSON string of all data instances stored in `.types` object
     *
     * @throws DSErrorCompileDataString
     *
     * @private
     * @readonly
     */
    get _dataString() {
        //  Define a container object to be serialized
        let jobj = {};

        //  Define each type container on `jobj` with its class name as a key
        try {
            for(let [type, container] of this._types.entries()) {
                jobj[type.name] = container;
            }

            //  Return the serialized container object
            return DataStorage.serialize(jobj);
        }
        catch(er) {
            if(!er instanceof DSError)
                er = new DSErrorCompileDataString(`Error compiling data string:\n${er}`);

            throw er;
        }
    }


    /** ##SECTION - Maintain last-sync parameter
     *
     *  get _lastSync()
     *  set _lastSync()
     */

    /** Get timestamp of the most recent successful sync
     *
     * @returns {number} The timestamp of the most recent successful sync
     *
     * @private
     */
    get _lastSync() {}
    /** Set timestamp of the most recent successful sync
     *
     * @param {number} sync
     *
     * @returns {undefined}
     *
     * @private
     */
    set _lastSync(sync) {}


    /** ##SECTION - ID assignment
     *
     *  get _newID()
     */

    /** Ensure that no two data instances are assigned the same id during batch saves
     *
     * @returns {number} The smallest integer greater than or equal to the current timestamp which has not already been assigned as an ID to another data instance
     *
     * @private
     * @readonly
     */
    get _newID() {}
}

/** Convert a string of hexadecimal characters to a `Uint8Array`
 *   Adapted from [StackOverflow answer][hex string conversion]
 *
 * [hex string conversion]: https://stackoverflow.com/questions/38987784/how-to-convert-a-hexadecimal-string-to-uint8array-and-back-in-javascript
 *     "How to convert a hexadecimal string to Uint8Array and back in JavaScript? - Stack Overflow - March 5, 2019"
 *
 * @param {string} hexString - string of characters 0-9 and a-f
 *
 * @returns {Uint8Array}
 */
function fromHexString(hexString) {
    try {
        return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    }
    catch(er) {
        throw new DSErrorConvertFromHexString(`input: ${hexString}\nerror: ${er}`);
    }
}

/** Convert an array of 8-bit integers to a string of hexadecimal characters
 *   Adapted from [StackOverflow answer][hex string conversion]
 *
 * [hex string conversion]: https://stackoverflow.com/questions/38987784/how-to-convert-a-hexadecimal-string-to-uint8array-and-back-in-javascript
 *     "How to convert a hexadecimal string to Uint8Array and back in JavaScript? - Stack Overflow - March 5, 2019"
 *
 * @param {(BufferSource|number[])} bytes
 *
 * @returns {string}
 */
function toHexString(bytes) {
    try {
        if(bytes instanceof ArrayBuffer)
            bytes = new Uint8Array(bytes);

        return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
    }
    catch(er) {
        throw new DSErrorConvertToHexString(`input: ${bytes}\nerror: ${er}`);
    }
}

/** Abstract class overrides built-in `toString()`
 *
 */
class DSError extends Error {
    constructor(type, ...args) {
        super(type, ...args);
        console.trace();
    }

    toString() {
        return `${this.constructor.name}: ${this.message}`;
    }
}

/** Error thrown when `fromHextString()` fails
 *
 */
class DSErrorConvertFromHexString extends DSError {
    constructor(...args) {
        super(...args);
    }
}
/** Error thrown when `toHextString()` fails
 *
 */
class DSErrorConvertToHexString extends DSError {
    constructor(...args) {
        super(...args);
    }
}

/** Error thrown when `JSON` fails to serialize an object
 *
 */
class DSErrorSerializeJSON extends DSError {
    constructor(...args) {
        super(...args);
    }
}
/** Error thrown when `JSON` fails to parse a string
 *
 */
class DSErrorParseJSON extends DSError {
    constructor(...args) {
        super(...args);
    }
}
/** Error thrown when `DataStorage` fails to compile a data string
 *
 */
class DSErrorCompileDataString extends DSError {
    constructor(...args) {
        super(...args);
    }
}

/** Sync result summary type
 *
 * @typedef {object} SyncResult
 * @property {(string|undefined)} [hash] - If sync is successful, the hash of the synchronized data files
 * @property {(number|undefined)} [sync] - If sync is successful, the timestamp at which the sync is recorded
 * @property {(ReconcileResult|undefined)} [resolve] - If a discrepancy was resolved, the resolved data instances
 */
/** Reconcile result summary type
 *
 * @typedef {object} ReconcileResult - An object containing data returned by the server's reconciliation script
 * @property {string} ReconcileResult.hash - Hash digest of the server's data file computed after running its reconciliation algorithm
 * @property {ReconcileResult.<string, object>} typeContainer - A container object with data instances of the given type, organized by rank
 * @property {typeContainer.<string, object>} rankContainer - A container object with data instances of the given type and rank, indexed by ID
 * @property {rankContainer.<string, ModelClass>} dataInstance - A data instance of the given type & rank, stored using its ID as a key
 */

/** Data class
 *
 * @external ModelClass
 *
 * @property {number|undefined} _created - The timestamp at which the data instance was saved
 * @private
 *
 * @property {number|undefined} _modified - The timestamp at which the data instance was most recently modified
 * @private
 */
/** Return a new ModelClass instance from a JSON string/raw JSON object
 * @method external:ModelClass.fromJSON
 * @returns {ModelClass}
 */
/** Public getter method of _created property
 * @method external:ModelClass#id
 * @returns {(number|undefined)}
 */
/** Return the JSON text representation of the data instance
 * @method external:ModelClass#toJSON
 * @returns {string}
 */
/** Return a readable string representation of the data instance, e.g. for console output
 * @method external:ModelClass#toString
 *@returns {string}
 */
/** Deleted data instance
 *
 * @typedef DeletedDataInstance
 *
 * @property {number} _created - The timestamp at which the data instance was saved
 * @private
 *
 * @property {number} _deleted - The timestamp at which the data instance was deleted
 * @private
 */


/** Data activity rank
 * 'new', 'modified', 'deleted', or 'conflict'
 *
 * @typedef {string} DataActivityRank
 *
 * @enum {string}
 */

/** Data instance container indexed by type-rank-id
 *
 * @typedef {object} IndexObjectTypeRankId
 *
 * @property {object} [type] - A container object with data instances of the given type, organized by rank
 * @property {object} [type.rank] - Containers for each individual data rank
 * @property {ModelClass} [rank.id] - A data instance of the given type & rank, stored using its ID as a key
 */

/** Data instance container & constructor reference
 *
 * @typedef {Map} TypeContainer
 *
 * @property {function} constructor - Constructor function/class object for the given type
 * @property {object[]} instances - Array of all instances of a given type
 */
/** Record of a deleted data instance
 *
 * @typedef {object} DeletedRecord
 *
 * @property {number} _created - ID/_created values of the deleted instance
 * @property {number} _deleted - Timestamp at which the instance was deleted
 */
/** Deleted instance record container
 *
 * @typedef {object} DeletedContainer
 *
 * @property {DeletedRecord[]} DeletedContainer.records - Array of object containing records of each deleted instance
 */