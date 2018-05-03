<?php
$target_dir = "../uploads/";
$target_file = $target_dir . basename($_FILES["model"]["name"]);

echo $target_file . "<br/>";

$method = $_POST["method"];
$iterations = $_POST["iterations"];
$max_generations = $_POST["max-generations"];
$args = "-q -g " . " -r " . $iterations . " -h " . $method . " ";
if ($method == "ga") {
  $args = $args . " -mg " . $max_generations . " -ga bin/unfolding.ga ";
}

if (move_uploaded_file($_FILES["model"]["tmp_name"], $target_file)) {
  // $cmd_method 
  $cmd = "bin/unfolder " . $args . $target_file . " > ../uploads/log.txt &";
  echo $cmd . "<br/>";
  exec($cmd);
} else {
  echo "Sorry, there was an error uploading your file.";
}
?>