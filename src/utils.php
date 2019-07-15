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
    $matches = array_filter($container, function($val) use ($newInst) {
        return $val->_created === $newInst->_created;
    });

    LOG && $output .= '### replace()' . str_repeat(LN, 2);
    LOG && $output .= count($matches) . ' matches found in container array  ' . LN;

    //  If zero or multiple matches, exit with error
    if(count($matches) === 0) {
        echo 'CANNOT_REPLACE_NO_MATCH';
        die;
    }
    else if(count($matches) > 1) {
        echo 'CANNOT_REPLACE_MULTI_MACH';
        die;
    }

    //  Get the index of the matched instance in the provided container array
    $ind = array_search($matches[0], $container, true);
    if($ind === false) {
        echo 'CANNOT_REPLACE_OLD_INST_NOT_FOUND';
        die;
    }

    LOG && $output .= 'index of match is ' . $ind . '  ' . LN;

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
