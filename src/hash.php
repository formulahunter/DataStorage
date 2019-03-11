<?php

$file = json_decode(file_get_contents('data/demo.json'));

//  Save a shallow copy of `$file` for manipulation without interfering with file contents
$copy = clone $file;

//  Remove the deleted list from the JSON object and encode the resulting data for hashing
unset($copy->deleted);
$jstr = json_encode($copy, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
//file_put_contents('output.json', $jstr);

//  json_encode() automatically removes whitespaces (spaces, tabs, newlines) in its return string
//  Even if the data file is formatted for easy inspection in WebStorm, the hash value should compute correctly
echo hash('sha256', $jstr);

?>