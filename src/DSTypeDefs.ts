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
enum DSDataActivityRank {NEW, MODIFIED, DELETED, CONFLICT}


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
    /** Defined as the timestamp at which the data instance was saved
     * Also used as the record's ID
     */
    private created: number = -1;

    /** Defined as the timestamp of the **most recent** modification of this
     * instance; set to -1 for instances that have not been modified since they
     * were created.
     */
    private modified: number = -1;


    /** Get a `DSDataRecord` from a **JSON** object or string
     *
     * @remarks
     * This method explicitly checks the presence and types of the
     * `DSDataRecord` properties `_created`, which must be defined *and* a
     * `number`; and `_modified`, which must be `undefined` *or* a `number`.
     *
     * @param json - a JSON `object` or `string`
     */
    static fromJSON(json: DSDataJSONRecord): DSDataRecord;
    static fromJSON(json: string): DSDataRecord;
    static fromJSON(json: any): any {
        let inst: DSDataRecord = new this();

        let jobj: DSDataJSONRecord;
        if(typeof json === 'string') {
            let obj: any = DataStorage.parse(json);
            if(obj._created === undefined || typeof obj._created !== 'number')
                throw new TypeError(`Faulty JSON string ${json} does not define a _created property`);
            if(obj._modified !== undefined && typeof obj._modified !== 'number')
                throw new TypeError(`Faulty JSON string ${json} specifies an invalid _modified property`);

            jobj = obj;
        }
        else {
            if(json._created === undefined || typeof json._created !== 'number')
                throw new TypeError(`Faulty JSON object ${json} does not define a _created property`);
            if(json._modified !== undefined && typeof json._modified !== 'number')
                throw new TypeError(`Faulty JSON object ${json} specifies an invalid _modified property`);

            jobj = json;
        }

        inst.created = jobj._created;
        if(jobj._modified !== undefined)
            inst.modified = jobj._modified;

        return inst;
    }

    /** Get an object literal representing this data instance, with the intent
     *  to serialize to a JSON string.
     *
     *  Subclasses must implement this method and initiate their return value
     *  using `super.toJSON()`
     */
    toJSON(): object {
        return {
            _created: this.created,
            _modified: this.modified === -1 ? undefined : this.modified
        };
    }
}
