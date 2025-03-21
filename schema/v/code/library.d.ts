import * as schema from "./schema.js";
import * as quest from "./questionnaire.js";
import { path } from "./tree.js";
import * as reg from "./registration/classes.js";

// Interface defining metadata used to derive the column axis for an SQL driver.
export type metadata_interface = {
  //
  //Name of the column
  name: string;
  //
  //Size of teh column
  len: number;
  //
  //Type of column as returned by get column metadata
  native_type: string;
  //
  //Name of the sourec table, if present
  table: string | null;
};
//
//TO help us execute php methods straight from javascript.
class mutall {
  //
  //
  constructor(
    //
    //An optional Throws an error as soon as they are found the  default is
    //true. If false the error will be buffered in a property called errors
    //and can be accessed through the method report
    throw_exception: boolean = true
  );
  //
  //Given a password hash it and return the hash
  password_hash(password): string;
  //
  //Given a password and a hash check if the password matches the hash and return a true if they match
  //otherwise return false
  password_verify(password: string, hash: string): boolean;
}
//Modelling the database connection
class database {
  //
  //Testing an explicit constructor
  //
  //The login credentials for this database are fed in a config file
  constructor(
    //The database name.
    name: string,
    //
    //An optional boolean that indicates whether we desire a database
    //complete with its entities or not. The the default is complete.
    // If not  complete an empty shell is returned; this may be useful when
    //quering the database directly, i.e., without the need of the object model
    complete: boolean = true,
    //
    //An optional Throws an error as soon as they are found the  default is
    //true. If false the error will be buffered in a property called errors
    //and can be accessed through the method report
    throw_exception: boolean = true
  );
  //
  //Returns data as an array of simple objects after executing
  //the given sql on this database. The sql may be directly specified as a
  //string, or indirectly as a file to read from.  If the source is a file
  //then its name is specified as an absolute path relative to the document root
  //E.g. get_sql_data('/chama/v/code/conrobution.sql', 'file')
  get_sql_data(
    sql: string,
    source: "string" | "file" = "str"
  ): Array<schema.fuel>;
  //
  //Returns the accounting details of a specified account
  accounting(accname: string): Array<schema.fuel>;
  //
  //Returns a complete database structure, .i.e one that is populated with
  //entities and columns
  //We return an any because we do not wish to check the structure of our data
  export_structure(): schema.Idatabase;
  //
  //The query command is used for executing the insert,
  //update or delete statements.
  query(sql: string): void;
  //
  //Use the given credentials to authenticate the matching user, returning
  //an ok with the primary key id of the user, or an error with an message
  authenticate(
    name: string,
    password: string
  ): { result: "ok"; pk: number } | { result: "error"; msg: string };
  //
  //Use the given credentials to create a new user account, returning
  //an ok with the primary key id of the user, or an error with an message
  register(
    name: string,
    password: string
  ): { result: "ok"; pk: number } | { result: "error"; msg: string };

  //Retrieve metadata for an sql statement
  get_column_metadata(sql: string): Array<metadata_interface>;
}
//
//This class models a select statement that retrieves all the columns
//of an entity. In particular the foreign keys values are accompanied
//by their friendly names. These names are useful for editing/looking up
// the foreign key values.
class editor {
  //
  constructor(
    //
    //This is the entity name from which we are doing the selection
    ename: ename,
    //
    //The name of the database in which the entity is defined
    dbname: dbname
  );
  //
  //Returns the standard string representation of a select sql statement
  stmt(): string;
  //
  //This method returns the metadata necessary for driving a
  //CRUD table.
  //The last parameter maximum length is returned as a string
  describe(): [schema.Idatabase, Array<cname>, sql, string];
}
///Mutall label format for exporting data to a database.
//The data has the following structure [dbname, ename, alias, cname, value].
export type dbname = string;
//
//The table in the named dbname where the data will be saved
export type ename = string;
//
//The number of similar records being saved
type alias = Array<number>;
//
//COlumn name in the database table to be saved
type cname = string;
//
//The primary key value is a nu,ber formated as a string
export type pk = string;
//
//The location of a td in a crud table. This is important for saving and
//restoring a crud td.
export type position = [rowIndex, cellIndex];

//The basic value in schema is teh same as the one exported from here. The reason
//for this double export is that schema.basic_value has already been used alot.
export type basic_value = schema.basic_value;
//
//An atom is the smallest datatype that is aware of its origin.
export type atom = [basic_value, position?];
//
//The exact position of the td with the data to be saved relative to the
//table
type cellIndex = number;
type rowIndex = number;
//
//The complete label format
type label = [dbname, ename, alias, cname, atom];

//
//The index of the value being saved
type col_position = number;
//
//TARBULAR DATA FORMAT
interface tabular {
  header: Array<[dbname, ename, alias, cname, col_position]>;
  //
  //There are as many entries of the values as there are header
  //options
  body: Array<basic_value>;
}

//
//This interface is designed for reporting runtime results
//
//This interface is designed for reporting runtime results
interface runtime {
  //
  //The class name that distinguishes between this and syntax errors
  class_name: "runtime";
  //
  //A runtime result is an array of row indexed entries
  result: Array<{
    //
    //The CRUD table's row index
    rowIndex: integer;
    //
    //An entry is either....
    entry: //
    //..an ERROR....
    | {
          error: true;
          //
          //...in which case it msut be accompanied by a message
          msg: string;
        }
      //..or a befriended PRIMARY key
      | {
          error: false;
          //
          //..in which case it must have the primary key....
          pk: integer;
          //
          //...and its friendly component
          friend: string;
        };
  }>;
}

//
//This interface is designed for reporting syntax errors.
interface syntax {
  //
  //The type of update/write result
  class_name: "syntax";
  //
  //This is a list of error messages when the class_name is
  // syntax
  errors: Array<string>;
}
//
//
//The imala is either a runtime or a syntax result
type Imala = syntax | runtime;
//
//This is special construct for mporting a partialy complete
//tree structure that reprresents files and folders from
// the  server. Partialy complete means some folder are rich
//with children and others are not. The rich ones are part of
//the intial path specification.
export interface Inode {
  //
  //This the full name of the path
  name: string;
  //
  //The type of the path, i.e leaf or branch.
  //Leaf are maped to files and branches to folders.
  class_name: "leaf" | "branch";
}
//
//A leaf is a node that has no children by design.
export interface Ileaf extends Inode {}
//
//A branch is a node that can have children. If the children
//are defined then this is a rich branch else it is not.
export interface Ibranch extends Inode {
  //
  //The children of a rich branch are nodes
  children?: Array<Inode>;
}
//
//This is the php version of the js node. mainly used for
//housing the export method.
export class node {
  //
  constructor(
    //
    //The name of this node
    name: string,
    //
    //Full name of this node's parent
    full_name: string
  );

  //Form a complete node structure using the initial path and return
  //a static node.
  static export(
    //
    //e.g  absolute: /pictures/water/logo.jpeg.
    //     relative:  pictures/water/logo.jpeg.
    initial_path: string,
    target: "file" | "folder"
  ): Inode;
}

//This class implements the selector sql which is useful for populating selectors
//with data from the database
export class selector {
  //
  constructor(
    //
    //The entity name
    ename: string,
    //
    //The database name
    dbname: string
  );
  //
  //The execute method runs the query that returns the output of the data
  execute(): Array<fuel>;
}
//The PHP tracker class, to be re-placed in the tracker.d.ts later
export class tracker {
  constructor();
  //
  //Re-establish the links between the user and the application sub-systems.
  relink_user(links: Array<{ ename; cname }>): boolean;
}

//The questionnaire format for loading large tables
export class questionnaire {
  //
  constructor(dbname: string);
  //
  //The general style of loading that data tat can be customised
  //to other types, e.g., common, user_inputs, etc.
  load(
    //
    //Array of input data layouts
    layouts: Array<layout>,
    //
    //XML file for logging the loadin process
    xmlfile: string = "log.xml",
    //
    //Error file for logging table loading exceptions
    errorfile: string = "file.html"
  ): quest.Imala;

  //The most common way of calling questionaire::load, returning a html
  //report
  load_common(
    //
    //Array of input data layouts
    layouts: Array<layout>,
    //
    //XML file for logging the loading process
    xmlfile: string = "log.xml",
    //
    //Error file for logging table loading errors
    errorfile: string = "file.html"
  ): "ok" | string /*the string is an error message*/;

  //
  //Load user inputs from a crud page, returning a result fit for
  //updatng the page.
  load_user_inputs(layouts: Array<layout>): Imala;
}

//To suppoty the accounting subsystem
export class accounting {
  constructor(bus: string, acc: string, date: string);
  records(dis_type: "closed" | "open" | "all"): Array<schema.fuel>;
  closed_records(): Array<schema.fuel>;
  close_books(): Imala;
}
//
//Results of interrogating products. This is a special case of I fuel
export interface Iproduct {
  id: string;
  title: string;
  cost: number | null;
  solution_id: string;
  solution_title: string;
  listener: string;
  is_global: "yes" | "no";
}

export class app {
  constructor(app_id: string);
  get_products(): Array<Iproduct>;
  customed_products(): Array<{ role_id: string; product_id: string }>;
  subscribed_products(name: string): Array<{ product_id: string }>;
  //
  //Returns those produts available to a user for this application. These
  //are free products as well as any that the user has are paid
  //for, a.k.a., assets
  available_products(name: string): Array<{ product_id: string }>;
}

//A pointer is a foreign key column of a contributor whose integrity would
//be violated if there is an attempt to delete a reference record. The pointer
//would need re-direction before being deleted.
export type pointer = {
  //
  //Name of the column/field
  cname: cname;
  //
  //Name of the table containing the column
  ename: ename;
  //
  //Name of the database in which the table is contained.
  dbname: dbname;
  //
  //Is the foreign key a cross member or not. This is important
  //for addressing possibiliy for cyclic referencing
  is_cross_member: boolean;
};

//Indices of the pointer's away table that can
//be violated by re-direction
export type index = {
  //
  //Index name (for reporting purposes)
  ixname: string;
  //
  //An sql that generates a merging singature bases on the
  //violaters, i.e., the columns of an index needed to determine
  //integrity violaters. The sql has the shape:
  //Array<{signature}>
  signatures: Array<{ signature: string }>;
  //
  //The sql that is to be constrained by a specific to generate
  //the pointer members that need to be merged. he sql has the shape:-
  //Array<{signature, member}
  members: sql;
};

//
export class merger {
  constructor(imerge: Imerge);

  get_players(): { principal: number; minors: sql } | null;

  get_values(): sql;
  //
  get_consolidation(): { clean: interventions; dirty: conflicts };

  update_principal(consolidations: interventions): void;
  //
  delete_minors(): Array<pointer> | "ok";
  //
  redirect_pointer(pointer: pointer): Array<index> | "ok";
}

//
//The result of carrying out a crud operation. When an operation is successful
//it returns 'ok'; otherwise the result is an error
export type crud_result = "ok" | Error;

//Support for server fie system technology, i.e., folder and file  managememt
export class path {
  //
  //The given path is first resolved to an absolutely absolute path on construction
  //See documenstion for schema::resolve_path()
  //We also need to know if its a file or a folder
  constructor(path: path, is_file: boolean);

  //Scanning for files in folder in the current directory. The properties are listed a key value
  //pairs and includes the path name.
  scandir(): Array<{
    path: path;
    name: string;
    is_file: boolean;
    properties: { [index: string]: basic_value };
  }>;
  //
  //Delete the file or folder
  delete(): void;
  //
  //Rename a file or folder from its current name to teh given
  //one, effectively saving it.
  rename(to: path): void;
  //
  //Read and return the contents of the current path
  get_file_contents(): string;
}
//
//A message recipient is either selected individuals (of the user's gropu) or
//the enitre  group.
export type recipient =
  //
  //A group has a business id used to get all members associated with that group
  | { type: "group"; business: outlook.business }
  //
  //The individual has a name which is used to retrieve his/her email address or
  // the mobile number
  | { type: "individual"; users: Array<username> };
//
//The messenger class that supports sending of sms's and names to all users of
//the currently logged in user's business
export class messenger {
  constructor();
  //
  //Sending a message requires three major parameters, namely the business,
  //subject, and body of the message
  send(
    //
    //The primary key of the business the user is currently logged in as
    recipient: recipient,
    //
    //The subject of the communication
    subject: string,
    //
    //The body of the communicated message
    body: string
  ): Array<string>;
}
//
//The at command is either for:-
export type at =
  //
  //- sending a message indirectly using a job number(from which the message
  //can be extracted from the database)
  | { type: "message"; datetime: string; message: number; recipient: recipient }
  //
  //- or for initiating a fresh cronjob on the specified date
  | { type: "refresh"; datetime: string }
  //
  //- or for running any linux command.
  | { type: "other"; datetime: string; command: string };
//
//The scheduler class that supports scheduling of automated tasks on the server
export class scheduler {
  constructor();
  //
  //Executing a scheduler requires that we get the array of at jobs
  execute(
    //
    //The job name to schedule.
    job_name: string,
    //
    //The event's repetitive type
    repetitive: boolean,
    //
    //The array of at commands which consists of the date and the message of
    //the event
    at: Array<at>
  ): Array<string>;
}

//
//Let stmt be an sql statement string
type stmt = string;

//The  2-dimensional matrix of data fetched from a database
type matrix = Array<Array<basic_value>>;

//The structure of sql statements that are used for extracting the data for
//completing a registration form
interface sql_retriever {
  //
  //The sql statement for retrieving scalars -- the values that feed
  //simple inputs. The result of such a statement is a 1-dimensional (row)
  //of values whose index position shoudld match the original sources
  scalar: stmt;
  //
  //The sqls for retrieving the 2-d matrices of basic values that feed a table
  tabular: Array<stmt>;
}

//
//A class that provides CRUD functionality to support friendly registration of
//users, including:-
//- creating data using a form similar to paper questionnairs (PIQ)
//- reviewing the data in an intuitive fashion
//- updating the data, using a form that looks looks the original one used for
//for data entry
class query {
  //
  //The constructor of a registrar requiers the database in which the user's
  //role is defineed, e.g., mutall_tracker for registration of interns
  constructor(dbname: string, sqls: reg.sqls);
  //
  //
  //Retrieve the data for writing to the registration form, given an sql retriever
  //The retrievers have the following shapes
  //  sql_retriever = {scalar:$sql, tabular:Array<$sql>}
  //  data_retriever = {scalar:Array<basic_value>, tabular:Array<$matrix>}
  //where:-
  //-$sql is text for an sql statement
  //-$matrix is a 2-dimensional arrau of basic values, i.e, Array<Array<basic_value>>
  execute(): reg.retrievee;
}

//Message content
export interface content {
  //
  //The subject, used as one of the email identifiers; the others are
  //sender and date)
  subject: string;
  date: string;
  sender: username;
  //
  //The body text
  body: string;
  //
  //The type of text in the body is wirher plain text or html
  type: "plaint" | "html";
  //
  //If this is a reply, provide the orignal message
  reply_to?: message;
}

//Registered types of technologies for sending messages
export type technology_id = "mailer" | "twilio" | "mobitech";

//A username
export type username = string;

//
//Technologies for sending messages, defined as PHP classes
export class technology {
  //
  //The sql to retrieve the addresses
  constructor($sql: string);
  //
  //Retuens the number of addresses eturned by the sql
  get_count(): number;
  //
  //Execute the sql and send the message to the addresses. The page
  //is used for paginating the results of teh sql
  //It returns the errors resulting from teh operation
  execute(
    content: content,
    page: { offset: number; size: number }
  ): Array<string>;
}
//The 3 technolgies used for sending messages
export class mobitech extends technology {}
export class twilio extends technology {}
export class mailer extends technology {}

//

//The scheduler system
export class scheduler {
  constructor();
  refresh(): void;
}

export class at_scheduler extends scheduler {}
export class crontab_scheduler extends scheduler {}

//
// mutall_mailer class declaration
export class mutall_mailer {
  //
  // Send an email to the given recipient
  // Returns 'ok' on success or an error message on failure
  send_email(
    // Email address of the recipient
    receiver: string,
    // Subject of the email
    subject: string,
    // Content of the email
    body: string,
    // Name of the recipient (optional)
    name?: string,
    // Path to an attachment file (optional)
    attachment?: string,
    // Whether the email body contains HTML (optional)
    is_html?: boolean
  ): Promise<string>;
}
