<?php
namespace mutall;
//
//This class supports the tree view of files and folders
class path{ //Save the give contents to a file
    function put_file_contents(string $text)/*number|false*/{
        //
        //Only files are expected
        if (!$this->is_file) throw new \Exception("This '$this->name' is not a valid file");
        //
        //The file must exist
        if (!file_exists($this->name)) throw new \Exception("This '$this->name' does not exist");
        //
        //Return the contents of the requested file
        return file_put_contents($this->name, $text);
    }
    //
    //The full name of this path
    public string $name;
    //
    //Indicates if the path name is a file or not; if not, then its a folder
    public bool $is_file;
    //
    //Construct a path from the full name of the the path. Also, indicate if 
    //the path is a file or not
    public function __construct(string $iname, bool $is_file) {
        //
        //use the current working directory (cwd) to resolve relative path, if
        //necessary
        $this->name = schema::resolve_filename($iname);
        //
        //Set the is_file property
        $this->is_file = $is_file;
    }
    
    //Scan for files and folders in the current directory, i.e., the directory
    //that was used to create this path.
    function scandir():Array/*<{path:path, name:string, is_file:boolean, properties:properties}>*/{
        //
        //Scan the directory and get rid of the dots that scandir() picks up in
        // Linux environment
        $scan_indexed = array_diff(scandir($this->name), ['..', '.']);
        //
        //The array dif seems to return an indxed array -- which gets mapped to
        //another indexed array. Such an array resurfaces as a json object, 
        //rather than an array -- with unintended consequences. Hakikisha that
        //only array valuse are considederd.
        $scan = array_values($scan_indexed); 
        //
        //Return the scanned paths with an indication whether a path is a file or 
        //not,i.e.,a folder.
        //For some reason, the array is indexed using 
        return array_map(fn($name)=> $this->compile_result($name),$scan);
    }
    
    //Compile the Ipathj result
    function compile_result(string $name):array/*{path:path, name:string, is_file:boolean, properties:properties}*/{
            //
            //Formulate the complete path
            $path = $this->join_paths($this->name, $name);
            //
            //Return the name of a file or folder, plus whether it is a file
            //or not
            return [
                'path'=>$path, 
                'name'=>$name, 
                'is_file'=>is_file($path), 
                'properties'=>$this->get_properties($path, $name)
            ];
    }
    
    //Read and return the contents of the current file name
    function get_file_contents():string{
        //
        //Only files are expected
        if (!$this->is_file) throw new \Exception("This '$this->name' is not a valid file");
        //
        //The file must exist
        if (!file_exists($this->name)) throw new \Exception("This '$this->name' does not exist");
        //
        //Return the contents of the requested file
        return file_get_contents($this->name);
    }

    //Return the properties of a file.
   // filectime: when created
   // filemtime: last modified
   // fileatime: last accessed
   function get_properties(string $path, string $name):Array /*={[index:string]:basic_value}*/{
    //
    //Handle directories
    if (!is_file($path)) return [
        'name'=>$name, 
        'size'=>$this->format_size($this->dir_size($path))
    ];
    //
    //Handle files
    //
    //Use the pathname to construct a file object
    $file = new \SplFileObject($path);
    //
    //Retrieve the size, in friendly format
    $size = $this->format_size($file->getSize());
    //
    //Retrieve the date of creation. date ("F d Y H:i:s.", $time)
    $create_date= date("d m Y H:i:s", $file->getCTime());
    //
    //Retrieve the date of last modification (unix time)
    $modify_date = date("d m Y H:i:s", $file->getMTime());
    //
    //Compile and return the properties. 
    return ['name'=>$name, 'size'=>$size, 'create_date'=>$create_date, 'modify_date'=>$modify_date];
}   
    //Returns the complete name of this path by joining trh 2 given parts
    //ensuring that slashes are applied correctly
    function join_paths(string $path1, string $path2):string{
        //
        //Join and return the root and relative paths
        return join(
           //
           //Use the slash as a separator between the 2 paths
           '/', 
           //
           //Formulate an array using the 2 paths after cleaning them, i.e.,
           //strippng them off the trailing forward slash if it is present
           [
               //
               //Ensure that the leading slash is removed from the first path,
               //if it is present
               rtrim($path1, '/'), 
               //
               //Ensure that the leading slash is remmoves from the 2nd path,
               //if it is present
               rtrim($path2, '/')
            ]
        );
    }
    
   //Returns the size of a folder 
   function dir_size($directory):int{
        $size = 0;
        foreach(new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($directory)) as $file){
            $size+=$file->getSize();
        }
        return $size;
    }
    
    //Put the size to human friendly format 
    function format_size($size):string {
        $mod = 1024;
        $units = explode(' ','B KB MB GB TB PB');
        for ($i = 0; $size > $mod; $i++) {
          $size /= $mod;
        }
        return round($size, 2) . ' ' . $units[$i];
   }
   
    //Delete the current path
    function delete():void{
       //
       //Unlink the path, if its file
       if ($this->is_file && unlink($this->name)) return;
       //
       //Remnove the path if its a folder 
        if (!$this->is_file && rmdir($this->name)) return;
        //
        //The path cannot be removed
        throw new \Exception("Unable to delete '$this->name'");
   }
   
   //Rename the current path to the given one
    function rename(string $to):void{
       //
       //Rename the path, if its possible
       if (rename($this->name, $to)) return;
        //
        //The path cannot be renamed
        throw new \Exception("Unable to rename '{$this->name}' to '$to'");
   }
   
   // copy given file to the given destination
   function  copy(string $destination):void{
       //
       //
       copy($this->name,$destination);
   }
   
   
   
}



 
