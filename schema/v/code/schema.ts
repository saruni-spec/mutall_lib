//Mechamism for schema to access the mutall library
import {
  mutall,
  mutall_error,
  basic_value,
  mymap,
} from "../../../schema/v/code/mutall.js";
import * as library from "../../../schema/v/code/library.js";
import * as io from "../../../schema/v/code/io.js";

//
//Re-export mutall error (for backward compatibility)
export { mutall_error, basic_value, mymap };
//
//Describes the entiy names in so to maintain my code local vocabularies as
//derived from php
export type ename = string;
//
//The database name
export type dbname = string;
//
//These are the custom datatype for the column name to maintain a semantic meaning to my code
export type cname = string;
//
//The end of time date is the highest valid date that the relational
//databases can accommodate
export const end_of_time = "9999-12-31";

//The column structure as imported from php
type static_column = {
  name: string;
  data_type: string;
  default: string;
  is_nullable: string;
  //
  //This comment is used for driving new properties, e.g. title, cx, cy
  comment: string;
  title: string;

  length: number;
  type: string;
  extra: string;
};
//
//Represents errors emanating from server (php) side. N.B. the underbars in
//the following property names have their roots in PHP where plain names
//like message and stack are not allowed as they refer to protected properties
//which are discared by json encoding. The PHP error has more information, e.g.,
//line number, etc; but the following is what is important for our purpose.
export type php_error = {
  //
  //The error message
  _message: string;
  //
  //The stack trace, as a string.
  _stack: string;
};
//
//A label was mooted to support the generation of full-fledged questionnaire
//labels. The only difference is that of the first parameter. Instead of a
//mandatory expression we have an optional binding. It tells us how to compile
//free, i.e., undefined, binding when the label's expression will be bound to the
//context. If it is bound, then the binding is the label's expression. When
//a label is compiled, it is converted to a binding
export type label = [
  binding: basic_value | undefined,
  ename: string,
  cname: string,
  dbname?: string,
  alias?: alias
];
//
//Options for controlling a view
export interface view_option_interface {
  //
  //The address  of the page. Some popup pages don`t have
  //a url that`s why it`s optional.
  url: string;
  //
  //A friendly identifier of this zone, for reporting and debugging purposes,
  //as well classifying cells of this homozone. Use this option to name cells
  //that you can style as you wish
  class_name: string;
  //
  //For quirk and dirty coloring jobs....
  color: string;
  //
  //The hlm element that defines where this zone/table will be attached
  //in the DOM hierarchy, defined explcily as an element or implicily as a css
  anchor: string | HTMLElement;
  //
  //The current working directory, used for resolving relative paths
  cwd: string;
  //
  //The name of the current database, if any, thus integrating view with database
  //operations
  dbname: string;
  //
  //The input/output(io) supported by the all the cells in the homozone
  io_type: io.io_type | "default";
  //
  //Data type derived from the php native data types. See php getColumnMetadata()
  //method in php
  data_type: string;
  //
  //Data size, as suggested by a database column and the maximum number of
  //characters you can type in an input field
  maxlength: number;
  //
  //The size/width of an input field. This is borrowed from html input element
  size: number;
  //
  //Indicates if this view is hidden or not
  hidden: boolean;
  //
  //Cells that have this option set to true will not be written to the
  //database on blur. The default is that they will
  nowrite: boolean;
  //
  //Determines whether a data list is added to a varchar io or not. The default
  //is that it is added if it satisfy certain conditions, e.g., it is used
  //for identification
  add_datalist: boolean;
  //
  //Mode for opening a cell. The default is normal
  mode: "edit" | "normal";
  //
  //Provision for specifying data writing labels at the highest level in the
  //view hierarchy. This property helps to implement the method
  //search_subject():Generator<subject>, thus allowin us to specify database
  //labels anywhere within the view heierarchy
  labels: Array<label>;
}
//
//The options used to describe a view. Do not confuse this with Array<option>
export type view_options = Partial<view_option_interface>;
//
//The general structure of an option. We need to access options via a getter; therefore
//it cannot be paremetric
export type option = {
  //
  //The identifier of the option
  key: string;
  //
  //Its value
  value: any;
  //
  //The view it came from
  source: view;
};
//
//Harmonises errors from both the server and client sides of an application.
export type myerror = {
  //
  //The error message
  message: string;
  //
  //The stack trace, as a string. In JS, stack is optional. Make this one
  //optional as well, for compatibility
  stack?: string;
};

//Let fuel be the data type that describes a record derived from an sql statement.
export type fuel = { [key: string]: basic_value };

//
//The types of columns available in this file
type col_type = "attribute" | "primary" | "foreign" | "field";

//
//The name-indexed databases accessible through this schema. This typically
//comprises of the mutall_users database and any other database opened by
//an application.
export const databases: { [index: string]: database } = {};

//
//An alias is an id, such that its combination a dbname, ename, and cname is
//used to form a unique index of an expression The questionnaire loading system
//requires that all labeled expressions being loaded must be uniquely identified
//by the dbname/ename/cname/questionnaire combination. An alias is designed
//as an array to support loading of hierarchical data.
export type alias = Array<basic_value>;

//The sttaic reference to a database able
export type subject = {
  ename: string;
  dbname: string;
};
//
//View is the root of all classes in the outlook library, so, it holds methods
//and properties that all outlook users can access.
//(Its descendants can dispatch and listen to events. Where do we use this fact?)
export abstract class view extends mutall {
  //
  //Every view has a proxy -- a element that represents the view. The user
  //of this property is responsible for setting it. This is designed to be
  //compatible with earlier view-derived classes
  public proxy__?: Element;
  //
  //This is used for indexing a view object to support implementation of the
  //static 'current' property, as well as associating this view with a state
  //object in the management of sessions. It is set when this view is
  //constructed. See onpopstate
  public key: number;
  //
  //Lookup storage for all views created by this application.
  static lookup: Map<number, view> = new Map();
  //
  //The current active view where the events (on a html page) are wired. E.g.
  //<button onclick=view.current.open_dbase()>Ok</button>
  static current: view;
  //
  //A view is associated with a win property. Typically it is the current
  //window, when the view is created. This variable is protected so that
  //it accessible only via getters and setters. This is important because
  //other derivatives of this class access the window property in different
  //ways. For instance, a baby page gets its window from its mother
  protected win__: Window = window;
  //
  //These are getter and setter to access the protected win variable. See
  //documention for propertu win__ above to appreciate the reason for using
  //of getters and setters in derived classes
  get win() {
    return this.win__;
  }
  set win(win: Window) {
    this.win__ = win;
  }
  //
  //The document of a view is that of its the window
  get document() {
    return this.win.document;
  }
  //
  //A database in the mutall hierarchy referenced by one of the view options, e.g.,
  //{dbname:string}
  public dbase?: database;
  //
  //A database name in the view hierarchy
  public dbname?: string;
  //
  //The children nodes of the root document element of this page
  //to support restoring of this page in response to the on pop state event.
  //The ordinary programmer is not expected to interact with this property,
  //so it is protected
  protected child_nodes: Array<ChildNode> = [];
  //
  //The end of time date is the highest valid date that the relational
  //databases can accommodate
  public static end_of_time: string = "9999-12-31";
  //
  //Support for data lists, indexed by a column id
  public datalists: Map<string, HTMLDataListElement> = new Map();
  //
  constructor(
    //
    //To implement the view has-a hierarchy
    public parent?: view,
    //
    //The options for controlling a view
    public options?: view_options
  ) {
    //
    //Initialize the parent evet target
    super();
    //
    //Register this view identified by the last entry in the lookup table for views.
    //
    //The view's key is the count of the number of keys in the lookup.
    this.key = view.lookup.size;
    view.lookup.set(this.key, this);
  }
  //
  //The parents hierarchy for driving collection of available options. The only
  // known case where a view has more than 1 parent is the grid cell. Note
  //the difference between parent and parents hierarchy
  get guardians(): Array<view> {
    //
    //If this view has no parent, then it has no guardians
    if (!this.parent) return [];
    //
    //By default, the parent is the only guarduan; under the cell circumstance
    //there can be 2 -- a horizontal and vertical guardian
    return [this.parent];
  }
  //
  //Tells us if this view is hidden or not, depending on whether the
  //hidden option is available (in the view hierarchy) or not. Tabulators
  //overide this method to implement hidding by considering options in ticks and axes
  get hidden(): boolean {
    //
    //Get the hidden option
    const hidden: boolean | undefined = this.search_option("hidden");
    //
    //By default a view is visible, i.e., not hidden
    if (hidden === undefined) return false;
    //
    //Otherwise the user desired hidden status
    return hidden;
  }

  //Retrieving the root view. It is the one that has no parent
  search_root_view(): view {
    //
    //This is the root view if it has no parent
    if (!this.parent) return this;
    //
    //The parent exist. Continue the search from there.
    return this.parent.search_root_view();
  }

  //Execute a php class method from javascript (using parametrization to
  //implement type checks)
  //This method simplifies the windows equivalent fetch method with the following
  //behaviour.
  //If the fetch was successful, we return the result; otherwise the fetch
  //fails with an exception.
  //partcular static methods are specifed static:true....
  //It returns the same as result as the method  in php
  async exec_php<
    //
    //Convert the library namespace to a type. It comprises of classes organized
    //as an interface e.g.,
    //classes = interface library {database:object, record:object, node:object }
    classes extends typeof library,
    //
    //The class names are the keys of classes. Get the keys using the keyof operator.
    //The resulting type is string|number. In order to comply with the
    //formdata.append parameters i.e.,string|blob, filter out the numbers, to be
    //left with strings
    class_name extends Extract<keyof classes, string>,
    //
    //Get the actual (static) class that is indexed by the class name; it also
    //should be a constructor
    $class1 extends classes[class_name],
    //
    //In additin, class1 must satisfy a constructor type.
    //N.B. Interesection does not give us the correct behaviour.
    $class extends $class1 extends { new (...args: any): any }
      ? $class1
      : never,
    //
    //Get the constructor parameters.
    cargs extends ConstructorParameters<$class>,
    //
    //Get the constructed instance
    instance extends InstanceType<$class>,
    //
    //The object method must be a string. Filter out the numbers
    method_name extends Extract<keyof instance, string>,
    //
    //Get the actual, i.e., indexed method
    method1 extends instance[method_name],
    //
    //The methods must satisfy the function type
    method extends method1 extends (...args: any) => any ? method1 : never,
    //
    //Retrieve the arguments from the method
    margs extends Parameters<method>,
    //
    //Get the return type of the method
    $return extends ReturnType<method>
    /*
       NAMING THE GENERIC PARAMETERS EXACTLY LIKE THE FUNCTION ARGUMENTS SEEMS
       TO CONFUSE THE INTELLISENSE. HENCE THE CAPITLAIZATION OF THE FIRST LETTER
       IT WAS THE SOLUTION TO AN AGE-OLD PPROBLEM 
       */
  >(
    //
    //The class of the php class to execute.
    Class_name: class_name,
    //
    Cargs: cargs,
    //
    Method_name: method_name,
    //
    Margs: margs,
    //
    //The current working directory. Important for resolving relative paths
    cwd?: string
  ): Promise<$return> {
    //
    //Call the non parametric form of exec
    return await this.exec_php_nonparam(
      Class_name,
      Method_name,
      Margs,
      Cargs,
      cwd
    );
  }

  //
  //This is the non-parametric version of exec useful for calling both the static
  //and object version of the given php class
  async exec_php_nonparam(
    //
    //This is the name of the php class to create
    class_name: string,
    //
    //The method to execute on the php class
    method_name: string,
    //
    //The arguements of the method
    margs: Array<any>,
    //
    //If defined, this parameter represents the constructor arguements for the
    //php class. It is undefined for static methods.
    cargs: Array<any> | null = null,
    //
    //The current working directory
    cwd0?: string
  ): Promise<any> {
    //
    //Prepare to collect the data to send to the server
    const formdata = new FormData();
    //
    //If the current working directory is given use it, otherwise search the
    //view hierarchy for one
    const cwd: string | undefined = cwd0 ?? this.search_option("cwd");
    //
    //Add the current working directory, if available. This will replace the
    //need for reading the app_url from a setup file
    if (cwd) formdata.append("cwd", cwd);
    //
    //Add to the form, the class to create objects on the server
    formdata.append("class", class_name);
    //
    //Add the class constructor arguments if they are defined
    if (cargs === null) {
      //
      //The method on the php class is static
      formdata.append("is_static", "true");
    } else {
      //
      //The method on the php class is an object method
      formdata.append("cargs", JSON.stringify(cargs));
    }
    //
    //Add the method to execute on the class
    formdata.append("method", method_name);
    //
    //Add the method parameters
    formdata.append("margs", JSON.stringify(margs));
    //
    //Prepare  to fetch using a post
    const init = {
      method: "post",
      body: formdata,
    };
    //
    //Construct the correct path for the index file
    //
    //The default location of the index file
    const default_path: string = "/schema/v/code/index.php";
    //
    //The correct path for the indexing file when we have a current working
    //directory
    const path: string = cwd ? `${cwd}/../../..${default_path}` : default_path;
    //
    //Fetch and wait for the response, using the (shared) export file
    const response = await fetch(path, init);
    //
    //Get the text from the response. This can never fail
    const text = await response.text();
    //
    //The output is expected to be a json string that has the following
    //pattern: {ok:boolean, result:any, html:string}. If ok, the
    //result is that of executing the requested php method; otherise it
    //is an error message. htm is any buffered warnings.
    let output: { ok: boolean; result: any; html: string };
    //
    //The json might fail (for some reason, e.g., an Exception durinh PHP execution)
    try {
      //Try to convert the text into json
      output = JSON.parse(text);
    } catch (ex) {
      //
      //Invalid json; ignore the json error. Report the text as it is. It may
      //give clues to the error
      //
      throw new mutall_error(text);
    }
    //
    //The json is valid.
    //
    //Test if the requested method ran successfully or not
    if (output.ok) return output.result;
    //
    //The method failed. Report the method specific errors. The result
    //must be an error message string
    const msg = <string>output.result;
    //
    //Report the error and log the result.
    throw new mutall_error(msg, output.result);
  }

  //Create a new element from  the given tagname and attributes
  //we assume that the element has no children in this version.
  public create_element<
    //
    //The tagname is the string index of the html map.
    tagname extends keyof HTMLElementTagNameMap,
    //
    //Collection of attributed values. The typescript Partial  data type
    //is a short form of
    //attribute_collection extends {[key in attribute_name]?:HTMLElementTagNameMap[tagname][key]}
    attribute_collection extends Partial<HTMLElementTagNameMap[tagname]>
  >(
    //
    //The element's tag name
    tagname: tagname,
    //
    //The parent of the element to be created.
    anchor: HTMLElement,
    //
    //The attributes of the element
    attributes?: attribute_collection
  ): HTMLElementTagNameMap[tagname] {
    //
    //Create the element holder based on the td's owner document
    const element = this.document.createElement(tagname);
    //
    //Attach this element to the anchor, if the anchor is defined
    if (anchor !== undefined) anchor.appendChild(element);
    //
    //Loop through all the keys to add the atributes, if they are defoned
    if (attributes !== undefined)
      for (let key in attributes) {
        const value: any = attributes[key];
        //
        // JSX does not allow class as a valid name
        if (key === "className") {
          //
          //Take care of multiple class values
          const classes = (<string>value).split(" ");
          classes.forEach((c) => element.classList.add(c));
        } else if (key === "textContent") {
          element.textContent = value;
        } else if (
          key.startsWith("on") &&
          typeof attributes[key] === "function"
        ) {
          element.addEventListener(key.substring(2), value);
        } else {
          // <input disable />      { disable: true }
          if (typeof value === "boolean" && value) {
            element.setAttribute(key, "");
          } else {
            //
            // <input type="text" />  { type: "text"}
            element.setAttribute(key, value);
          }
        }
      }
    //
    //Rteurn the element
    return element;
  }
  //
  //Return the identified element, if it exists. If it does not, then throw an
  //exception
  get_element(id: string): HTMLElement {
    //
    //Get the identified element from the current browser context.
    const element: HTMLElement | null = this.document.getElementById(id);
    //
    //Check the element for a null value
    if (element === null)
      throw new mutall_error(`The element identified by #${id} not found`);
    //
    //Return (found) the element
    return element;
  }

  //To capitalize the first letter of a word
  capitalize_first_letter(word: string): string {
    //
    // Check if the input is not empty
    if (word.length === 0) return "";
    //
    // Capitalize the first letter and concatenate with the rest of the word
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  //Returns the proxy element of this view.  proxy is definitely available for
  //all ios, but it may not be available to others. Proxy is a general element
  //so that we can take care of both html and svg elements
  get proxy(): Element {
    //
    //Its a loud error if you try to get a proxy that is not set
    if (!this.proxy__) throw new mutall_error(`Proxy of view not set`, this);
    return this.proxy__;
  }
  //Set the proxy element
  set proxy(e: Element) {
    this.proxy__ = e;
  }
  //
  //Search and return the the only element selected by the gigen css
  //css selector; it is an error if more than 1 or none is found.
  query_selector(css: string): HTMLElement {
    //
    //Get the identified element from the current browser context.
    const elements: Array<Element> = Array.from(
      this.document!.querySelectorAll(css)
    );
    //
    //If there is more than one element, warn the user
    if (elements.length > 1)
      throw new mutall_error(
        `There are ${elements.length} elements selected by ${css}`
      );
    //
    //Check the elements is empty
    if (elements.length === 0)
      throw new mutall_error(`The element with selector ${css} not found`);
    //
    //Return (the only found) the )HML) element
    return <HTMLElement>elements[0];
  }

  //Returns todays date in the yyyy-mm-dd format suitable for feeding to mySQL
  //database, as well as to the value of a date input (without the time component)
  get_todays_date(): string {
    //
    // Create a new Date object for today's date
    const today = new Date();
    //
    //Standardise and todays date
    const formatted_date: string = this.standardise_date(today);
    //
    //Return the mysql standardised date
    return formatted_date;
  }

  //Use the Luxon library to return the date and time for now() formated in
  //the way  MYsql expects it.
  public now(): string {
    //
    //Discontinue the lusxon library
    //return luxon.DateTime.now().toFormat('YYYY-MM-DD hh:mm:ss');
    //
    //se the alternative method to get a mysql-compatible date string for
    //now();
    return this.standardise_date(new Date());
  }
  //
  //This is a general procedure for standardising conversion of dates to mySQL
  //compatible string format. I still have a problem importing from a node_modules
  //library that is not in my current folder. Js won't understand
  //import * as y from "x"
  //when the node_modules are in a different folder from the code. It only understands
  //paths of the form: "./x.js" "../x.js", "/a/b/c/x.js". Perhaps its time to
  //learn how to use webpack. For now, use the native Js method of converting the
  //date to a ISOstring, then replacing the T with a space and Z with nothing
  standardise_date(date: Date): string {
    //
    //Discontinue using the lucon libray
    //return luxon.DateTime.fromJSDate(date).toFormat('YYYY-MM-DD hh:mm:ss');
    //
    //Use the given date to bject and ...
    const str = date
      //
      //Convert the date ISO string, e.g., "2023-01-27T00:12:00.0000Z"
      .toISOString()
      //
      //Use the T to split the string into date and time components
      .split("T")[//Pick the date part //
    0];
    //
    //Return the result as, e.g. "2023-01-27"
    return str;
  }

  //Open and retirn the nearest database oin the view hierarchy
  async get_dbase(): Promise<database> {
    //
    //Serach for a datbase name in the properties and options of the view
    //hierarchy
    const dbname: string = this.get_dbname();
    //
    //Use the dbname to open a database if exists or or create one if it doesnt
    const dbase: database = await this.open_dbase(dbname);
    //
    //Retuirn the dataase
    return dbase;
  }

  //Returns the named database if it exists; if it does not, create one and return it
  async open_dbase(dbname: string): Promise<database> {
    //
    //Define the desired database
    let dbase: database;
    //
    //If the database is in the global collection, return it
    if ((dbase = databases[dbname])) return dbase;
    //
    //Otherwise construct one from first principles
    //
    //Get the structure of the dbname; this will throw an exception if no such
    //database exist
    const Idbase = await this.exec_php(
      "database",
      [dbname],
      "export_structure",
      []
    );
    //
    //Construct the database
    dbase = new database(Idbase);
    //
    return dbase;
  }

  //Returns the database column that matches the given entity and column names
  async get_column(
    ename: string,
    cname: string,
    dbname?: string
  ): Promise<column> {
    //
    //Define the database to use. If the dbname is provided...
    const dbase: database = dbname
      ? //
        //..then use it...
        await this.open_dbase(dbname)
      : //
        //...otherwise, then search the database in the view hierarchy
        await this.open_dbase(this.get_dbname());
    //
    //Get the entity name; prepare for failure
    const column: column | undefined = dbase.entities[ename]?.columns?.[cname];
    //
    //Its an error if the attribute is not defined
    if (!column)
      throw new mutall_error(
        `Column '${ename}.${cname}' not found in database '${dbase.dbname}'`
      );
    //
    return column;
  }

  //
  //Report the errors at the appropriate place in teh current form
  public report_error(id: string, msg: string): void {
    //
    //Use the given id to get the general data field area where to report.
    //It must be available
    const element = this.get_element(id);
    //
    //Get the  specific element where to report
    const report: HTMLElement | null = element.querySelector(".error");
    //
    //If there is no place to report, then this is a badly designed form; alert the user
    if (report === null)
      throw new mutall_error(
        `No element for reporting errors for field '${id}'`
      );
    //
    //Now report the error message
    report.textContent = msg;
  }

  //Read the contents of the file at the given path. We assume that the path
  //is to a file that may be specified in 3 ways:-
  //1. Absolutely absolute, e.g., d:/mutall_projects/samples/test.php
  //2. Relatively absolute, e.g., /sample/test.php
  //3. Relative, e.g., test.php
  //In case 2, the document root directory, d:/mutall_projects, is added
  // to complete the path
  //In case 3, the current working directory is added to complete tha path
  async get_file_contents(path: string): Promise<string> {
    //
    //The path is a file
    const is_file: boolean = true;
    //
    //Get the sql statement
    const sql: string = await this.exec_php(
      //
      //The php class
      "path",
      //
      //The constructor arguments for the php class
      [path, is_file],
      //
      //The method to execute on the class
      "get_file_contents",
      //
      //There are no arguments to getting file contents
      []
    );
    //
    return sql;
  }
  //
  //Search for an option in this view area as well as in areas resulting
  // from expanding the ticks and cells options
  search_option<x extends keyof view_options>(
    key: x
  ): view_options[x] | undefined {
    //
    //From the available options of this view, find the one that matches
    //the given key
    const option = this.available_options.find((option) => option.key === key);
    //
    //If the search failed, return an undefined result
    if (!option) return undefined;
    //
    //Get the option's value
    const value: view_options[keyof view_options] = option.value;
    //
    //Return the option's value (casted into the expected return type)
    return <view_options[x]>value;
  }

  //
  //Get the available options from the complete parents hierarchy, for
  // debugging and other purposes, e.g., collecting labels for cells from the
  // tree hierarchy
  get available_options(): Array<option> {
    //
    //Use the guardian hierarchy to collect this, immediate and ancestral
    // views of this view
    const views: Array<view> = this.collect_guardian_views();
    //
    //Extract view options from these views
    const view_options: Array<[source: view, view_options]> =
      this.extract_options(views);
    //
    //Split the view options into the simpler options
    const options: Array<option> = this.split_options(view_options);
    //
    //Simplify options
    const simple_options: Array<option> = this.simplify_options(options);
    //
    //Return the simple options
    return simple_options;
  }
  //
  //Extract options from the given views, discarding noises
  extract_options(sources: Array<view>): Array<[source: view, view_options]> {
    //
    //Start with an empty result
    const result: Array<[source: view, view_options]> = [];
    //
    for (const source of sources) {
      //
      //Skip the source if it has no options
      if (!source.options) continue;
      //
      //Collect the options
      result.push([source, source.options]);
    }
    //
    //Return the result
    return result;
  }

  //Split the view options into the simpler into key/value pairs
  split_options(view_options: Array<[source: view, view_options]>): option[] {
    //
    //Start with an empty list of options
    const split_options: option[] = [];
    //
    //For each view option...
    for (const [source, view_option] of view_options) {
      //
      //Split the view option into keys and value entries
      for (const [key, value] of Object.entries(view_option)) {
        //
        //Discard the option if the value is undefined
        if (value === undefined) continue;
        //
        //Collect the slpitetd option
        split_options.push({ key, value, source });
      }
    }
    //
    //Return the split options
    return split_options;
  }

  //Simplify complex options
  simplify_options(options_in: Array<option>): Array<option> {
    //
    //Start with an empty list of options
    const options_out: Array<option> = [];
    //
    //Foreach potentially complex option
    for (const option of options_in) {
      //
      //Simplify the complex ones
      const simple_options: Array<option> = this.simplify_option(option);
      //
      //Save the simpler cases
      options_out.push(...simple_options);
    }
    //
    //Returm the simplified vetsion
    return options_out;
  }

  //
  // Convert complex options into their fundamental components.
  // For example, ticks, axes, and cells should resolve to the basic options
  // associated with their respective components.
  // By default, this method returns the sinput as the output. However,
  // it plays a crucial role in cases like cells, where multiple options
  // correspond to different tabulators.
  simplify_option(option: option): option[] {
    //
    //By default return the same basic option as the input
    return [option];
  }

  //Collect views in the guardian hierarchy, including this view
  collect_guardian_views(): Array<view> {
    //
    //Get the at most 2 guardians of this view
    const guardians: Array<view> = this.guardians;
    //
    //Start with an empty list of ancestors
    const ancestors: Array<view> = [];
    //
    //For each guardian...
    for (const guardian of guardians) {
      //
      //Collect the guardians views and aher ancestors
      const views: Array<view> = guardian.collect_guardian_views();
      //
      //Save them as teh ancestrs of thos view
      ancestors.push(...views);
    }
    //
    //Assemble all the views gatered so far, starting with this one
    const result: Array<view> = [this, ...ancestors];
    //
    //Return the result
    return result;
  }

  //Get a database name directly if its available; if not search the options
  //in the view hierarchy; it must exist
  get_dbname(): string {
    //
    //Define the dbname;
    let dbname: string | undefined;
    //
    //Get the database name directly
    dbname = this.dbname;
    //
    //Return it if found
    if (dbname) return dbname;
    //
    //Get a database name by searching in the view hierarchy;
    dbname = this.search_option("dbname");
    //
    //Return the db name if found; otherwise report error
    if (dbname) return dbname;
    //
    //Report that you are unable to get a database
    throw new mutall_error("No database found in the view hierarchy");
  }
}
//
//Schema is the root class of objects derived from a database's information
//schema. These are examples of such objects:-a database, an entitiy/table, an
//index, a column, etc.. Its main functions are:-
//--to implement a common mechanism for handling errors arising from both the
// PHP and TS namespaces
//--to act as a home for schema-related static methods that can be accessed
//globally
//Schema is a view; this feature allows us to represent objects visually, e.g.,
// the metavisuo application
export class schema extends view {
  //
  //The name of an entiy is offloaded from the static data. Let typescript
  //know this by declaring it.
  //All schema objects are named. This name is useful when working with
  //xml technology, e.g., presentation of error logs
  public declare name: string;
  //
  //Tracking/Handling errors generated from both the server (in PHP) and client
  //(Javascricpt) side of a mutall_data application
  public errors: Array<myerror>;
  //
  //Define a globally accessible application url for supporting the working of
  //PHP class autoloaders. The url enables us to identify the starting folder
  //for searching for PHP classes. Who sets it?
  public static app_url: string;
  //
  //A private svg element that is used to support the svg getter
  private __svg?: SVGElement;
  //
  //That is the purposes of the
  //parent property. The To create a schema we require a unique identification also called a partial
  //name described above. The default is no name
  constructor(
    //
    //The data imported from the server side (typically in PHP) needed for
    //construction a schema object. It holds the errors emanating from the
    //PHP side
    public static_data: any,
    //
    //Schema elemets are chain in a has-a hierarchy. Currently database is
    //at the root of such a hierarchy. In future, server will be the root.
    //What is the purpose of the hierarchy?
    public parent?: schema,
    //
    options?: view_options
  ) {
    //
    //Initialize the view system
    super(parent, options);
    //
    //Offload all the properties in the given static structure. You may need
    //to re-declare the important properties so that typescript can see them
    Object.assign(this, static_data);
    //
    //Convert php errors to javascript-comptible versionsions, if the static
    //data is valid
    this.errors = static_data ? this.activate_errors(static_data.errors) : [];
  }

  //Activate errors using the static version, if it exist. This converts php
  //to javascript-comptible version
  activate_errors(errors: Array<php_error>): Array<myerror> {
    //
    //Convert a php error to myerror versions
    return errors.map((error) => ({
      message: error._message,
      stack: error._stack,
    }));
  }
}

//
//Represents the php version of the database, i.e (static_dbase). These is inorder
//to solve the datatype error required for the creation of the database
export interface Idatabase {
  name: dbname;
  //
  //The reporting string of all the errors of the database
  report: string;
  //
  //Entities/views/tables of this static database
  entities: { [index: string]: Ientity };
  //
  //Errors retrieved from php
  errors: Array<object>;
}

//Is a mutall object that models a database class. Its key feature is the
//collection of entities.
export class database extends schema {
  //
  //A collection of entities/tables for this database indexed by their names
  public entities: { [index: ename]: entity };
  //
  //Construct the database from the given static database structure imported
  //from PHP
  constructor(
    //
    //The static dbase that is used to create this database is derived from php
    //version. It is important when we need to extend a database
    public static_dbase: Idatabase
  ) {
    //
    //For his version, a database has no parent. In the next version, the
    //parent of a database will be a server.
    super(static_dbase);
    //
    //Activate the entities, resulting in the collection of schema entities
    //indxed by entity name
    this.entities = this.activate_entities();
    //
    //Register the database to global collection of databases
    databases[this.name] = this;
  }
  //
  //Activate the static collection of entities to active versions
  activate_entities(): { [index: ename]: entity } {
    //
    //start with an empty object
    const entities: { [index: string]: entity } = {};
    //
    //Loop through all the static entities and activate each one of them
    for (let ename in this.static_dbase.entities) {
      //
      //Create the active entity, passing this database as the parent
      const active_entity = new entity(this, ename);
      //
      //Replace the static with the active entity
      entities[ename] = active_entity;
    }
    //
    //Return the entities of this database
    return entities;
  }

  //Retrieving a named entoty name fails, rather than cracsh
  try_entity(ename: string): entity | undefined {
    //
    try {
      return this.entities[ename];
    } catch (err) {
      return undefined;
    }
  }

  //
  //Returns the entity if is found; otherwise it throws an exception
  get_entity(ename: ename): entity {
    //
    //Try to get the named entuty -- without crashing
    const entity: entity | undefined = this.try_entity(ename);
    //
    //Take care of the undeefined situations by throwing an exception
    //if the entity was not found
    if (!entity)
      throw new mutall_error(
        `Entity ${ename} is not found in database '${this.name}'`
      );
    //
    return entity;
  }
  //
  //Retrive the user roles from this database.
  //A role is an entity that has a foreign key that references the
  //user table in mutall users database.
  //The key and value properties in the returned array represent the
  //short and long version name of the roles.
  get_roles(): Array<{ name: string; value: string }> {
    //
    //Get the list of entities that are in this database
    const list = Object.values(this.entities);
    //
    //Select from the list only those entities that refer to a user.
    const interest = list.filter((Entity) => {
      //
      //Loop throuh all the columns of the entity, to see if there is any
      //that links the entity to the user. NB: Entity (in Pascal case) is
      //a variable while entity (in Snake case) is a class name
      for (let cname in Entity.columns) {
        //
        //Get the named column
        const col = Entity.columns[cname];
        //
        //Skip this column if it is not a foreign key
        if (!(col instanceof foreign)) continue;
        //
        //The foreign key column must reference the user table in the
        //user database; otherwise skip it. NB. This comparsion below
        //does not give the same result as col.ref === entity.user. Even
        //the loose compasrison col.ref==entity.user does not give the
        //the expected results. Hence thos lonegr version
        if (col.ref.dbname !== entity.user.dbname) continue;
        if (col.ref.ename !== entity.user.ename) continue;

        //
        //The parent entity must be be serving the role function. D no more
        return true;
      }
      //
      //The entity cannot be a role one
      return false;
    });
    //
    //Map the entities of interest into outlook choices pairs.
    const roles = interest.map((entity) => {
      //
      //Get teh name element
      const name = entity.name;
      //
      //Return the complete role structure
      return { name, value: name };
    });

    return roles;
  }
}
//
//The static entity that is directly derived from php required to form php
//The entity before activation
export interface Ientity {
  //
  //In php an entity is defined by the ename and the dbname
  name: ename;
  dbname: dbname;
  //
  //The class name of this entity
  class_name: "view" | "entity" | "table" | "alien";
  //
  //The metadata of the entity
  comment: string;
  //
  //The dependency
  depth?: number;
  //
  //The error derived from php
  errors: Array<{ message: string }>;
  //
  indices?: { [index: string]: index };
  //
  //The columns/fields of this entity
  columns: { [index: string]: Icolumn };
}

//
//An index is just a list of column names that uniquely idenity an entity
export type index = Array<cname>;

//An entity is a mutall object that models the table of a relational database
export class entity extends schema {
  //
  //Every entity has a collection of column inmplemented as maps to ensure type integrity
  //since js does not support the indexed arrays and yet columns are identified using their
  //names.
  //This property is optional because some of the entities eg view i.e selectors do not have
  //columns in their construction
  columns: { [index: string]: attribute | foreign | primary };
  //
  //The long version of a name that is set from this entity's comment
  public title?: string;
  //
  //Define the identification index fields in terms of column objects. This
  //cannot be done at construction time (because the order of building
  //database entities is not guranteed to follow dependency). Hence its
  //optional
  private ids_?: Array<primary | foreign | attribute>;
  //
  //static object of the indices that are used to activate the ids. NB. PHP
  //indexed arraya are converted to javascript objects.
  declare indices?: { [index: string]: index };
  //
  //the depth of this entity as derived from php
  declare depth?: number;
  //
  //Expose the sttaic data of the schema object as an Intity
  declare static_data: Ientity;

  //A reference to the user database (that is shared by all databases in this
  //server)
  static user: {
    //
    //The entity/table name
    ename: string;
    //
    //The database name
    dbname: string;
  } = { dbname: "mutall_users", ename: "user" };
  //
  //Store the static/inert version of this entity here
  //public static_entity:Ientity;
  //
  //Construct an entity using:-
  //a) the database to be its parent through a has-a relationship
  //b) the name of the entity in the database
  constructor(
    //
    //The parent of this entity which is the database establishing the reverse
    //connection from the entity to its parent. it is protected to allow this
    //entity to be json encoded. Find out if this makes any diference in js
    //The datatype of this parent is a database since an entity can only have
    //a database origin
    public dbase: database,
    //
    //The name of the entity
    name: string
  ) {
    //Initialize the parent so thate we can access 'this' object
    super(dbase.static_dbase.entities[name], dbase);
    //
    //Use the static column data to activate them to javascript column objects
    this.columns = this.activate_columns();
  }
  //Activate the columns of this entity where the filds are treated just like
  //attributes for display
  activate_columns(): {} {
    //
    //Begin with an empty object collection
    let columns: { [index: string]: foreign | attribute | primary } = {};
    //
    //Loop through all the static columns and activate each of them
    for (let cname in this.static_data.columns) {
      //
      //Get the static column
      let static_column: Icolumn = this.static_data.columns[cname];
      //
      switch (static_column.class_name) {
        //
        case "primary":
          columns[cname] = new primary(this, static_column);
          break;
        case "attribute":
          columns[cname] = new attribute(this, static_column);
          break;
        case "foreign":
          columns[cname] = new foreign(this, static_column);
          break;
        default:
          throw new mutall_error(`Unknown column type 
                    '${static_column.class_name}' for ${this.name}.${cname}`);
      }
    }
    return columns;
  }

  //Retrieving a column name fails, rather than crach
  try_col(cname: string): column | undefined {
    //
    try {
      return this.columns[cname];
    } catch (err) {
      return undefined;
    }
  }

  //Returns the structural columns of this entity. A structural column is one
  // which...
  get_structural_cols(): Array<attribute | foreign> {
    //
    const cols = Object.values(this.columns).filter(
      (col) =>
        //
        //...is either mandatory or is used used an identifier
        (col.is_nullable === "NO" || col.is_id()) &&
        //
        //...and is not primary
        !(col instanceof primary)
    );
    return cols;
  }

  //Returns the named column of this entity; otherwise it cratches
  get_col(cname: cname): column {
    //
    //Retrieve the named column
    const col: column | undefined = this.try_col(cname);
    //
    //Report eror if column not found
    if (!col)
      throw new mutall_error(
        `Column '${cname}' is not found in entoty '${this.name}'`
      );
    //
    return col;
  }

  //Defines the identification columns for this entity as an array of columns this
  //process can not be done durring the creation of the entity since we are not sure
  //about the if thses column are set. hence this function is a getter
  get ids(): Array<primary | foreign | attribute> | undefined {
    //
    //Return a copy if the ides are already avaible
    if (this.ids_ !== undefined) return this.ids_;
    //
    //Define ids from first principles
    //
    //Use the first index of this entity. The static index imported from
    //the server has the following format:-
    //{ixname1:[fname1, ...], ixname1:[....], ...}
    //We cont know the name of the first index, so we cannot access directly
    //Convert the indices to an array, ignoring the keys as index name is
    //not important; then pick the first set of index fields
    if (this.indices === undefined) {
      return undefined;
    }
    //
    const fnames: index = this.indices[0];
    //
    //If there are no indexes save the ids to null and return the null
    if (fnames.length === 0) {
      return undefined;
    }
    //
    //Activate these indexes to those from the static object structure to the
    //id datatype that is required in javascript
    //
    //begin with an empty array
    let ids: Array<primary | foreign | attribute> = [];
    //
    //
    fnames.forEach((name) => {
      //
      //Get the column of this index
      const col = this.columns[name];
      if (col === undefined) {
      } else {
        ids.push(col);
      }
    });
    return ids;
  }

  //Returns the relational dependency of this entity based on foreign keys
  get dependency(): number | undefined {
    //
    //Test if we already know the dependency. If we do just return it...
    if (this.depth !== undefined) return this.depth;
    //
    //only continue if there are no errors
    if (this.errors.length > 0) {
      return undefined;
    }

    //...otherwise calculate it from 1st principles.
    //
    //Destructure the identification indices. They have the following format:-
    //[{[xname]:[...ixcnames]}, ...]
    //Get the foreign key column names used for identification.
    //
    //we can not get the ddependecy of an entity if the entity has no ids
    if (this.ids === undefined) {
      return undefined;
    }
    //
    //filter the id columns that are foreigners
    let columns: Array<foreign> = [];
    this.ids.forEach((col) => {
      if (col instanceof foreign) {
        columns.push(col);
      }
    });
    //
    //Test if there are no foreign key columns, return 0.
    if (columns.length === 0) {
      return 0;
    } else {
      //Map cname's entity with its dependency.
      const dependencies = columns.map((column) => {
        //
        //Get the referenced entity name
        const ename = column.ref.ename;
        //
        //Get the actual entity
        const entity = this.dbase.get_entity(ename);
        //
        //Get the referenced entity's dependency.
        return entity.dependency;
      });
      //
      //remove the nulls
      const valids = <Array<number>>dependencies.filter((dep) => {
        return dep !== null;
      });
      //
      //Get the foreign key entity with the maximum dependency, x.
      const max_dependency = Math.max(...valids);
      //
      //Set the dependency
      this.depth = max_dependency;
    }
    //
    //The dependency to return is x+1
    return this.depth;
  }

  //The toString() method of an entity returnsthe fully spcified, fully quoted name, fit
  //for partcipatin in an sql. E.g., `mutall_users`.`intern`
  toString() {
    return "`" + this.dbase.name + "`" + "." + "`" + this.name + "`";
  }

  //Collect pointers to this entity from all the available databases
  *collect_pointers(): Generator<foreign> {
    //
    //For each registered database....
    for (const dbname in databases) {
      //
      //Get the nameed database
      const dbase = databases[dbname];
      //
      //Loop through all the entity (names) of the database
      for (const ename in dbase.entities) {
        //
        //Loop through all the columns of entity
        for (const cname in dbase.entities[ename].columns) {
          //
          //Get the named column
          const col = dbase.entities[ename].columns[cname];
          //
          //Only foreign keys are considered
          if (!(col instanceof foreign)) continue;
          //
          //The column's reference must match the given subject
          if (col.ref.dbname !== this.dbase.name) continue;
          if (col.ref.ename !== this.name) continue;
          //
          //Collect this column
          yield col;
        }
      }
    }
  }
}
//
//The structure of the static column
interface Icolumn {
  //
  //a column in php is identified by the name, ename, dbname
  name: cname;
  ename: ename;
  dbname: dbname;
  //
  //The columns in php can either be of type
  class_name: col_type;
  //
  //Errors resolved in a column
  errors: Array<object>;
}

//Modelling the column of a table. This is an abstract class, so that all columns
//must be explicily defined: primary, attrobute and foreign. Is pointer a column?
//This class is the home of all metadata for a column read-off the information
//schema
export class column extends schema {
  //
  //Boolean that tests if this column is primary
  is_primary: boolean;
  //
  //This is the descriptive name of this column
  //derived from the comment
  public title: string;
  //
  //The construction details of the column includes the following
  //That are derived from the information schema  and assigned
  //to this column;-
  //
  //Metadata container for this column is stored as a structure (i.e., it
  //is not offloaded) since we require to access it in its original form
  public comment: string;
  //
  //The database default value for this column
  public default: string;
  //
  //The acceptable datatype for this column e.g the text, number, autonumber etc
  public data_type: string;
  //
  //Determines if this column is optional or not.  if nullable, i.e., optional
  //the value is "YES"; if mandatory, i.e., not nullable, the value is
  //"NO"
  public is_nullable: string;
  //
  //The maximum character length
  public length: number;
  //
  //The column type holds data that is important for extracting the choices
  //of an enumerated type
  public type: string;
  //
  //The following properties are assigned from the comments  field;
  //
  //This property is assigned for read only columns
  public read_only?: boolean;
  //
  //These are the multiple choice options as an array of key value
  //pairs.
  public select?: Array<[string, string]>;
  //
  //The value of a column
  public value?: basic_value;
  //
  //
  //The class constructor that has entity parent and the json data input
  //needed for defining it. Typically this will have come from a server.
  constructor(public entity: entity, static_column: static_column) {
    //
    //Initialize the parent so that we can access 'this' object
    super(static_column, entity);
    //
    //Primary keys are special; we neeed to identify them. By default a column
    //is not a primary key
    this.is_primary = false;
    //
    //Thos part aws originally wriiten using the Object.asign() method which
    //did not work a the schema level
    //Object.assign(this, static_column);
    this.title = static_column.title;
    this.comment = static_column.comment;
    this.default = static_column.default;
    this.is_nullable = static_column.is_nullable;
    this.data_type = static_column.data_type;
    this.length = static_column.length;
    this.type = static_column.type;
  }

  //A unique name formed by concatennating the database, entity and column names
  //aeparetd with an underbar to for a unique name used for e.g., identifying
  //data lists
  get id(): string {
    return `${this.entity.dbase.name}_${this.entity.name}_${this.name}`;
  }

  //Returns true if this column is used by any identification index;
  //otherwise it returns false. Identification columns are part of what is
  //known as structural columns. This is important for he questinnaire system.
  is_id(): boolean {
    //
    //Get the indices of the parent entity
    const indices: { [index: string]: index } = this.entity.indices!;
    //
    //Test if this column is used as an index.
    for (const name in indices) {
      //
      //Get the named index
      const cnames: Array<cname> = indices[name];
      //
      //An index consists of column names; test if the name of this column
      //is included. If its , then this colum is used for identification.
      if (cnames.includes(this.name)) return true;
    }
    //This column is not used for identification
    return false;
  }

  //The string version of a column is used for suppotring sql expressions
  toString(): string {
    //
    //Databasename quoted with backticks
    const dbname = "`" + this.entity.dbase.name + "`";
    //
    //Backtik quoted entity name
    const ename = "`" + this.entity.name + "`";
    //
    //The backkicked column name;
    const cname = "`" + this.name + "`";
    //
    return `${dbname}.${ename}.${cname}`;
  }
}

//Modelling the non user-inputable primary key field
export class primary extends column {
  //
  //The class contructor must contain the name, the parent entity and the
  // data (json) input
  constructor(parent: entity, data: any) {
    //
    //The parent colum constructor
    super(parent, data);
    //
    //This is a primary key; we need to specially identify it. Why cannot
    //instanceof do?
    this.is_primary = true;
  }
}

//Modellig foreign key field as an inputabble column.
export class foreign extends column {
  //
  //The reference that shows the relation data of the foreign key. It comprises
  //of the referenced database and table names
  ref: {
    //
    //The entity/table name
    ename: string;
    //
    //The database name
    dbname: string;
  };
  //
  //Construct a foreign key field using :-
  //a) the parent entity to allow navigation through has-a hierarchy
  //b) the static (data) object containing field/value, typically obtained
  //from the server side scriptig using e.g., PHP.
  constructor(parent: entity, static_column: any) {
    //
    //Save the parent entity and the column properties
    super(parent, static_column);
    //
    //Extract the reference details from the static data
    this.ref = {
      ename: static_column.ref.table_name,
      dbname: static_column.ref.db_name,
    };
  }

  //The referenced entity of this relation will be determined from the
  //referenced table name on request, hence the getter property
  public get_ref_entity() {
    //
    //Let n be table name referenced by this foreign key column.
    const n = this.ref.ename;
    //
    //Return the referenced entity using the has-hierarchy
    return this.entity.dbase.entities[n];
  }

  //Tests if this foreign key is hierarchical or not
  is_hierarchical(): boolean {
    //
    //A foreign key represents a hierarchical relationship if the reference...
    //
    return (
      //...database and the current one are the same
      this.entity.dbase.name === this.ref.dbname &&
      //
      //...entity and the current one are the same
      this.entity.name === this.ref.ename
    );
  }
}

//Its instance contains all (inputable) the columns of type attribute
export class attribute extends column {
  //
  //The column must have a name, a parent column and the data the json
  // data input
  constructor(parent: entity, static_column: any) {
    //
    //The parent constructor
    super(parent, static_column);
  }
}
