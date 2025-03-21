<?php
//
//Get the directory from where this file was launched form
$cwd = dirname($_SERVER['SCRIPT_NAME']);
?>

<!DOCTYPE html>
<html lang="en">
    <head>
        <title>MetaVisuo</title>
        <meta charset="UTF-8" />
        <link rel="stylesheet" href="../../../outlook/v/samples/sample.css">
        <link rel="stylesheet" href="../code/metavisuo.css" />

        <script type="module">
            //
            //Get the metavisuo applicatiion class
            import { metacrud } from './metacrud.js';
            //
            //
            window.onload = async () => {
                //
                //Create a metavisuo  page
                const page = new metacrud(<?php echo '"'.$cwd.'"'?>);
                //
                //Let the page be accessible outside of this class
                window.page = page;
                //
                //Show the metavisuo object
                await page.show_panels();
            };
        </script>
    </head>
    <body>
        <!--
        The header section-->
        <div id="header">
            <button id="zoom_out">&#43;</button>
            <button id="zoom_in">&#45;</button>
            <button id="pan_up">&#8743;</button>
            <button id="pan_down">&#8744;</button>
            <button id="pan_left">&#60;</button>
            <button id="pan_right">&#62;</button>
            <select id="databases"></select>
            <button id="save">save</button>
            <button id="comments">Comments</button>
            <button id="data_types">DataTypes</button>
            <button onclick="page.hide()">Hide</button>
            <button id="show">Show</button>
            <button id="show_data">Show Data</button>
            <button id="update">Update</button>
            <div>
                <button onclick="page.show_errors()">Show Errors</button>
                <div id="report"></div>
            </div>
        </div>
        <!--
        The content section-->
        <div id="content"></div>
        <div id="entities"></div>
    </body>
</html>
