<?php
namespace mutall;
//
//This file supports the link between the server and client sub-systems
//
//Start the buffering as early as possible. All html outputs will be 
//bufferred 
\ob_start();
//
//Catch all errors, including warnings.
\set_error_handler(function(
    $errno, 
    $errstr, 
    $errfile, 
    $errline /*, $errcontext*/
){
    throw new \ErrorException($errstr, $errno, \E_ALL, $errfile, $errline);
});
//The output structure has the format: {ok, result, html} where:-
//ok: is true if the returned result is valid and false if not. 
//result: is the user request if ok is true; otherwise it is the error message
//html: is any buffered html output message that may be helpful to interpret
//  the error message 
$output = new \stdClass();
//
//Catch any error that may arise.
try{
    //
    //Include the library where the mutall class is defined. (This will
    //throw a warning only which is not trapped. Avoid require. Its fatal!
    include_once  'schema.php';
    //
    //modify the permissions for the post json, for the first Iteration.
    // chmod('./post.json', 0777);
    //
    //Save the server postings to post.json for debugging 
    //purposes. Do this as early as we can, so that, at least we have a json for
    //debugging.
    mutall::save_globals('post.json');
    //
    //The database quering system
    include_once  'sql.php';
    //
    //This is the large tableload replacement for record (small table loads)
    include_once  'questionnaire.php';
    //
    //Methods for activating products are found in the app class
    include_once  'app.php';
    //
    //To support the merging operation
    include_once  'merger.php';
    //
    //Support for the tree view
    include_once  'path.php';
    //0
    //Register the class autoloader 
    //Why is the callback written as a string when the data type clearly 
    //states that it is a callable?
    \spl_autoload_register('\mutall\mutall::search_class');
    //
    //Run the requested method from a requested class
    $output->result = match(true){
        //
        //Upload files to the server
        isset($_POST["upload_files"]) => (new \mutall\mutall())->upload_files(),
        //
        //Execute a named method on a class        
        default => \mutall\mutall::fetch()
    };
    //
    //The process is successful; register that fact
    $output->ok=true;
}
//
//The user request failed
catch(\Exception $ex){
    
    //
    //Register the failure fact.
    $output->ok=false;
    //
    //Record the error message in a friendly way
    //
    //Replace the hash with a line break in the trace message
    $trace = str_replace("#", "<br/>", $ex->getTraceAsString());
    //
    //Compile the result following the above fragment
    $result ="
        <details>
            <summary>
                {$ex->getMessage()}
            </summary>
                $trace
        </details>";
    //
    $output->result = $result;
}
finally{
    
    //
    //Empty the output buffer to the output html property
    $output->html = ob_end_clean();
    //
    //Convert the output to a string
    $encode = \json_encode($output, \JSON_THROW_ON_ERROR);
    //
    //Return output to the client
    echo $encode;
}