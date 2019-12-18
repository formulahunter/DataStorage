/** @file `DataStorage` base type definitions
 *  @author formulahunter
 *  @since October 25, 2019
 */


/** Request header object type */
interface RequestHeader {
    header: string;
    value: string;
}


/** DSDataRecordID
 * Wrapper type that enforces non-negative ID values
 */
class DSDataRecordID {
    id: number;
    constructor(id: number|undefined) {
        if(id === undefined) {
            id = Date.now();
        }
        else if(id < 0) {
            throw new RangeError(`invalid DSDataRecordID ${id} - cannot be negative`);
        }

        this.id = id;
    }

    toString(): string {
        return this.id.toString();
    }
    valueOf(): number {
        return this.id;
    }
}


/** DSDataActivityRank
 * Used to reconcile data record updates
 */
enum DSDataActivityRank {
    NEW = 'new',
    MODIFIED = 'modified',
    DELETED = 'deleted',
    CONFLICT = 'conflict'
}


/** DSDataJSONRecord
 * Raw JSON object literal type
 */
interface DSDataJSONRecord {
    readonly _created: number;
    readonly _modified?: number;
}


/** Abstract data instance superclass
 * @since March 10, 2019
 */
class DSDataRecord {

    /** DSDataRecord constructor
     *
     * @property created - Defined as the timestamp at which the data
     * instance was saved; also used as the record's ID
     *
     * @property modified - Defined as the timestamp of the **most recent**
     * modification of this instance; set to -1 for instances that have not
     * been modified since they were created.
     */
    constructor(private created: number = -1, private modified: number = -1) {}


    /** Get a `DSDataRecord` from a **JSON** object or string
     *
     * @privateRemarks
     * This method explicitly checks the presence and types of the
     * `DSDataRecord` properties `_created`, which must be defined *and* a
     * `number`; and `_modified`, which must be `undefined` *or* a `number`.
     *
     * @param json - a JSON `object` or `string`
     *
     * @throws TypeError
     * Thrown if the provided object or string is not a valid `DSDataJSONRecord`
     */
    static fromJSON(json: DSDataJSONRecord|string): DSDataRecord {
        let inst: DSDataRecord = new this();

        let jobj: DSDataJSONRecord;
        if(typeof json === 'string') {
            let obj: {_created?: any, _modified?: any} = DataStorage.parse(json);
            if(obj._created === undefined || typeof obj._created !== 'number') {
                let er: TypeError = new TypeError(`A required private property is missing: ${json}`);
                er.name = 'InvalidJsonString';
                throw er;
            }
            if(obj._modified !== undefined && typeof obj._modified !== 'number') {
                let er: TypeError = new TypeError(`A required private property is invalid: ${json}`);
                er.name = 'InvalidJsonString';
                throw er;
            }

            jobj = <DSDataJSONRecord>obj;
        }
        else {
            if(json._created === undefined || typeof json._created !== 'number') {
                let er: TypeError = new TypeError(`Faulty JSON object ${json} does not define a _created property`);
                er.name = 'InvalidJsonObject';
                throw er;
            }
            if(json._modified !== undefined && typeof json._modified !== 'number') {
                let er: TypeError = new TypeError(`${json} specifies an invalid _modified property`);
                er.name = 'InvalidJsonObject';
                throw er;
            }

            jobj = json;
        }

        inst.created = jobj._created;
        if(jobj._modified !== undefined)
            inst.modified = jobj._modified;

        return inst;
    }


    /** Public getter method of the instance ID
     *
     * @privateRemarks
     * ID is defined as the private `created` property
     *
     * @returns the instance ID
     */
    get id(): number {
        return this.created;
    }


    /** Return a new instance whose properties values are identical to the
     * current instance
     *
     * @privateRemarks
     * This method excludes the `_created` and `_modified` properties unless the
     * optional `id` argument is `true`. Subclasses must override this
     * method and instantiate their return instance using `super.copy()`
     *
     * @param id - if `true`, the instance's ID property is also copied;
     *        defaults to `false`
     *
     * @returns a copy of this instance
     */
    copy(id: boolean = false): this {
        let copy: this;
        if(id === true) {
            // @ts-ignore
            copy = new this.constructor(this.id);
        }
        else {
            // @ts-ignore
            copy = new this.constructor();
        }

        return copy;
    }


    /** Get an object literal representing this data instance with the intent
     *  to serialize to a JSON string. Subclasses must implement this method
     *  and initiate their return value
     *  using `super.toJSON()`
     *
     *  @returns a JSON object literal representing the instance
     */
    toJSON(): object {
        return {
            _created: this.created,
            _modified: this.modified === -1 ? undefined : this.modified
        };
    }


    /** Get a human-readable string representation of the data instance, e.g.
     *  for console output. Subclasses must override this method
     *
     * @returns the class name and instance ID separated by a hash tag
     *
     * @override
     */
    toString(): string {
        return `${this.constructor.name}#${this.id}`;
    }
}


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
interface DSDataTypeIndex {
    [class_name: string]: DSDataRankIndex;
}

/** Data index by rank
 *   An object literal whose keys are `DSDataActivityRank` values
 *   The value at each key is the corresponding `DSDataIdIndex` container
 *   A rank index with no relevant data will be defined as an empty object
 *
 * This index is defined as a `type` alias, not an `interface`, so that
 * property keys may be restricted to `DSDataActivityRank` values (see
 * http://www.typescriptlang.org/docs/handbook/advanced-types.html#interfaces-vs-type-aliases
 * for details)
 *
 * @typedef {object.<DSDataActivityRank, DSDataIdIndex>} DSDataRankIndex
 * @dict
 */
type DSDataRankIndex = {
    [R in DSDataActivityRank]: DSDataIdIndex;
}

/** Data index by id
 *   An object literal whose keys are data instance ID's (cast to `string` types)
 *   The value at each key is the corresponding `DSDataRecord` instance
 *
 * typedef {object.<(string)DSDataRecordID, DSDataRecord>} DSDataIdIndex        //  #NEWPROJECT-JSDOCEXTEND Proposed format extension allowing explicit casting of one type to another
 * @typedef {object.<DSDataRecordID, DSDataRecord>} DSDataIdIndex
 * @dict
 */
interface DSDataIdIndex {
    [id: string]: DSDataRecord;
}


/** Reconcile result summary
 *
 * @since 3/12/2019
 */
class DSReconcileResult {

    /** Hash digest of the server's data file computed after running its
     *  reconciliation algorithm */
    readonly hash: string;

    /** Container object for reconciled/conflicting data records */
    data: DSDataTypeIndex = {};


    /** Instances must be constructed with the updated remote hash accounting for
     *  any data added/edited/deleted during reconciliation
     *
     * @param hash - The remote hash digest as returned by `reconcile.php`
     * @param [serverData] - The data object returned by `reconcile.php`
     */
    constructor(hash: string, serverData: DSDataTypeIndex) {
        this.hash = hash;
        this.data = serverData;
    }
 }


/** Sync result summary type
 *  The `DSSyncResult` combines two earlier "interfaces" to summarize all
 *  relevant info about a sync operation
 *   1. The resolved `local` and `remote` hash digests, and interface methods
 *      `get succeeds()`, `get sync()`, and `get hash()`
 *   2. The `DSReconcileResult` interface, with properties `hash` and
 *      `reconcile`
 *
 * @since 3/12/2019
 */
class DSSyncResult {

    /** Resolved local hash digest */
    readonly local: string;

    /** Resolved remote hash digest */
    readonly remote: string;

    /** Reconciliation result; defaults to an empty object */
    reconcile?: DSReconcileResult;

    /** The timestamp at which the sync was confirmed successful; default value
     *  of -1 indicates sync not yet confirmed
     */
    private _sync: number = -1;

    /** Instances must be constructed with the resolved local & remote hash values
     *
     * @param local - Resolved local hash digest
     * @param remote - Resolved remote hash digest
     * @param [reconcile] - reconciliation result; defaults to an empty object
     *
     */
    constructor(local: string, remote: string, reconcile?: DSReconcileResult) {
        this.local = local;
        this.remote = remote;

        // If a discrepancy was resolved, the resolved data instances are contained here
        this.reconcile = reconcile;
    }

    /** Get the timestamp at which the sync was confirmed successful; default
     * value of -1 indicates sync not yet confirmed
     */
    get sync(): number {
        return this._sync;
    }

    /** After a sync is confirmed, gets the hash digest both data stores have
     *  synced with
     */
    get hash(): string {
        return this.succeeds ? this.remote : '';
    }

    /** A simple, direct indication of whether or not the sync was successful */
    get succeeds(): boolean {
        if(typeof this.local !== 'string' || typeof this.remote !== 'string')
            throw new Error('DSSyncResult configured with non-string local' +
                ' or remote hash property');

        if(this.local !== this.remote)
            return false;

        //  Set the `_sync` property if this is the first time sync has been
        //  confirmed for this instance
        if(this._sync !== -1) {
            this._sync = Date.now();
        }

        return true;
    }
}

/*
type Sha256Digest = string;
function isSha256Digest(val: string): val is Sha256Digest {
    return (new RegExp('[a-zA-z0-9]{64}')).test(val);
}
*/
