/** @file `DataStorage` class
 *  @author formulahunter
 * @since October 21, 2019
 */

/// <reference path="./DSTypeDefs.ts">

/** The `DataStorage` class provides an abstract interface to an advanced
 *  data storage protocol designed to be both fast and robust
 *
 *  @since November 25, 2019
 */
class DataStorage {

    /** **JavaScript** `Map` object mapping `DSDataRecordClass` ->
     *  `DSDataRecordContainer`
     */
    private types: Map<((...args: any) => any), any[]> = new Map();

    /** **JavaScript** `Map` object mapping `DSDataRecordClass` ->
     *  `DSDataDeletedRecordContainer`
     */
    private deleted: Map<((...args: any) => any), any[]> = new Map();

    /** "Index" mapping `DSDataRecordClassName`s to their
     *  respective `DSDataRecordClass`es
     */
    private classes: any = Object.create(null);

    /** The greatest ID assigned to any data instance
     *
     *  @remarks
     *  Used to assign unique ID's during batch save processes. An initial
     *  value of -1 is reassigned during initialization.
     */
    private maxID: number = -1;

    /**
     * @param key - The key to be used for storing data in localStorage
     * @param types - The class objects (constructor functions) of each data
     *        type to be managed by this `DataStorage` instance
     */
    constructor(private key:string, types: ((...args: any) => any)[]) {

        //  Configure data type index and containers
        for(let cls of types) {
            if(!(cls.prototype instanceof DSDataRecord)) {
                let er = new TypeError('Cannot construct DataStorage' +
                    ' instance with given data type ' + cls.toString() + ' -' +
                    ' data classes must extend DSDataRecord');
                er.name = "InvalidArgumentType";
                throw er;
            }

            this.types.set(cls, []);
            this.deleted.set(cls, []);
            this.classes[cls.name] = cls;
        }
    }


    /** Parse a JSON string into an Javascript Object
     *  Presently just an alias for `JSON.parse()`
     *
     * @param jstr - The string to be parsed
     *
     * @throws {DSErrorParseJSON}
     */
    static parse(jstr: string): object {
        try {
            return JSON.parse(jstr);
        }
        catch(er) {
            //  TODO CHANGE THIS BACK TO `DSErrorParseJSON` ONCE DEFINED
            let wrapper = new Error(`Failed to parse ${jstr}\n${er.toString()}`);
            wrapper.name = 'DSErrorParseJSON';

            throw wrapper;
        }
    }

    /** Serialize a JavaScrip Object into a string
     *  Presently just an alias for `JSON.parse()`
     *
     * @param val - The object to be serialized
     *
     * @throws {DSErrorSerializeJSON}
     */
    static serialize(val: object): string {
        try {
            return JSON.stringify(val);
        }
        catch(er) {
            //  TODO CHANGE THIS BACK TO `DSErrorSerializeJSON` ONCE
            //  DEFINED
            let wrapper = new Error(`Failed to serialize ${val}\n${er.toString()}`);
            wrapper.name = 'DSErrorSerializeJSON';

            throw wrapper;
        }
    }
}
