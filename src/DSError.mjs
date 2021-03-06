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

/** Abstract class implements constructor and overrides built-in `toString()`
 *    DSError instances can be constructed but will be less useful than a context-specific subclass
 *
 * @extends Error
 *
 * @abstract
 */
class DSError extends Error {
    /** Constructor derives custom message from provided `message` argument
     *
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance, objects, or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message);

        /** Custom error message
         *      `{new line}<name>: <message | '-'><{new line}source | ''>`
         *
         * @type {string}
         */
        this.message = `\n${this.name}: ${message ? message : '-'}${source? `\n${source.toString()}` : ''}`;

        /** Abstract context info
         *
         */
        this.source = source;
    }

    /** Error type/constructor name
     *
     * @type string
     * @readonly
     */
    get name() {
        return this.constructor.name;
    }

    toString() {
        // return `${this.name}: ${this.message?`: ${this.message}`:''}${this.source?`\n${this.source.toString()}`:''}`;
        return this.message;
    }
    valueOf() {
        return this.toString();
    }
}

/** Error thrown when a value is of invalid type */
class DSErrorInvalidType extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}

/** Error thrown when `DataStorage#search()` catches an exception other than invalid argument type (see `DSErrorSearchInvalidType`) */
class DSErrorSearch extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when `DataStorage#search()` is called with an argument that is not recognized as a `DSDataRecord` subclass */
class DSErrorSearchInvalidType extends DSErrorInvalidType {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}

/** Error thrown when `save()` fails */
class DSErrorSave extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when `save()` fails due to failed preliminary sync */
class DSErrorSavePrelimSync extends DSErrorSave {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when `save()` fails due to failed final sync */
class DSErrorSaveFinalSync extends DSErrorSave {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}

/** Error thrown when `edit()` fails */
class DSErrorEdit extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when `edit()` fails due to failed preliminary sync */
class DSErrorEditPrelimSync extends DSErrorEdit {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when `edit()` fails due to failed local hash digest */
class DSErrorEditLocalHash extends DSErrorEdit {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when `edit()` fails due to failed remote hash digest */
class DSErrorEditRemoteHash extends DSErrorEdit {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when `edit()` fails due to failed final sync */
class DSErrorEditFinalSync extends DSErrorEdit {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}


/** Error thrown when `sync()` fails */
class DSErrorSyncFail extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}

/** Error thrown when `reconcile()` fails */
class DSErrorReconcile extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}

/** Error thrown when `hash()` fails */
class DSErrorComputeHashDigest extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}

/** Error thrown when `fromHexString()` fails */
class DSErrorConvertFromHexString extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when `toHextString()` fails */
class DSErrorConvertToHexString extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}

/** Error thrown when `_add()` fails */
class DSErrorAdd extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when `_add()` fails due to unrecognized data type */
class DSErrorAddInvalidType extends DSErrorAdd {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when `_add()` fails due to data ID conflict */
class DSErrorAddIDConflict extends DSErrorAdd {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}

/** Error thrown when `_replace()` fails */
class DSErrorReplace extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when `_replace()` fails due to unrecognized data type */
class DSErrorReplaceInvalidType extends DSErrorReplace {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when `_replace()` fails due to absence of corresponding instance */
class DSErrorReplaceNoMatch extends DSErrorReplace {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}


/** Error thrown when `_remove()` fails */
class DSErrorRemove extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}

/** Error thrown when `localStorage` fails to read a given key */
class DSErrorReadLocalData extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when `localStorage` fails to write to a given key */
class DSErrorWriteLocalStorage extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}

/** Error thrown when no local data is found and remote data load fails */
class DSErrorRemoteDataLoad extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}

/** Error thrown when XHR GET request fails */
class DSErrorXhrGetRequest extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when XHR GET request loads with bad status */
class DSErrorXhrGetRequestStatus extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when XHR POST request fails */
class DSErrorXhrPostRequest extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when XHR POST request loads with a status other than `200`/`OK` */
class DSErrorXhrPostRequestStatus extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}

/** Error thrown when `JSON` fails to serialize an object */
class DSErrorSerializeJSON extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when `JSON` fails to parse a string */
class DSErrorParseJSON extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when `DataStorage` fails to compile a data string */
class DSErrorCompileDataString extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}

/** Error thrown when local last-sync parameter read fails */
class DSErrorGetLastSync extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
     */
    constructor(message, source) {
        super(message, source);
    }
}
/** Error thrown when local last-sync parameter write fails */
class DSErrorSetLastSync extends DSError {
    /**
     * @param {string} message - message describing this error
     * @param {*} [source] - `Error` instance or condition (described in text) that caused this error to be generated
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



export {
    DSError,
    DSErrorAdd,
    DSErrorAddIDConflict,
    DSErrorAddInvalidType,
    DSErrorCompileDataString,
    DSErrorComputeHashDigest,
    DSErrorConvertFromHexString,
    DSErrorConvertToHexString,
    DSErrorEdit,
    DSErrorEditFinalSync,
    DSErrorEditLocalHash,
    DSErrorEditPrelimSync,
    DSErrorEditRemoteHash,
    DSErrorGetLastSync,
    DSErrorInvalidType,
    DSErrorParseJSON,
    DSErrorReadLocalData,
    DSErrorReconcile,
    DSErrorRemoteDataLoad,
    DSErrorRemove,
    DSErrorReplace,
    DSErrorReplaceInvalidType,
    DSErrorReplaceNoMatch,
    DSErrorSave,
    DSErrorSavePrelimSync,
    DSErrorSaveFinalSync,
    DSErrorSearch,
    DSErrorSearchInvalidType,
    DSErrorSerializeJSON,
    DSErrorSetLastSync,
    DSErrorSyncFail,
    DSErrorWriteLocalStorage,
    DSErrorXhrGetRequest,
    DSErrorXhrGetRequestStatus,
    DSErrorXhrPostRequest,
    DSErrorXhrPostRequestStatus,
}