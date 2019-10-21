/** @file `DataStorage` class
 *  @author formulahunter
 * @since October 21, 2019
 */

/// <reference path="./DSTypeDefs.js">

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
            //  TODO CHANGE THIS BACK TO THE instanceof OPERATOR ONCE
            //   DSTypeDefs IS MIGRATED
            // if(!(cls.prototype instanceof DSDataRecord)) {
            if(cls.prototype.constructor.name !== "DSDataRecord") {
                let er = new TypeError('Cannot construct DataStorage' +
                    ' instance with given data type ' + cls.toString() + ' -' +
                    ' data classes must extend DSDataRecord');
                er.name = "ConstructorArgumentMustExtendDSDataRecord";
                throw er;
            }

            this.types.set(cls, []);
            this.deleted.set(cls, []);
            this.classes[cls.name] = cls;
        }
    }
}
