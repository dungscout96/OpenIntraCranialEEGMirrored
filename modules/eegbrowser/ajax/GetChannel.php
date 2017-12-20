<?php
/**
 * Endpoint for fetching one iEEG .edf file
 *
 * PHP Version 5
 *
 * @category Loris
 * @package  EEGBrowser
 * @author   Armin Taheri <armin.ytaheri@gmail.com>
 * @license  Loris license
 * @link     https://github.com/aces/Loris-Trunk
 */

require_once "rootPath.php";
if (!$rootDataPath) {
    error_log("ERROR: $rootDataPath does not exist");
    header("HTTP/1.1 500 Internal Server Error.");
    exit(1);
}

// Load config file and ensure paths are correct
set_include_path(
    get_include_path() . ":" .
    __DIR__ . "/../project/libraries:" .
    __DIR__ . "/../php/libraries"
);

$dataPath = realpath("/data/ieeg/data/edf/data") . "/";

// avoid ../../../../../../etc/passwd security hole pre-concat to $path.
$channelName = basename($_GET['channelname']);

$path = $dataPath . $channelName . '.edf';

if (!file_exists($path)) {
    error_log("ERROR: File $path does not exist");
    header("HTTP/1.1 404 Not Found");
    exit(5);
}

header('Content-Description: File Transfer');
header('Content-Type: application/force-download');
header("Content-Transfer-Encoding: Binary");
header("Content-disposition: attachment; filename=\"" . basename($path) . "\"");
readfile($path);
?>
