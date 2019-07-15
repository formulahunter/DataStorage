/** Request header object type
 * @typedef {object} XHRHeader
 *
 * @property {string} header - the HTTP header to be set
 * @property {string} value - the value to be set for the indicated header
 */


/** Timestamp type
 *   Integer greater than (not equal to) 0
 * typedef {number<int[!0, >]} DSTimestamp   //  #NEWPROJECT-JSDOCEXTEND Proposed format extension allowing integer type with range constraint ('!' indicates exclusive bound, i.e. value cannot be equal to 0)
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
 * @template D
 * @extends {DSDataJSONRecord}
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
     *    Subclasses must implement this method and instantiate their return instance using `super.fromJSON()`
     *
     * @template D
     * @param {DSDataJSONRecord<D>} jobj - The raw JSON object literal
     *
     * @returns {D}
     */
    static fromJSON(jobj) {
        if(jobj instanceof String || typeof jobj === 'string')
            jobj = DataStorage.parse(jobj);

        let inst = new this();

        inst._created = jobj._created;
        inst._modified = jobj._modified || 0;

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

    /** Return a new instance whose properties values are identical to the current instance
     *      **EXCLUDES** the `_created` and `_modified` properties unless `id` argument is `true`
     *      Subclasses must implement this method and instantiate their return instance using `super.copy()`
     *
     * @template D
     * @param {boolean} [id=false] - if `true`, the instance's _created` and `_modified` properties are also copied; defaults to `false`
     *
     * @returns {D}
     */
    copy(id = false) {
        let copy = new this.constructor();
        if(id === true) {
            copy._created = this._created;
            copy._modified = this._modified;
        }

        return copy;
    }

    /** Get the JSON object literal representation of the data instance
     *    Subclasses must implement this method and initiate their return value using `super.toJSON()`
     *
     * @template D
     * @returns {DSDataJSONRecord<D>}
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
     *    Subclasses must override this method
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
 *   `Object` literal whose keys are `DSDataRecord` subclass names (type `string`)
 *   The value at each key is the corresponding `DSDataRankIndex` container
 *   Types with no relevant data are not represented (their index is `undefined`)
 *     There is no global reference to the complete collection of data types/classes
 *     Contrast with `DSDataActivityRank`, whose members are globally defined constants and so can be iterated over
 *
 * @typedef {object.<string, (DSDataRankIndex|undefined)>} DSDataTypeIndex
 * @dict
 */
/** Data index by rank
 *   An object literal whose keys are `DSDataActivityRank` values
 *   The value at each key is the corresponding `DSDataIdIndex` container
 *   A rank index with no relevant data will be defined as an empty object
 *
 * @typedef {object.<DSDataActivityRank, DSDataIdIndex>} DSDataRankIndex
 * @dict
 */
/** Data index by id
 *   An object literal whose keys are data instance ID's (cast to `string` types)
 *   The value at each key is the corresponding `DSDataRecord` instance
 *
 * typedef {object.<(string)DSDataRecordID, DSDataRecord>} DSDataIdIndex        //  #NEWPROJECT-JSDOCEXTEND Proposed format extension allowing explicit casting of one type to another
 * @typedef {object.<DSDataRecordID, DSDataRecord>} DSDataIdIndex
 * @dict
 */

/**** Reconcile result summary type
 *    This type is no longer used (replaced by DSDataTypeIndex) but is being kept for record of the format proposal:
 * @typedef {object.<DSDataActivityRank, object>.<(string)DSDataRecordID, DSDataRecord>} DSDataReconcileData        // #NEWPROJECT-JSDOCEXTEND Proposed format extension allowing multi-dimensional type specification of object literals/objects with indeterminate property keys
 */
/** Reconcile result summary type
 *
 * @property {string} hash - Hash digest of the server's data file computed after running its reconciliation algorithm
 * @property {DSDataTypeIndex} data - Container object for reconciled/conflicting data records
 *
 * @since 3/12/2019
 */
class DSReconcileResult {
    /** Instances must be constructed with the updated remote hash accounting for any data added/edited/deleted during reconciliation
     *
     * @param {string} hash - The remote hash digest as returned by `reconcile.php`
     * @param {DSDataTypeIndex} [serverData] - The data object returned by `reconcile.php`
     */
    constructor(hash, serverData = {}) {
        //  Retain the remote hash digest so it does not need to be fetched again in a separate request
        this.hash = hash;

        //  Retain server data or an empty object
        this.data = serverData;
    }
}

/** Sync result summary type
 *   The `DSSyncResult` combines two "interfaces" to summarize all relevant info about a sync operation
 *   1. The resolved `local` and `remote` hash digests, and interface methods `get succeeds()` and `get hash()`
 *   2. The `DSReconcileResult` interface, with properties `hash` and `reconcile`
 *
 * @property {string} local - Resolved local hash digest
 * @property {string} remote - Resolved remote hash digest
 *
 * @property {number} sync - The timestamp at which the sync was confirmed successful; initialized to `0`
 * @readonly
 *
 * @property {DSReconcileResult|undefined} [reconcile] - The result returned by the server's `reconcile()` algorithm, if data has been reconciled (successful or otherwise)
 *
 * @since 3/12/2019
 *
 */
class DSSyncResult {
    /** Instances must be constructed with the resolved local & remote hash values
     *
     * @param {string} local - Resolved local hash digest
     * @param {string} remote - Resolved remote hash digest
     * @param {DSReconcileResult} [reconcile] - reconciliation result; defaults to an empty object
     *
     */
    constructor(local, remote, reconcile = new DSReconcileResult('')) {
        this.local = local;
        this.remote = remote;

        // Default value indicating sync not yet confirmed
        this.sync = 0;

        // If a discrepancy was resolved, the resolved data instances are contained here
        this.reconcile = reconcile;
    }

    /** Hash comparison 'succeeds' getter method
     *    This method automatically defines read-only `sync` property if both hashes match and
     *
     * @returns {boolean} `true` if hashes are both of type 'string' and exactly equal as determined by `===`, otherwise `false`
     */
    get succeeds() {
        if(typeof this.local !== 'string' || typeof this.remote !== 'string')
            return false;

        if(this.local !== this.remote)
            return false;

        if(!this.sync) {
            Object.defineProperty(this, 'sync', {
                configurable: false,
                enumerable: true,
                value: Date.now(),
                writable: false
            });
        }

        return true;
    }

    /** Hash comparison 'hash' getter method
     *
     * @returns {string} The `remote` hash digest if `succeeds` returns `true`, otherwise empty string ''
     */
    get hash() {
        return this.succeeds ? this.remote : '';
    }

    toString() {
        try {
            let str;
            if(this.succeeds)
                str = `success at ${this.sync}`;
            else
                str = `fail with local (${this.local ? this.local.slice(0, 7) : 'undefined'}), remote (${this.remote ? this.remote.slice(0, 7) : 'undefined'})`;

            return `DSSyncResult{${str}}`;
        }
        catch(er) {
            console.log('something went wrong');
        }
    }
}
