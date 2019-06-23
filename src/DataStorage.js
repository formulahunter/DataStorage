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
         * @property {DSDataRecordContainer} _types
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
            id = ++this._maxID;

        return id;
    }


    /** ##SECTION - Data initialization
     *
     *  init()
     */

    /** Load local data into memory and return result of data sync
     *
     * @returns {DSSyncResult}
     */
    async init() {
        /***    TODO - CONSIDER PACKAGING ALL DATA INSTANCES ON AN OBJECT AND RETURNING THAT OBJECT; SYNC WOULD BE INITIALIZED BUT NOT `await`ED
         * //  Synchronously read and parse local data
         * let jdat = DataStorage.parse(await DataStorage.read(`${this.key}-data`));
         *
         * //  Iterate over the type container arrays in `jdat`
         * let dataObj = {};
         * for(let type in jdat) {...populate `dataObj` while instantiating data records...}
         *
         * this._sync();
         *
         * return dataObj;
         *
         */

        //  Synchronously read and parse local data
        let jdat = DataStorage.parse(await DataStorage.read(`${this.key}-data`));

        //  Iterate over the type container arrays in `jdat`
        for(let type in jdat) {
            if(!jdat.hasOwnProperty(type))
                continue;

            //  Designate the associated class object for each type
            let classObj = window[type];

            //  Iterate through elements in each type container array
            for(let jobj of jdat[type]) {
                //  Construct a new instance of `classObj` and assign its `_created` property
                let inst = classObj.fromJSON(jobj);

                //  Add the new instance to the respective container array
                this._add(inst);
            }
        }

        //  `await` must be used with this call within an immediate `try..catch()` block to properly capture/log `DSError` instances
        //  Not sure why
        //  Possibly to pause execution here and submit thrown errors to the catch() block, rather than return execution to the calling context and risk uncaught exceptions?
        try {
            return await this._sync();
        }
        catch(er) {
            console.error(er);
            return er;
        }
    }


    /** ##SECTION - Incremental data manipulation
     *
     */

    /** Save *new* data instance
     * @param {DSDataRecord} inst - The data instance to be saved
     *
     * @returns {Promise<DSSyncResult>}
     */
    async save(inst) {
        //  Preliminary sync
        let prelim;
        try {
            prelim = await this._sync();
        }
        catch(er) {
            throw new DSErrorSavePrelimSync(`Unable to sync data before saving new ${inst.constructor.name} instance ${inst} -- aborting save`, er);
        }

        //  Assign the instance an ID
        inst._created = this._newID;

        //  Add to container array, sort the array, and get the index
        this._add(inst);

        //  Write the new data instance to local cache
        let local = DataStorage.write(`${this.key}-data`, this._dataString);

        //  Write the new data instance to remote data file
        let data = {
            query: 'add',
            type: inst.constructor.name,
            instance: inst
        };
        let url = 'query.php';
        let headers = [{
            header: 'content-type',
            value: 'application/json;charset=UTF-8'
        }];
        let remote = DataStorage.xhrPost(data, url, headers);

        //  Concluding sync
        [local, remote] = await Promise.all([local, remote]);
        let final;
        try {
            final = this._sync(local, remote);
        }
        catch(er) {
            throw new DSErrorSaveFinalSync(`Unable to sync data before saving new ${inst.constructor.name} instance ${inst} -- aborting save`, er);
        }

        return final;
    }

    /** Edit existing data instance
     *      This method replaces an existing data instance with the new version provided
     *
     * @param {DSDataRecord} inst - The NEW version of the instance
     *
     * @returns {Promise<DSSyncResult>}
     */
    async edit(inst) {
        //  Local variable for preliminary sync result
        let prelim;

        //  Preliminary sync
        try {
            prelim = await this._sync();
        }
        catch(er) {
            throw new DSErrorEditPrelimSync(`Unable to sync data before editing ${inst.constructor.name} instance ${inst} -- aborting edit`, er);
        }

        //  Write modified instance to local storage
        let local;
        try {
            //  (Re)assign the `_modified` property
            inst._modified = Date.now();

            //  Add to container array, sort the array, and get the index
            this._replace(inst);

            //  Write the new data instance to local cache
            local = DataStorage.write(`${this.key}-data`, this._dataString);
        }
        catch(er) {
            throw new DSErrorEditLocalHash(`Error caught while initiating local replacement of ${inst.constructor.name} instance ${inst} -- aborting edit`, er);
        }

        //  Send modified instance to server
        let remote;
        try {
            //  Write the new data instance to remote data file
            let data = {
                query: 'edit',
                type: inst.constructor.name,
                instance: inst
            };
            let url = 'query.php';
            let headers = [{
                header: 'content-type',
                value: 'application/json;charset=UTF-8'
            }];
            remote = DataStorage.xhrPost(data, url, headers);

            [local, remote] = await Promise.all([local, remote]);
        }
        catch(er) {
            throw new DSErrorEditRemoteHash(`Error caught while initiating remote replacement of ${inst.constructor.name} instance ${inst} -- aborting edit`, er);
        }

        //  Concluding sync
        let final;
        try {
            final = this._sync(local, remote);
        }
        catch(er) {
            throw new DSErrorEditFinalSync(`Unable to sync data before saving new ${inst.constructor.name} instance ${inst} -- aborting save`, er);
        }

        return final;
    }

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
     * @param {(string|PromiseLike<string>)} [local]
     * @param {(string|PromiseLike<string>)} [remote]
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

        //  Fetch remote server hash asynchronously (if necessary)
        if(!remote) {
            let data = {query: 'hash'};
            let url = 'query.php';
            let headers = [{
                header: 'content-type',
                value: 'application/json;charset=UTF-8'
            }];
            remote = DataStorage.xhrPost(data, url, headers);
        }

        //  Initiate asynchronous hash digest of local data
        if(!local)
            local = this._hash();

        //  `await` both asynchronous requests and construct a `DSSyncResult` with the resolved values
        //  Assign both resolved values to local variables
        [local, remote] = await Promise.all([local, remote]);
        let result = new DSSyncResult(local, remote);

        //  If the initial comparison fails, initiate the reconciliation procedure
        if(!result.succeeds) {
            console.log('Attempting to reconcile local and remote data');

            //  Run the `_reconcile()` procedure
            //  `result.reconcile` is implicitly defined
            await this._reconcile(result);

            //  Check if discrepancies have been reconciled
            if(!result.succeeds)
                throw new DSErrorSyncFail('Failed to synchronize local and remote data', result.toString());

            //  Overwrite local storage with successfully reconciled data in memory
            //  `await` this call only in case a subsequent method (after `_sync()`) attempts to access local storage
            await DataStorage.write(`${this.key}-data`, this._dataString);
        }

        //  At this point, either sync, reconciliation, or resolution must have succeeded
        //  If `result.succeeds` was used to evaluate success, `result.sync` was set automatically (see implementation of `DSSyncResult[get succeeds()]`)
        let time = result.sync;
        this._lastSync = time;
        console.info('Local and remote data synchronized');
        console.debug(`Successful sync on ${(new Date(time)).toLocaleString()}\nTimestamp: ${time}`);

        //  Disable any changes to `result` and return it
        Object.freeze(result);
        return result;
    }

    /** Reconcile discrepancies
     *    Aggregate all data activity since last sync
     *    Send to server's reconciliation script
     *    Process result by updating local data cache
     *    Pass any conflicts along to `_reconcile()`
     *
     * @param {DSSyncResult} sync - The sync result originally constructed in `_sync()`, passed so that its `remote` property can be updated with the new server hash
     *
     * @returns {Promise<DSReconcileResult>}
     *
     * @private
     */
    async _reconcile(sync) {
        //  Compile local activity since `lastSync`
        let lastSync = this._lastSync;
        let instances = {};
        for(let type of this._types.keys()) {
            //  Associate data instances with the key they are defined on
            //  Organization of data in the remote repository depends on this association
            //  Object literals are used as associative arrays to simplify some server-side `reconcile()` operations
            //    - Refer to `DSDataTypeIndex` type definition
            let key = type.name;
            instances[key] = {
                new: {},
                modified: {},
                deleted: {}
            };

            let active = this._types.get(type);
            let deleted = this._deleted.get(type);
            for(let inst of active) {
                if(inst._created > lastSync)
                    instances[key].new[inst.id] = inst;
                else if(inst._modified && inst._modified > lastSync)
                    instances[key].modified[inst.id] = inst;
            }
            for(let inst of deleted) {
                if(inst._deleted > lastSync)
                    instances[key].deleted[inst._created] = inst;
            }

            //  Clean up `instances` to minimize unnecessary data transmission
            //  Also prevents server from having to iterate over empty data sets
            //  This violates the `DSDataTypeIndex` type definition
            let newCount = Object.keys(instances[key].new).length;
            let modCount = Object.keys(instances[key].modified).length;
            let delCount = Object.keys(instances[key].deleted).length;
            if(newCount === 0 && modCount === 0 && delCount === 0) {
                delete instances[key];
            }
            else {
                if(newCount === 0)
                    delete instances[key].new;
                if(modCount === 0)
                    delete instances[key].modified;
                if(delCount === 0)
                    delete instances[key].deleted;
            }
        }

        //  Send compiled data to server's `reconcile` procedure
        let data = {
            query: 'reconcile',
            data: {
                    sync: lastSync,
                    instances: instances
            }
        };
        let url = 'query.php';
        let headers = [{
            header: 'content-type',
            value: 'application/json;charset=UTF-8'
        }];
        let response = DataStorage.parse(await DataStorage.xhrPost(data, url, headers));

        //  Wrap response in `DSReconcileResult` and evaluate
        let result = new DSReconcileResult(response.hash, response.data);
        let conflicts = {};
        for(let type in result.data) {
            if(!result.data.hasOwnProperty(type))
                continue;

            //  Designate the associated class object, data container, and local container for each type
            //  `dataContainer` is the `DataStorage` instance's container for the designated data type
            //  `localContainer` is the JSON data container object defined in the server's response
            let classObj = window[type];
            let dataContainer = this._types.get(classObj);
            let localContainer = result.data[type];

            //  Add new data instances, replace modified ones, and remove deleted ones
            for(let id in localContainer.new) {
                if(!localContainer.new.hasOwnProperty(id))
                    continue;

                //  Define a new instance of `classObj` using property values on `jobj`
                let inst = classObj.fromJSON(localContainer.new[id]);

                //  Add the new instance to its respective container array
                this._add(inst);
            }
            for(let id in localContainer.modified) {
                if(!localContainer.modified.hasOwnProperty(id))
                    continue;

                //  Define a new instance of `classObj` using property values on `jobj`
                let inst = classObj.fromJSON(localContainer.new[id]);

                //  Replace the corresponding instance in the associated type container
                this._replace(inst);
            }
            for(let id in localContainer.deleted) {
                if(!localContainer.deleted.hasOwnProperty(id))
                    continue;

                throw new DSErrorReconcile('Processing of deleted instances from server reconciliation not yet implemented in DataStorage.resolve()', `Instance id: ${id}`);
            }
            for(let id in localContainer.conflict) {
                if(!localContainer.conflict.hasOwnProperty(id))
                    continue;

                if(!conflicts[type])
                    conflicts[type] = {};

                conflicts[type][id] = localContainer.conflict[id];

                throw new DSErrorReconcile('Processing of conflicting instances from server reconciliation not yet implemented in DataStorage.resolve()', `Instance id: ${id}`);
            }
        }

        //  Implicit update of sync result
        sync.reconcile = result;
        sync.remote = result.hash;
        sync.local = await this._hash();

        //  Resolve conflicts
        if(Object.keys(conflicts).length > 0)
            this._resolve(conflicts, sync);

        //  Return `result`
        return result;
    }

    /** Resolve server's reconciliation response
     *
     * @param {object} response
     *
     * @returns {Promise<DSSyncResult>}
     *
     * @private
     */
    _resolve(response) {}


    /** Add data instance to respective container
     *      Maintain proper sort order and `_maxID`
     *
     *  @param {DSDataRecord} inst
     *
     *  @return {number} the index to which the new instance was sorted
     *
     *  @throws {DSErrorSave} - see `DSErrorSave` & subclasses
     *
     *  @private
     */
    _add(inst) {
        //  Validate type against managed types
        let type = inst.constructor;
        let container = this._types.get(type);
        if(container === undefined)
            throw new DSErrorAddInvalidType(`Cannot add unrecognized data type ${type.name} -- no container defined`, type);

        //  Check that the instance has not already been added to the container and that no ID conflicts exist
        //  `push()` the new instance to the container
        let exInd = container.indexOf(inst);
        let idConflict = container.find(el => el.id === inst.id);
        if(exInd >= 0)
            console.warn(`${type.name} instance ${inst} already added to data container -- will not be added again`, [inst, container[exInd]]);
        else if(idConflict)
            throw new DSErrorAddIDConflict(`Cannot add new ${type.name}: ID ${inst.id} already exists in local data container`, [inst, idConflict]);
        else
            container.push(inst);

        //  Re-sort the array using the standard sort algorithm
        container.sort(stdSort);

        //  Update `_maxID` if necessary
        if(inst.id > this._maxID)
            this._maxID = inst.id;

        //  Return index of new instance (after sorting)
        return container.indexOf(inst);
    }

    /** Replace an existing data instance with a new one
     *
     * @param {DSDataRecord} inst
     *
     * @return {number} the index to which the new instance was sorted
     *
     * @private
     */
    _replace(inst) {
        //  Validate type against managed types
        let type = inst.constructor;
        let container = this._types.get(type);
        if(container === undefined)
            throw new DSErrorReplaceInvalidType(`Cannot add unrecognized data type ${type.name} -- no container defined`, type);

        //  Get the associated container array and index of old instance
        let ind = container.findIndex(el => el.id === inst.id);
        if(ind < 0)
            throw new DSErrorReplaceNoMatch(`Cannot replace ${inst} -- no matching instance found in the ${type.name} container`, inst);

        //  Replace the old instance with the new one
        container.splice(ind, 1, inst);

        //  Re-sort the array using the standard sort algorithm
        container.sort(stdSort);

        //  Return index to which the new instance was sorted
        return container.indexOf(inst);
    }

    /** Remove an existing data instance
     *      Adds identifying information to the respective `_deleted` container by default
     *      Can be overridden by passing `false` as the second argument
     *
     * @param {DSDataRecord} inst
     * @param {boolean} [del=true]
     *
     * @return {number} the index from which the instance was removed
     *
     * @private
     */
    _remove(inst, del = true) {
        //  Get the associated container array and index of instance
        let type = inst.constructor;
        let container = this._types.get(type);
        let ind = container.indexOf(inst);
        if(ind < 0)
            throw new DSErrorReplace(`Cannot remove ${inst} -- not found in the ${type.name} container`);

        //  Remove the instance from the container array
        container.splice(ind, 1);

        //  Add identifying data to the appropriate deleted container
        if(del) {
            //  Get the associated 'deleted' container array and check for ID conflicts
            let container = this._deleted.get(type);
            let existing = container.find(el => el.id === inst.id);
            if(existing)
                throw new DSErrorAdd(`Cannot add ${type.name} ${inst.id} to deleted container: ID already exists in local 'deleted' data container`, [inst, existing]);

            //  `push` identifying information to the 'deleted' container
            container.push({_created: inst._created, _deleted: inst._deleted});

            //  Re-sort the array using the standard sort algorithm
            container.sort(stdSort);
        }

        return ind;
    }

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

            return DataStorage.hash(data);
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
     * @param {object.<string, string>[]} [headers=[]] - An array of key-value string pairs as request headers to be set on the XHR object before it is sent
     *
     * @returns {PromiseLike<string>} Resolves to the value of the server response
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
     * @param {(object|string)} data - The data object to be serialized and sent as the request body
     * @param {string} url - The URL of the request target file
     * @param {object.<string, string>[]} [headers=[]] - An array of key-value string pairs as request headers to be set on the XHR object before it is sent
     *
     * @returns {PromiseLike<string>} Resolves to the value of the server response
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
        // console.debug(cipher);

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
     * @throws {DSErrorParseJSON}
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
     * @throws {DSErrorSerializeJSON}
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
     * @throws {DSErrorCompileDataString}
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

/** Standard data sorting algorithm
 *      For use with `Array.prototype.sort()`
 *
 * @param {DSDataRecord} a
 * @param {DSDataRecord} b
 *
 * @return {number} - will be less than 0 if `a` was created more recently than `b`, otherwise greater than 0
 */
const stdSort = (a, b) => b.id - a.id;

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
