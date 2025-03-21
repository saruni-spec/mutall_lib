<?php
//All out php code is placed in the mutall namespace. Therefore native PHP 
//functions and constants must be prefixed with a \
namespace mutall;

//
require_once 'config.php';
//
require_once 'mutall_mailer.php';
//
//Include questionnaire to see if this addresses the following problem
//Fatal error: 
//  Could not check compatibility between 
//      mutall\capture\artefact::pk(): mutall\capture\column 
//  and mutall\entity::pk(): mutall\column, 
//  because class mutall\capture\column is not available 
//in questionnaire.php on line 796
//
//This did not solve the problem, so I commemneted it out
//require_once 'questionnaire.php';
//
//The super class that supports the common methods for all the classes 
//in a mutall project. 
class mutall {
    //
    //Every mutall object is characterised by this property
    public string $class_name;
    //
    //The namespace of this mutall object
    public string $ns;
    //
    public bool $throw_exception;
    //
    //To support uploading of files
    //
    //The upload input arguments, eg., destination,action, etc
    public \stdClass $inputs;
    //
    //The files to be uploaded
    public array $files;
    //
    //An array of myerrors to support error reporting for all mutall 
    //based objects
    public array /*<myerror>*/ $errors = [];
    //
    function __construct(bool $throw_exception = true) {
        //
        //What do you do if there are any (entity) errors?. That depends on the
        //given parameter -- throw_exception. The Default is true
        $this->throw_exception = $throw_exception;
        //
        //Set the class_name of this method
        //
        $reflect = new \ReflectionClass($this);
        $this->class_name = $reflect->getShortName();
        //
        //Add the namespace from which this objet was created
        $this->ns = $reflect->getNamespaceName();
    }
    //
    //Given a password the hash function will hash the password by utilizing the password hash native
    //php function then return the hashed password
    function password_hash(string $password):string{
        //
        //Hash the password
        return \password_hash($password, PASSWORD_DEFAULT);
    }
    //
    //Given a password verify if the password matches the hash using the native password verify funtion
    //in php. This funtion will help during the logging in process
    function password_verify(string $password, string $hash):bool{
        //
        //Return a boolean in that if the password match return true otherwise false
        return \password_verify($password, $hash);
    }
    //
    //Returns the directory from where this file was launched (as a json 
    //string so that it is quoted). This function is required tyPIcally when 
    //we launch a php script as an app; then we can transfer the cwd to javaccript
    //code, e.g., 
    // const x = new workplan(<?php echo mutall.cwd(); ? >)
    static function cwd():string{
        //
        /*Get the execution script relative to the root, e.g,
        /workplan/v/code/test.php
        */
        $script = $_SERVER['SCRIPT_NAME'];
        //
        //Extract the directory component
        $dir = dirname($script);
        //
        //Json-encode the mame, this adding quotes
        return (json_encode($dir));
    }

    //The function that supports executon of arbitray methods on arbitrary class
    //objects from Javascript. This method is called from index.php. 
    static function fetch()/*:result*/ {
        //
        //The class name must be set 
        if (!isset($_REQUEST['class'])) 
            throw new \Exception('Class name not found in $_REQUEST');
        
        // 
        //Get the requested class name. PHP classes referenced in Javascript are
        //expected to be found in the \mutall namespace
        $class = "\\mutall\\".$_REQUEST['class'];
        //
        //The method must be set
        if (!isset($_REQUEST['method'])) {
            throw new \Exception('The method of the class to execute must be set');
        }
        //
        //Retrieve and set the method from the global request 
        $method = $_REQUEST['method'];
        //
        //Get the method parameters 
        if (!isset($_REQUEST['margs'])) {
            throw new \Exception("Method parameters not found");
        }
        $margs = json_decode($_REQUEST['margs'], null, 512, JSON_THROW_ON_ERROR);
        //
        //This method is executable at an object state or static state
        //controlled by the is_static property at the request
        $is_static = isset($_REQUEST['is_static']) && $_REQUEST['is_static'];
        //
        //If this is an object method...
        if (!$is_static) {
            //
            //Create an object of the class to execute
            //
            //Get the class contructor arguments
            if (!isset($_REQUEST['cargs'])) {
                throw new \Exception("Class constructor parameters not found");
            }
            $cargs = json_decode($_REQUEST['cargs'], null, 512, JSON_THROW_ON_ERROR);
            $obj = new $class(...$cargs);
            //
            //Execute on object method
            $result = $obj->$method(...$margs);
            
        } else {
            //
            //Execute the static method on the class 
            $result = $class::$method(...$margs);
        }
        //
        //This is the Expected result from the calling method
        return $result;
    }

    
     //Upload files to the server
     function upload_files(): void{
        //
        //Retrieve the imagery
        $this->inputs= json_decode($_POST['inputs']);
    
        //It is an error if there are no files to upload
        if (!isset($_FILES['files'])) throw new \Exception('There are no files to upload');
        //
        $this->files = $_FILES['files'];
        //   
        // Loop through each uploaded file and save it to the destination folder.
        for ($i = 0; $i < count($this->files["name"]); $i++) $this->upload_file($i);
        //
        //Depending on throw exception setting report errors
        if ($this->throw_exception && count($this->errors)>0) 
            throw new \Exception("{$this->errors}");
             
    }
    
    //Load the i'th image. This means moving the i'th file to a desired location
    //and saving the metadata to a database
    function upload_file(int $i){
        //
        //Get the name of the i'th file
        $name = $this->files["name"][$i];
        //
        //Check if the file was transferred correctly or not
        if($this->files["error"][$i] !== 0) 
            return $this->errors[]="File $name was not transferred correctly";
        //
        //Get the destination folder
        $folder = $this->inputs->destination;
        //
        //Formulate the url of dthe file (without the local_host prefix)    
         $url= $folder."/".$name;
        //
        //Where to move the file
        $filename = $_SERVER['DOCUMENT_ROOT']."/".$url;
        //
        //Take action depending on whether the file exists or not
        if (file_exists($filename)) $this->take_action($filename, $name, $i);
        //
        //Move the file from temporary storage to the destination unconditionnaly
        else $this->move_file($filename, $name, $i);    
    }
    
    //
    //Move the file from temporary storage to the destination
    function move_file(string $filename, string $name, int $i){
        //
        //Get the temp filename from where to move the file
        $source = $this->files["tmp_name"][$i];
        //
        //Do the move
        $result /*:boolean*/= move_uploaded_file($source, $filename);
        //
        //Check if the moving was successful or not; if not report error
        if(!$result) $this->errors[]=new myerror("File $name not moved to its destinatio for some reason");
    }
    
    //When a file exists, take the appropriate action
    //skipping, overiting or repoting it as an error
    function take_action(string $filename, string $name, int $i){
        //
        switch ($this->inputs->action){
            //
            //Skip the file
            case "skip":return;
            //
            //Do not overwrite the file; instead log his as an error
            case "report": return $this->errors[]="File '$filename' already exist";
            //
            //Overwrite the file    
            case "overwrite":$this->move_file($filename, $name, $i);    
        }
    }
    
    //Style the given error so that it comes out organized in a detail/summary
    //arrangement. E.g.,
    /*
        <details>
            <summary>
                $msg->getMessage()
            </summary>
                $msg->getTraceMessage();
        </details>
    */
    static function style_error(myerror $ex):string{
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
        //Return the exception as a string result
        return $result;
    }

    //
    //sets the database access credentials as session keys to avoid passing them
    //any time we require the database object 
    static function save_session($username, $password) {
        //
        //save the database credentials as session variables hence we do not have to 
        //overide them anytime we want to acccess the database yet they do not change 
        //Save the username 
        if (!isset($_SESSION['username'])) {
            $_SESSION['username'] = $username;
        }
        //
        //Save the password 
        if (!isset($_SESSION['password'])) {
            $_SESSION['password'] = $password;
        }
    }

    //The following 2 functions are used for intercepting posted data (for 
    //debugging purposes) by interactin with the suoer global varaibles.
    //
    //Save Requested/posted data to the given file
    static function save_globals(string $filename) {
        //
        //Save the entire global environment
        $json = json_encode($GLOBALS);
        file_put_contents($filename, $json);
        //
        //Add permission to the file
        // chmod($filename, 0777);
    }

    //Retrieve the posted data and assign it to the global variable
    static function set_globals(string $filename){
        //
        //Read the contemts
        $contents = file_get_contents($filename);
        //
        //Set the requests, using keys as array indices
        $globals = json_decode($contents, true);
        //
        // To restore the previous behavior, iterate its copy and assign 
        // each property back to $GLOBALS.
        foreach ($globals as $key => $value) {
            $GLOBALS[$key] = $value;
        }
    }
    
    
    //Offload the properties from the source to the destination
    static function offload_properties($dest, $src) {
        //
        //If the source is empry, there is nothing to offload
        if (is_null($src)) return;
        //
        //Loop through all the keys of the source and for each key add it to 
        //to the destination if it does not exist
        foreach ($src as $key => $value) {
            //
            if (!isset($dest->$key)) {
                $dest->$key = $value;
            }
        }
        return $dest;
    }

    //Ignoring the variables that are not used mostly durring destructring 
    //or position based element
    static function ignore() {
    }
    
    //This method is used for resolving user defined classes found in the 
    //application's website folder by autoloading the appropriate php file.
    //It assumes one file per class, saved in the root folder
    static function search_class(string $class_name){
        //
        //Get the website folder; it must have been passed to the server from
        //the client, so it must exist.
        if(!isset($_REQUEST['cwd']))
            throw new \Exception("The current working directory (cwd) not found where to search for class '$class_name'");
        //
        //Now get the complete url,.e.g., 
        //http://localhost:90/tracker/v/code/index.php ?x=y
        $url= $_REQUEST['cwd'];
        //
        //Get the complete index path for the application website
        //.e.g., /tracker/v/code/index.php
        $index= parse_url($url, PHP_URL_PATH);
        //
        //Retrieve the website folder,.e.g., tracker/v/code
        $website= pathinfo($index,PATHINFO_DIRNAME);
        //
        //Add the requested class name to the website folder
        $file_name= 
            //
            //Start from document root folder, e.g..
            //D:\mutall_project\    
            $_SERVER["DOCUMENT_ROOT"]
            //
            //Add the website, e.g., tracker/v/code    
            .$website
            //
            //Add the directory separator, i.e, forward slash, 
            .DIRECTORY_SEPARATOR
            //
            //Add the class name, taking care of namespaces to match folder 
            //structure    
            .str_replace('\\', DIRECTORY_SEPARATOR, $class_name)    
            //
            //Add the php extension
            .".php";
        //
        //Include this file once if it exists
        if(file_exists($file_name)) require_once $file_name;
    }

    //This version of the shell exec imlementatiion is an extension of the
    //standard php version; but this one fauls if the sshell command canno
    //be executed, rather than just retutning false 
    static function shell_exec(string $command):null|string{
        //
        //Call the standard shell exec command
        $result = \shell_exec($command); 
        //
        //If the shell command failed report it. NB. The === is used rather than 
        //a (!result) becase a null value evaluates to false. HARD LESSON LEARNT
        if ($result===false)
            throw new \Exception("The shell command '$command' failed to execute");
        //
        //return teh result
        return $result;
    }

}

//Modelling special mutall objects that are associated with a database schema.
//Database, entity, index and column extends this class. Its main charatreistic
//is that it represents a package whose contents can "saved", resulting in 
//a basic expression.
abstract class schema extends mutall {
    //
    //The name of a schema object, used in formulating xml tags, indexing joints, etc.
    public string $name;
    //
    //Title is a comment (typically associated with a field) that explains 
    //expounds on the name
    public string $title;
    //
    //Toggle the default auto commit of the trasactions to true of false onorder to 
    //influence a rollback and a commit upon the end of a transaction 
    //The default is a false 
    static bool $roll_back_on_fatal_error = false;
    //
    //This method (to be implemented by all descendants) collects design issues
    //and saves them in the above error array. It is designed to support:-
    //(1) reporting of integrity when the underlying dayabase is created
    //(2) metavisuo applications
    //By default, this methods does nothing; teh user pverrides it when needed.
    function verify_integrity():void {}
    //
    //When a shema object is written to a database, the result can be accessed
    //from here
    public /*answer*/ $answer;

    //A schema has a name
    function __construct(string $name) {
        //
        $this->name = $name;
        //
        parent::__construct();
    }

    //
    //Resolve a partially specified file name to its absolutely absolue paath.
    //For instance:-
    // (1) D:/mutall_projects/sample/test.php does not need further resolving as it is
    // is absolutely absolute.
    // (2) /sample/test.php is a relatively absolute path. It is resolved to absolutely
    //by prepending the root directory, resulting to case (1)
    // (3) test.php is a relative path. It is resolved to to absolutely absolute in
    //2 ways:-
    // -- if there is a current working working directory (cwd)is availble, we 
    //prepend it to make it relatively absolute, then resolve it to get (1) if
    //cwd is /sample
    // -- if the cwd is the directlory the resolving is done by prepending the
    //directory that contains this code
    static function resolve_filename(string $name):string{
        //
        //Determine whether the path name is is absolutely absolute or not
        //It is is if the 2nd charecter is a colon
        $is_absolutely_absolute /*:boolean*/ = strpos($name, ':') === 1;
        //
        //If the name is absolutely absolute return then it is already resolve
        if($is_absolutely_absolute) return $name;
        //
        //Check to see if the file name given is relatively absolute. It is if the
        //leading character is a slash
        $is_relatively_absolute /*:boolean*/= strpos($name, '/') === 0;
        //
        //If the filename given is relatively absolute then resolve it by 
        //prepending the document root
        // if($is_relatively_absolute) return $_SERVER['DOCUMENT_ROOT'].'/'.$name;
        if($is_relatively_absolute) {
            //
            // Check if the path already includes DOCUMENT_ROOT
            $doc_root = $_SERVER['DOCUMENT_ROOT'];
            //
            // Path already contains DOCUMENT_ROOT
            // Find the position of the first occurrence of a the folder name in a root path
            if (strpos($name, $doc_root) === 0) {
                //
                // if the path already contains the document root, then return the path
                return $name; 
            }
            //
            // If the path does not contain the document root, then prepend the document root
            return $doc_root.'/'.$name;
        }
        //
        //At this the file name is relative. We then need to check if the cwd was
        //is provided 
        //
        //The user-defined cwd is available as a global variable via $_POST['cwd'];
        //it is initialized by index.php, if provided. NB. cwd is the 5th parameter 
        //of exec method in server.ts 
        $cwd /*:string|null*/ = isset($_POST["cwd"]) ? $_POST["cwd"] : null;
        //
        //The current working directory is available if cwd is not null
        $cwd_is_set = $cwd!==null;
        //
        //If there is no working directory, then use the php magic word, __DIR__
        //to resolve the name to the directory where this script resides
        if (!$cwd_is_set) return __DIR__.'/'.$name;
        //
        //When we get here the cwd is alredy present
        //Resolve the absolute path
        return $_SERVER['DOCUMENT_ROOT'].$cwd.'/'.$name;
    }
    //
    //This function generates a url relative to the document root of the web server
    //We first generate the absolute path then go ahead to exclude the web servers 
    //document root. Is this not doing same thing as $_SERVER['SCRIPT']??
    static function get_url(string $name):string{
        //
        //Get the absolute path of the file
        $path = self::resolve_filename($name);
        //
        //Get the document root
        $root = $_SERVER['DOCUMENT_ROOT'];
        //
        //Get the relative path
        $url = str_replace($root, '', $path);
        //
        //Return the relative path
        return $url;
    }
    
    
    //Compile the full name of a node from its name and that of its class
    //This is implemented as a function because the partial name may change 
    //during runtime, e.g., in the case of barrel saving
    function full_name():string{
        //
        //Get the class name, complete with the namespaces
        $name = get_class($this);
        //
        //Split the name into parts, using teh namespace separator \\
        $array = explode("\\", $name);
        //
        //Reverse the components, so that the last one comes last
        $parts = array_reverse($array);
        //
        //Pick the first one, combine it with name, then retirn it
        return $parts[0].$this->name;
    }
    
    
    //Returns the children of this schema class.  By default, a schema has no
    //children. When it does, overide this fact
    function children():array {return []; }
    
    
    //Compile report for this schema object comprising of an error message and 
    //the total number of errors, i.e., both local and those of the children.
    function compile_report():array/*[string, int]*/{
        //
        //Only children that have errors are considered
        $children = array_filter($this->children(), fn($child)=>count($child->errors)>0);
        //
        //Compile reports for the erroneous children of this schema object
        $child_reports = array_map(
            //
            //Map a child to its report    
            fn($child)=>$child->compile_report(), 
            //
            $children
        );
        //
        //Get total number of errors for this schema object by adding the number
        //of local errors to the sum of those errors reported by the children
        $total_errors = array_reduce(
            //
            //These are the child reports    
            $child_reports, 
            //
            //Accumulate errors from the children reports. N.B. index 1 is the
            //field index that matches the error count in the report    
            fn($accumulator, $report)=>$accumulator += $report[1],
            //
            //Start the totalling with a count of the local errors    
            count($this->errors)
        );
        //
        //Get the local report comprising of a header and the error
        //messages organized in a detail/summaty arrangement;
        $local_report = array_reduce(
            //
            //Use the local errors to drive this report    
            $this->errors,
            //
            //Style up an error to show the summary and hide details    
            fn($accum, $error)=>$accum.=mutall::style_error($error),
           //
           //Start a local report with a header
           "<h2>There are $total_errors errors in ".get_class($this)." ".$this->name."</h2>"
        );
        //
        //Compile the complete report, comprising of the local section and
        //that of the children
        $complete_report = array_reduce(
            //
            //Here are the children reports    
            $child_reports,        
            //
            //Accumulate the children reports. N.B., a separator is assumed
            fn($accum, $report)=>$accum.=$report[0],
            //
            //Start with the local report section followed by that of the 
            //children, if necesary
            $local_report.(count($child_reports)===0 ? "": "<br/>Child reports<br/>")
        );
        //
        return [$complete_report, $total_errors]; 
    }
    

    //
    //Exports a schema object to the database by:-
    //-opening the save tag (nameed using the partial name)
    //-writing the schema object to the database
    //-closing the save tag.
    //The key point about save is that all schema objects use this 
    //implementation AND CANNOT OVERRIDE IT, so its final.
    //
    //The input parameter is either a row detail, if the save was initiated
    //from a table; otherwise it is null.
    //
    //The result is an output expression, a.k.a., answer
    final function save(/*row|null*/$row): answer{
        //
        //Use the row data to determine if logging is necessary
        $log = $this->logging_is_necessary($row);
        //
        //Open the log for this export operation
        if ($log) {
            $element = log::$current->open_tag("save.{$this->full_name()}");
            //
            //Add the schema-specific attributes to the save element
            $this->log_attributes($element);
        }
        //
        //Get the expression returned after a write into the database. Take care 
        //of the fact that the writing may fail with an exception
        $ans = $this->write($row);
        //
        //Save this answer for future reference.
        $this->answer = $ans;
        //
        //Log the result if loggig mode is on.
        if ($log){
            //
            log::$current->add_attr('result', "$ans");
            //
            //Close the log for this save
            log::$current->close_tag($element);
        }
        //
        //Return the basic expresiion 
        return $ans;
    }
    
    //Determines if logging is necessary or not. By default, logging is 
    //necessary. In the case of a beral, we should control logging, to
    //avoid cluterring the log file with repetitive errors
    function logging_is_necessary($row){
        //
        return true;
    }
    
    //
    //Add the schema-specific attributes to the save element. For now only the
    //save.artefect element has meaniful attributes to log
    function log_attributes($element):void{}

    //Every schema object must implement its own way of writing to 
    //the database .When it does, it must return an answer. If it does not 
    //implement a write method then this default one will throw an exception. 
    //
    //This write operation is implemennted for all schema objects.
    protected function write(/*row|null*/$row):answer{
        //
        throw new \Exception("We cannot write schema object of type "
                . "$this->class_name to the database");
    }

    //Returns the named database if it was previously opened; otherwise it creates
    //one from the information schema. 
    function open_dbase(string $dbname): database {
        //
        //Return a previously opend database if it exists
        if (isset(database::$current[$dbname])) return database::$current[$dbname];
        //
        //Create a fresh copy of the requested database
        $dbase = new database($dbname);
        //
        //Set the current database
        database::$current[$dbname] = $dbase;
        //
        return $dbase;
    }

    //Add fields (to this schema object) derived from the given comment string 
    //provided as a json (or no json)
    function add_comments(string $json): void {
        //
        //If the comment is empty, then it has nothig to add
        if (empty($json)) return;
        //
        //Decode the comment (which might be in proper json format) to a php 
        //(\stdClass) object, so it may fail. 
        $comment = json_decode($json);
        //
       //If the comment is not a valid json text, then consider the original text
       //as a title for this schema object
       if (is_null($comment)){
           //
           $this->title = $json;
           //
           return;
       }
       //
       //If the comment is an object, then assign the propertis and their values
       //to this schema object, i.e., entity or column
       //E.g. {"cx":200, "cy":"-23"}, accs the cx and cy propertis  to a table
        if (is_object($comment)) {
            //
            //Offload the comment fields to this schema object. This works similarly
            //to Object.asiign in javascript
            mutall::offload_properties($this, $comment);
            return;
        }
        //
        //If the comment is a valid json that is not an object (remember null 
        //is an object) then consider teh decoded version as a title of the 
        //schema object
        $this->title = $comment;
    }
    
    //Returns all the databses in this server
    function get_databases():Array{
        //
        //Use the information schema to formulate sql for retrieving databases
        //Set the system databses for filtering later
        $system_dbs = "
            'information_schema',
            'performance_schema',
            'phpmyadmin',
            'webauth',
            'mysql',
            'sys'
        ";
        //Select all database names excluding php system databases
        $sql = "
            select 
                schema_name as dbname 
            from 
                information_schema.schemata
            where 
                schema_name not in ($system_dbs)
        ";
        //
        //Execute the sql (without formulating compiling a mutall-compliant 
        //database -- because the information schema is not compliant)
        $names = (new database('information_schema', false))->get_sql_data($sql);
        //
        //Map the names to their corresponding (complete) databases. Do not
        //stop even if there are database errors
        $databases = array_map(fn($db)=>new database($db['dbname'], true, false), $names);
        //;
        //Return the databases
        return $databases;
        
    }
}    
//Answer is an expression that can particicate as an output expression 
//from a save operation. The Typescript's style of definition would be
//type answer = myerror|scalar. Without this union way of expressing ourselves
//in PHP we have implemented it as an interface where myerror and scalar implements
//this interface.
interface answer{
    //
    //Answers must be convertible to strings for xml logging
    //purposes
    function __toString();
    //
    //At some point, we need to enrich an answer with position data
    //when its available. The data can be recovered using this function
    //
    function  get_position()/*:[row_index, col_index?]|null*/; 
        
}

//An operand is an expression that can take part in input operations. It can be
//a complex exression that is simplifiable to get an answer. See the definition 
//of an answer. Both were designed to support the questionnnaire class for large 
//data loading.
interface operand{
    //
    //An operand must be simplifiable to get answer
    function simplify():answer;
}

//This general form of an expression was originaly designed to suport sql 
//operations
interface expression {
    //
    //Every expression must be expressable as a valid sql string expression.
    //Often, this method returns the same value as the __toString() magic method,
    //but not in all cases. For instance, the __toString() of the id field in 
    //a selector is, e.g., "mutall_login.application.id__" whereas its to_str()
    //value is "concat(mutall_login.application.name,'/')". The __toString() of
    // an the application entity is, e.g., "muutall_login.application"; but that
    // of the aplication expression, to_str() refers to the primary key field
    // "mutall_login.application.application"
    function to_str(): string;

    //Yield the entities that participate in this expression. This is imporatnt 
    //for defining search paths for partial and save_indirect view. This is the 
    //method that makes it posiible to analyse mutall view and do things that
    //are currently woul not be possible without parsing sql statements
    function yield_entity(): \Generator;

    //
    //Yields the primary attributes that are used in fomulating this expression.
    //This is important for determining if a view column is directly editable or 
    //not. It  also makes it possble to expression values by accesing the primary
    //entities that constitue them up.
    function yield_attribute(): \Generator;
}

//This class models a function as originally designed to support sql statements
//and later moved to the schema file to support parsing of default values
//
//A function is an expressiion that can be used as an answer to a simplification
//process. So, it can the result of an scheme::save() method
class function_ implements expression, answer{
    //
    //These are the function's arguments
    public array /*expression []*/$args;
    //
    //This is the name of the function e.g., concat 
    public $name;
    //
    //???
    public bool $is_view;
    //
    //Requirements for supporting the get_position() method
    public /*[row_index, col_index?]*/$position = null;
    //
    //This functin is imporant for transferring expression ppostion data 
    //between exprssions. E.g., 
    //$col->ans->position = $col->exp->get_postion()
    function get_position(){return $this->position; }
    //
    function __construct(string $name, array/*expression[]*/ $args){
        //
        $this->name = $name;
        $this->args = $args;
    }
    
    //Convert a function to a valid sql string
    function to_str():string{
        //
        //Map every argument to its sql string equivalent
        $args = array_map(fn($exp)=>$exp->to_str(), $this->args);
        //
        //All function arguments are separated with a comma
        $args_str = implode(', ', $args);
        //
        //Return the properly syntaxed function expression
        return "$this->name($args_str)";
    }
    
    //Yields all the entity names referenced in this function
    function yield_entity():\Generator{
        //
        //The aarguments of a functin are the potential sources of the entity
        //to yield
        foreach($this->args as $exp){
            //
            yield from $exp->yield_entity();
        }
    }
    //Yields all the atrributes referenced in this function
    function yield_attribute():\Generator{
        //
        //The aarguments of a functin are the potential sources of the entity
        //to yield
        foreach($this->args as $exp){
            //
            yield from $exp->yield_attributes();
        }
    }
    //
    //
    function __toString() {
        return $this->to_str();
    }
}

//Modelling the database as a schema object (so that it too can save data to 
//other databases)
class database extends schema {
    //
    //An array of entities the are the collection of the tables that are required to create a 
    //database 
    public array $entities = [];
    //
    //This is the pdo property that allows us to query and retrieve information from 
    //the database it is a property to avoid this class from extending a pdo
    public \PDO $pdo;
    //
    //Let the user set what should be considered as the default database. This is 
    //the database that is picked if a daabase name is not given explicity. This 
    //is designed to simplify working with a single database.
    static database $default;
    //
    //An aray of ready to use databases (previously descrobed as unserialized). 
    static array/* database[name] */ $current = [];
    //
    //This is where the error report is saved.
    public string $error_report;
    //
    //Do we need to generate a complete database or not;
    public bool $complete;
    //
    //The database constructor requires the following parameters 
    //name: name of the database which is mandatory 
    //complete: an optional boolean that indicates whether we desire a database
    //complete with its entities or not. The the default is complete. If not 
    //an empty shell is returned; this may be useful when quering the database
    //directly, i.e., without the need of the object model
    function __construct(
        //
        //The database name.
        string $name,
        //
        //An optional boolean that indicates whether we desire a database
        //complete with its entities or not. The the default is complete.
        // If not  complete an empty shell is returned; this may be useful when 
        //quering the database directly, i.e., without the need of the object model
        bool $complete = true,
        //
        //An option that when set to true, throws errors as soon as they are 
        //found, or collects them into an errors variable. The default is 
        //true. Set this to false, especially in in content of metavisuo when
        //you want to report teh errors in teh browser.
        bool $throw_exception = true
    ) {
        //
        //Construct the parent 
        parent::__construct($name);
        //
        $this->name = $name;
        //
        //Set the default value of the optional complete as true
        $this->complete = $complete;
        //
        //What do you do if there are any (entity) errors?. That depends on the
        //3rd parameter -- throw_exception. The Default is true
        $this->throw_exception = $throw_exception;
        //
        //Connect to the database by initializing the php PDO object
        $this->connect();
        //
        //Set the current database, so that it can be accessed by all her 
        //dependants during activation.
        database::$current[$name] = $this;
        //
        //Attend to the 'complete' option. You are done if an incomplete database 
        //is required. Don't waste time on entities. This is important if all we
        //want is to run a query
        if (!$complete) return;
        //
        //Activate the schema objects (e.g., entities, columns, etc) associated
        //with this database
        $this->activate_schema();
        //
        //Set the relational dependency for all the entities and log all the 
        //cyclic conditions as errors (at the database level).
        $this->set_entity_depths();
        //
        //Compile and report errors encounterd in the database construction
        $this->report_errors();
    }
    
    //Th children of a database, in the context of metavisuo, are entities
    function children():array{
        //
        //
        return $this->entities; 
        
    }
    
    // 
    //Use this database to test if a user with the given credentials is 
    //found in the user database or not. It returns an array
    //which when json encoded and decoded behaves like an stdclass of
    //the shape: {result:'ok', pk:number} | {result:'error', msg:string}
    public function authenticate(string $name, string $password):array{
        // 
        //Create an sql/view to retrieve the password from  user table. 
        //the user with the given name 
        $sql = "
            select 
                password, 
                user 
            from 
                user 
            where 
                name= '$name' ";
        //
        //Execute the query and retrieve the password
        $users= $this->get_sql_data($sql);
        // 
        // Test if there is any user that matches the name if not report so
        if(count($users)===0){return ['result'=>'error', 'msg'=>'Please sign up first, to access services'];}
        // 
        //If there is more than one  user we throw an exception
        if(count($users)>1){throw new myerror("More than one name found. "
                . "Check your data model");}
        //
        //If the user exists verify the password.
        $ok = password_verify($password, $users[0]["password"]);
        //
        //If the autentication exists, return {result:'ok', pk:number}
        if ($ok)return ['result'=>'ok', 'pk'=>$users[0]["user"]];
        //
        //Otherwise return {result:'error', msg:string}
        else return ['result'=>'error', 'msg'=>'Sign in failed because of wrong credentials'];         
    }
                
    //Create a new account for the given user from first principles 
    //so that we can take charge of error reporting. It returns an array
    //which when json encodede and decodes behaves like an stdclass of
    //the shape: {result:'ok', pk:number} | {result:'error', msg:string}
    public function register(string $name, string $password):array{
        // 
        //Create an sql/view to retrieve the password from  user table. 
        //the user with the given name 
        $sql = "
            select 
                user,
                password 
            from 
                user 
            where name= '$name'";
        //
        //Execute the query and retrieve the password
        $users= $this->get_sql_data($sql);
        //
        //Get the entity on which to do the insert this will aid in string 
        //processing since entities and columns have their string equivalent
        $entity=$this->entities["user"];
        //
        //if no user is found, create the user's instance
        if(count($users)===0){
            // 
            //Formulate the sql to insert from first principle 
            //insert statement 
             $sql = "INSERT \n"
                    //
                    //Get the entity to insert 
                    . "INTO  {$entity} \n"
                    //
                    //Insert the two columns name and password
                    . "("
                            . "{$entity->columns["name"]},"
                            . "{$entity->columns["password"]} "
                    . ")\n"
                    //
                    //Insert the given values.
                    . "VALUES ("
                         . "'{$name}','" .password_hash($password, PASSWORD_DEFAULT)."'"
                    . ")\n";
            //
            //Execute the insert query
            $this->query($sql);
            //
            //Stop any further execution, returning success the last insert id
            return ['result'=>'ok', 'pk'=>$this->pdo->lastInsertId()];
        }
        //
        //This user exists 
        //
        //Test if user exists with a null password. If he does, set the password
        //to the given one
        if(is_null($users[0]["password"])){
            $stmt="UPDATE \n"
                    //
                    //Update this entity
                    . "{$entity} \n"
                    . "SET \n"
                    //
                    //Update the password from the null to the hashed version. 
                    . "{$entity->columns["password"]}='"
                        .password_hash($password, PASSWORD_DEFAULT). "'\n"
                    //
                    //Update only the given nameed user.
                    . "WHERE {$entity->columns["name"]}='$name'\n";
            //
            //execute
            $this->query($stmt);
            //
            //Stop any futher execution, returning ok with the selected primary key 
            return ['result'=>'ok', 'pk'=>$users[0]['user']];
        }
        //
        //We have a user who has a password already. Return the error message
        return ['result'=>'error', 'msg'=>"You '$name' already have an account; please use it to log in"];
    }
    //
    //For now we do not have a need of saving an entity 
    protected function write(/*row|null*/ $row): answer {
        throw new \Exception("You cannot save a database");
    }

    //Compile database loading errors and:-
    //--save them to the error_report property for later use
    //--if the user desires, throw an eception
    private function report_errors() {
        //
        //Compile the error report, returning a text and the total number of 
        //errors found there in.
        list ($report, $no_of_errors) = $this->compile_report();
        //
        //Save the error report -- incase we wish to access it later, e.g.,
        //from the Javascript side.
        $this->error_report = $report;
        //
        //Throw an Exception, if the user so desires.
        if ($this->throw_exception && $no_of_errors>0) throw new \Exception($report);
        
    }

    //Activate the schema objects (e.g., entities, columns, etc) associated
    //with this database
    private function activate_schema():void{
        //
        //Query the information information scheme once for the following data
        //
        //Activate all the entities of this database from the tables of the 
        //information
        $this->activate_entities();
        //
        //Activate all the columns of this database from the columns of the 
        //information schema
        $this->activate_columns();
        //
        //Activate all the identification inices from the statistics of the 
        //information schema
        $this->activate_indices();
        //
        //Check for Mutall model consistency, e.g., 
        //missing indices, missing primary keys, invalid data type for primary
        //keys, invalid relations
        foreach ($this->entities as $entity) $entity->verify_integrity();
    }

    //Check if an sql is valid. It returns thh same sql.
    //This is important for debudgging queries that depend on others
    public function chk(string $sql):string{
        //
        try{
            //Run the query to catch any errors in the query
            //
            $this->pdo->beginTransaction();
            $this->query($sql);
            $this->pdo->rollBack();
        }catch(\Exception $ex){
            //
            //Re-throw the exception with the full sql appended
            die(
                "<pre>"
                .$ex->getMessage()
                ."\n"    
                .$ex->getTraceAsString()    
                ."\n".$sql
                ."</pre>"
            );
        }
        //
        //Return the same sql as the input
        return $sql;
    }
    
    //Activate all the entities of this database by querying the information schema.
    //This method needs to be overriden to extend entities, for instance, when 
    //entities in the capture namespace are created from those in the root.
    function activate_entities(): void {
        //
        //Get all the static entities from the information schema's table.
        $tables = $this->get_entities();
        //
        //Now activate the entities, indexing them as you go along
        foreach ($tables as [$dbname, $ename, $comment]) {
            //
            //Ensure that the database names match
            if ($dbname!==$this->name)
                throw new \Exception("This dataase name $$this->name does not match $dbname");
            //
            //Create the entity in the root namespace
            $entity = new table($this, $ename);
            //
            //Add fields derived from comments
            $entity->add_comments($comment);
            //
            //Push the entity object to the array to be returned
            $this->entities[$ename] = $entity;
        }
    }

    //Retyrn all th tables of this database from the nformation schema
    private function get_entities(): array/* [dbname, ename, comment][] */ {
        //
        //Let $sql be the statement for for retrieving the entities of this
        //database.
        $sql = "select "
                //    
                . "table_schema as dbname, "
                //    
                . "table_name as ename, "
                //    
                . "table_comment as comment "
                . "from "
                . "information_schema.tables "
                . "where "
                //
                //Only tables of the current database are considerd
                . "table_schema = '$this->name' "
                //
                //Exclude the views
                . "and table_type = 'BASE TABLE'";
        //
        //Execute the $sql on the the schema to get the $result
        $result = $this->pdo->query($sql);
        //
        //Retrueve the entires from the $result as an array
        $tables = $result->fetchAll();
        //
        //Return the tables list.
        return $tables;
    }

    //Activate all the columns of all the tables in this database. This can be
    //overriden, so it is public
    function activate_columns(): void {
        //
        //Get the static columns from the information schema
        $columns = $this->get_columns();
        //
        //Use the static data to formulate a capture column object
        foreach ($columns as [$dbname, $ename, $cname, $data_type, $default, $is_nullable, $comment, $length, $key, $type, $extra]) {
            //
            //The database names must match
            if ($dbname!==$this->name) 
                throw new \Exception("This database name $this->name does not match $dbname");
            //
            //Get the named entity; it is an error if it does not exist
            if (!isset($this->entities[$ename]))
                throw new \Exception("Entity '$ename' not found in database '$dbname'");
            $entity = $this->entities[$ename];
            //
            // Return the column as primary if its key is set to PRI
            if (isset($key) && $key == 'PRI') {
                //
                //The column constrcutior variablles are desifgned to a) initialize
                //its capture parent and b) check consistency with Mutall 
                //framework
                $column = new primary($entity, $cname, $data_type, $default, $is_nullable, $comment, $length, $type, $extra);
            }
            //
            //Create an ordinary column. It will be upgrated to a foreign key
            //at a later stage, if necessary.
            else {
                $column = new attribute($entity, $cname, $data_type, $default, $is_nullable, $comment, $length, $type, $extra);
            }
            //
            //Add fields derived from comments, i.e., offload the comment properties
            //to the column.
            $column->add_comments($comment);
            //
            //Add the column to the database
            $this->entities[$ename]->columns[$cname] = $column;
        }
        //
        //Activate the foreign key colums
        //
        //Promote attributes to foreign keys where necessary, using the column 
        //usage of the information schema
        $this->activate_foreign_keys();
    }

    //Get all the columns for all the tables in this database
    private function get_columns(): array/**/ {
        //
        //Select the columns of this entity from the database's information schema
        $sql = "select "
                //
                . "columns.table_schema as dbame, "
                //
                //specifying the exact table to get the column from
                . "columns.table_name as ename, "

                //Shorten the column name
                . "column_name as cname, "
                //
                //Specifying the type of data in that column
                . "data_type, "
                //
                //Get the default 
                . "column_default as `default`, "
                //
                //if it is nullable
                . "is_nullable, "
                //
                //Extract any meta data json information in the comments
                . "column_comment as comment, "
                //
                //The size of the collumn
                . "character_maximum_length as length, "
                //
                //The column key so as to identify the primary keys
                . "column_key as `key`, "
                //
                //Add the column type, to access the enum data type (if any) 
                //needed for supporting the selector i/o 
                ."column_type as type, "
                //
                //auto_increment|virtual generated|virtual stored
                ."extra "
                //
            . "from "
                //
                //The main driver of this query
                . "information_schema.`columns` AS columns "
                //
                //Prepare to select only columns from base tables(rather than 
                //view)
                ."inner join information_schema.tables as tables on "
                    . "columns.table_schema = tables.table_schema "
                    . "and columns.table_name = tables.table_name "
                . "where "
                //
                //Filter out the view
                ." tables.table_type = 'BASE TABLE' "
                //    
                // The table schema is the name of the database
                . " AND columns.table_schema = '{$this->name}' ";
        //
        //Execute the $sql on the the schema to get the $result
        $result = $this->pdo->query($sql);
        //
        //Retrieve the entities from the $result as a simple array
        return $result->fetchAll(\PDO::FETCH_NUM);
    }

    //Promote existing columns to foreign keys where necessary, using the column 
    //usage of the information schema
    private function activate_foreign_keys() {
        //
        //Retrieve the static foreign key columns from the informatuion schema
        $columns = $this->get_foreign_keys();
        //
        //Use each column to promote the matching attribute to a foreign key.
        foreach ($columns as $column) {
            //
            //Destructure the column usage data to reveal the its properties
            list($dbname, $ename, $cname, $ref_table_name, $ref_db_name, $ref_cname) = $column;
            //
            //Get the named entity from this database. 
            //
            //The dbnames must match (unless yor query was not accurate)
            if ($dbname!==$this->name)
                throw new \Exception("This databae name $this->name does not match $dbname");
            //
            //Get the named entity
            $entity = $this->entities[$ename];
            //
            //Get the matching attribute; it must be set by this time.
            $attr = $entity->columns[$cname];
            //
            //Ignore all the primary columns in this process since only attributes 
            //can be converted to foreigners
            if ($attr instanceof primary) continue;
            //
            //Compile the referenced database, table and column names 
            $ref = new \stdClass();
            $ref->table_name = $ref_table_name;
            $ref->db_name = $ref_db_name;
            $ref->cname = $ref_cname;
            //
            //Create a foreign key colum using the same attribute name
            $foreign = new foreign(
                $entity, 
                $cname, 
                $attr->data_type,
                $attr->default, 
                $attr->is_nullable, 
                $attr->comment, 
                $attr->length, 
                $attr->type, 
                $attr->extra,
                $ref
            );
            //
            //Offload the remaining options to the foreign key as local 
            //properties. Why is this necesary? Just in case there were 
            //properties derived peviously, e.g., errors[]
            mutall::offload_properties($foreign, $attr);
            //
            //Replace the previously derived attribute with the foreign key
            $entity->columns[$cname] = $foreign;
        }
    }

    //Retrieve details about relationships, in terms of foreign key columns
    private function get_foreign_keys(): array/* [dbname, ename, cname, ref_table_name, ref_db_name][] */ {
        //
        //Set sql statement for selecting all foreign key columns of this table 
        //and database
        $sql = "select "

                // The table schema is the name of this database
                . "table_schema  as dbname, "
                //
                //specifying the exact table to get the column from
                . "table_name as ename, "
                //
                . "column_name as cname, "
                //
                //Specify the referenced table and her database
                . "referenced_table_name as ref_table_name, "
                //    
                . "referenced_table_schema as ref_db_name,"
                . "referenced_column_name as ref_cname "
                . "from "
                //
                //The main driver of this query
                . "information_schema.key_column_usage "
                . "where "
                //    
                // The table schema is the name of this database
                . "table_schema = '{$this->name}' "
                //
                //The column must be used as a relation (i.e., as a forein key) 
                . "and referenced_table_schema is not null ";
        //
        //Execute the $sql on the the schema to get the $result
        $result = $this->pdo->query($sql);
        //
        //Retrueve the entitiesfrom the $result as an array
        return $result->fetchAll();
    }

    //Activate all the identification indices from the statistics of the 
    //information schema. N.B. This process does not affect a table that does 
    //not have indices, so, theit indices will be left uniinialized. The 
    //integrity checker uses that informatiion to flag the indexing error
    function activate_indices() {
        //
        //Get all the index columns for all the indices for all the entities
        //in this database
        $columns = $this->get_index_columns();
        //
        //Build the indices and their active columns
        foreach ($columns as [$ename, $ixname, $cname]) {
            //
            //Start a new index if need be
            if (!isset($this->entities[$ename]->indices[$ixname]))
                $this->entities[$ename]->indices[$ixname]=[]; 
            //
            //Push the named column to the index;
            $this->entities[$ename]->indices[$ixname][]=$cname;
        }
    }

    //Get all the static index columns for all the indices of all the entities
    //in this database
    private function get_index_columns(): array/* [][] */ {
        //
        //The sql that obtains the column names
        $sql = "select "
                //
                . "table_name as ename, "
                // 
                . "index_name  as ixname, "
                //  
                . "column_name as cname "
                //
                . "from "
                //
                //The main driver of this query
                . "information_schema.statistics "
                . "where "
                //    
                // Only index rows from this database are considerd
                . "index_schema = '{$this->name}' "
                // 
                //Identification fields have patterns like id2, identification3
                . "and index_name like 'id%'";
        //Execute the $sql on the the schema to get the $result
        //
        //
        $result = $this->pdo->query($sql);
        //
        //Retrueve the entitiesfrom the $result as an array
        return $result->fetchAll();
    }

    //Set the dependency depths for all the entities as weell as loggin any 
    //cyclic errors
    private function set_entity_depths(): void {
        //
        foreach ($this->entities as $entity) {
            $entity->depth = $entity->get_dependency();
        }
    }

    //Report an error arising out of the activation process, rather than throw 
    //it as it occurs
    private function report_activation_errors() {
        //
        //Get the number of errors
        $count = count(self::$errors);
        //
        //There has to be at leason one error for the reporting to be done
        if ($count === 0) {
            return;
        }
        //
        $msg = "There are $count activation errors. They are:-<br/>"
                . implode(".<br/>", database::$errors);
        //
        throw new \Exception($msg);
    }

    //When you serialize a database, exclude the pdo property. Otherwise you
    //get a runtime error. __sleep has has been deprecated. Use __serilaize to
    //exlude the pdo property
    function __sleep() {
        return ['name', 'entities'];
    }
    
    function __serialze() {
        return [
            'name'=>$this->name, 
            'entities'=>$this->entities
        ];
    }
    

    //Set the pdo property when the database is unserialized. Not sure whethe 
    //this too has been deprecated
    function __wakeup() {
        $this->connect();
    }

    //
    //Returns data after executing the given sql on this database. The sql may 
    //be directly specified as a string, or indirectly as a file to read from.
    //The default is from a string. File names will be specified as paths
    //relative to the document root
    function get_sql_data(string $sql, string $source='str'): array{
        //
        //If the source of the sql is a file, read from it; otherwise it must be
        //a string
        if ($source==='file') $sql = \file_get_contents(schema::resolve_filename($sql));
        elseif ($source!=='str') throw new \Exception("Sql source '$source' is not known");     
        //
        //Execute the sql to get a pdo statement; catch PDO erors if any
        try{
            //
            //Query the database using the given sql
            $results = $this->pdo->query($sql);
            //
            //Fetch all the data from the database -- indexed by the column name
            $data = $results->fetchAll(\PDO::FETCH_ASSOC);
            //
            //Return the fetched data                
            return $data;
        }
        //PDO error has ocurred. Catch it, append the sql and re-throw
        catch(\Exception $ex){
            throw new \Exception($ex->getMessage()."<br/><pre>$sql</pre>");
        }
    }
    // 
    //Retrieves the account datails of the specified account
    function accounting(string $accname):array{
    $sql ="SELECT"
            ."`transaction`.`date` as `date` ," 
            ."`transaction`.`ref` as `ref_num` ,"
            ."`je`.`purpose` as `purpose` ,"  
             ."'' as dr ," 
            ."`je`.`amount` as cr "
        ."From `credit` \n"
            ." inner join `je` on `credit`.`je`= `je`.`je`
            inner join `transaction` on `transaction`.`transaction`= `je`.`transaction`
            inner join account on `credit`.account= `account`.account "
        //
        //specify the account under study
        ."WHERE `account`.id ='$accname' "
        //--
        //--join the sqls
        ." union "
        //--
        //--The sql that derives all the debited je 
        ." SELECT"
            ."`transaction`.`date` as `date` , 
           `transaction`.`ref` as `ref_num`,
           `je`.`purpose` as `purpose`,  
           `je`.`amount` as dr,
            '' as cr "
        ." From `debit` "
            ." inner join `je` on `debit`.`je`= `je`.`je`
            inner join `transaction` on `transaction`.`transaction`= `je`.`transaction`
            inner join account on `debit`.account= `account`.account "
        // --
        //--the account under study.
        ."WHERE `account`.id ='$accname'";
    return $this->get_sql_data($sql);
    
    }

    //
    //Returns a complete database structure, .i.e, one that is populated with 
    //entities and columns
    //We return an any??? because we do not wish to check the structure of our data  
    function export_structure(): database {
        return $this;
    }

    //Turns off autocommit mode. Hence changes made to the database via $this->pdo
    //are not committed until you end the transaction by calling $this->commit()
    //or $this->rollBack
    function beginTransaction(): void {
        $this->pdo->beginTransaction();
    }

    //Save the changes made to the database permanently 
    function commit(): void {
        $this->pdo->commit();
    }

    //Roles back the current transaction. i.e avoid commiting it permanently 
    //to the database.Please note this function is only effective if we had begun
    // a transaction
    function rollBack(): void {
        $this->pdo->rollBack();
    }

    //Implementing the method so that it can be evoked from JS using the
    //standard method. We use this method for sqls that don't return a result
    function query($sql): void{
        //
        //NB. We cannot access the pdo class from Js, hence this workround
        $this->pdo->query($sql);
    }
    
     //Retrieve metadata for an sql statement
    function get_column_metadata(string $sql):array/*<metadata>*/{
        //
        //Get a pdo statement, by executing the given query. The statement can
        //be interogated to get column metadata. Catch the error so that we can 
        //attach the sql that raised the error
        try{
            $stmt = $this->pdo->query($sql);
        }    
        catch(\Exception $ex ){
            throw new \Exception($ex->getMessage()."<br/><pre>$sql</pre>");
        }    
        //
        //Get the number of columns in the pdo statement
        $cols  = $stmt->columnCount();
        //
        //Start with an empty list of metadata columms
        $list = [];
        //
        //For each column position....
        for ($i = 0; $i < $cols; $i++) {
            //
            //Get the metadata for the i'th column
            $metadata = $stmt->getColumnMeta($i);
            //
            //Save the metadata to the out array
            array_push($list, $metadata);
        }
        
        //
        //Return the final list of metadata columns
        return $list;
        
    }

    //Set the PDO property of this database; this links the mutall database 
    //model to the PHP vesrion.
    private function connect() {
        //
        //Formulate the full database name string, as required by MySql. Yes, this
        //assumed this model is for MySql database systems
        $dbname = "mysql:host=localhost;dbname=$this->name";
        //
        //Initialize the PDO property. The server login credentials are maintained
        //in a config file.
        $this->pdo = new \PDO($dbname, config::username, config::password);
        //
        //Throw exceptions on database errors, rather than returning
        //false on querying the dabase -- which can be tedious to handle 
        //quering errors
        $this->pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        //        
        //Prepare variables (e.g., current and userialised) to support the 
        //schema::open_databes() functionality. This is designed to open a database
        //without having to use the information schema which is terribly slow.
        //(Is is slow wor badly written? Revisit the slow issue with fewer 
        //querying of the information schema)
        //Save this database in a ready, i.e., unserialized,  form
        database::$current[$this->name] = $this;
        //
        //Add support for transaction rolling back, if valid. See the 
        //\capture record->export() method
        if (isset(schema::$roll_back_on_fatal_error) && schema::$roll_back_on_fatal_error) {
            $this->pdo->beginTransaction();
        }
    }

    //Returns a json string of this database structure 
    function __toString() {
        //
        //Encode the database structure to a json string, throwing exception if
        //this is not possible
        $result = json_encode($this, JSON_THROW_ON_ERROR);
        //
        return $result;
    }

    //Returns the primary key value of the last inserted in a database.
    //Remember that pdo is prrotected, and so cannot be accessed directly
    function lastInsertId() {
        return $this->pdo->lastInsertId();
    }
    
    //Map the database to a namespace in Typescript. This is for supporting the 
    //ORM objective
    function map($stream):void{
        //
        //Write the opening tag as a namespace. E.g., 
        //export namespace mutall_users{
        fwrite($stream, "export namespace $this->name {\n");
        //
        //Map all the entiries of this databse corresponding classes
        foreach($this->entities as $entity) $entity->map($stream);
        //
        //Write the closing tag
        fwrite($stream, "}\n");
    }
  
}

//
//Class that represents an entity. An entity is a schema object, which means 
//that it can be saved to a database.
abstract class entity extends schema implements expression {
    //
    //The columns of this entity
    public array /*<column>*/$columns;
    //
    //The indices of this entity. This property is initialized when a database 
    //is being constructed and at the activate_indices stage, if the index is 
    //defined; othewise it is left uninitialized. The intrgrity checker uses this
    //fact to report the indexing error
    public array/*<cname>*/ $indices;
    //
    //The alias name used for referncing an entity
    public string $alias_name;
    //
    //The database name of  an entity
    public string $dbname;

    //Marks an entity as used for repoering purose or not
    public bool $reporting;
    
    //
    function __construct(string $name) {
        //
        parent::__construct($name);
    }

    //The children of an entity (from metavsuo point if view) are its columns
    function children():array{return $this->columns; }

    //The primary key column of any entity is the column named the
    //same as the view
    function pk():column{
        //
        //Get the name of this entity
        $name = $this->name;
        //
        //There must be a column indexed by this name
        if (!isset($this->columns[$name])) 
            throw new \Exception("No primary key column found for entity $name");
        //
        //Return the column
        return $this->columns[$name];
    }

    //Set the columns of this entity. It is illegal to try to access the columns 
    //before calling this method.
    public function set_columns(): void{
        //
        //Open the named database if available; otherwise construct one
        //from he infrmation schema
        $dbase = $this->open_dbase($this->dbname);
        //
        //Set this entity's columns
        $this->columns = $dbase->entities[$this->name]->columns;
    }
    
    //
    //This is the string represention of this table 
    public function to_str(): string {
        return "`$this->dbname`.`$this->name`";
    }

    //Returns the string version of this entity as an sql object for use in array
    //methods.
    function __toString(): string {
        return $this->to_str();
    }

    //
    //An entity yields iself
    function yield_entity(): \Generator {
        yield $this;
    }

    //The attributes that are associated with an entity are based on its columns:-
    function yield_attribute(): \Generator {
        foreach ($this->columns as $col) {
            if ($col instanceof attribute)
                yield $col;
        }
    }

    //Returns foreign key columns (only) of this entity. Pointers are exccluded 
    //beuase they take time to build and may not always be required at the same
    //time with forein keys. The resulst of theis functi should not be buffred
    //bacsuse with the addition of views in our model, the structure of the 
    //database can change at run time.
    function foreigners(): \Generator/* foreigner[] */ {
        //
        //
        foreach ($this->columns as $col) {
            if ($col instanceof foreign) {
                yield $col;
            }
        }
    }

    //
    //yield only the structural foreigners
    function structural_foreigners(): \Generator/* foreigner[] */ {
        //
        //Loop throug all the columns of this entity
        foreach ($this->columns as $col) {
            //
            //A column is a structural foreigner if.....
            if (
                //...it is a foreign key..
                $col instanceof foreign
                //
                //..that is not used for reporting
                &! $col->away()->reporting()
                //
                //..and is not a cross member. A cross member is a column 

            ) {
               
                yield $col;
            }
        }
    }

    //
    //yields only the structural pointers
    function structural_pointers(): \Generator/* pointers[] */ {
        //
        //The search for pointers will be limited to the currently open
        //databases; otherwise we would have to open all the databases on the 
        //server.
        foreach (database::$current as $dbase) {
            foreach ($dbase->entities as $entity) {
                //
                //remove all reporting entities
                if ($entity->reporting()) {
                    continue;
                }
                //
                //Loop through all the structural foregn keys of this entity
                foreach ($entity->structural_foreigners() as $foreigner) {
                    //
                    //remove all the foreigners that reference to the reporting entities
                    if ($foreigner->away()->reporting()) {
                        continue;
                    }
                    if ($foreigner->home()->reporting()) {
                        continue;
                    }
                    //
                    //A foreigner is a pointer to this entity if its reference matches
                    //this entity. The reference matches if...
                    if (
                        //...database are teh same...
                        $foreigner->ref->db_name === $this->dbname
                        //
                        //...and the table names are the same
                        && $foreigner->ref->table_name === $this->name
                    ) {
                        //
                        //Create a pointer 
                        yield new pointer($foreigner);
                    }
                }
            }
        }
    }

    
    //Yield all the parts of a friendly column. Each part is derived from 
    //an identifier attributes.Every entity has its own way of generating 
    //friendly columns
    function get_friendly_part(): \Generator {
        //
        //Loop through all the columns of this entity, yielding its 
        //friendly components
        foreach ($this->columns as $col) {
            //
            //A column is friendly if...
            //
            //1. ... it is an identification attribute or ... 
            if ($col->is_id() && $col instanceof attribute
                    //
                    //Ignore the is_valid column
                    && $col->name !== "is_valid") {
                yield $col;
            }
            //
            //2. ...it is a mandatory column named as: description, name, title or ...
            elseif ($col->is_nullable==="NO" && $col->is_descriptive()) {
                yield $col;
            }
            //
            //3. ...it is a  identification foreign key.
            elseif ($col->is_id() && $col instanceof foreign) {
                yield from $col->away()->get_friendly_part();
            }
        }
    }
    
    //Returns the mandatory columns of this entity as ids i.e those not nullable 
    //and those used as ids as a record to be saved 
    function get_id_columns(): array {
        //
        //begin with an empty array of the mandatory columns to be inserted
        $ids = [];
        //
        //1. loop through the column of this entity to add all the columns 
        //which are not nullable and those that are used as ids in this 
        foreach ($this->columns as $column) {
            //
            //filter those not nullable
            if ($column->is_nullable === 'NO') {
                $ids[$column->name] = $column;
            }
            //
            //filter the id columns
            if ($column->is_id()) {
                $ids[$column->name] = $column;
            }
        }
        //
        //
        return $ids;
    }

    //Returns the source entity taking care 
    function get_source(): string {
        //
        if (isset($this->alias_name)) {
            return "$this->alias_name";
        }
        return "$this->name";
    }

    //Returns a valid sql string from expression
    function fromexp(): string {
        //
        if (isset($this->alias_name)) {
            $str = "`$this->alias_name` as";
        } else {
            $str = '';
        }
        return "$str `$this->name`";
    }

    //returns a valid sql column representation of the primary column this method 
    //is overidden because an alien violates the rule that the primary column
    //of an entity has the same name as the entity 
    function get_primary(): string {
        //
        if (isset($this->alias_name)) {
            $str = ".`$this->alias_name`";
        } else {
            $str = '';
        }
        return "`$this->name`$str";
    }
    
     //Map this entity to a class in Typescript. This is for supporting the ORM 
     //objective
    function map($stream):void{
        //
        //Write the opening tag, e.g., declare class event extends tuple {...
        fwrite($stream, "\tdeclare class $this->name extends tuple.tuple {\n");
        //
        //Map the columns to the properties optional of this entity
        foreach($this->columns as $column) {
            //
            //Convert mysql type to typescript
            $type = match($column->data_type){
                "int"=>"number",
                "varchar"=>"string",
                'datetime'=>'Date',
                'date'=>'Date',
                'tinyint'=>"boolean",
                'money'=>'number',
                default=>$column->data_type,
            };
            //
            //Output the column
            fwrite($stream, "\t\tpublic $column->name?: $type;\n");
        }    
        //
        //Override abstract methods
        fwrite($stream, $this->get_overrides());
        //
        //Write the closing tag
        fwrite($stream, "\t}\n");
    }
    
    //Generate code for overrideing abstract methods in the context of ORM
    private function get_overrides():string{
         
        $overrides = "
            //Collect all the layouts of this entity
            collect_layouts(): Generator<quest.layout>;
            //
            //Convert a basic tuple structure to a ready one. The ready one is then used
            //for setting the user properties of the tuple 
            convert_reader_2_edit(i:reader<tuple>):edit<tuple>;
            //
            //Convert the ready data of this tuple to a  basic version primarily for the
            //for purpose of saving it to a database. 
            convert_2_writer():writer<tuple>;

            ";
       return $overrides;
    }
    
}

//
//The class models an actual table on the database; it extends an entity by 
//including the indices
class table extends entity {
    //
    //The parent database. It is protected to avoid recursion during json encoding
    protected database $dbase; 
    //
    //To allow external access to this table's protected database
    function get_dbase(){return $this->dbase; }
    //
    //The relation depth of this entity.  
    public ?int $depth = null;
    //
    //The json user information retrieved from the comment after it was decoded  
    public $comment;
    //
    //The unique indices of this table, used for identification of records
    //in the table, are set after the entity is created by a database through
    //the method named activate_indices. I think the process should be implemented
    //here, for the sake of transparency.
    //Initialed to empty delibarately
    public array /*<index>*/$indices=[];
    //
    function __construct(database $parent,string $name) {
        //
        parent::__construct($name);
        //
        $this->dbase = $parent;
        //
        //Set the database name for global access
        $this->dbname = $parent->name; 
    }
    
    //Verify the integrity of a database table (which we refer to as an entity
    //in the Javascript context)
    function verify_integrity():void{
        //
        //Verify integrity for all the columns, before those of the entity
        foreach ($this->columns as $cname=>$col) {
            //
            //A general rule for columns: Use snake (not camel) case for columm names
            if ($cname!==strtolower($cname)) $this->errors[]=new myerror("Use snake case for column named '$cname'");
            //
            //Apply column-specific intgrity checks
            $col->verify_integrity();
        }    
        //
        //Verify integrity for Indices
        if (count($this->indices)===0) 
            $this->errors[]= new myerror("Entity '{$this->name}' has no identification index");
        //
        //Ensure that the primary key is not used for building the identification.
        $this->no_primary_key_in_index();
        //
        //An entity must have a primary key
        if (count(array_filter($this->columns, fn($col)=>$col instanceof primary))===0)
        $this->errors[] = new myerror("Entity '{$this->name}' does not have a primary key");
        
    }
    //
    //Ensure that the primary key is not used for building the identification index.
    function no_primary_key_in_index(){
        //
        //Only cases where indices are defiend are consideerd
        if (!isset($this->indices)) return;
        //
        //Primary key columns should not be use in identification indices
        foreach($this->indices as $ixname=>$index) 
        foreach ($index as $cname)
        if ($this->columns[$cname] instanceof primary)
        $this->errors[]  = new myerror("Primary key of '{$this->name}' cannot be used in identification index '$ixname'");
        
    } 
    
    //Yields an array of pointers as all the foreigners that reference this 
    //table. This function is similar to foreigners(), except that its output 
    //cannot be buffered, because, with ability to add views to the database, 
    //the pointers of an entity can change.
    function pointers(): \Generator/* pointers[] */ {
        //
        //The search for pinters will be limited to the currently open
        // databases; otherwise we woulud have to open all the databse on the 
        //server.
        foreach (database::$current as $dbase) {
            foreach ($dbase->entities as $entity) {
                foreach ($entity->foreigners() as $foreigner) {
                    //
                    //A foreigner is a pointer to this entity if its reference match
                    //this entity. The reference match if...
                    if (
                    //...database names must match...
                            $foreigner->ref->db_name === $this->dbname
                            //
                            //...and the table names match
                            && $foreigner->ref->table_name === $this->name
                    ) {
                        //
                        //Create a pointer 
                        yield new pointer($foreigner);
                    }
                }
            }
        }
    }

    //This is the string represention of this table 
    public function to_str(): string {
        return "`{$this->dbase->name}`.`$this->name`";
    }
    
    //
    //Get the friendly component of the given primary key.
    function get_friend(int $pk): string {
       //
       //Formulate a selector sql based on this table's ename and dbname
       $selector = new selector($this->name, $this->dbname);
       //
       //Formulate a view based on the selector and the primary 
       //key criteria
       // 
       //Formulate the criteria 
       $criteria= new binary($this->columns[$this->name], "=",new scalar($pk));
       //
       //Compile the view, using...
       $view = new view(
               //
               //This table as the subject
               $this, 
               //
               //The only column in the view is the friendly id of the selector
               [$selector->friend()],
               //
               //The join is the same as that of the selector
               $selector->join, 
               //
               //No need for naming this view
               "noname",
               //
               //Add the name criteria
               $criteria
           );
        // 
        //Execute the view to get the friendly component
        $sql =$view->stmt();
        // 
        //Get the table's database.
        $dbase = $this->dbase;
        // 
        //Retrieve the data. 
        $data= $dbase->get_sql_data($sql);
        // 
        //We expect one row of data unless something went wrong
        if(count($data) !==1){
            throw new \Exception("The following sql did not yield one row "
                    . "of data '$sql'");
        }
        // 
        //Extract and return the friendly component; its the id
        //column of the first row.
        //
        //NB. The column may be indexed by column name
        return $data[0][$selector->friend()->name];
    }


    //
    //Returns the friendly name of the given primary key 
    function get_friendly_name(int $pk): string {
        //
        //Create the selector view
        $selector = new selector($this->name, $this->dbname);
        //
        //Modify the selecctor statement using the given primary key
        //
        //Formulate the query extension
        $where = " where `$this->name`.$this->name`= $pk";
        $sql = $selector->stmt() . $where;
        //
        //Execute the sql statement to get a result 
        $result = $this->open_dbase($this->dbname)->get_sql_data($sql);
        //
        //There should only one record 
        if (count($result) !== 1) {
            $str = json_encode($result);
            throw new \Exception("Invalid friendly name result $str");
        }
        //
        //Return the sting friend.
        return $result[0]["friend"];
    }

    //
    //Returns the "relational dependency". It is the longest identification path 
    //from this entity. 
    //The dependency is the count of the targets involved in the join of this view
    //based on the dependency network (i.e., the path whose joins return the highest 
    //number of targets);
    //How to obtain the dependency:- 
    //1. Test if it is already set inorder to trivialise this process
    //2. Create a dependecy network with this entity as its source
    //3. Using the dependency network create a join from it 
    //4. Count the number of targets in the join 
    function get_dependency(): ?int {
        //
        //1. Test if the dependecy was set to trivilalize this process
        if (isset($this->depth)) {
            return $this->depth;
        }
        //
        //2. Create a dependecy network with this entity as its source
        //To create this network we need the foreign strategy 
        $dependency = new dependency($this);
        //
        //3.Create a join using the paths dependency network 
        $join = new join($dependency->paths);
        //
        //Check for network building errors, including, cyclic loops
        $this->errors += $dependency->errors;
        //
        //If there are errors return a null
        if (count($dependency->errors) > 0) {
            return null;
        }
        //
        //4. Count the number of joints in the join 
        $depth =  $join->joints->count();
        //
        return $depth;
    }
}

//
//Models the sql of type select which extends an entity, so that it can take part
//in the database model. To resolve the root entity requires the inclusion of a
//config file in the main application.
class view extends entity {
    //
    //The criteria of extracting information from the from an entity as a 
    //boolean expression.
    public ?expression $where;
    //
    //The from clause of this view is an entity.  
    public entity $from;
    //
    //Has the connection on the various entities which are involved in this sql
    public ?join $join;
    //
    //Other clauses of an sql that the user can provide after a view is created
    public array $group_by = [];

    //Not quite sure what this property is. It is used in the execute() method 
    public string $where_ex;
    //
    public string $order_by;

    //We dont expext to callt this constructor from Js, because the data types 
    //are not simple
    function __construct(
            //
            //The base of this view
            entity $from,
            //
            //An array of named expressions, i.e., fields    
            array /* <field> */$columns,
            //    
            //The join that this view uses to access/define its data
            join $join,
            //
            //The name of the view; this is needed if this view participates in 
            //other view    
            string $name,
            //
            //The where clause as an expression
            expression $where = null,
            //
            //The group by clause -- which is an array of coulumns
            array /*<column>*/$group_by = []
    ){
        //
        //Properties are saved directly since this class is not callable from 
        //javascript
        $this->from = $from;
        $this->join = $join;
        $this->where = $where;
        $this->group_by = $group_by;
        //
        //The columnsn of a view are expected to be fields, i.e., named 
        //expresions. We use the name to index the columns.
        $keys = array_map(fn($field) => $field->name, $columns);
        $this->columns = array_combine($keys, $columns);
        //
        parent::__construct($name);
    }

    //
    //The short form of identifying a view
    function id(): string {
        return "`$this->dbname`.`$this->name`";
    }

    //Yielding the trivial entity in this view includes all the target entites 
    //involved in this join
    function yield_entity(): \Generator {
        //
        throw new \Exception("This method is not complete. The previous code is
        commented out because targets are not define in the join");
        yield;
        //
        //foreach ($this->join->targets->keys() as $entity) yield $entity;
    }

    //
    //Yields the columns in that are involved in this view useful for editing a none
    //trivial view(sql).
    function yield_attribute(): \Generator {
        //
        //Loop through the columns in this view and yield them all 
        foreach ($this->columns as $column) {
            //
            if ($column instanceof attribute)
                yield $column;
        }
    }

    //Executes the sql to return the data as an double array. At this point, we 
    //assume that all the view constructor variables are set to their desired
    //values. This is clearly not true for extensions like editor and selector. 
    //They must override this method to prepare the variables before calling
    //this method.
    function execute()/* value[][cname] */ {
        //
        //Extend the sql statement Of this view using the given where and order 
        //by clauses.
        //
        //Test if extending the where is necesary or not
        if (isset($this->where_ex)) {
            //
            //It is necessary to extend the where clause (ithe extension is 
            //provided).
            //
            //Test if a where clause already exists for this viewor not.
            if (!is_null($this->where)) {
                //
                //There already exists a where clause.
                //
                //Extend it.
                $where_str = "{$this->where} AND {$this->where_ex}";
            } else {
                //
                //There is no where clause in this view.
                //
                //Insert one.
                $where_str = "WHERE {$this->where_ex}";
            }
        } else {
            //
            //Extending the where clause is not necessary
            //
            //Return an empty string
            $where_str = '';
        }
        if (!isset($this->order_by)) {
            $this->order_by = "";
        }
        //
        //Compile the complete sql.
        $sql = "{$this->stmt()} \n$where_str \n{$this->order_by}";
        //
        //Get the current database, guided by the database name of the from 
        //clause
        $dbase= database::$current[$this->from->dbname];
        //
        //Execute the $sql to get the $result in an array 
        $array = $dbase->get_sql_data($sql);
        //
        //Return the array 
        return $array;
    }

    
    //Returns the standard string representation of a select sql statement
    public function stmt(): string {
        //
        //Ensure that each view constructor argument is set. If not we will 
        //assume the default values.
        //
        //If the fields are not set, then use all of those of the 'from' clause
        if (is_null($this->columns)) {
            $this->columns = $this->from->columns;
        }
        //
        //Convert the columns into thier sql string equivalnets
        $columns_str = implode(
            //
            //The coma sparates the columns    
            ",", 
            //
            //Note the as clause, to ensure the columns are properly named
            array_map(
                //
                //Note that its the string version of a column we want, NOT
                //THE EXPRESSION     
                fn($col) => "\n\t{$col->to_str()} as `$col->name`", 
                $this->columns
            )
        );
        //
        //If the join is not set, then assume none
        $join = is_null($this->join) ? '' : $this->join->stmt();

        //Compile the where clause in such a way that exra conditions can
        //be added at query time. For better performance, the where clause is 
        //ommited all togeher if not required
        $where = is_null($this->where) ? '' : "WHERE \n\t{$this->where->to_str()}";
        //
        //Get the from expression
        $fromxp = $this->from instanceof view 
                ? $this->from->stmt() : $this->from->to_str();
        //
        //Add the group by if necessary
        $group = "";
        if (count($this->group_by)>0){
            //
            //Convert the group by columns to a comma separated list of column
            //names;
            $group_by_str = implode(
                //
                //Use the comma as the separator
                ", ",
                //
                //Convert the roup by columns to thier string equivalents
                array_map(fn($col)=>"$col", $this->group_by)
            );
            //
            $group =  " group by \n\t$group_by_str";
        }
        //
        //Construct the sql (select) statement. Note use of the alias. It allows 
        //us to formulate a generalised sql that is valid for both primary
        //and secondary entities, i.e, views. For instance, let $x be a primary 
        //entity or view. The generalised sql is:-
        //
        //select * from $x as $x->name
        //
        //If $x is bound to the primary entity say, e.g., 'client', the final 
        //sql would be:-
        //
        //select * from client as client ....(1)
        //
        //Note that this is verbose, because of 'as client',  but correct. 
        //
        //However if $x is bound to a view named, say, test and whose sql is, e.g.,
        //
        // select name from account 
        //
        //the required sql should be:-
        //
        //select * from (select name from payroll) as test.
        //
        //The opening and closing brackets are valid for views only as it is 
        //illegal to say 
        //
        //select * from (client) as client
        //
        //in statement (1) above. Hence the brackets are conditional.
        //
        //The opening and closing brackets of the from clause are required by 
        //view only. Let $b be the set of brackets
        $b = $this->from instanceof entity ? ['', ''] : ['(', ')'];
        //
        //Now compile teh full sttaement
        $stmt = "SELECT \n"
                //
                //List all the required fields
                . "\t$columns_str \n"
                . "FROM \n"
                //
                //Use the most general form of the 'from' clause, i.e., one with
                //conditional brackets and a valid AS phrase
                ."\t". $b[0] . $fromxp . $b[1] . "\n"
                //
                //Add the joins, if any.
                . "$join\n"
                //
                //Add the where clause, if necessary    
                . $where."\n"
                //
                //Add the group by clause            
                . $group;
        //
        //Return the complete sttaement        
        return $stmt;
    }

    //ITS YOUR RESPINSIBILITY TO MAKE SURER THE SQL STATEMENT YIELDS A SCALAR
    function to_str(): string {
        return "({$this->stmt()}) as `{$this->name}` ";
    }

    //
    //sets the default of fields of this view to be either 
    //1. The fields of a from if the from is another view 
    //2. The columns of the from if the from is a root entity 
    protected function set_default_fields(): void {
        //
        $this->columns = $this->from->columns;
    }
}

//Modeling the columns of an entity as the smallest package whose 
//contents can be "saved" to a database. It is an expresion. 
//Note: this class is not abstract as we can use it to create
//columns. This is important in the context of left joins
class column extends schema implements expression{
    //
    //The parent/home of this column; it is protected to prevent recurssion when 
    //the database object is json encoded
    protected entity $entity;
    //
    //To allow access to the protcted entity
    function get_entity():entity {return $this->entity;}
    //
    //Every column should have a name 
    public string $name;
    public string $ename;
    
    //
    function __construct(
            //
            //The parent/home of this column
            entity $parent,
            //
            //The actual name of the column 
            string $name
    ) {
        //
        parent::__construct("$parent->name.$name");
        //
        //Save the constructor arguments
        $this->entity= $parent;
        $this->name = $name;
        $this->ename = $parent->name;
    }

    //
    //Only an attribute column can yield itself; all other columns cannot.
    //
    //Netbeans accepts does not commplain when we leave out the yield keyword
    //VS code does. Im not sure whether this yields a null or not. Needs to check
    //
    //Results from the research are:-are
    //A function is a generator if it contains the keyword 'yield'
    //Returing before yielding generates nothing
    function yield_attribute(): \Generator {return; yield; }
    
    //Yield the entity of this column
    function yield_entity(): \Generator {
        yield $this->entity;
    }
 
    //Returns the string version of this column. NB. There is no reference to
    //a database. Compare this with the capture:: version.
    function __toString() {
        return "`$this->ename`.`$this->name` ";
    }

    //
    //The expression string version of a column has the form
    //``$ename`.`$cname`????????/
    function to_str(): string {
        return "$this";
    }

    //Verify the integrity of a database table (which we refer to as an entity
    //in the Javascript context)
    function verify_integrity():void{
        //
        //A general rule for columns: Use snake (not camel) case for names
        if ($this->name!==strtolower($this->name)) $this->errors[]=new myerror("Use snake case for this column, '{$this->name}'");
    }
    
}
//Modelling primary (as opposed to derived) columns needed for data capture and 
//storage. These are columns extracted from the information schema directly 
//(so they need to be checked for integrity).
abstract class capture extends column {
    //
    //To support global access to database and entity names
    public string $dbname;
    //
    //The construction details of the column includes the following;- 
    //
    //Originally used for storing meta data in a strictred way. This usage has 
    //been deplrecated in favor of extending the information schema with a submodel
    //comprising of dbase-entuty-attribute tables. A comments type is string|null 
    public ?string $comment;
    //
    //The default value for this column; its type is string|null 
    public ?string $default;
    //
    //The acceptable datatype for this column, e.g., the text, number etc 
    public string $data_type;
    //
    //Shows if this column is mandatory or not. It is a string "YES" if not 
    //nullable  or a string "NO" if nullable
    public string $is_nullable;
    //
    //The size of the column. Its type is number|null
    public ?int $length;
    //
    //The column type (needed for extraction enumerated of choices)
    public string  $type;
    //
    //Extra details attached to a column, e.g., auto_increment
    public ?string $extra; /*'auto_increment'|'VIRTUAL_GENERATED'|'STORED GENERATED'|null*/
    //
    function __construct(
            table $parent,
            string $name,
            string $data_type,
            ?string $default,
            string $is_nullable,
            ?string $comment,
            ?int $length,
            string $type, 
            ?string $extra
    ) { 
       //
        //save the properties of the capture the default, datatype, is_nullable,
        //comment
        $this->comment = $comment;
        $this->data_type = $data_type;
        $this->default = $default;
        $this->is_nullable = $is_nullable;
        $this->length = $length;
        $this->type = $type;
        $this->extra = $extra;
        //
        //Create the parent column that requires the dbname, the ename and the 
        //column name  
        parent::__construct($parent, $name);
        //
        //Initialize dataase and entity names
        $this->dbname = $parent->dbname;
    }
    
    //The string version of a capture column, is the same as that of an
    //ordinary column, prefixed with the database name to take care of 
    //multi-database scenarios
    function __toString() {
        return "`$this->dbname`.".parent::__toString();
    }
    
    //Returns the non-structural colums of this entity, a.k.a, cross members. 
    //These are optional foreign key columns, i.e., thhose that are nullable.
    //They are important for avoidng cyclic loops during saving of data to database
    function is_cross_member() {
        return 
            $this instanceof foreign 
            && $this->is_nullable === 'YES'
            &! $this->is_id();
    }

    //Returns true if this column is used by any identification index; 
    //otherwise it returns false. Identification columns are part of what is
    //known as structural columns.
    function is_id(): bool {
        //
        //Get the indices of the parent entity 
        $indices = $this->entity->indices;
        //
        //Test if this column is used as an index 
        foreach ($indices as $cnames) {
            //
            if (in_array($this->name, $cnames)) {
                return true;
            }
        }
        //
        return false;
    }

    //
    //Returns a true if this column can be used for fomulating a friendly 
    //identifier.
    function is_descriptive(): bool {
        //
        //The descriptive columns are those named, name, title or decription 
        return in_array($this->name, ['name', 'description', 'title', 'id']);
    }
}

//
//The primary and foreign key column are used for establishing relationhips 
//entities during data capture. It:-
//1. Is named the same as the entity where it is homed,
//2. Has the autonumber datatype 
class primary extends capture {
    //
    function __construct(
            entity $entity,
            string $name,
            string $data_type,
            ?string $default,
            string $is_nullable,
            ?string $comment,
            ?int $length,
            string $type,
            ?string $extra
    ) {
        parent::__construct($entity, $name, $data_type, $default, $is_nullable, $comment, $length, $type, $extra);
    }

    //
    //The conditions of integrity of the primary key are:- 
    //1. It must be an autonumber 
    //2. It must be named the same way as the home entity 
    //3. It must be marked as the primary key
    function verify_integrity():void {
        //
        //The primary key column must be an integer 
        if ($this->data_type !== 'int') 
            $this->errors[] = new myerror("The data type for the primary key, {$this->name}, should be a int, not {$this->data_type}");
        //
        //The key must be  marked for auto increment
        if ($this->extra!=='auto_increment')
            $this->errors[] = new myerror("A primary key column shoulld be marked as for auto_increment");    
        //
        //A primary key column must be named the same way as the home entity. 
        //This is useful for visualizing and specifying and joins between tables. The names are case 
        //sensitive, so 'Application' is different from 'application' -- hence 
        //the reason we empasise sticking to lower case rather than camel case
        if ($this->name !== $this->entity->name) 
            $this->errors[] = new myerror("The primary key column $this should be named the same its home entity {$this->entity->name}");
            
    }

    //
    //Yield teh attribute of an entity
    function yield_entity(): \Generator {
        //
        //This database must be opened by now. I cannot tell when this is not 
        //true
        yield database::$current[$this->dbname]->entities[$this->ename];
    }
    
}
//Atributes are special columns in that they have options that describe the data
//that they hold, e.g., the data type, their lengths etc. Such descritions are 
//not by any other column
class attribute extends capture implements expression {
    //
    //create the attributes with is structure components see in in capture above 
    function __construct(
            entity $entity,
            string $name,
            string $data_type,
            ?string $default,
            string $is_nullable,
            ?string $comment,
            ?int $length,
            string $type,
            ?string $extra
    ) {
        parent::__construct($entity, $name, $data_type, $default, $is_nullable, $comment, $length, $type, $extra);
    }

    //Yieldin an attribute yields itself
    function yield_attribute(): \Generator {
        yield $this;
    }
    //
    //From metavisuo stand point, an attribute has no children
    function children():array{return []; }
   
    //There is nothing special about attributes (more than column names)
    function verify_integrity():void{
        //
        //Chhose an attribute name that does not match that of an entity as
        //this might confuse automated joints between tables. Such names are
        //reserved for foreign keys
    }
}

//
//Modelling derived columns, i.e., those not read off the information schema. 
class field extends column implements expression {
    //
    //This is the calculated/derived expression that is represented by
    //this field. 
    public expression $exp;
    //
    function __construct(
        //
        //The parent/home entity of the field.
        entity $parent,
        //
        //The field name, used as as in 'as id
        string $name,
        //
        //The expression which produces the field's value
        expression $exp
    ) {
        //
        $this->exp = $exp;
        //
        parent::__construct($parent, $name);
    }

    //The component of a field used in aselect statement
    //e.g., SELECT {$this->to_str()} AS {$this->name}
    function to_str(): string {
       return $this->exp->to_str();
    }

    //
    //Override the magic to string methd to ensure that the name of a 
    //field does not include a dbname
    function __toString() {
        //
        return "`{$this->get_entity()->name}`.`$this->name`";
    }

    //Yield the primary *nort derived) attributes of this entity. They are needed
    //to support editing of fields formulated from complex expressions
    function yield_attribute(): \Generator {
        yield from $this->exp->yield_attribute();
    }

    //Yield the primary (not derived) entities of this expression. They are 
    //needed for constructing paths using primary entoties only. A different
    //type iof yeld is required for search maths that include views. This may be
    //imporatant when deriving view from existing views. Hence the primary qualifier
    function yield_entity(bool $primary = true): \Generator {
        //
        yield from $this->exp->yield_entity($primary);
    }

}

//The link interface allows us to express relationhip between 2 columns
//as a string. Foreig and link casses implements it
interface ilink{
    //
    //A link must implement the on string needed by a join clause
    //Examples of such strings are:-
    //for many-to-one cases: todo.developer == developer.developer
    //for one-to-one case: developer.developer = user.user
    function on_str():string; 
}

//
//This class is used for establishing a link between any 2 columns
//irrespective of whether its a many to one or one to one
class link implements ilink{
    //
    //The 2 entties being linked
    public column $a;
    public column $b;
    //
    function __construct(column $a, column $b){
        $this->a = $a;
        $this->b = $b;
    }
    //
    //Example of the on clause of a one to many link:-
    //developer.developr = user.user
    function on_str(): string {
        return "$this->a = $this->b";
    }
}

//A foreign key column participates in data capture. It implements the 
//many-to-one link between 2 entities. The home entity is the one that
//houses the column. The second entity, a.k.a, away entity, is the one pointed 
//to by the relationshp
class foreign extends capture implements ilink{
    //
    //The name of the referenced table and database
    public \stdClass /* {table_name, db_name, cname} */ $ref;
    //
    function __construct(
            entity $entity,
            string $name,
            string $data_type,
            ?string $default ,
            string $is_nullable,
            ?string $comment,
            ?int $length,
            string $type,
            ?string $extra,
            \stdClass $ref
    ) {
        //
        //save the ref 
        $this->ref = $ref;
        parent::__construct($entity, $name, $data_type, $default, $is_nullable, $comment, $length, $type, $extra);
    }

    //Only relationhips that link primary and foreig keys are considered
    function verify_integrity():void {
        //
        //The name of a foreign key should match that of the regeferenecd entity, 
        //unless the relationship is hierarchical
        if (!$this->is_hierarchical() && $this->ref->table_name!==$this->name)
        $this->errors[]=new myerror("A foreign key column's name '{$this->name}' should match that of the referenced table '{$this->ref->table_name}'");
        //
        //Only foreign keys that point to a primary key are considered. This test
        //is so designed that it will work even for an external database
        if (!$this->is_hierarchical() && $this->ref->table_name !==$this->ref->cname)
        $this->errors[]=new myerror("Only foreign keys that point to a primary key are considered");
    }
    
    //Implement the on clause for a many-to-one relationship. It has a form
    //such as: todo.developer = developer.developer
    function on_str():string{
        //
        //Define the column on the many side, i.e., freign key column on the
        //the home side.
        $many = "`{$this->home()->name}`.`$this->name`";
        //
        //Define the one side, i.e., the primary key column on the away side
        $one = "`{$this->away()->name}`.`{$this->away()->name}`";
        //
        //Compile and return the equation
        return "$many = $one";
    }

    //
    //Returns the entity that the foreign key is pointing 
    //at i.e., the referenced entity.
    public function away(): entity {
        //
        //Get the referenced dbname.
        $dbname = $this->ref->db_name;
        //
        //Get the referenced database.
        $dbase = $this->open_dbase($dbname);
        //
        //Get the referenced ename.
        $ename = $this->ref->table_name;
        //
        //Get the referenced entity.
        $entity = $dbase->entities[$ename];
        //
        return $entity;
    }

    //
    //The home method returns the entity in which the 
    //foreign key is housed. It is indicated with a chicken foot
    //in our data model.
    public function home(): entity {
        //
        return $this->entity;
    }

    //Yield the entity asssociated with this column
    function yield_entity(): \Generator {
        yield $this->entity;
    }

    //returns the name
    function get_ename(): string {
        return "{$this->entity->name}.$this->name";
    }

    //Tests if a foreign key is hierarchical or not
    function is_hierarchical(): bool {
        //
        //A foreign key is hierarchical if...
        return
            //
            //...the table it references is the same as parent of 
            //this  
            $this->ref->table_name == $this->entity->name
            //
            //and in the same database    
            && $this->ref->db_name == $this->entity->dbname;
    }
    
}

//This class models a column in an entity that points to a referenced entity.
// The diference between a pointer and a foreign is that the pointers it not 
//homed at the entity it found
class pointer extends foreign {
    //
    function __construct(foreign $col) {
        parent::__construct(
            $col->get_entity(),
            $col->name, 
            $col->data_type,
            $col->default,
            $col->is_nullable,
            $col->comment, 
            $col->length,
            $col->type,
            $col->extra,    
            $col->ref
        );
    }

    //Pointers run in the opposite direction to corresponding foreign keys, so 
    //that its away entity is the home version of its foreign key
    function away(): entity {
        //
        //Get the referenced entity aand return it 
        return parent::home();
    }

    //By definition, pointers run in the opposite direction to corresponding foreign keys, so 
    //that its home entity is the away entity of its foreign key.
    function home(): entity {
        //
        //Get the referenced entity aand return it 
        return parent::away();
    }

    //
    //The expression string version of a comlumn has the form
    //`$dbname`.`$ename`.`$cname`
    function to_str(): string {
        return "$this as `$this->name`";
    }

}

//Expression for handling syntax and runtime errors in the code execution. N.B. 
//The error class does not have an sql string equivalent 
//$msg is the error message that resulted in this error 
//$suplementary data is any additional information that gives more details about 
//this error.
//Error seems to be an existing class in php, hence myerror!!
//
//My error can participate as an output expression in schema::save()
//
//myerror has been extended to handle custip errors. This is important for
//when a database is exported to Javascript. The protetcted and private
//properties of Error are not exprted. This version ensures that they are.
class myerror extends \Error implements expression, answer{
    //
    //Unprotect the error message and the stack trace so that they can be 
    //be exportable through json encoding.
    public string $_message;
    public string $_stack;
    //
    //Keeping track of the row counter for error reporting in a multi-row dataset
    protected static /* row id */  ?int $row = null;
    
    //The supplementary data is used for further interogation of the error 
    //message. 
    protected  $supplementary_data;
    //
    //Requirements for supporting the get_position() method
    protected /*[row_index, col_index?]*/$position = null;
    //
    //This functin is imporant for transferring expression postion data 
    //between expressions, e.g., 
    //$col->ans->position = $col->exp->get_postion()
    function get_position(){return $this->position; }
        //
    //Construction requires a mandatory error message and some optional suplementary 
    //data that aids in debugging
    function __construct(string $msg, $supplementary_data = null) {
        //
        //Initialize the parent class
        parent::__construct($msg);
        //
        $this->_message = $msg;
        $this->supplementary_data = $supplementary_data;
        //
        //Unprotect the inherited stack trace, replacing yeh # with a line break
        $this->_stack = str_replace('#', '<br/>', $this->getTraceAsString());
    }

    //The strimg representtaion of an error
    function __toString(): string {
        return $this->message;
    }

    //
    function to_str(): string {return "Error. $this->message";}

    //An error is always an error.
    function is_error() {return true;}

    //
    //There are no entities in an error, so this generator yields nothing. IM NOT
    //SURE HOW TO GET THE COMPILER NOT TO FLAG THIS CONSTRUCT (WITHOUT YIELD) AS
    //AN ERROR. Try the yield keyword with nothing...
    //The correct answer is a return before a yield -- see StackOverflow;  
    function yield_entity():\Generator {return; yield; }

    //
    //There are no attributes in  error, so this generator yields nothing 
    function yield_attribute(): \Generator {return; yield; }

}

//Home for methods shared between a scalar defined in this namespace and
//that defined in the capture namespace
trait scalar_trait{
    
    //A simple mechanism for distinguishing between different scalars
    public $type;
    //
    //This is the value to be represented as an expression. It has to be a absic
    //type that can be converted to a string.
    public /* string|int|boolean|null*/ $value;
    //
    //Requirements for supporting the get_position() method
    public /*[row_index, col_index?]*/$position = null;
    //
    //This functin is imporant for transferring expression ppostion data 
    //between exprssions. E.g., 
    //$col->ans->position = $col->exp->get_postion()
    function get_position(){return $this->position; }
    //
    //When you simplify a scalar you get the same thing because a scalar
    //is both an operand, i.e., input expression, and an answer, i.e., output 
    //expression. 
    function simplify():answer{
        return $this;
    }

    //String representation of a literal. Note tha there are no quotes, or special
    //processing of empty cases
    function __toString() {
        return "$this->value";
    }
    
}

//This is the simplest form of an expression. It is encountered
//in sql operatiopns, as an answer to schema::save() and as an
//operand in input operations
class scalar implements expression, answer, operand {
    //
    //Copy implementations from the root scalar trait
    use \mutall\scalar_trait;
    //
    function __construct($value, $type = null) {
        //
        //The value of a scalar is a basic_value. It  is 
        //what PHP  defines as a scalar AND as a null
        if (!(is_scalar($value) || is_null($value))) {
            throw new \Exception('The value of a literal must be a scalar or null');
        }
        //
        //save the value
        $this->value = $value;
        $this->type = $type;
    }

    //
    //Converting a literal to an sql string
    public function to_str(): string {
        //
        //A string version of a scalar is the string version of its value. For
        //null cases, its the word null without quotes; otherwise  
        //it should be enclosed in single quotes as required by mysql
        return is_null($this->value) ? 'null': "'$this->value'";
    }
    

    //There are no entoties in a literal expression
    function yield_entity(): \Generator {
        return; yield;
    }

    //There are no attributes in a literal 
    function yield_attribute(): \Generator {
        return; yield;
    }
}

//Modelling the null value expression. A null is needed for supporting both 
//caputuring and reporting f data. So, it is both an answer and an operand
class null_ implements expression, answer, operand{
    //
    //Requirements for supporting the get_position() method
    public /*[row_index, col_index?]*/$position = null;
    //
    //This functin is imporant for transferring expression position data 
    //between expressions, e.g., 
    //$col->ans->position = $col->exp->get_postion()
    function get_position(){return $this->position; }
    //
    function __construct(){}
    //
    //The string version of a null, as required in an sql statement
    function to_str(): string {
        return "null";
    }
    //There are no entities in a literal null expression
    function yield_entity(): \Generator {return; yield; }

    //There are no attributes in a null expression
    function yield_attribute(): \Generator {return; yield; }
    // 
    //
    function __toString() {
        return $this->to_str();
    }
    //
    //As an operand, a null simplifies to itself
    function simplify():answer{
        return $this;
    }
}

//The log class help to manage logging of save progress data, for training 
//purposes
class log extends \DOMDocument {

    //
    //The file name used for used for streaming
    public $filename;
    //
    //The current log, so that it can be accessed globally
    static log $current;
    //
    //Indicates if logging is needed or not; by default it is needed
    static bool $execute = true;
    //
    //The elememnt stack
    public array $stack = [];

    //
    //The document to log the outputs
    function __construct($filename) {
        //
        //Set the file handle
        $this->filename = $filename;
        //
        parent::__construct();
        //
        if (log::$execute) {
            //
            //Start the xml document 
            $root = $this->createElement('capture.data');
            $this->appendChild($root);
            //
            //Place the root at the top of the stack
            $this->stack = [$root];
        }
    }

    //Returns the element at the top of the stack
    function current() {
        return $this->stack[count($this->stack) - 1];
    }

    //Output the xml document
    function close() {
        //
        //Close the file handle, assuming files specifications are with respect
        //to the root directory
        $this->save($this->filename);
    }

    //Output the open tag for start of expression save
    function open_save(schema $obj) {
        //
        //Output the expresion full name tag
        if (!log::$execute) {
            return;
        }
        //
        //Create the element
        $elem = $this->createElement($obj->full_name());
        $this->current()->appendChild($elem);
        //
        //Place it in the stack
        array_push($this->stack, $elem);
        //
        return $elem;
    }

    //Creates a tag and appends it to the tag on top of the stack given a tag name  
    function open_tag(string $tag_name) {
        //
        //Only continue if we are in a logging mode 
        if (!log::$execute) {
            return;
        }
        //
        //In the logging mode...
        //
        //Create the element of the tagname provided. Prepare to catch invalid 
        //tagnames
        try{
            $elem = $this->createElement($tag_name);
        }catch(\Exception $ex){
            echo "Problem with tagname '$tag_name'";
            //
            //Rethrow the exception
            throw $ex;
        }
        //
        //Append the element to the one on top of the stack  i.e current;
        $this->current()->appendChild($elem);
        //
        //Place it in the stack
        array_push($this->stack, $elem);
        //
        //return the element creates
        return $elem;
    }

    //sets the attributes of an element given the string attribute name, the element 
    //and the value 
    function add_attr(string $attr_name, string $value, $element = null) {
        //
        if (!log::$execute) {
            return;
        }
        //
        //
        //$Ensure the element we are adding the value is at the top of the stack
        //enquire on how to deal with this situatuation 
        if (!is_null($element) && $this->current() == !$element) {
            throw new \Exception('Your stack is corrupted');
        } else {
            $this->current()->setAttribute($attr_name, $value);
        }
    }

    //ClosiNg pops off the given element from the stack
    function close_tag($element = null) {
        //
        //If not in log mode
        if (!log::$execute) {
            return;
        }
        //
        //Use the givebn element for tesing integory
        if (!is_null($element) && $this->current() == !$element) {
            throw new \Exception('Your stack is corrupted');
        }
        array_pop($this->stack);
    }

}

//Models the network of paths that start from an entity and termnate on another
//as a schema object so that it can manage errors associated with the process of 
//formulating the paths.
abstract class network extends schema {

    //
    //keeps a count of all the paths that were considered for deburging puposes 
    public int $considered = 0;
    //
    //The entity that is the root or origin of all the paths pf this network
    public entity $source;
    //
    //The collection of paths that form this network. Each path terminates on
    //another entity. Multiple paths terminating on the same entity are not allowed.
    //The better of the two is prefered over any other alternative. Note that 
    //this property is deliberately unset, so that execute() will do it when 
    //required.
    public array /* path[name] */$paths;
    //
    //The strategy to use in searching for paths in a network (to improve 
    //performance). This ensures that networks that dont use pointers do not have
    //to carry the budden asociated with construcring poinsters
    public strategy $strategy;
    
    //To create a network we must atleast know where the network will begin which 
    //is the source entity. The constructor cannot be called from javascript 
    //because of its complex data type. 
    function __construct(entity $source, strategy $strategy) {
        //
        //save the start point of this network
        $this->source = $source;
        $this->strategy = $strategy;
        //
        //Initialize the parent process. There is no partial name that is 
        //associated with a network as it has no presence in the relatinal data 
        //model (unlike entities, attributes, indices, etc)
        parent::__construct('unnamed');
        //
        //Extract the paths involved in this network 
        $this->build_paths();
    }

    //Every network should have a way of defining whe its paths come to 
    //an end
    abstract function is_terminal(entity $entity): bool;

    //
    //By default, every foreign key can contribute in a network
    function is_excluded(foreign $key): bool {
        //
        //Ignore the key
        mutall::ignore($key);
        //
        //No forein key is excluded from partcipating in a network
        return false;
    }

    //By default every foreign key should be included.
    function is_included(foreign $key): bool {
        //
        //Ignore the key
        mutall::ignore($key);
        //
        //No forein key is excluded from partcipating in a network
        return true;
    }

    //Executing the network establishes and sets its associated paths. Any errors 
    //encountered are handled according to the throw_excepon setting. If true, 
    //an expetion will be thrown immediately. If not, it is save in the error 
    //log. (Remmember that network is a schema object). 
    function build_paths(bool $throw_exception = true) {
        //
        //Begin with an empty path. 
        /* path[name] */$this->paths = [];
        //
        //Starting from the source, populate ths network's  paths, indexed 
        //by the terminal entity name. In a multi-database setting the ename is
        //not sufficent to identify an entity. The database name is also required
        //Hence the partial name.
        foreach ($this->path_from_entity($this->source, []) as $newpath) {
            //
            $this->paths[] = $newpath;
        }
        //
        //Verify integrity of the paths. E.g., in a fit, ensure that all the
        //targets are covered.
        $this->verify_integrity($throw_exception);
    }

    //Yields all the paths that start from the given entity. Each path is indexed
    //by a suitable name
    private function path_from_entity(entity $from, /* foreigner[] */ $path): \Generator {
        //
        //Check if we are at the end of the path. We are if the
        //termnal condition is satisfied
        if ($this->is_terminal($from)) {
            //
            //Yield teh indexed and the target name
            yield $from->name => $path;
        }
        //
        //Us the foreigner returned by executing each of the serch functiion
        foreach ($this->strategy->search($from) as $foreigner) {
            //var_dump($foreigner->name);
            //
            //count the foreigners
            $this->considered++;
            //
            // Consider teh foghner for the path being searched
            yield from $this->path_thru_foreigner($foreigner, $path);
        }
    }

    //Yields all the paths that pass through the given foreigner
    private function path_thru_foreigner(foreign $foreigner, array /* foreigner[] */$path): \Generator {
        //
        //Determine if this foreigner is to be included in the path. Don't waste
        //time with any operation besed on this foeigner if,after all, we are 
        //not goin to include it in the path!
        if ($this->is_excluded($foreigner)) {
            return;
        }
        //
        if (!$this->is_included($foreigner)) {
            return;
        }
        //
        //We are not at the end yet; Prepare to add this foreigner to the path
        //and continue buiiding the path using its away component; but first, 
        //attend to cyclic looping condition. For now....(in future we throw 
        //exeption immedately or log it as an error, e.g., in identifier)
        //
        //A cyclic path will occur if a) the relation is hierarchical or.... 
        if ($foreigner->is_hierarchical()) {
            return;
        }
        //
        //b)...if 'there is evidence' that it is already in the path.
        $repeated = array_filter($path, fn($f) => $f->name == $foreigner->name);
        //
        if (count($repeated) > 0) {
            return;
        }
        //
        //Add this foreigner to the path
        $path[] = $foreigner;
        //
        //Continue buildig the path, as if we are starting from the away entity
        //of the foreigner.
        $entity = $foreigner->away();
        //
        yield from $this->path_from_entity($entity, $path);
    }

}

//Modelling strategy for searching through a network. Searching through paths 
//indiscriminately is very time consuming because potetually we would have to 
//search through all the databases in the sever -- in a multi-database scenario. 
//To improvoe performance, we have limuetd to the search to currently opened 
//databases only. Even then, pointers are not buffered, because, with introduction 
//of views (that can be connected to the model at any time) the problems of 
//updating the buffer is not worth the trouble. Some searches do not require
//pomiters, so thet dont have to beer the budden. The stargey class is desifned 
//to dismiss pointers when they are not necessary
abstract class strategy extends mutall {
    // 
    //Types of strategies for searching paths in a network are designed for  
    //boosting the search performance
    public int $type;
    //
    //Possible values for the stragegy types are:-
    //
    //Use the foreign key columns only. Typically, the identifier network uses 
    //this strategy
    const foreigners = 0;
    //
    //Use the pointers only for the network. I have no idea which network would
    //ever use this, so this strategy is not implemented for now.
    const pointers = 1;
    //
    //Use both pointers and foreign key columns. The fit and save (indirect) 
    //networks use this strategy. 
    const both = 2;
    //
    //using only structural foreigners 
    const structural = 3;
    //
    function __construct(int $type = self::foreigners) {
        $this->type = $type;
        //
        //The true in the parent is for the throw exception option which by default 
        //is true but i passed it here so that i can be aware of it.
        parent::__construct(true);
    }

    //
    //Yields the required foreign depending on the strategy o nwhich the network is 
    //operating on
    abstract function search(entity $source): \Generator;
}

//Use foreiners only
class strategy_foreigner extends strategy {

    //
    function __construct() {
        parent::__construct(self::foreigners);
    }

    function search(entity $source): \Generator {
        yield from $source->foreigners();
    }

}

//
//The network that utilises both the foreigners and the pointers in the formulation of
//its path this strategy is particulary important in the areas where we do 
//not know how the entites are related i.e for the fit and the save network 
class strategy_both extends strategy {

    //
    //The stategy for this network is a both see in strategy above 
    function __construct() {
        parent::__construct(self::both);
    }

    //
    //Searches in this strategy are bound to both the foreigners and the pointers 
    //since both constitute the path of a network in this strategy 
    function search(entity $source): \Generator {
        //
        yield from $source->foreigners();
        //
        //The source must be a table
        if ($source instanceof table) yield from $source->pointers();
    }

}

//
//This strategy is to save on the processing time needed to where we constrain the path 
//to only the structural or administative entities (no reporting) ment to reduce the number 
//of paths that are considered for a complete join 
class strategy_structural extends strategy {

    //
    //The stategy for this network is a both see in strategy above 
    function __construct() {
        parent::__construct(self::structural);
    }

    //
    //Saerches in this strategy are bound to both the foreigners and the pointers 
    //since both constitute the path of a network in this strategy 
    function search(entity $source): \Generator {
        //
        //Test if this entity is a reporting entity any to ensure that no path 
        //is yielded in such a situation
        if ($source->reporting)  return;
        //    
        //An entity not used for reporting yields both the pointers and the foreigners 
        else {
            yield from $source->structural_foreigners();
            yield from $source->structural_pointers();
        }
    }

}

//This is a network of all the foreigns that are none cross members from the source 
//to terminal condition 
//Terminal condition is an entity that does not have structural foreign key(structural
//means those entties that that are  not cross members)
//parameter $source is the root origin of this network see in network above 
class dependency extends network {
    //
    //
    function __construct(entity $source) {
        //
        //The dependency network only relies on foreigners (not pointers) keys to 
        //create for its path
        $strategy = new strategy_foreigner();
        //
        //Search the network paths using the foreign strategy 
        parent::__construct($source, $strategy);
    }

    //We only utilise those foreign keys that are not cross members 
    function is_included(foreign $key): bool {
        //
        //Exclude cross members 
        if ($key->is_cross_member()) {
            return false;
        }
        //
        return true;
    }

    //Returns true if the given entity does not have any foreign keys that are 
    //not cross members i.e structural foreign keys 
    function is_terminal(entity $from): bool {
        //
        //Filter the columns of the entity to remain with the foreign keys
        //that are not cross members
        $id_foreigners = array_filter($from->columns, fn($col) =>
                $col instanceof foreign & !$col->is_cross_member()
        );
        //
        //We are at the end of the path if the given entity has no foreign column 
        //that are structural
        return count($id_foreigners) === 0;
    }

}