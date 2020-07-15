/** @file `DataStorage` class
 *  @author formulahunter
 * @since October 21, 2019
 */

/*
 *     Copyright (C) 2018  Hunter Gayden
 *
 *     This program is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU Affero General Public License as
 *     published by the Free Software Foundation, either version 3 of the
 *     License, or (at your option) any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU Affero General Public License for more details.
 *
 *     You should have received a copy of the GNU Affero General Public License
 *     along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/// <reference path="./DSTypeDefs.ts">

/** The `DataStorage` class provides an abstract interface to an advanced
 *  data storage protocol designed to be both fast and robust
 *
 *  @since November 25, 2019
 */
class DataStorage {

    /** **JavaScript** `Map` object mapping `DSDataRecord` class objects to
     *  their respective record containers
     */
    private types: Map<((...args: any) => any), any[]> = new Map();

    /** **JavaScript** `Map` object mapping `DSDataRecord` class objects to
     *  their respective deleted record containers
     */
    private deleted: Map<((...args: any) => any), any[]> = new Map();

    /** An "index" mapping `DSDataRecordClassName`s to their respective
     *  `DSDataRecordClass`es
     */
    private classes: any = Object.create(null);

    /** The greatest ID assigned to any data instance
     *
     *  @remarks
     *  Used to assign unique ID's during batch save processes. An initial
     *  value of -1 is reassigned during initialization.
     */
    // @ts-ignore
    private maxID: number = -1;

    /** DSDataStorage constructor
     *
     * @param key - The key to be used for storing data in localStorage
     * @param types - The class objects (constructor functions) of each data
     *        type to be managed by this `DataStorage` instance
     *
     * @throws {TypeError}
     */
    // @ts-ignore
    constructor(private key: string, types: ((...args: any) => any)[]) {

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


    /** Parse a JSON string into a JavaScript Object
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
     * @throws {SyntaxError}
     */
    static serialize(val: object): string {
        try {
            return JSON.stringify(val);
        }
        catch(er) {
            //  TODO CHANGE THIS BACK TO `DSErrorSerializeJSON` ONCE
            //  DEFINED
            let wrapper = new SyntaxError(`Failed to serialize ${val}\n${er.toString()}`);
            wrapper.name = 'DSErrorSerializeJSON';

            throw wrapper;
        }
    }
}
