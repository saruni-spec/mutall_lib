<?php
//
//Reade the sql from file. Convert to json, so that quotes are added
$sql = json_encode(file_get_contents("extension.sql"));
?>

<!DOCTYPE html> 
<!--
Demonstrating the zone idea using school exam data
-->
<html>
    <head>
        <title>Extending a Heterozone</title>
        <link rel="stylesheet" href="sample.css">
        
        <script type="module">
            //
            //Import score heterozone
            import {score} from "./extension.js";
            //
            //On loading the sample page....
            window.onload = async()=>{
                //
                //Use the base sql to tabulate scores
                const zone = new score(<?php echo $sql; ?>);
                //
                //Now show the score zone
                await zone.show();
            };
        </script>
    </head>

    <body>
    </body>
</html>