<?php

//  Load object from string
$jobj = json_decode(file_get_contents('php://input'));

//  Load file data into object
$file = json_decode(file_get_contents('data/demo.json'));

//  Add new data to file
foreach($jobj as $key => $value) {
    $file->$key = $value;
}

//  Encode data object back to JSON string to write to file
$jstr = json_encode($file, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT);

//  Write new data string to file
file_put_contents('data/demo.json', $jstr);

//  Return new data hash
echo(hash('sha256', $jstr));

?>