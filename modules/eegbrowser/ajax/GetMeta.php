<?php
/**
 * iEEG Meta data fetching endpoint
 *
 * Computes an tree of iEEG signal metadata as JSON to use a props for the
 * SignalSelectionFilter and RegionSelect components.
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

$dataPath = $rootDataPath . "metadata/";

echo json_encode(computeSignalMeta());

class CSVTable {
    public $header = array();
    public $data = array();

    public function add($row) {
        array_push($this->data, $row);
    }
}

class InnerNode {
    public $type = "Inner";
    public $label = "";
    public $value = array();
}

class LeafNode {
    public $type = "Leaf";
    public $label = "";
    public $value = array();
}

class Channel {
    public $name = "";
    public $electrodeType = "";
    public $regionID = "";
    public $regionName = "";
    public $lobeName = "";
    public $hemisphere = "";
    public $oneCPPPR = "";
    public $nonRepeated = "";
    public $position = array(0, 0, 0);
}

function computeSignalMeta() {
    global $dataPath;
    $channelFile = fopen($dataPath . "out_with_extra_metadata_final.txt", "r");
    if (!$channelFile) {
        error_log("ERROR: Could not open " . $dataPath . "out_with_extra_metadata_final.txt");
        header("HTTP/1.1 500 Internal Server Error");
        exit(1);
    }
    $channels = csv2channels($channelFile, "\t");
    fclose($channelFile);
    return computeRegionTree($channels);
}

function groupBy($arr, $selector) {
    $comparator = function ($a, $b) use($selector) {
        return strcmp($selector($a), $selector($b));
    };
    $selected = array_map($selector, $arr);
    $result = array();
    for ($i = 0; $i < count($selected); $i++) {
        if (!$selected[$i]) {
            break;
        }
        if (isset($result[$selected[$i]])) {
            $result[$selected[$i]][] = $arr[$i];
        } else {
            $result[$selected[$i]] = array($arr[$i]);
        }
    }
    return $result;
}

function getRegionName($channel) {
    return $channel->regionName;
}

function computeRegions($channels) {
    $regions = groupBy($channels, getRegionName);
    $out = array();
    foreach($regions as $key => $value) {
        $regionNode = new LeafNode();
        $regionNode->label = $key;
        $regionNode->value = $value;
        $out[] = $regionNode;
    }
    return $out;
}

function getLobe($channel) {
    return $channel->lobeName;
}

function computeLobes($channels) {
    $lobes = groupBy($channels, getLobe);
    $out = array();
    foreach($lobes as $key => $value) {
        $lobeNode = new InnerNode();
        $lobeNode->label = $key;
        $lobeNode->value = computeRegions($value);
        $out[] = $lobeNode;
    }
    return $out;
}

function computeRegionTree($channels) {
    return computeLobes($channels);
}

function channelFromRow($header, $row) {
    $hemiMap = array("L" => "Left", "R" => "Right");
    $channel = new Channel();
    $channel->name = $row[$header["channelName"]];
    $channel->center = $row[$header["center"]];
    $channel->electrodeType = $row[$header["electrodeType"]];
    $channel->regionID = (int)$row[$header["region"]];
    $channel->regionName = $row[$header["regionName"]];
    $channel->hemisphere = $hemiMap[$row[$header["hemisphere"]]];
    $channel->lobeName = $row[$header["lobeName"]];
    $channel->oneCPPPR = (bool)$row[$header["OneContactPerPatientPerRegion"]];
    $channel->nonRepeated = (bool)$row[$header["NotRepeatedContacts"]];
    $channel->position = array(
        (int)$row[$header["x"]],
        (int)$row[$header["y"]],
        (int)$row[$header["z"]]
    );
    return $channel;
}

function csv2channels($file, $delimeter) {
    $arr = array();
    $isHeader = TRUE;
    $header = array();
    while (($row = fgetcsv($file, 10000, $delimeter)) !== FALSE) {
        if ($isHeader) {
            for ($i = 0; $i < count($row); $i++) {
                $header[$row[$i]] = $i;
            }
            $isHeader = FALSE;
            continue;
        }
        array_push($arr, channelFromRow($header, $row));
    }
    return $arr;
}

?>
