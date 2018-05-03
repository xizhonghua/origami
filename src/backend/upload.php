<?php
$target_dir = "uploads/";
$target_file = $target_dir . basename($_FILES["model"]["name"]);

echo $target_file . "<br/>";

if (move_uploaded_file($_FILES["model"]["tmp_name"], $target_file)) {
  $cmd = "bin/unfolder -g " . $target_file . " > uploads/log.txt &";
  echo $cmd . "<br/>";
  exec($cmd);
} else {
  echo "Sorry, there was an error uploading your file.";
}
?>