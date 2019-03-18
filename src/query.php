<?php

$file = json_decode(file_get_contents('data/demo.json'));

function getHash() {
    global $file;

    //  Save a shallow copy of `$file` for manipulation without interfering with file contents
    $copy = clone $file;

    //  Remove the deleted list from the JSON object and encode the resulting data for hashing
    unset($copy->deleted);
    $jstr = json_encode($copy, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    file_put_contents('output.json', $jstr);

    //  json_encode() automatically removes whitespaces (spaces, tabs, newlines) in its return string
    //  Even if the data file is formatted for easy inspection in WebStorm, the hash value should compute correctly
    return hash('sha256', $jstr);
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
    global $file;

    //  Retrieve 'lastSync' and 'pushed'
    $lastSync = $data->sync;
    $recon = $data->instances;

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
    $server = new stdClass();
    foreach($compiled as $type => $typeArr) {
        //  Skip `$compiled->hash` which is a `number`
        if(!is_object($typeArr)) {
            continue;
        }

        //  Select instances from `$file` that have been created, modified, or deleted since `$lastSync`
        $server->$type = new stdClass();
        foreach ($file->$type as $serverInst) {
            //  Note that `$type` values are coming from `$compiled` so no need to check for `$type === "deleted"`
            $id = $serverInst->_created;

            //  Check if the instance was created since `$lastSync`
            //  If not, check if it was modified since `$lastSync`
            if ($id > $lastSync) {
                if (!isset($server->$type->new)) {
                    $server->$type->new = new stdClass();
                }
                $server->$type->new->$id = $serverInst;
            } else if ((isset($serverInst->_modified) && $serverInst->_modified > $lastSync)) {
                if (!isset($server->$type->modified)) {
                    $server->$type->modified = new stdClass();
                }
                $server->$type->modified->$id = $serverInst;
            }
        }
        foreach ($file->deleted->$type as $serverInst) {
            $id = $serverInst->_created;

            //  Check if the instance was deleted since `$lastSync`
            if ($serverInst->_deleted > $lastSync) {
                if (!isset($server->$type->deleted)) {
                    $server->$type->deleted = new stdClass();
                }
                $server->$type->deleted->$id = $serverInst;
            }
        }


        //  Iterate through screened server data instances
        //    - Compare with all instances received from the client
        //      - If any matches, mark as indeterminate
        //        - Check for matches by `$id`
        //        - Check for matches by text
        //        - Check for matches by text excluding timestamps
        //      - If no matches, add to `$compiled`
        foreach($server->$type as $serverStatus => $serverStatusArray) {
            foreach($serverStatusArray as $id => $serverInst) {
                //  Assign `$serverInst` to `$compiled` as if no conflict will be found
                $compiled->$type->$serverStatus->$id = $serverInst;
                if(!isset($recon->type))
                    continue;

                //  Check for conflicts and move `$serverInst` accordingly
                foreach($recon->$type as $clientStatus => $clientStatusArray) {
                    //  If not conflict exists, move on to the next client status
                    if(isset($clientStatusArray->$id)) {
                        //  Assign local reference to matching instance in `$clientStatusArray`
                        $clientInst = $clientStatusArray->$id;

                        //  Assign conflicting instances to the 'conflicts' array based on `$type`
                        //  `$serverInst` will always be the first instance in this array
                        if(is_array($compiled->$type->conflicts->$id)) {
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
                    /*else {
                        //  Check JSON text excluding timestamps
                        $serverClone = clone $serverInst;
                        $clientClone = clone $clientInst;

                        //  If match is found excluding timestamps, evaluate timestamps:
                        //    - If equal, mark as resolved with server value
                        //    - If not equal, mark as conflict to confirm duplicate on client

                        //  Remove the matching instance from the client data array
                        unset($clientStatusArray->$id);
                    }*/
                }
            }
        }

        //  Iterate through remaining client data instances
        //    - Compare with all instances stored on the server
        //    - Assign a resolved value of each into `$file` or `$compiled`
        if(isset($recon->$type) && isset($recon->$type->new)) {
            foreach($recon->$type->new as $id => $clientInst) {
                $conflicts = array_filter($file->$type, function($val) use ($id) {return $val->_created === $id;});
                if(count($conflicts) > 0) {
                    array_unshift($conflicts, $clientInst);
                    $compiled->$type->conflicts->$id = $conflicts;
                }
                else {
                    array_unshift($file->$type, $clientInst);
                }
            }
        }
        if(isset($recon->$type) && isset($recon->$type->modified)) {
            foreach($recon->$type->modified as $id => $clientInst) {
                $matches = array_filter($file->$type, function($val) use ($id) {return $val->_created === $id;});
                if(count($matches) === 0) {
                    $compiled->$type->conflicts->$id = array($clientInst);
                    //  If another instance has already been deleted, add it to the conflicts list
                    $deleted = array_filter($file->deleted->$type, function($val) use ($id) {return $val->_created === $id;});
                    if(count($deleted) > 0) {
                        array_splice($compiled->$type->conflicts->$id, 0, 0, $deleted);
                    }
                }
                else if(count($matches) > 1) {
                    array_push($matches, $clientInst);
                    $compiled->$type->conflicts->$id = $matches;
                }
                else {
                    $ind = array_search($matches[0], $file->$type);
                    array_splice($file->$type, $ind, 1, $matches);
                }
            }
        }
        if(isset($recon->$type) && isset($recon->$type->deleted)) {
            foreach($recon->$type->deleted as $id => $clientInst) {
                $matches = &array_filter($file->$type, function($val) use ($id) {return $val->_created === $id;});
                if(count($matches) === 0) {
                    $compiled->$type->conflicts->$id = array($clientInst);
                }
                else if(count($matches) > 1) {
                    array_push($matches, $clientInst);
                    $compiled->$type->conflicts->$id = $matches;
                }
                else {
                    $ind = array_search($file->$type, $clientInst);
                    array_splice($file->$type, $ind, 1);
                    array_unshift($file->deleted->$type, $clientInst);
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

        //  Clean up `$compiled` to minimize data transfer
        foreach($compiled->$type as $status => $statusArray) {
            if(count(get_object_vars($compiled->$type->$status)) === 0) {
                unset($compiled->$type->$status);
            }
        }
        if(count(get_object_vars($compiled->$type)) === 0) {
            unset($compiled->$type);
        }
    }

    //  Write all changes to disk

    //  MAKE SURE $file REFLECTS ALL CHANGES BEFORE COMPUTING HASH IN FOLLOWING COMMAND
    //   Compute new server hash and add to `$compiled`
    $compiled->hash = getHash();

    //   Return selected activity and new hash
    return json_encode($compiled, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
}

function saveNew($type, $inst, $ind) {
    global $file;

    $typeArray = false;
    switch($type) {
        case 'ingredient':
        case 'ingredients':
            $typeArray = &$file->ingredients;
            break;
        case 'recipe':
        case 'recipes':
            $typeArray = &$file->recipes;
            break;
        case 'meal':
        case 'meals':
            $typeArray = &$file->meals;
            break;
        case 'list':
        case 'lists':
            $typeArray = &$file->lists;
            break;
        /*case 'receipt':
        /*case 'receipts':
            $typeArray = &$file->receipts;
            break;*/
        default:
            die("Unknown data type \'$type\'");
    }

    //  Add new instance at given index
    //  New array members to be added must be provided in a container array
    //  Otherwise their properties are enumerated and added as key-value pairs
    array_splice($typeArray, $ind, 0, array($inst));

    //  Encode data object back to JSON string to write to file
    $jstr = json_encode($file, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT);

    //  Write new data string to file
    file_put_contents('data/mealplan.json', $jstr);

    //  Return new data hash
    return getHash();
}

function modify() {

}

function remove() {

}

$request = json_decode(file_get_contents('php://input'));
$query = $request->query;
switch($query) {
//    case "count":
//        echo countTxn();
//        return;
    case "hash":
        echo getHash();
        return;
    case "reconcile":
        echo reconcile($request->data);
        return;
    case "add":
        echo saveNew($request->type, $request->instance, $request->index);
        return;
//    case "edit":
//        echo modify($request->data);
//        return;
//    case "delete":
//        echo remove($request->data);
//        return;
}

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