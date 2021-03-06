
<?php
/**
 * Endpoint for fetching a zip of one or more iEEG .edf files
 *
 * PHP Version 5
 *
 * @category Loris
 * @package  EEGBrowser
 * @author   Armin Taheri <armin.ytaheri@gmail.com>
 * @license  Loris license
 * @link     https://github.com/aces/Loris-Trunk
 */

session_start();
if (!isset($_SESSION['paths'])) {
    $_SESSION['paths'] = [];
}

function command_exist($cmd) {
    $return = shell_exec(sprintf("which %s", escapeshellarg($cmd)));
    return !empty($return);
}

if (!command_exist('zip')) {
    error_log("ERROR: zip needs to be installed on this system.");
    header("HTTP/1.1 500 Internal Server Error.");
    exit(5);
}

require_once "rootPath.php";
if (!$rootDataPath) {
    error_log("ERROR: $rootDataPath does not exist");
    header("HTTP/1.1 500 Internal Server Error.");
    exit(1);
}

$dataPath = $rootDataPath;
$zipPath = "/tmp/ieegBundle";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_POST['channelnames'])) {
        error_log("ERROR: 'channelnames' not formatted as name1,name2,name3,...");
        header("HTTP/1.1 400 Bad Request");
        exit(5);
    }
    $channelNames = explode(",", $_POST['channelnames']);
    function makePath($channelName) {
        global $dataPath;
        return 'data/' . basename($channelName) . '.edf';
    }

    $paths = array_map(makePath, $channelNames);

    $_SESSION['paths'] = $paths;

    header("HTTP/1.1 200 Success");
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $paths = array_map(escapeshellarg, $_SESSION['paths']);
    if (empty($paths)) {
        error_log("WARNING: \$paths is empty.");
        header("HTTP/1.1 204 No Content");
        exit(1);
    }
    $_SESSION['paths'] = [];
    $zipargs = implode(" ", $paths);
    $i = 0;
    $countedZipPath = $zipPath . $i;
    while (file_exists($countedZipPath)) {
        $i++;
        $countedZipPath = $zipPath . $i;
    }
    $countedZipPath = $countedZipPath . '.zip';
    $cwd = getcwd();
    chdir($dataPath);
    shell_exec("zip " . $countedZipPath . " " . $zipargs);
    chdir($cwd);
    if (!file_exists($countedZipPath)) {
        error_log("ERROR: File $countedZipPath does not exist");
        header("HTTP/1.1 404 Not Found");
        exit(5);
    }
    header('Content-Disposition: attachment; filename="'.$zipname.'"');
    header('Content-Description: File Transfer');
    header('Content-Type: application/force-download');
    header("Content-Transfer-Encoding: Binary");
    header("Content-disposition: attachment; filename=\"" . basename($countedZipPath) . "\"");
    ob_clean();
    flush();
    readfile($countedZipPath);
    shell_exec("rm -f $countedZipPath"); // slightly insecure but easy.
    error_log("rm -f $countedZipPath");
}

?>
