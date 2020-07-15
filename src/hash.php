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
