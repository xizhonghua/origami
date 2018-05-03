<?php
$path = realpath("../uploads/");

$matched = array();

$it = new RecursiveDirectoryIterator($path);
$allowed = array("ori");
foreach(new RecursiveIteratorIterator($it) as $file) {
  if (in_array(substr($file, strrpos($file, '.') + 1), $allowed)) {
    array_push($matched, basename($file));
  }
}

echo json_encode($matched)

?>