<?php

//  Constants/globals
const LN = "\n";
const LN_JSON = "  \n";
const IN = '    ';
const IN_JSON = '  ';
const URL = __FILE__;

//  Enable/disable server logs
const LOG = false;
LOG && $output = '';

//  Define resource locations
const DATA_FILE = '../../data/mealplan.json';
const LOG_FILE = '../../log/log.md';

//  Include utility functions
include 'utils.php';

//  Read data file from disk & parse as **JSON**
$file = json_decode(file_get_contents(DATA_FILE));

function getHash() {
    global $file, $output;

    //  Save a shallow copy of `$file` for manipulation without interfering with file contents
    $copy = clone $file;

    //  Remove the deleted list from the JSON object and encode the resulting data for hashing
    unset($copy->deleted);
    $jstr = json_encode($copy, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);

    LOG && $output .= '### getHash()' . str_repeat(LN, 2);
    LOG && $output .= '#### JSON object:' . json_code_block_b(json_indent($copy));
    LOG && $output .= '#### JSON string:' . json_code_block_b(json_indent($jstr));

    //  json_encode() automatically removes whitespaces (spaces, tabs, newlines) in its return string
    //  Even if the data file is formatted for easy inspection in WebStorm, the hash value should compute correctly
    $hash = hash('sha256', $jstr);
    LOG && $output .= '#### digest: ' . str_repeat(LN, 2) . "computed hash digest: `$hash`" . str_repeat(LN, 2);
    return $hash;
}
function write_file() {
    global $file, $output;

    //  Encode data object back to JSON string to write to file
    $jstr = json_encode($file, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT);

    LOG && $output .= '### write_file()' . str_repeat(LN, 2);
    LOG && $output .= '#### data file:' . json_code_block_b(json_indent($file));
    LOG && $output .= '#### data string:' . json_code_block_b(json_indent($jstr));

    //  Write new data string to file
    $result = file_put_contents(DATA_FILE, $jstr);

    //  Log confirmation
    LOG && $output .= '#### result:' . LN . LN . "$result bytes written to disk" . LN . LN;

    //  Return new data hash
    return getHash();
}


/** RECONCILE
 *  1) Resources: server data file, instances sent from client, list successful sync
 *     a) Define a container to store results that need to be returned to the client upon completion
 *  2) Screen all server data against last-sync date; organize as created-since, modified-since, or deleted-since
 *  3) For all screened data instances, search for a match among the client instances
 *     a) If no match, add to the 'return' container as non-conflict
 *     b) If a match is found, remove it from the client list and add both to the 'return' container as conflicting
 *  4) For all remaining instances in the data sent from the client, search for a match among *entire* data file
 *     a) Update the data file as necessary based on rank (new, modified, deleted) of client instance
 *  5) Overwrite the server data file to reflect any changes that were made
 *  6) Compute the new server hash digest and return it, along with any data updates, to the client
 *
 *  ***Always give priority to the server's data to pushed resolutions outward rather than pull conflicts inward
 *
 *
 * @param $data
 * @return false|string
 */
function reconcile($data) {
    /*
        DATA RECONCILIATION
        Data reconciliation is based on three inputs: lastSync, data provided by the client, and data saved on the server
         - `$recon` is the 'instances' data passed from the client, assumed to all be after `$lastSync`
         - The entire data file is retained in `$file`
         - `$compiled` is where the results are compiled to be returned to the client
         - Each data instance in `$file` is screened against `$lastSync` and earlier instances are ignored
         - Instance ID's are checked against the ID's provided by the client -- instances indicated as new, modified, and deleted are all cross-checked
         - All ID's that do not match one received from the client are added to the `$compiled` list in the appropriate category
         - All matches are checked for most recent modification relative to '$lastSync'
            - If only one has been changed since `$lastSync`, the other is altered to match
            - Else if the serialized data strings are exactly equal, the more recent copy is used
            - Else both have changed since, and both are added to the appropriate 'conflicts' list
         - Server data file is iterated first; cleared instances are removed from `$recon`; then any remaining instances in `$recon` are cleared against the same algorithm
    */
    global $file, $output;

    //  Retrieve 'lastSync' and 'pushed'
    $lastSync = $data->sync;
    $recon = $data->instances;
    if(LOG) {
        $output .= '### reconcile()' . str_repeat(LN, 2);
        $output .= '> *$lastSync:* `' . gettype($lastSync) . ' ' . $lastSync . '`' . LN_JSON;
        $output .= '> *$recon:*' . LN . '> ' . LN . json_block_quote(json_indent($recon)) . str_repeat(LN, 2);
        $output .= LN;
    }

    //  Compile all changes since lastSync
    //  Compare provided activities with activities on disk
    //   - Resolve any id conflicts

    //   Select all server activity since lastSync
    //   Check selected activity vs. transmitted for ID conflict
    //    - Place each instance in an indicative container in `$compiled`
    //    - Remove transmitted data incrementally as it is matched against existing server instances
    //  Check remaining transmitted data vs. all server data (not just selected)
    //    - Place each instance in an indicative container in `$compiled`

    //  `$compiled` is a container of containers for each data type/status combo, e.g. ingredients-new, ingredients-modified, etc.
    LOG && $output .= '#### constructing compiled-data index from local file' . LN;
    $compiled = new stdClass();
    foreach($file as $type => $value) {
        if($type === 'deleted')
            continue;

        $compiled->$type = new stdClass();
        $compiled->$type->new = new stdClass();
        $compiled->$type->modified = new stdClass();
        $compiled->$type->deleted = new stdClass();
        $compiled->$type->conflicts = new stdClass();
    }
    LOG && $output .= '`$compiled` template:' . json_code_block($compiled);
    LOG && $output .= LN;

    //  Check for ID conflicts and resolve
    //  The following nested loops iterate over every type/status combination
    //    - Server data is compared against the client data first
    //      - Conflicts are removed from the client data array and added to the `$compiled` array regardless of conflict rank
    //    - Any client data remaining in `$recon` is then checked against the server data
    //
    //  After the entire reconciliation algorithm is complete:
    //    - `$file` will be encoded and re-written to the server data file
    //    - `$compiled` will be returned to the client with changes since its last sync, including unresolved conflicts
    //  Therefore every data instance created/modified since the last sync should be sorted into one of these two containers

    LOG && $output .= '#### iterating over all data types in `$compiled`' . str_repeat(LN, 2);
    $server = new stdClass();
    foreach($compiled as $type => $typeArr) {
        //  Skip `$compiled->hash` which is a `number`
        if(!is_object($typeArr))
            continue;

        LOG && $output .= "##### `$type` records" . str_repeat(LN, 2);

        //  Select instances from `$file` that have been created, modified, or deleted since `$lastSync`
        LOG && $output .= '###### screening server records against last-sync' . LN;
        $server->$type = new stdClass();
        foreach($file->$type as $serverInst) {
            //  Note that `$type` values are coming from `$compiled` so no need to check for `$type === "deleted"`
            $id = $serverInst->_created;

            //  Check if the instance was created since `$lastSync`
            //  If not, check if it was modified since `$lastSync`
            if($id > $lastSync) {
                LOG && $output .= '**server instance `' . $id . '` created after last sync**' . LN_JSON;
                LOG && $output .= str_repeat(IN, 2) . '**> adding to `server->new` container**' . LN;
                if(!isset($server->$type->new))
                    $server->$type->new = new stdClass();

                $server->$type->new->$id = $serverInst;
            }
            else if((isset($serverInst->_modified) && $serverInst->_modified > $lastSync)) {
                LOG && $output .= '**server instance `' . $id . '` modified after last sync**' . LN_JSON;
                LOG && $output .= str_repeat(IN, 2) . '**> adding to `server->modified` container**' . LN_JSON;

                if(!isset($server->$type->modified))
                    $server->$type->modified = new stdClass();

                $server->$type->modified->$id = $serverInst;
            }
            else {
                LOG && $output .= 'server instance `' . $id . '` unchanged since last sync' . LN_JSON;
            }
        }
        foreach($file->deleted->$type as $serverInst) {
            $id = $serverInst->_created;

            //  Check if the instance was deleted since `$lastSync`
            if($serverInst->_deleted > $lastSync) {
                if(!isset($server->$type->deleted))
                    $server->$type->deleted = new stdClass();

                $server->$type->deleted->$id = $serverInst;
            }
        }
        LOG && $output .= LN;


        //  Iterate through screened server data instances
        //    - Compare with all instances received from the client
        //      - If any matches, mark as indeterminate
        //        - Check for matches by `$id`
        //        - Check for matches by text
        //        - Check for matches by text excluding timestamps
        //      - If no matches, add to `$compiled`
        if(LOG) {
            $output .= "###### checking screened server `$type` instances for conflicts" . LN;
            if(count(get_object_vars($server->$type)) === 0)
                $output .= 'no screened server instances to be checked for conflicts' . LN_JSON;
        }

        foreach($server->$type as $serverStatus => $serverStatusArray) {
            foreach($serverStatusArray as $id => $serverInst) {
                //  Assign `$serverInst` to `$compiled` as if no conflict will be found
                $compiled->$type->$serverStatus->$id = $serverInst;
                LOG && $output .= 'tentatively adding instance to `compiled->' . $serverStatus . '` container' . str_repeat(LN, 2);
                LOG && $output .= json_indent($serverInst) . str_repeat(LN, 2);

                //  Prevent `notice`/`warning` messages from being returned to client
                if(!isset($recon->$type))
                    continue;

                //  Check for conflicts and move `$serverInst` accordingly
                foreach($recon->$type as $clientStatus => $clientStatusArray) {
                    //  If no conflict exists, move on to the next client status
                    if(isset($clientStatusArray->$id)) {
                        //  Assign local reference to matching instance in `$clientStatusArray`
                        $clientInst = $clientStatusArray->$id;

                        //  Assign conflicting instances to the 'conflicts' array based on `$type`
                        //  `$serverInst` will always be the first instance in this array
                        if(isset($compiled->$type->conflicts->$id)) {
                            //  If the conflicts array has already been defined, just push the new instance
                            $compiled->$type->conflicts->$id[] = $clientInst;
                        }
                        else {
                            //  If this is the first conflict for this id:
                            //    - Create a conflict array containing the two instances
                            //    - Remove `$serverInst` from the non-conflict location in `$compiled`
                            $compiled->$type->conflicts->$id = array($serverInst, $clientInst);
                            unset($compiled->$type->$serverStatus->$id);
                        }

                        //  Remove the matching instance from the client data array
                        unset($clientStatusArray->$id);
                    }
                    else {
                        //  Check JSON text excluding timestamps
                        /*$serverClone = clone $serverInst;
                        $clientClone = clone $clientInst;

                        //  If match is found excluding timestamps, evaluate timestamps:
                        //    - If equal, mark as resolved with server value
                        //    - If not equal, mark as conflict to confirm duplicate on client

                        //  Remove the matching instance from the client data array
                        unset($clientStatusArray->$id);*/

                        //  Temporary override/patch until advanced data matching is implementation
                        LOG && $output .= "confirmed no conflicts for server instance id $id" . str_repeat(LN, 2);
                    }
                }
            }
            LOG && $output .= LN;
        }
        LOG && $output .= LN;

        //  Iterate through remaining client data instances
        //    - Compare with all instances stored on the server
        //    - Assign a resolved value of each into `$file` or `$compiled`
        if(isset($recon->$type)) {
            LOG && $output .= "###### checking client data `$type` instances for conflicts" . LN_JSON;

            if(isset($recon->$type->new)) {
                LOG && $output .= '####### checking `new` instances' . LN_JSON;
                if(LOG && count(get_object_vars($server->$type)) === 0)
                    $output .= 'no `new` client instances to be processed' . LN;

                foreach($recon->$type->new as $id => $clientInst) {
                    $conflicts = array_filter($file->$type, function($val) use ($id) {
                        return $val->_created === $id;
                    });
                    if(count($conflicts) > 0) {
                        LOG && $output .= count($conflicts) . " conflicts found in server data for `new` client id $id" . LN;
                        array_unshift($conflicts, $clientInst);
                        $compiled->$type->conflicts->$id = $conflicts;
                    }
                    else {
                        LOG && $output .= "no conflicts for `new` client id $id" . LN;
                        add($file->$type, $clientInst);
                    }
                }
                LOG && $output .= LN;
            }
            if(isset($recon->$type->modified)) {
                LOG && $output .= '####### iterating through `modified` instances' . LN_JSON;
                if(LOG && count(get_object_vars($server->$type)) === 0)
                    $output .= 'no `new` client instances to be processed' . LN;

                foreach($recon->$type->modified as $id => $clientInst) {
                    $matches = array_filter($file->$type, function($val) use ($id) {
                        return $val->_created === $id;
                    });
                    LOG && $output .= count($matches) . " matches found in server data for `modified` client id $id" . LN_JSON;

                    //  If there are no matches, then the server has no record to modify
                    //    - Check the server's `deleted` container
                    //      - If id match is found, compare modified and deleted timestamps
                    //  If there are more than 1 matches, then mark all instances as conflicts
                    //  If there is exactly one match, then:
                    //    If the server instance's `_modified` property is `undefined` OR less than the client instance's `_modified` property, then resolve the match to the client instance
                    //    Else mark the two instances as conflicts
                    if(count($matches) === 0) {
                        //  Temporary override/patch
                        //  Mark the client instance as a solo conflict to draw attention
                        //    - If another instance has already been deleted, add it to the conflicts list
                        LOG && $output .= IN . '**THIS CASE IS NOT FULLY IMPLEMENTED AND MAY HAVE UNPREDICTABLE RESULTS**' . LN;

                        $compiled->$type->conflicts->$id = array($clientInst);
                        $deleted = array_filter($file->deleted->$type, function($val) use ($id) {
                            return $val->_created === $id;
                        });
                        if(count($deleted) > 0)
                            array_splice($compiled->$type->conflicts->$id, 0, 0, $deleted);
                    }
                    else if(count($matches) > 1) {
                        //  There shouldn't be more than one match for a given id
                        LOG && $output .= IN . '**ERROR - DATA FILE HAS BEEN IMPROPERLY MAINTAINED**' . LN;

                        array_push($matches, $clientInst);
                        $compiled->$type->conflicts->$id = $matches;
                    }
                    else {
                        //  Replace the server's record with the client's subject to the following data-integrity check
                        //  Criteria for clean replacement are:
                        //    1) The matched server instance has not been `_modified`
                        //      **OR**
                        //    2) All modifications are congruent:
                        //      a) The matched server instance was `_modified` before `lastSync`
                        //        **AND**
                        //      b) The client instance was modified more recently that the server instance
                        if(!isset($matches[0]->_modified) || ($matches[0]->_modified < $lastSync && $clientInst->_modified > $matches[0]->_modified)) {
                            LOG && $output .= IN . "clean replacement of client-modified record $id" . LN;

                            //  Replace the instance and maintain correct sort order
                            replace($file->$type, $matches[0], $clientInst);
                        }
                        else {
                            LOG && $output .= IN . "aborting incongruent replacement of modified record $id" . LN;

                            array_push($matches, $clientInst);
                            $compiled->$type->conflicts->$id = $matches;
                        }
                    }
                }
                LOG && $output .= LN;
            }
            if(isset($recon->$type->deleted)) {
                LOG && $output .= '####### iterating through `deleted` instances' . LN;
                foreach($recon->$type->deleted as $id => $clientInst) {
                    $matches = array_filter($file->$type, function($val) use ($id) {
                        return $val->_created === $id;
                    });
                    if(count($matches) === 0) {
                        $compiled->$type->conflicts->$id = array($clientInst);
                    }
                    else if(count($matches) > 1) {
                        array_push($matches, $clientInst);
                        $compiled->$type->conflicts->$id = $matches;
                    }
                    else {
                        //  Remove the instance from its container array
                        remove($file->$type, $clientInst);

                        //  Add the instance to its respective "deleted" container
                        add($file->deleted->$type, $clientInst);
                    }
                }
            }
            /*foreach($recon->$type as $clientStatus => $clientStatusArray) {
                foreach($clientStatusArray as $id => $clientInst) {
                    //  Add the new client instance to the beginning of the server array as if no conflicts will be found
                    foreach($file->$type as $serverTypeArray) {
                        array_shift($serverTypeArray, $clientInst);
                        foreach($serverTypeArray as $ind => $serverInst) {
                            if($serverInst->_created !== $id) {
                                continue;
                            }

                            //  If a conflict is found, relocate the client instance from the beginning of the array to the location of the matched server instance
                        }
                    }
                }
            }*/
            LOG && $output .= LN;
        }

        //  Clean up `$compiled` to minimize data transfer
        foreach($compiled->$type as $status => $statusArray) {
            if(count(get_object_vars($compiled->$type->$status)) === 0)
                unset($compiled->$type->$status);
        }
        if(count(get_object_vars($compiled->$type)) === 0)
            unset($compiled->$type);
    }

    //  Write all changes to disk
    LOG && $output .= 'reconciled data to be written to file on server:' . json_code_block($file);
    LOG && $output .= LN;
    $newHash = write_file();

    //  Define container `data` object
    $result = new stdClass();
    $result->data = $compiled;

    //  MAKE SURE $file REFLECTS ALL CHANGES BEFORE COMPUTING HASH IN FOLLOWING COMMAND
    //   Compute new server hash and add to `$compiled`
    $result->hash = $newHash;

    //   Return selected activity and new hash
    LOG && $output .= 'compiled data to be returned to client:' . json_code_block($result);
    LOG && $output .= LN;
    return json_encode($result, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
}

function save($inst, $type) {
    global $file, $output;

    LOG && $output .= '### save()' . str_repeat(LN, 2);
    LOG && $output .= "#### new instance to be saved:" . json_code_block_b(json_indent($inst));

    if(!isset($file->$type)) {
        LOG && $output .= "unrecognized type $type cannot be saved to file" . str_repeat(LN, 2);
        echo('CANNOT_ADD_INVALID_TYPE');
        return null;
    }

    //  Add new instance to the respective array
    add($file->$type, $inst);
    LOG && $output .= "#### $type container after addition:" . json_code_block_b(json_indent($file->$type));

    //  Write data to file & return new hash
    return write_file();
}

function modify($inst, $type) {
    global $file, $output;

    LOG && $output .= '### modify()' . str_repeat(LN, 2);
    LOG && $output .= "#### new $type instance to replace existing:" . json_code_block_b(json_indent($inst));

    if(!isset($file->$type)) {
        LOG && $output .= "cannot replace unrecognized type $type" . str_repeat(LN, 2);
        echo('CANNOT_MODIFY_INVALID_TYPE');
        return null;
    }

    replace($file->$type, $inst);
    LOG && $output .= "#### $type container after replacement:" . json_code_block_b(json_indent($file->$type));

    //  Write data to file & return new hash
    return write_file();
}

function delete() {

}

$request = json_decode(file_get_contents('php://input'));

//  Log new data string to file
$title = date(DATE_COOKIE);
LOG && $output .= $title . LN;
LOG && $output .= str_repeat('=', strlen($title)) . LN;
LOG && $output .= '> **url:** `' . URL . '`' . LN_JSON;
LOG && $output .= '> **parameters:** `' . json_encode($request) . '`' . str_repeat(LN, 2);

$query = $request->query;
$qtitle = "query: `$query`";
LOG && $output .= $qtitle . LN;
LOG && $output .= str_repeat('-', strlen($qtitle)) . str_repeat(LN, 2);
switch($query) {
//    case "count":
//        echo countTxn();
//        break;
    case "hash":
        echo getHash();
        break;
    case "reconcile":
        echo reconcile($request->data);
        break;
    case "add":
        echo save($request->instance, $request->type);
        break;
    case "edit":
        echo modify($request->instance, $request->type);
        break;
//    case "delete":
//        echo remove($request->data);
//        break;
}

LOG && $output .= LN;
LOG && file_put_contents(LOG_FILE, $output . file_get_contents(LOG_FILE));
return;

//  SINGLE PHP FILE TO HANDLE HASH, COUNT, STAMPS, INSTANCES, NEW, RECONCILE
//    - HASH IS MOST COMMON & SIMPLEST
//      - {query: 'hash'}
//      - return: hash()
//    - *COUNT IS QTY OF TXNS ON SERVER
//      - {query: 'count'}
//      - return: count()
//    - *STAMPS IS ARRAY OF INTEGER '_created' VALUES OF ALL TXNS ON FILE
//      - {query: 'stamps'}
//      - return: [array of _created values]]
//    - *INSTANCES IS ARRAY OF TXN INSTANCES SPECIFIED BY '_created' VALUES
//      - {query: 'txns', data: [array of _created values]}
//      - return: txns()
//    - ADD TRIGGERS ADDITION OF NEW TRANSACTION INSTANCE TO FILE & RETURNS HASH BY DEFAULT
//      - {query: 'add', data: {txn data obj}}
//      - return: hash()
//    - EDIT CHANGES GIVEN PROPERTIES OF A SPECIFIC TRANSACTION
//      - {query: 'edit', data: {txn data obj}}
//      - return: hash()
//    - DELETE REMOVES A TRANSACTION'S DATA AND MOVES IT TO THE 'DELETED' INDEX
//      - {query: 'delete', data: '_created value'}
//      - Remove indicated transaction from log entirely
//      - Add _created ID to deleted array along with time of request
//      - As with adds & edits, the timestamp should be generated by the client
//      - return: hash()
//    - RECONCILE IDENTIFIES POSSIBLE DISCREPANCIES GIVEN A SPECIFIC QUERY DATE
//      - {query: 'reconcile', data: 'timestamp'}
//      - return: {new: [array of txn instances], modified: [array of txn instances], deleted: [array of _created values]}
//
//  *MAY NOT IMPLEMENT THESE TO REDUCE DATA EXPOSURE

?>
