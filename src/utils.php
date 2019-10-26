<?php

function json_indent($jobj) {
    //  Indented JSON strings are formatted as follows:
    //    1) The JSON object `$jobj` is encoded
    //      i) `JSON_PRETTY_PRINT` must be one of the encoding options
    //    2) 4-space indents are reduced to 2-space
    //    3) Newlines are appended with a single 4-space indent (namely **Markdown** code-block formatting)
    //      i) A single 4-space indent is prepended to the entire string, since it would not otherwise be inserted via the newline replace/append
    return IN . str_replace(LN, LN . IN, str_replace(IN, IN_JSON, json_encode($jobj, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)));
}
function json_code_block($jobj) {
    //  Indented JSON strings are formatted for **Markdown** output as follows:
    //  Two blank lines are inserted both before and after the string returned by json_indent() to preserve the code-block section in **Markdown** syntax
    //    - An indented block of text with un-indented text on the line immediately before or after will not be printed as a code block
    return str_repeat(LN, 2) . json_indent($jobj) . str_repeat(LN, 2);
}
function json_code_block_b($jobj) {
    //  Indented JSON strings are formatted for **Markdown** output as follows:
    //  Two blank lines are inserted both before and after the string returned by json_indent() to preserve the code-block section in **Markdown** syntax
    //    - An indented block of text with un-indented text on the line immediately before or after will not be printed as a code block
    return str_repeat(LN, 2) . $jobj . str_repeat(LN, 2);
}
function json_block_quote($jobj) {
    return '> ' . str_replace(LN, LN . '> ', $jobj);
}
function count_nl($subject) {
    //  Count the number of newline characters (as defined by `LN`) in a string
    return substr_count($subject, LN);
}

function stdSort($a, $b) {
    global $output;

//    LOG && $output .= "##### Sorting instances $a->_created & $b->_created" . LN ;
//    LOG && $output .= "\$a->_created type: " . gettype($a->_created) . LN;   //  Confirm types for debugging
//    LOG && $output .= "\$b->_created type: " . gettype($b->_created) . LN;   //  Confirm types for debugging
//    echo "\$a->_created type: " . gettype($a->_created) . LN;
//    echo "\$b->_created type: " . gettype($b->_created) . LN;

    //  Return 1, 0, or -1 if `$b` is greater than, equal to, or less than `$a`, respectively
    return ($a->_created < $b->_created) - ($a->_created > $b->_created);   //  https://stackoverflow.com/a/20460461/1657023
}
function add(&$container, $inst) {
    //  Insert the new instance to the end of the array
    $container[] = $inst;

    //  Re-sort the array using the standard sort algorithm
    usort($container, "stdSort");
}
function replace(&$container, $newInst) {
    global $output;

    //  Get the index of the instance to be replaced
    //  NOTE: the array returned by array_filter PRESERVES KEYS -- see below
    $matches = array_filter($container, function($val) use ($newInst) {
        return $val->_created === $newInst->_created;
    });

    LOG && $output .= '### replace()' . str_repeat(LN, 2);
    LOG && $output .= count($matches) . ' matches found in container array  ' /*. print_r($container, true)*/ . LN;
    LOG && $output .= 'matches: ' . print_r($matches, true);

    //  If zero or multiple matches, exit with error
    if(count($matches) === 0) {
        echo 'CANNOT_REPLACE_NO_MATCH';
        return null;    //  Return null rather than die so that log output is written to file (after switch statement in query.php
    }
    else if(count($matches) > 1) {
        echo 'CANNOT_REPLACE_MULTI_MACH';
        return null;    //  Return null rather than die so that log output is written to file (after switch statement in query.php
    }

    //  Get the index of the matched instance in the provided container array
    //  Since array_filter() preserves keys, we can't search $container for $matches[0] because $matches[0] will likely be undefined
    //  However, we can simply query the first "key" of $matches (there will only be one at this point, due to preceding conditionals)
    //  PHP >= 7.3.0 includes an array_keys_first() function to get the key of the first array element
    $ind = array_keys($matches)[0];
    if($ind === null) {
        LOG && $output .= 'cannot locate matched instance ' . print_r($matches[0], true) . ' in container array ' . print_r($container, true) . ' -- aborting' . LN;
        echo 'CANNOT_REPLACE_OLD_INST_NOT_FOUND';
        return null;    //  Return null rather than die so that log output is written to file (after switch statement in query.php)
    }

    LOG && $output .= 'index of match is ' . $ind . '  ' . str_repeat(LN, 2);

    //  Remove the old instance and insert the new one in its place
    array_splice($container, $ind, 1, array($newInst));

    //  Re-sort the array using the standard sort algorithm
    usort($container, "stdSort");
}
function remove($inst, &$container) {
    //  Retrieve the index of the instance in the provided container array
    $ind = array_search($inst, $container, true);
    if($ind === false)
        die('CANNOT_REMOVE_INST_NOT_FOUND');

    //  Remove the instance
    array_splice($container, $ind, 1);
}
