<?php
/**
 * This file handles mounting the EEG Browser widget into a loris module.
 *
 * PHP Version 5
 *
 * @category LORIS
 * @package  Main
 * @author   Armin Taheri <armin.traheri@gmail.com>
 * @license  http://www.gnu.org/licenses/gpl-3.0.txt GPLv3
 * @link     https://www.github.com/aces/Loris
 */

/**
 *
 * @category LORIS
 * @package  Main
 * @author   Armin Taheri <armin.traheri@gmail.com>
 * @license  http://www.gnu.org/licenses/gpl-3.0.txt GPLv3
 * @link     https://www.github.com/aces/Loris
*/
class NDB_Form_eegbrowser extends \NDB_Form
{
    function eegbrowser()
    {

    }
    /**
     * Everyone has access to the eegbrowser module.
     *
     * @return boolean true if user has correct access permissions
     */
    function _hasAccess()
    {
        return true;
    }

    /**
     * Override base function to include EEGBrowser react component files.
     * and dependencies
     *
     * @return array of javascript files to be included
     */
    function getJSDependencies()
    {
        $factory =& \NDB_Factory::singleton();
        $baseURL = $factory->settings()->getBaseURL();

        $deps = parent::getJSDependencies();
        return array_merge(
            $deps,
            array(
             $baseURL . "/js/d3.min.js",
             $baseURL . "/eegbrowser/js/three.min.js",
             $baseURL . "/eegbrowser/js/OrbitControls.js",
             $baseURL . "/eegbrowser/js/pixpipe.min.js",
             $baseURL . "/eegbrowser/js/EEGBrowser.js",
            )
        );
    }
    /**
     * Override css fetching for eegbrowser css styles
     *
     * @return array of css files to be loaded into the eegbrowser page.
     */
    function getCSSDependencies()
    {
        $factory =& \NDB_Factory::singleton();
        $baseURL = $factory->settings()->getBaseURL();
        $deps    = parent::getCSSDependencies();
        return array_merge(
            $deps,
            [
             $baseURL . "/eegbrowser/css/eegbrowser.css",
            ]
        );
    }
}
?>
