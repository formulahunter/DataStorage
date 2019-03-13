/** @file `DataStorage` class and types
 *  @author Hunter Gayden
 *  @since March 3, 2019
 */

/** The `DataStorage` class provides an abstract interface to an advanced data storage pattern designed to be both fast and robust
 *
 * @since November 25, 2019
 */
class DataStorage {
    /**
     * @param {string} key - The key to be used for storing data in localStorage
     * @param {DSDataRecordClass[]} types - The class objects (constructor functions) of each data type to be managed by this `DataStorage` instance
     */
    constructor(key, types) {
        if(!(key instanceof String || typeof key === 'string'))
            throw new TypeError(`DataStorage constructor expects a string 'key' argument but received ${key}`);

        if(!Array.isArray(types))
            throw new TypeError(`DataStorage constructor expects an array 'types' argument but received ${types}`);

        /** Key on which all local data is stored
         *    Data in local storage may be grouped by appending suffixes to this key
         *    Once deployed to production, extensive preparation will be required if this key is to be changed
         *
         * @property {string} key
         */
        this.key = key;

        /** **JavaScript** `Map` storing containers for all data types
         *
         * @property {DSDataRecordContainer} _created
         *
         * @private
         */
        this._types = new Map();
        /** **JavaScript** `Map` storing containers for all data types
         *
         * @property {DSDataDeletedRecordContainer} _deleted
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


    /** ##SECTION - Maintain last-sync parameter
     *
     *  private get _lastSync()
     *  private set _lastSync()
     */

    /** Get timestamp of the most recent successful sync
     *    Returns 0 if `{this.key}-sync` does not exist in local storage
     *
     * @returns {number} The timestamp of the most recent successful sync, or 0 if parameter not found in local storage
     *
     * @private
     */
    get _lastSync() {
        try {
            let sync = localStorage.getItem(`${this.key}-sync`);
            if(sync === null)
                return 0;

            return Number(sync);
        }
        catch(er) {
            throw new DSErrorGetLastSync(`Error reading \`${this.key}-sync\` from local storage`, er);
        }
    }
    /** Set timestamp of the most recent successful sync
     *
     * @param {number} sync - the timestamp at which the successful sync ccurred
     *
     * @private
     */
    set _lastSync(sync) {
        try {
            if(sync === true || sync === false || sync === undefined || sync === null)
                throw new TypeError('.lastSync cannot be `true`, `false`, `undefined`, or `null`');
            if(Array.isArray(sync))
                throw new TypeError('.lastSync cannot be an array');
            if(Number.isNaN(Number(sync)) || !Number.isInteger(Number(sync)))
                throw new TypeError('.lastSync must be an integer, or a string that can be parsed to an integer');

            localStorage.setItem(`${this.key}-sync`, sync.toString());
        }
        catch(er) {
            throw new DSErrorSetLastSync(`Error writing last-sync parameter ${sync} to local storage key \`${this.key}-sync\``, er);
        }
    }


    /** ##SECTION - ID assignment
     *
     *  private get _newID()
     */

    /** Ensure that no two data instances are assigned the same id during batch saves
     *
     * @returns {number} The smallest integer greater than or equal to the current timestamp which has not already been assigned as an ID to another data instance
     *
     * @private
     * @readonly
     */
    get _newID() {
        let id = Date.now();
        if(id <= this._maxID)
            id = this._maxID + 1;

        return id;
    }


    /** ##SECTION - Data initialization
     *
     *  init()
     */

    /** Sync data automatically and return parsed JSON data objects
     *    TEMPORARY IMPLEMENTATION FOR DEVELOPMENT/DEMONSTRATION PURPOSES
     *
     * @returns {object}
     */
    async init() {
        let sync = await this._sync();

    }


    /** ##SECTION - Incremental data manipulation
     *
     */

    /** Save new data instance
     * @param {DSDataRecord} inst - The data instance to be saved
     *
     * @returns {Promise<DSSyncResult>}
     */
    save(inst) {}

    /** Edit existing data instance
     * @param {DSDataRecord} inst
     *
     * @returns {Promise<DSSyncResult>}
     */
    edit(inst) {}

    /** Delete data instance
     * @param {DSDataRecord} inst
     *
     * @returns {Promise<DSSyncResult>}
     */
    delete(inst) {}


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
     * @param {string} [local]
     * @param {string} [remote]
     *
     * @returns {Promise<DSSyncResult>}
     *
     * @private
     */
    async _sync(local, remote) {
        /*  Failure modes
         *  -------------
         *
         *  1. `lastSync` not updated despite matching records in both repositories
         *      1. Data instance(s) not recorded or recorded in duplicate in either repository
         *  2. Data instances recorded with different/invalid data types in one or both repositories
         *
         */

        //  Initiate asynchronous server hash request in `remote`
        let remote = DataStorage.xhrGet('hash.php');

        //  Synchronously read and parse local data
        let jdat = DataStorage.parse(await DataStorage.read(this.key));

        //  Iterate over the type container arrays in `jdat`
        let classObj, inst;
        for(let type in jdat) {
            if(!jdat.hasOwnProperty(type))
                continue;

            //  Designate the associated class object for each type
            classObj = window[type];

            //  Iterate through elements in each type container array
            for(let jobj of jdat[type]) {
                //  Construct a new instance of `classObj` and assign its `_created` property
                inst = new classObj();
                inst._created = jobj._created;

                //  `push` the new instance to the respective container array in `data._types` using the class object as an index/lookup
                this._types.get(classObj).push(jobj);

                //  Compare the instance's `_created` property to `data._maxID` and assign the new value if greater than the current one
                if(jobj._created > this._maxID)
                    this._maxID = jobj._created;
            }
        }

        //  Initiate asynchronous hash digest of local data
        let local = this._hash();

        //  `await` both asynchronous requests and pass the resolved values to `_compareHash()`
        [local, remote] = await Promise.all([local, remote]);
        let result = this._compareHash(local, remote);

        //  If the initial comparison fails, initiate the reconciliation procedure
        //  **For now just fail the sync**
        if(!result) {
            // let reconcile = await this._reconcile();
            // let result = this._compareHash(local, reconcile);

            throw new DSErrorSync(`Failed to synchronize local and remote data files`, {local, remote});
        }

        //  At this point, either sync, the reconciliation, or resolution must have succeeded
        let now = new Date;
        let time = now.getTime();
        this._lastSync = time;
        console.info('Local and remote data synchronized');
        console.debug(`Successful sync on ${now.toLocaleString()}\nTimestamp: ${time}`);

        //  Define the `sync` property on `result` and resolve the `sync()`
        result.sync = time;
        return {hash: remote, sync: time};
    }

    /** Compare two hash values for equality
     *
     * @param {string} local - Local hash digest
     * @param {string} remote - remote hash digest
     *
     * @returns {DSHashComparison} - An object summarizing the result of the sync operation
     *
     * @private
     */
    _compareHash(local, remote) {
        console.log(local, remote);

        if(local === remote)
            return {hash: remote, sync: Date.now()};

        return {};
    }

    /** Reconcile discrepancies
     *    Aggregate all data activity since last sync
     *    Send to server's reconciliation script
     *    Process result by updating local data file
     *    Pass any conflicts along to `_reconcile()`
     *
     * @param {object} result
     *
     * @returns {Promise<DSSyncResult>}
     *
     * @private
     */
    async _reconcile() {}

    /** Resolve server's reconciliation response
     *
     * @param {object} response
     *
     * @returns {Promise<DSSyncResult>}
     *
     * @private
     */
    _resolve(response) {}


    /** ##SECTION - Compute cryptographic hash digests
     *
     *  static async hash()
     *  static async _dataString()
     */

    /** Initiate hash digest of string values
     *    Implemented to allow static `_write()` method to return hash digest
     *    String to be hashed **must** be provided
     *    Hash algorithm may be specified; defaults to SHA-256
     *
     *    Adopted from [MDN SubtleCrypto.digest() reference][subtle-crypto digest]
     *
     * [subtle-crypto digest]: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#Example
     *      "SubtleCrypto.digest() - MDN - (circa) November 25, 2018"
     *
     * @param {string} str - The string to be hashed
     * @param {string} [algo='SHA-256'] - The hash algorithm to be used (see https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest)
     *
     * @returns {Promise<string>} Resolves to the string hash digest
     */
    static async hash(str, algo = 'SHA-256') {
        // console.debug(`Compute hash digest of ${typeof str === 'string' ? `string (length ${str.length})` : `${typeof str}`} using ${alg} algorithm\nvalue: ${str}`);

        try {
            //  SubtleCrypto.digest() returns a Promise, so this function needs only to return that promise
            let buf = new TextEncoder('utf-8').encode(str);

            let digest = await window.crypto.subtle.digest(algo, buf);
            return toHexString(digest);
        }
        catch(er) {
            if(!(er instanceof DSError))
                er = new DSErrorComputeHashDigest(`Error computing hash digest of string ${str} with ${algo} algorithm`, er);

            throw er;
        }
    }
    /** Private instance implementation of hash digest
     *    Implemented to allow other instance methods to use data in memory as default value
     *
     * @param {string} str - The string to be hashed
     * @param {string} [algo='SHA-256'] - The hash algorithm to be used (see https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest)
     *
     * @returns {PromiseLike<string>} Resolves to the string hash digest
     *
     * @private
     */
    async _hash(str = this._dataString, algo) {
        return DataStorage.hash(str, algo);
    }


    /** ##SECTION - Local storage interface
     *   static async read()
     *   static async write()
     */

    /** Read items from local storage
     *    Returns `null` if data in local storage is not truthy
     *    Otherwise returns result of decrypt()
     *
     * @param {string} key
     *
     * @returns {PromiseLike<(string|null)>}
     *
     * TODO Implement server data loading when no local data found
     */
    static async read(key) {
        try {
            //  All local data is encrypted
            let cipher = localStorage.getItem(key);

            if(cipher === null) {
                console.log(`No local data found under ${key}`);

                let loadRemote = confirm(`No data stored locally under data key ${key}\n\nLoad data file from server?`);
                if(!loadRemote) {
                    console.log(`User has elected not to load data from remote file for key ${key}`);

                    //  Return a JSON string representing an empty object
                    return '{}';
                }

                //  Load remote data file, save locally under `key`, and return data string
                alert('Loading remote data is not yet implemented\nAborting');

                //  Else reject with reason to indicate why sync failed
                throw new DSErrorRemoteDataLoad(`Failed to load remote data for key \`${key}\``);
            }

            return DataStorage.decrypt(cipher);
        }
        catch(er) {
            if(!(er instanceof DSError))
                er = new DSErrorReadLocalData(`Error retrieving data from local storage key \`${key}\``, er);

            throw er;
        }
    }

    /** Write items to local storage
     *    Returns hash digest of **the data string written to disk (not the data in memory)**
     *
     * @param {string} key
     * @param {string|object} data
     *
     * @returns {PromiseLike<string>}
     */
    static async write(key, data) {
        try {
            if(!(data instanceof String || typeof data === 'string'))
                data = DataStorage.serialize(data);

            let str = await DataStorage.encrypt(data);
            localStorage.setItem(key, str);

            return DataStorage.hash(str);
        }
        catch(er) {
            if(!(er instanceof DSError))
                er = new DSErrorWriteLocalStorage(`Failed to write ${data} to key \`${key}\``, er);

            throw er;
        }
    }


    /** ##SECTION - Dispatch XHR GET and POST requests
     *
     *  static async xhrGet()
     *  static async xhrPost()
     */

    /** Issue XMLHttpRequests with the GET method to a given URL with optional headers
     *
     * @param {string} url - The URL of the request target file
     * @param {object[]} [headers=[]] - An array of request headers to be set on the XHR object before it is sent
     *
     * @returns {PromiseLike<object>} Resolves to the value of the server response
     *
     * @private
     */
    static async xhrGet(url, headers = []) {
        try {
            return new Promise(function(resolve, reject) {
                //  Open a new XHR request
                let request = new XMLHttpRequest();

                request.onerror = function(er) {
                    if(!(er instanceof DSError))
                        er = new DSErrorXhrGetRequest(`XHR GET request for ${url} encountered an error`, er);

                    throw er;
                };

                //  Notice that the request is opened before the `load` event handler is defined
                //  This is done to simplify the onload handler
                request.open('GET', url);

                //  Set headers if provided
                headers.forEach(function({header, value}) {
                    request.setRequestHeader(header, value);
                });

                //  Define the onload handler
                //  Since this function is defined after the request is opened, it does not need to check the readyState property of the request
                //   - Opening a request causes the onload event to fire a few times, at which point the readyState property reflects an earlier phase of the request cycle
                request.onload = function () {
                    try {
                        if(this.statusText === 'OK') {
                            if(this.responseXML !== null)
                                resolve(this.responseXML);

                            resolve(this.responseText);
                        }
                        else {
                            throw new DSErrorXhrGetRequestStatus(`GET request loaded with unexpected status ${this.statusText}\nResponse: ${this.response}`);
                        }
                    }
                    catch(er) {
                        this.onerror(er);
                    }
                };

                //  Send the request
                request.send();
            });
        }
        catch(er) {
            throw new DSErrorXhrGetRequest(`Error issuing XHR GET to ${url} with headers ${headers}`, er);
        }
    }

    /** Dispatch XMLHttpRequests with the POST method to a given URL with specified data and optional headers
     *
     * @param {string} data - The body of the request to be sent
     * @param {string} url - The URL of the request target file
     * @param {string[]} [headers=[]] - An array of key-value string pairs as request headers to be set on the XHR object before it is sent
     *
     * @returns {PromiseLike<object>} Resolves to the value of the server response
     *
     * @private
     */
    static async xhrPost(data, url, headers = []) {
        try {
            let body = DataStorage.serialize(data);

            return new Promise(function(resolve, reject) {
                //  Open a new XHR request
                //  Notice that the request is opened immediately
                //  This is done to simplify the onload handler
                let request = new XMLHttpRequest();

                //  Monitor for network errors (different from bad request status checked in 'onload')
                //  e.g. poor network connection and no response received, a.k.a. 'request timed out'
                request.onerror = function(er) {
                    if(!(er instanceof DSError))
                        er = new DSErrorXhrGetRequest(`POST request for ${url} encountered an error`, er);

                    throw er;
                };

                request.open('POST', url);

                //  Set request headers if provided
                headers.forEach(function({header, value}) {
                    request.setRequestHeader(header, value);
                });

                //  The onload event handler fires only once the full response has been received (i.e. readystate===4 and statusText===OK)
                request.onload = function() {
                    try {
                        if(this.statusText === 'OK') {
                            if(request.responseXML !== null)
                                resolve(request.responseXML);

                            resolve(request.responseText);
                        }
                        else {
                            throw new DSErrorXhrPostRequestStatus(`POST request loaded with unexpected status ${this.statusText}\nResponse: ${this.response}`);
                        }
                    }
                    catch(er) {
                        this.onerror(er);
                    }
                };

                // console.debug(`Sending POST request: ${request}`);
                request.send(body);
            })
        }
        catch(er) {
            throw new DSErrorXhrPostRequest(`Error executing XHR POST to ${url} with body ${data} and headers ${headers}`, er);
        }
    }


    /** ##SECTION - Encryption
     *
     *  static async encrypt()
     *  static async decrypt()
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
     * @returns {PromiseLike<string>} The encrypted cipher object
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
            throw new DSErrorParseJSON(`Failed to parse ${jstr}`, er);
        }
    }

    /** Serialize a JavaScrip Object into a string
     *    Presently just an alias for `JSON.parse()`
     *
     * @param {object} val - The object to be serialized
     * @param {function} [replacer] - A function that replaces property values with alternate data before serializing
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
            throw new DSErrorSerializeJSON(`Failed to serialize ${val}`, er);
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
            if(!(er instanceof DSError))
                er = new DSErrorCompileDataString('Failed to compile data string', er);

            throw er;
        }
    }
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
        throw new DSErrorConvertFromHexString(`Failed to convert ${hexString} to ArrayBuffer instance`, er);
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
        throw new DSErrorConvertToHexString(`Failed to convert ${bytes} to hex string`, er);
    }
}

/** Timestamp type
 *   Integer greater than (not equal to) 0
 * typedef {number<int[!0, >]} DSTimestamp   //  Proposed format extension allowing integer type with range constraint ('!' indicates exclusive bound, i.e. value cannot be equal to 0)
 * @typedef {number} DSTimestamp
 */
/** Data record ID type
 *    ID's are defined as the timestamp at the moment a data instance is saved
 *
 * @typedef {DSTimestamp} DSDataRecordID
 */
/** Data activity rank type
 *    One of ('new'|'modified'|'deleted'|'conflict')
 *
 * @enum {{NEW: string, MODIFIED: string, DELETED: string, CONFLICT: string}}
 */
const DSDataActivityRank = {
    NEW: 'new',
    MODIFIED: 'modified',
    DELETED: 'deleted',
    CONFLICT: 'conflict'
};
Object.freeze(DSDataActivityRank);
/** Data record class type
 *    Any of the constructor functions passed to `DataStorage` constructor's `types` argument
 *
 * @typedef {function} DSDataRecordClass
 */


/** Raw JSON object literal type
 *
 * @typedef {object} DSDataJSONRecord
 *
 * @property {DSDataRecordID} _created - Timestamp at which the represented data instance was created
 * @property {DSTimestamp} [_modified] - Timestamp at which the represented data instance was most recently modified
 */

/** Abstract data instance superclass
 * @since March 10, 2019
 *
 * @extends DSDataJSONRecord
 * @abstract
 */
class DSDataRecord {
    constructor() {
        /** `_created` property defined as the timestamp at which the data instance was saved
         *    Also used as the instance's ID
         *
         * @property {DSDataRecordID} _created - Timestamp at which the data instance was created, initialized value of `0`
         * @private
         */
        this._created = 0;
        /** `_modified` property defined as the timestamp of the **most recent** modification of a data instance, if any, and otherwise `0`
         *
         * @property {DSTimestamp} [_modified] - Timestamp at which the data instance was most recently modified, initialized value of `0`
         * @private
         */
        this._modified = 0;
    }

    /** Return a new `DSDataRecord` instance from a JSON string/raw JSON object
     *    **Note the use of `new this()`**
     *    This statement constructs a new instance of a subclass invoking `DSDataRecord.fromJSON()` with the `super` keyword
     *    As `fromJSON()` is a `static` method, the `this` keyword refers to the class object/constructor function itself
     *
     * @param {DSDataJSONRecord} jobj - The raw JSON object literal
     *
     * @returns {DSDataRecord} Initialized data instance
     */
    static fromJSON(jobj) {
        if(jobj instanceof String || typeof jobj === 'string')
            jobj = DataStorage.parse(jobj);

        let inst = new this();

        inst._created = jobj._created;
        if(jobj._modified)
            inst._modified = jobj._modified;

        return inst;
    }

    /** Public getter method of the instance ID
     *    ID is defined as the private `_created` property
     *
     * @returns {DSDataRecordID} - The value of the `_created` property
     *
     * @readonly
     */
    get id() {
        return this._created;
    }

    /** Get the JSON object literal representation of the data instance
     *
     * @returns {DSDataJSONRecord}
     */
    toJSON() {
        let jobj = {
            _created: this._created
        };
        if(this._modified)
            jobj._modified = this._modified;

        return jobj;
    }

    /** Get a human-readable string representation of the data instance, e.g. for console output
     *    Formatted to print the class name and ID
     *
     * @returns {string}
     */
    toString() {
        return `${this.constructor.name}{${this.id}`;
    }
}
/** Deleted data instance type
 *
 * @typedef {object} DSDataDeletedRecord
 *
 * @property {DSDataRecordID} _created - The timestamp at which the data instance was saved
 * @private
 *
 * @property {DSTimestamp} _deleted - The timestamp at which the data instance was deleted
 * @private
 */


/** Data record instance container & constructor reference
 *    `DSDataRecordClass` objects are "keys"
 *
 * @typedef {Map.<function, DSDataRecord[]>} DSDataRecordContainer
 * @dict
 */
/** Deleted data record container/reference
 *    `DSDataRecordClass` objects are "keys"
 *
 * @typedef {Map.<function, DSDataDeletedRecord[]>} DSDataDeletedRecordContainer
 * @dict
 */

/** Data index by type
 *   An object literal whose keys are `DSDataRecordClass` names
 *   The value at each key is the corresponding `DSDataRankIndex` container
 *
 * @typedef {object.<string, DSDataRankIndex>} DSDataTypeIndex
 * @dict
 */
/** Data index by rank
 *   An object literal whose keys are `DSDataActivityRank` values
 *   The value at each key is the corresponding `DSDataIdIndex` container
 *
 * @typedef {object.<DSDataActivityRank, DSDataIdIndex>} DSDataRankIndex
 * @dict
 */
/** Data index by id
 *   An object literal whose keys are data instance ID's
 *   The value at each key is the corresponding `DSDataRecord` instance
 *
 * typedef {object.<(string)DSDataRecordID, DSDataRecord>} DSDataIdIndex        //  Proposed format extension allowing explicit casting of one type to another
 * @typedef {object.<DSDataRecordID, DSDataRecord>} DSDataIdIndex
 * @dict
 */

/**** Abstract interface representing two resolved hash values
 *
 * typedef {object} ResolvedHashPair
 * @interface ResolvedHashPair
 *
 * @property {string} local - Resolved local hash digest
 * @property {string} remote - Resolved remote hash digest
 */
/** Hash comparison type
 * @since 3/12/2019
 *
 * augments ResolvedHashPair
 * @implements ResolvedHashPair
 */
class DSHashComparison {
    /** Instances must be constructed with the resolved local & remote hash values
     *
     * @param {string} local - Resolved local hash digest
     * @param {string} remote - Resolved remote hash digest
     */
    constructor(local, remote) {
        this.local = local;
        this.remote = remote;
    }

    /** Hash comparison 'succeeds' getter method
     *
     * @returns {boolean} `true` if hashes are both of type 'string' and exactly equal as determined by `===`, otherwise `false`
     */
    get succeeds() {
        if(typeof this.local !== 'string' || typeof this.remote !== 'string')
            return false;

        return this.local === this.remote;
    }

    /** Hash comparison 'hash' getter method
     *
     * @returns {string} The `remote` hash digest if `succeeds` returns `true`, otherwise empty string ''
     */
    get hash() {
        return this.succeeds ? this.remote : '';
    }

    toString() {
        return `DSHashComparison{${this.succeeds}`;
    }
}

/**** Reconcile result summary type
 *    This type is no longer used (replaced by DSDataTypeIndex) but is being kept for record of the format proposal:
 * @typedef {object.<DSDataActivityRank, object>.<(string)DSDataRecordID, DSDataRecord>} DSDataReconcileData        // Proposed format extension allowing multi-dimensional type specification of object literals/objects with indeterminate property keys
 */
/** Reconcile result summary type
 * @since 3/12/2019
 */
class DSReconcileResult {
    /** Instances must be constructed with the updated remote hash accounting for any data added/edited/deleted during reconciliation
     *
     * @param {string} hash - The remote hash digest as returned by `reconcile.php`
     * @param {DSDataTypeIndex} serverData - The data object returned by `reconcile.php`
     */
    constructor(hash, serverData) {
        /** Retain the remote hash digest so it does not need to be fetched again in a separate request
         * @property {string} hash - Hash digest of the server's data file computed after running its reconciliation algorithm
         */
        this.hash = hash;

        /** Container object for reconciled/conflicting records
         * @property {DSDataTypeIndex} resolve - A container object with data instances of the given type, organized by rank
         */
        this.resolve = serverData;
    }
}

/** Sync result summary type
 * @since 3/12/2019
 *
 * augments ResolvedHashPair
 * @implements ResolvedHashPair
 */
class DSSyncResult extends DSHashComparison {
    /** Instances must be constructed with the resolved local & remote hash values
     *
     * @param {ResolvedHashPair} hashPair - Container object for resolved hash digests
     * @param {string} hashPair.local - Resolved local hash digest
     * @param {string} hashPair.remote - Resolved remote hash digest
     * @param {DSReconcileResult} [resolve={}] - reconciliation result; defaults to an empty object
     *
     */
    constructor({local, remote}, resolve = {}) {
        super(local, remote);
        /** Automatically records the timestamp when the instance is constructed
         *
         * @property {number} sync - `0` if the local and remote hash digests are not equal, otherwise the timestamp at which this instance was constructed
         */
        this.sync = Date.now();

        /** If a discrepancy was resolved, the resolved data instances are contained here
         *
         * @property {DSReconcileResult}
         */
        this.resolve = resolve;
    }
}


/** Abstract class implements constructor and overrides built-in `toString()`
 *    DSError instances can be constructed but will be less useful than a context-specific subclass
 *
 * @param {string} message - message describing this error
 * @param {Error|string} [source] - `Error` instance or condition (described in text) that caused this error to be generated
 *
 * @abstract
 */
class DSError extends Error {
    constructor(message, source) {
        super(message);

        this.source = source;

        console.trace();
    }

    toString() {
        return `${this.constructor.name}${this.message?`: ${this.message}`:''}${this.source?`\n${this.source}`:''}`;
    }
}

/** Error thrown when `sync()` fails
 *
 */
class DSErrorSync extends DSError {
    /** Constructor passes arguments to the `DSError` constructor
     * @param {string} message - message describing this error
     * @param {Error|string} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}

/** Error thrown when `hash()` fails
 *
 */
class DSErrorComputeHashDigest extends DSError {
    /** Constructor passes arguments to the `DSError` constructor
     * @param {string} message - message describing this error
     * @param {Error|string} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}

/** Error thrown when `fromHexString()` fails
 *
 */
class DSErrorConvertFromHexString extends DSError {
    /** Constructor passes arguments to the `DSError` constructor
     * @param {string} message - message describing this error
     * @param {Error|string} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when `toHextString()` fails
 *
 */
class DSErrorConvertToHexString extends DSError {
    /** Constructor passes arguments to the `DSError` constructor
     * @param {string} message - message describing this error
     * @param {Error|string} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}

/** Error thrown when `localStorage` fails to read a given key
 *
 */
class DSErrorReadLocalData extends DSError {
    /** Constructor passes arguments to the `DSError` constructor
     * @param {string} message - message describing this error
     * @param {Error|string} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when `localStorage` fails to write to a given key
 *
 */
class DSErrorWriteLocalStorage extends DSError {
    /** Constructor passes arguments to the `DSError` constructor
     * @param {string} message - message describing this error
     * @param {Error|string} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}

/** Error thrown when no local data is found and remote data load fails
 *
 */
class DSErrorRemoteDataLoad extends DSError {
    /** Constructor passes arguments to the `DSError` constructor
     * @param {string} message - message describing this error
     * @param {Error|string} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}

/** Error thrown when XHR GET request fails
 *
 */
class DSErrorXhrGetRequest extends DSError {
    /** Constructor passes arguments to the `DSError` constructor
     * @param {string} message - message describing this error
     * @param {Error|string} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when XHR GET request loads with bad status
 *
 */
class DSErrorXhrGetRequestStatus extends DSError {
    /** Constructor passes arguments to the `DSError` constructor
     * @param {string} message - message describing this error
     * @param {Error|string} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when XHR POST request fails
 *
 */
class DSErrorXhrPostRequest extends DSError {
    /** Constructor passes arguments to the `DSError` constructor
     * @param {string} message - message describing this error
     * @param {Error|string} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when XHR POST request loads with a status other than `200`/`OK`
 *
 */
class DSErrorXhrPostRequestStatus extends DSError {
    /** Constructor passes arguments to the `DSError` constructor
     * @param {string} message - message describing this error
     * @param {Error|string} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}

/** Error thrown when `JSON` fails to serialize an object
 *
 */
class DSErrorSerializeJSON extends DSError {
    /** Constructor passes arguments to the `DSError` constructor
     * @param {string} message - message describing this error
     * @param {Error|string} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when `JSON` fails to parse a string
 *
 */
class DSErrorParseJSON extends DSError {
    /** Constructor passes arguments to the `DSError` constructor
     * @param {string} message - message describing this error
     * @param {Error|string} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when `DataStorage` fails to compile a data string
 *
 */
class DSErrorCompileDataString extends DSError {
    /** Constructor passes arguments to the `DSError` constructor
     * @param {string} message - message describing this error
     * @param {Error|string} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}

/** Error thrown when local last-sync parameter read fails
 *
 */
class DSErrorGetLastSync extends DSError {
    /** Constructor passes arguments to the `DSError` constructor
     * @param {string} message - message describing this error
     * @param {Error|string} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when local last-sync parameter write fails
 *
 */
class DSErrorSetLastSync extends DSError {
    /** Constructor passes arguments to the `DSError` constructor
     * @param {string} message - message describing this error
     * @param {Error|string} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}

/** AES-GCM cipher object
 *
 * @typedef {object} AesGcmCipher
 *
 * @property {string} salt
 * @property {string} iv
 * @property {string} text
 */