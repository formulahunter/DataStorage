<?php

/**
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
