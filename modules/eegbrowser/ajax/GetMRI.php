
<?php
/**
 * Endpoint for fetching one mri file
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

$dataPath = $rootDataPath . "mri/";

// avoid ../../../../../../etc/passwd security issues
$filename = basename($_GET['filename']);
if (empty($filename)) {
    error_log("ERROR: File '$filename' is a bad filename");
    header("HTTP/1.1 400 Bad Request");
    exit(1);
}

$path = $dataPath . $filename;

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
