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
