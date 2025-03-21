import { mutall, myalert } from "../../../schema/v/code/mutall.js";
//
import {
  view,
  label,
  option,
  view_option_interface,
  view_options,
  basic_value,
  mutall_error,
  fuel,
  cname,
  primary,
  column,
  database,
  entity as schema_entity,
  foreign as foreign_col,
  attribute,
  databases,
} from "../../../schema/v/code/schema.js";
//
import { metadata_interface } from "../../../schema/v/code/library.js";
import {
  label as qlabel,
  alias,
} from "../../../schema/v/code/questionnaire.js";
import { io, io_type, foreign_io, radio } from "../../../schema/v/code/io.js";
//
//The direction of an axis, 0 means vertical direction, 1 means horizontal.
//In a coordinate, dim can be used to denote which of the componets you wish to
//refer to: 0=row component, 1=column componnet
//type dim = 0|1;

//The error handling system allows us to tabulate as a far as possible,
//collecting errors if they occur, rather than stopping. Hopefully the
//partially constructed table will provide better error context than otherwise
export namespace error {
  //To support reporting of specific tabulation errors
  export type tabulator_error =
    //
    //Data Access Error during display data, most likely due to mismatch of
    // the cells_indxed and data object structures
    | {
        type: "display_data";
        //
        //The error message and where it came from
        err: Error;
        //
        //The homozone where the ssue occured
        homozone: homozone;
        //
        //The coordinate of the data being displayed -- if available
        coord?: coord<string>;
      }
    //
    | {
        type: "ambiguity";
        err: Error;
        seeds: Array<seed>;
        col: column;
        alias: alias;
      }
    //
    //Duplicate seeds found. Saving data will fail
    | { type: "duplicates"; err: Error; dups: Array<compact> }
    //
    //When 2 seeds that have non-basic ovules are encountered. It means that
    //our poliination process is producing duplicates!
    | {
        type: "2 non-basics";
        //
        //The reference cell being considered
        ref: grid;
        //
        //Where the error occured
        err: Error;
        //
        //The 2 seeds that have non-basic ovules, all other comparison
        //parameters  being equal
        seeds: Array<seed>;
      };
  //
  //The error handler class is the home of the current error handler object
  export class handler extends view {
    //
    //Tabulation runtime errors
    public errors: Array<tabulator_error> = [];
    //
    //Counter of all error events, starting from 0
    public counter: number = 0;
    //
    //The current handler
    static current: handler;

    //The error button that appears in the first cell of a zone
    public button?: HTMLButtonElement;
    //
    constructor(public zone: root.zone) {
      super();
    }

    //Save an error type, once only, for reporting later
    save(err1: tabulator_error) {
      //
      //Raise the error couner
      this.counter++;
      //
      //Locate the error type
      const found: tabulator_error | undefined = this.errors.find(
        (err2) => err2.type === err1.type && String(err1) === String(err2)
      );
      //
      //Save it if it is new
      if (!found) this.errors.push(err1);
    }

    //Report tabulation errors if there are any
    report(zone: root.zone): void {
      //
      //There is nothing to report if the error counter is 0
      if (this.counter === 0) return;
      //
      //Create a button at the top right corner of the zone, a cell
      //exist
      //
      //Get the html table of the zone
      const table: HTMLTableElement = zone.get_html_table();
      //
      //Get the first td in the zone; if there is an issue with the cell,
      //then use the body of zone as the anchor for the error
      const td1: HTMLTableCellElement | undefined = table.rows?.[0].cells?.[0];
      //
      //Use the current document body for error reporting if the table is empty
      const td: HTMLElement = td1 ?? this.document.body;
      //
      //Use the td to home the button
      this.button = this.create_element("button", td, {
        //
        //Flag the dialog with error appearance
        className: "error",
        //
        //Show the error count and saved types
        textContent: `Click to see ${this.counter} errors,  ${this.errors.length} error type(s)`,
        //
        //Attach a show_report event on click. Present  this click from
        //propagating to the zone
        onclick: (evt: Event) => {
          evt.stopPropagation();
          this.show_errors();
        },
      });
    }

    //Show the collected tabulator errors
    show_errors() {
      //
      //Create a dialog for displaying errors
      const dlg: HTMLDialogElement = this.create_element(
        "dialog",
        this.button!,
        {
          //
          //Stop any clicks from propagating to the cells
          onclick: (evt: Event) => evt.stopPropagation(),
        }
      );
      //
      //Show the errors as a list arranged in details/summary format
      for (const error of this.errors) {
        //
        //Create a details tag
        const details = this.create_element("details", dlg);
        //
        //Put a summary element inside teh details
        this.create_element("summary", details, {
          textContent: `${error.type}: ${error.err}`,
        });
        //
        //Show the error messages as the rest of the details children
        //
        //Convert error to message to detail children
        const msg: string = this.get_msg(error);
        //
        //Insert the message as an inner html
        details.innerHTML = details.innerHTML + msg;
        //
        //Add an on-toggle even to show the tabulators if in open mode
        details.ontoggle = () => {
          //
          //If in open mode, mark the tabulators and re-throw the
          //original error
          if (details.open) {
            this.mark_tabulators(error, true);
            //
            //Throw the exception so that we can see excatly where
            //in the code the error came from
            throw error.err;
          } else this.mark_tabulators(error, false);
        };
      }
      //Add a close button to the dialog
      const button = this.create_element("button", dlg, {
        textContent: "close",
        //
        //Stop this click from propagating
        onclick: (evt: Event) => {
          evt.stopPropagation();
          dlg.close();
        },
      });
      //
      //Display the dialog box
      dlg.show();
    }

    //Convert given error to a message
    get_msg(error: tabulator_error): string {
      //
      //Depending on the error type....
      switch (error.type) {
        //
        //Indxed cells/data structure mistamatch during display
        case "display_data":
          //
          //Destructure the display-data error type
          const { homozone, coord, err } = error;
          //
          //Convert data source coordindates (if available) to string
          const coord_str: string = coord
            ? `coord:${JSON.stringify(coord)}`
            : "";
          //
          //Compile and return the full error message
          return `
                        ${err.message}<br/>
                        homozone:'${homozone.id}'<br/>
                        ${coord_str}
                    `;
        //
        //User-caused ambiguity
        case "ambiguity":
          return error.err.message;
        //
        //Unexpected ambiguity. Report details about the duplicate seeds
        case "2 non-basics":
          //
          //Get the offending seeds
          const seeds: Array<seed> = error.seeds;
          //
          //Convert the seeds to strings
          const seed_str: string = seeds
            .map((seed) => seed.toString())
            .join("<br/>");
          //
          return `
                    When 2 seeds that have non-basic ovules are 
                    encountered. It means that our pollination process is 
                    producing duplicates!. The 2 seeds are:-<br/>${seed_str}`;

        //
        //Duplicate seeds
        case "duplicates":
          //
          //Convert the duplicates to an error message.
          const result: Array<string> = [];
          //
          for (const dup of error.dups) {
            //
            //Cdestructure the dup compact
            const { pollen, seeds } = dup;
            //
            //Destructure pollen
            const { col, alias } = pollen;
            //
            //Stringify pollen
            const pollenstr: string = `${col.toString()} ${JSON.stringify(
              alias
            )}`;
            //
            //Stringify seeds
            const seedstr: Array<string> = seeds.map((seed) =>
              JSON.stringify(seed.label)
            );
            //
            result.push(`${pollenstr}:${seedstr}`);
          }
          //
          //Compile and return the complete message
          return `${error.err.message}<br/>${result.join("<br/>")}`;
      }
    }

    //Show tabulators associated with the given error
    mark_tabulators(error: tabulator_error, yes: boolean): void {
      //
      //Depending on the error type....
      switch (error.type) {
        case "display_data":
          //
          //Destructure error
          const { homozone, coord, err } = error;
          //
          //Mark the erroneous homozone
          homozone.mark(yes);
      }
    }
  }
}

//A seed is tabulation object that associates some data with database column
//and alias. Seeds are used for generating questionnaire labels needed for
//writing data to a database
export class seed extends mutall {
  //
  //Tracking exacly where in this code the seed was generated, i.e., where the
  // ovule of some pollinator was bounded.
  public context: Error;
  //
  constructor(
    //The value of a seed can be a basic value, or a much richer cell,
    //a html element (from which its value or textContent can be derived)
    public ovule: ovule,
    //
    //The aliased column
    public col: column,
    public alias: alias,
    //
    //Where the seed came from. This is used for computing distances between
    //a seed and some reference cell
    public genesis: view,
    //
    //The reference cell needed for calculating seed distance
    public ref: cell
  ) {
    super();
    //
    //Track the context of this seed. Not sure of the best message
    this.context = new Error("Where in the code the seed came from");
  }

  //Convert a seed to a string for debugging purposes
  toString(): string {
    //
    //Extract the ovule, so we can replace it with a more detailed one
    const [ovule, ...rest] = this.label;
    //
    //Replace the ovule with a string version
    const result = [this.ovule, ...rest];
    //
    //Return a string as the result
    return String(result);
  }

  //Compares two seeds for equality. They are not if any the key properties of
  // a seed are not equal
  is_equal_to(seed: seed): boolean {
    //
    //Two seeds are not equal if thier columns are different
    if (this.col !== seed.col) return false;
    //
    //Two seeds are not equal if thier aliases are not equal
    //Take care of comparing arrays. A simple !== will not do.
    if (!mutall.arrays_are_equal(this.alias, seed.alias)) return false;
    //
    //To seeds are not equal if their values are different
    if (this.ovule !== seed.ovule) return false;
    //
    //2 seed are unequal if they were generated using different methods
    if (this.genesis !== seed.genesis) return false;
    //
    //Otherwise they are equal
    return true;
  }

  //Returns true if this seed is viable, i.e., it does not have a  meaningless
  //(null) ovule expression
  is_viable(): boolean {
    //
    //One of the characteristics of a non-nviable seed is that it has a null
    //expression, otherwise it is viable
    if (this.exp !== null) return true;
    //
    //Meaningful null ovules apply to primary keys, as they help to force
    //abstract entities to be included in a write session
    if (this.col instanceof primary) return true;
    //
    //Meaningful nulls also apply to attributes that had a previous non-null
    //value but have been edited to produce a null value. This would signify
    // a user deliberately nullifying an existing value
    if (
      //Only cell-based ovules are considered. What about listeners? Consider
      //them in the next version, but for now...
      this.ovule instanceof grid &&
      //
      //The original value before editing must be available
      this.ovule.io?.original_value &&
      //
      //The original value is not null
      this.ovule.io.original_value !== null
    )
      return true;
    //
    //At this point we have a null expression that is meanigless
    return false;
  }

  //Returns the  pollen/sperm, a.k.a., aliased column, of a seed
  get pollen(): { col: column; alias: alias } {
    return { col: this.col, alias: this.alias };
  }
  //
  //Get the longest distance between this seed's parent and the reference
  // cell
  get distance(): number {
    //
    //Get the first node as the parent of this seed
    const node1: view = this.genesis;
    //
    //Get the 2nd node as the reference cell used for formualting the seed
    const node2: grid = this.ref;
    //
    //Calculate the longest distance between the nodes, using the inter-node
    //distance calculator derived from ChatGPT. (The shorter paths may
    //be shortcuts arising from, e.g., an axis not being available. They
    //are therefore not suitable for calculating real distances)
    const Distance: number = this.distance_calculate_longest_between_nodes(
      node1,
      node2
    );
    //
    return Distance;
  }

  //Returns the expression (in [exp, ename, cname, dbname, alias]) that is
  //used for converting this seed to a questionnaire label
  get exp(): basic_value {
    //
    //Convert this seeds ovule to a basic version
    const value: basic_value = metadata.convert_ovule_2_value(this.ovule);
    //
    //Standardise null values
    const exp: basic_value = value === "" ? null : value;
    //
    return exp;
  }

  //Convert a computation seed to the questionniare version label.
  get label(): qlabel {
    //
    //Compile the questionnaire seed
    const qseed: qlabel = [
      this.exp,
      this.col.entity.name,
      this.col.name,
      this.alias,
      this.col.entity.dbase.name,
    ];
    //
    //Return the questionnaire seed
    return qseed;
  }

  // Encapsulate the distance between tabulation nodes calculation logic. This code
  // was obtained from ChatGPT by successive refinements then copy  pasted. Here
  //is the link:-
  //https://chatgpt.com/share/61443904-c387-45cf-9953-241aee316143
  //It has not been tested.
  //
  // Find all paths from a node to the root.
  distance_find_all_paths_to_root(node: view): view[][] {
    //
    // Start with an empty list of paths.
    const paths: view[][] = [];
    //
    // Base case: If the node has no ancestors, it's the root.
    if (node.guardians.length === 0) {
      return [[node]];
    }
    //
    // Recursive case: Traverse each parent and build paths.
    // Since the node has one or more parents, we need to find all the paths
    // from this node to the root by recursively exploring each parent node.
    for (const parent_node of node.guardians) {
      //
      // Recursively find all paths from the parent node to the root.
      // This step involves calling `find_all_paths_to_root` on each parent node.
      // The result is a list of paths where each path is an array of nodes
      // from the current parent to the root.
      const parent_paths = this.distance_find_all_paths_to_root(parent_node);
      //
      // Prepend the current node to each path obtained from the parent.
      // For each path found in `parent_paths`, we add the current node
      // to the beginning of that path. This effectively extends the path
      // from the parent to include the current node, thus creating a path
      // from the current node to the root.
      for (const path of parent_paths) {
        paths.push([node, ...path]);
      }
    }
    //
    // After all parent paths have been processed, return the full list of paths
    // that lead from the current node to the root.
    return paths;
  }
  //
  // Find the longest common ancestor (LCA) path between two paths, given 2
  // collections of paths.
  distance_find_longest_common_path(
    paths1: view[][],
    paths2: view[][]
  ): number {
    //
    // Start by assuming an LCA of 0, adjusting accordingly.
    let max_distance = 0;
    //
    // Compare each pair of paths, avoiding redundant comparisons.
    for (const path1 of paths1) {
      for (const path2 of paths2) {
        //
        // Initialize pointers at the end of both paths.
        let i = path1.length - 1;
        let j = path2.length - 1;
        //
        // Move both pointers up the paths until they no longer match.
        // Explanation: Starting from the end of the paths,
        // which represent nodes closest to the root, we compare nodes
        // at corresponding positions. The loop continues until we find
        // the first pair of nodes that are different, indicating where
        // the paths diverge. This point marks the end of the shared
        // ancestor path between the two nodes.
        while (i >= 0 && j >= 0 && path1[i] === path2[j]) {
          i--;
          j--;
        }
        //
        // Calculate the distance for this pair of paths based on
        // the position where they diverged.
        const distance = i + 1 + (j + 1);
        //
        // Adjust the result if this distance is the largest found so far.
        max_distance = Math.max(max_distance, distance);
      }
    }
    //
    return max_distance;
  }
  //
  // Calculate the longest distance between two nodes.
  distance_calculate_longest_between_nodes(node1: view, node2: view): number {
    //
    // Find all paths from node1 to the root.
    const paths1 = this.distance_find_all_paths_to_root(node1);
    //
    // Find all paths from node2 to the root.
    const paths2 = this.distance_find_all_paths_to_root(node2);
    //
    // Find the longest distance by comparing all pairs of paths.
    return this.distance_find_longest_common_path(paths1, paths2);
  }
}

//The general form of the row/col coordinates
export type coord<i> = [row: i, col: i];

//The homozone driver data represented as a 2 dimesioned object where the row and
//column indexers are strings
export type obj<i> = { [row: string]: { [col: string]: i } };

//The source of data that drives a homozone. It may be:-
export type driver_source =
  //
  //A. SOURCES MODELLED USING BASIC LINEAR ALGEBRA CONCEPTS, i.e., scalars,
  //vectors, matrices
  //
  //The simplest data possible has a dimension of  1 x 1. It is useful during
  //tests
  | basic_value
  //
  ////A row vector. The dimension is 1 x m. Similar to scalars and regular
  //matrices, the axes of a vector has numeric indices.
  | Array<basic_value>
  //
  //Matrices represent data a 2-d space. Dimension is m x n. When transposed
  //the matrix's dimension becomes n x m re
  | Array<Array<basic_value>>
  //
  //The case when the indices are the same as the values is a special one
  | {
      type: "indexed_array";
      values: Array<basic_value>;
      subjects?: Array<label>;
    }
  //
  //B. TEXT-INDEXED DATA
  //The data described raelier implicitly indexed by numbers. The following
  // group of data has text indices, representing data that typically comes
  //from quering databases.
  //
  //The sql resulting from executing the get_sql_data method of the database
  //classs. The row index shows names the column that is used as the row index
  //
  | { type: "sql"; sql: string; row_index: cname; dbname?: string }
  //
  //-- another source that produces data in a long format. The names refer
  //to the columns of the query which provide:-
  //-the array of values that form the row axis
  //-the array of values that form the column axis
  //-the cell values to be tabulated
  //This kind of data is the our motivation for tabulation as it is not very
  //easy to sport the underlying patterns in teh long format
  | {
      type: "sql.long";
      sql: string;
      row: cname;
      col: cname;
      basic_value: cname;
      dbname?: string;
    }
  //
  //A database entity (table) name.  This can be translated
  | { type: "ename"; ename: string; dbname: string }
  //
  //A data object of basic values indexed by row and column string values
  | { type: "obj"; obj: obj<basic_value> }
  //
  //Returns a driver data source derived from the given axis of the base
  // homozone
  | { type: "axis"; dim: 0 | 1; base: homozone };

//The plan of a heterozone is about how the constituent zones are organized
export type plan = Array<Array<root.zone>>;

//An option associated with a tick. Note how the label has been promoted to
// its own argument
export type tick_option = [
  mark: string,
  options: table_options,
  ...labels: Array<label>
];

//Options for controlling a homozone
export interface table_option_interface extends view_option_interface {
  //
  //Options associated with an axis
  axes: [row?: axis_options, col?: axis_options];
  //
  //Adding simple options to homoticks. This allows us to associate one or
  // more labels with a tick mark
  ticks: Array<tick_option>;
  //
  //To support the association of specific cells (using indices> with user
  //defined view options
  cells: Array<[row: string, col: string, view_options]>;
  //
  //The default value of a cell
  default_value: basic_value;
  //
  //The following (event) methods are used to override the onblur click event
  //listeners
  //
  //This is the method to execute when an io in a homozone loses focus. This
  //is needed to support auto-save
  onblur: listener;
  //
  //The click event listener for a homozone cell
  onclick: listener;
  //
  //The onchange event listener
  onchange: listener;
  //
  //Listen to the context menu
  oncontext_menu: listener;
  //
  //The double cliek event event listener
  ondblclick: listener;
  //
  //Show/hide the indexing row. The default is hidden
  show_row_index: boolean;
  //
  //This listener is called after a cell is initialized''
  oncell_init: (cell: cell) => Promise<void>;
  //
  //Indicates if data is provided as an unbalance object or not. Unbalance means
  //that there are rows that dont have the same number of keys as the first one
  unbalanced: true;
  //
  //Refresh a cell after writing is data to the datase
  refresh_after_write: boolean;
  //
  //The preferred layout of a table; teh default is auto
  table_layout: "fixed" | "auto";
  //
  //Indicates if a zone is transposed or not. The default is that it is not
  //When a column vector is transposed, it becomes a row vector, i.e., m x 1.
  // The dimension of scalar does change when transposed
  transposed: boolean;
  //
  //Show fields in update mode
  updateable: boolean;
}

//Options for modifying the look of a homozone
export type table_options = Partial<table_option_interface>;

//Options for modifying the look of an axis extends those of a view
export interface axis_option_interface extends table_option_interface {
  //
  //The source of data for marking the axis
  source: axis_source;
  //
  //Specific options for an indentified tick
  ticks: Array<tick_option>;
}
export type axis_options = Partial<axis_option_interface>;
//
//The Tabulator is the base class for all tabulation objects, e.g., cell, axis, homozone,
//heterozone etc
export abstract class tabulator extends view {
  //
  //The table that implements the zone. This is the bit that characterises the
  //zone hierarchy
  public table?: HTMLTableElement;
  //
  //Redefine the tabulator opotions to be based on a table option interface
  declare options?: table_options;
  //
  constructor(parent?: view, options?: table_options) {
    //
    super(parent, options);
  }
  //
  //Collect the transpose option occurrences in the view hierarchy
  *collect_transposed_options(): Generator<1> {
    //
    //Yield the transposed option if it is defined at in this view
    if (this.options?.transposed) yield 1;
    //
    //If this tabulator has a parent, then continue the search
    if (this.parent && this.parent instanceof tabulator)
      yield* this.parent.collect_transposed_options();
  }

  //
  //Transpose the given object by determining the row and column axes, then
  //using them to step through object and recompile it by interchanging
  //coordinates
  transpose_obj(obj: obj<basic_value>): obj<basic_value> {
    //
    //Get the axes of the object
    const axes: coord<Array<string>> = this.extract_axes(obj);
    //
    //Destructuure the axes
    const [rows, cols] = axes;
    //
    //Start with an empty result
    const result: obj<basic_value> = {};
    //
    //Step through the column axis (rather than row) as rows
    for (const row of cols) {
      //
      //Create an empty object of row values
      result[row] = {};
      //
      //Loop through all the rows as columns of this driver
      for (const col of rows) {
        //
        //Ignore cells that dont have any data
        try {
          result[row][col] = obj[col][row];
        } catch (err) {}
      }
    }
    return result;
  }
  //
  //Extract the axis from an object of cell values
  //We assume that the columns are not balanced, i.e., you have to visit all
  //the column keys in the matrix
  extract_axes(matrix: obj<basic_value>): coord<Array<string>> {
    //
    //Map the matrix keys to an array of basic values.
    const rows: Array<string> = Object.keys(matrix).map((value) => value);
    //
    //If the basic value is empty, then return an empty tuple
    if (rows.length === 0) return [[], []];
    //
    //Get the column values; they are formed from the keys of all the rows
    //if the data is not balanced. Otherwise use the first row to prpvide
    //the keys.
    //
    //Define the column keys
    let cols: Array<string>;
    //
    //By default, data will be assumed to be balanced, so that imbalanced
    //is a special case
    if (!this.search_option("unbalanced")) {
      //
      //Get the key of the first row
      const key: string = rows[0];
      //
      //Get all the keys of the firs row
      cols = Object.keys(matrix[key]);
    }
    //
    //For the unbalancd case
    else {
      //Start with an empty set of column strings, to ensure that the result
      //is unique
      const colset = new Set<string>();
      //
      //Loop thru the rows keys
      for (const r in matrix) {
        //
        //Loop thru the column keys
        for (const c in matrix[r]) {
          //
          colset.add(c);
        }
      }
      //
      //Map the column values (from a Set) to get (an array of) strings
      cols = [...colset].map((value) => value);
    }
    //
    return [rows, cols];
  }

  //Refresh is to show the zone that is at the root of this view.
  async refresh() {
    const zone: root.zone = this.get_root_zone();
    await zone.show();
  }

  //Remove  duplicate seed resulting from expanding the data model
  remove_duplicates(inputs: Array<seed>, seed_new: seed): Array<seed> {
    //
    //Find a seed from the inputs that matches the new one
    const found: seed | undefined = inputs.find(
      (seed_old) =>
        //
        //The columns must be equal
        seed_new.col === seed_old.col &&
        //
        //The aliases must be equal
        mutall.arrays_are_equal(seed_new.alias, seed_old.alias) &&
        //
        //The expression must be loosely equal. Why loosely? Because 6 is the
        //same as '6' even though the data types are different
        seed_new.exp == seed_old.exp
    );
    //
    //Skip the seed if it is a duplicate
    if (found) return inputs;
    //
    //Add the new seed to the list
    inputs.push(seed_new);
    //
    //Return the expanded list
    return inputs;
  }

  //Returns the row and column values needed for retrieving a cell from a
  // homozone, irrespective of the transposition in place
  orientate<i>(ref: [mark: i, dim: 0 | 1], mark2: i): coord<i> {
    //
    //Destructure the reference mark
    const [mark, dim] = ref;
    //
    //If the reference dimension is 0, then mark represents the row and mark2
    //the column; if the reference dimension is 1, the roles are reversed
    return dim === 0 ? [mark, mark2] : [mark2, mark];
  }

  //Switch the coordinates if necessary, assuming thhtat value 0 is
  //parallel to dim
  switch(dim: 0 | 1, values: coord<number>): coord<number> {
    //
    //Destructure values
    const [a, b] = values;
    //
    //Do teh sitching
    return dim === 0 ? [a, b] : [b, a];
  }
  //
  //Climb the zone hierarchy until you get a table that is defined. Report
  //an error if none is found
  get_html_table(): HTMLTableElement {
    //
    //For each view in the view hierarchy, test if teh tble field is present
    //Note the casting of any to bypass data check
    const found: view | undefined = [...this.collect_guardian_views()].find(
      (view) => (<any>view).table
    );
    //
    //If found, try extracting the table
    if (found) {
      //
      //Extract the table
      const table = (<any>found).table;
      //
      if (table instanceof HTMLTableElement) return table;
    }
    //
    //The table is not found
    throw new mutall_error("Unable to find a table in the view hierarchy");
  }

  //Redefine the search to search the table option interface
  search_option<x extends keyof table_options>(
    key: x
  ): table_options[x] | undefined {
    //
    return <table_options[x]>super.search_option(<keyof view_options>key);
  }

  //Returns the zone at the root of this tabulator.
  get_root_zone(): root.zone {
    //
    //Harvest all the view in the view hierachy
    const views: Array<view> = [...this.collect_guardian_views()];
    //
    //Reverse the list;
    const rviews: Array<view> = views.reverse();
    //
    //Search for the first entry that is a root.zone
    const found: view | undefined = rviews.find(
      (view) => view instanceof root.zone
    );
    //
    //If found, its the root
    if (found) return <root.zone>found;
    //
    //Otherwise throw an exception
    throw new mutall_error(`Root zone not found`);
  }
  //Returns the asymmetric difference between 2 sets as a tuple of
  //members of a that are not in b, and members of b that are not a
  get_difference<T>(setA: Set<T>, setB: Set<T>): [Set<T>, Set<T>] {
    //
    //Define members of a that are not in b
    const diffa = new Set<T>();
    //
    //Loop through all members of a;
    //
    //Collect the member if it is not in b
    for (const elem of setA) if (!setB.has(elem)) diffa.add(elem);
    //
    //Define members of b that are not in a
    const diffb = new Set<T>();
    //
    //Loop througall the members of b
    //
    //Collect members of b that are not in a
    for (const elem of setB) if (!setA.has(elem)) diffb.add(elem);
    return [diffa, diffb];
  }
  //
  // Intializing a tabulator is mainly about completing the construction
  // of the tabulator by attending to the asynchronous processes
  abstract init(): Promise<void>;
}

//Drivers of homozones are the sources of data that is tabulated
export namespace drivers {
  //
  //Modelling the source of data that drives a homozone. The key feature of
  //a source is that it is the home of all the coding related to conversion
  //of driver source specification to a data object and its axes. Drivers are
  //part the tabulation hierarchy, so that it is capable of managing pollinators.
  //They also organized in another hierarchy that shows how oen drove is derived
  //from another
  export abstract class driver extends tabulator {
    //
    //The source of axes bounding the data
    public axes_source?: coord<axis_source | undefined>;
    //
    //Re-declare the parent of a source (so that is not just a tabulation
    //element but a homozone). This is part of the view hierarchy
    declare parent: homozone;
    //
    constructor(parent: homozone) {
      //
      //Initialize the tabulation
      super(parent);
    }

    //
    //Creating/compiling a data source from user specification
    static create(ds: driver_source, parent: homozone): driver {
      //
      //A basic value is a scalar tensor
      if (tensor.is_basic_value(ds))
        return new tensor({ rank: 0, scalar: ds }, parent);
      //
      //An array of basic values is a vector tensor
      if (tensor.is_vector(ds))
        return new tensor({ rank: 1, vector: ds }, parent);
      //
      //A double array of basic values is a matrix tensor
      if (tensor.is_matrix(ds))
        return new tensor({ rank: 2, matrix: ds }, parent);
      //
      //The data source must have a type. It js an error if not
      if (ds.type === undefined)
        throw new mutall_error(
          `The driver source for homozone '${parent.id}' is not valid`,
          ds
        );
      //
      //The data source is of the (complex) named  type. Use the type to guide
      //the processing
      switch (ds.type) {
        //
        //Modelling data generated by executing a query (using the
        //get_sql_data route)
        case "sql":
          //
          //Destructure the data source
          //type sql.fuel = {sql, row_index, dbname}
          return new drivers.sql_fuel(ds.sql, ds.row_index, parent, ds.dbname);
        //
        //Another sql source that produces data in a long format. The names refer
        //to the columns of the query which provide:-
        //-the array of values that form the row axis
        //-the array of values that form the column axis
        //-the (measurement) values to be tabulated
        //This kind of data is the our motivation for tabulation as it is not ver
        //easy to sport the underlying patterns
        //{type:'long', source:source, row:cname, col:cname, measurement:cname}
        case "sql.long":
          //Destructure the source
          const { sql, row, col, basic_value, dbname } = ds;
          return new drivers.sql_long(
            sql,
            row,
            col,
            basic_value,
            parent,
            dbname
          );
        //
        //Read the data from a the named entity. Entities recognise foreign and
        //primary keys
        case "ename":
          return new entity(ds.ename, ds.dbname, parent);
        //
        //Convert a simple array of basic values, i.e., Array<basic_value>,
        //to a driver, i.e., obj<basic_value, which expands to
        //{[row:string]:{[col:string]:basic}} where row is set row 'null' and
        //as the  vertical indexer. This is a special case of the indices being
        //are the same  as the array values
        case "indexed_array":
          return new indexed_array(ds.values, parent, ds.subjects);
        //
        //
        //A specification that says that the data of this zone is a matrix
        //that is indxed in both the row and column axis.
        case "obj":
          return new driver_obj(ds.obj, parent);
        //
        //
        //Returns a driver data source derived from the given axis of a homozone
        case "axis":
          return new driver_axis(ds.dim, ds.base, parent);
      }
    }

    //Set the source of this driver's axes. Drivers override this method to
    //provide their own versions of initialization. NB. Setting the driver's
    // data is not part of this initialization. It is a seperate process
    // done when the data is needed
    async init(): Promise<void> {
      //
      //Set the sources of axes for this driver
      this.axes_source = [
        await this.get_axis_source(0),
        await this.get_axis_source(1),
      ];
    }
    //
    //Set the data object by analysing the driver source specifications
    abstract get_data(): Promise<obj<basic_value>>;
    //
    //Every driver must be able to specify its source of axes
    abstract get_axis_source(dim: 0 | 1): Promise<axis_source>;

    //
    //Retrives data  from a database (not just the simple fuel)
    //assuming the fuel to be single json string that can be casted to the user
    //defined type. NB. In cases where we expected an empty object {}, mysql
    //returned null instead. Hence the null option
    async retrieve_data<i>(sql: string, dbname_in?: string): Promise<i | null> {
      //
      //Get thr dbname
      const dbname = dbname_in ?? (await this.get_dbase()).name;
      //
      //Execute the sql to get the usual fuel
      const fuels: Array<fuel> = await this.exec_php(
        "database",
        //
        //Create the (incomplete, i.e., false parameter) database and execute
        //the sql to return the data
        [dbname, false],
        "get_sql_data",
        [sql]
      );
      //
      //The expected fuel is an array of one element only
      if (fuels.length !== 1)
        throw new mutall_error(
          `Expected 1 row of data. '${fuels.length}' found `
        );
      //
      //Get the array of values of the one row
      const values = Object.values(fuels[0]);
      //
      //Only 1 value is expected
      if (values.length !== 1)
        throw new mutall_error(
          `Expected 1 column of values; '${values.length}' found`
        );
      //
      //Get the only value
      const value: basic_value = values[0];
      //
      //It is possible that the value is null; if so return it
      if (value === null) return null;
      //
      //The value must be a (json) string
      if (typeof value !== "string")
        throw new mutall_error(
          `String value is expected. '${typeof value}' found`
        );
      //
      //Decode the json string. What if it is not? This will crash
      const result = JSON.parse(value);
      //
      //Cast the json into the desired shape. (You are on your own here)
      return <i>result;
    }
  }

  //Types of temnsors
  export type tensor_type =
    | { rank: 0; scalar: basic_value }
    | { rank: 1; vector: Array<basic_value> }
    | { rank: 2; matrix: Array<Array<basic_value>> };

  //This class borrows ideas from linear algebra concepts of scalars, vectors
  //and matrices -- all generalized in into rank-n tensors, where scalars are
  //rank-0
  export class tensor extends driver {
    //
    constructor(public type: tensor_type, parent: homozone) {
      super(parent);
    }
    //
    //Type guard for testing the input as a basic value
    static is_basic_value(value: any): value is basic_value {
      //
      //Testing for a basic value
      const test: boolean =
        value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean";
      return test;
    }

    //Type guard that tests value for a vector
    static is_vector(value: any): value is Array<basic_value> {
      //
      //An empty array is considered a vector
      if (Array.isArray(value) && value.length === 0) return true;
      //
      return Array.isArray(value) && this.is_basic_value(value[0]);
    }

    //Type guard for a matrix that tests if value is a matrix
    static is_matrix(value: any): value is Array<Array<basic_value>> {
      //
      return Array.isArray(value) && Array.isArray(value[0]);
    }

    //Returns the axis source of a temsor by first getting its object data
    // then using the object driver to deduce the axes
    async get_axis_source(dim: 0 | 1): Promise<axis_source> {
      //
      //Get the data in object format
      const objdata: obj<basic_value> = await this.get_data();
      //
      //Use the data to create a new driver of object
      const ds: driver_source = { type: "obj", obj: objdata };
      //
      //Use the data to create a new driver of object
      const driver_obj = drivers.driver.create(ds, this.parent);
      //
      //Return the desired data source
      const source: axis_source = await driver_obj.get_axis_source(dim);
      //
      return source;
    }

    //Construct the driver data object depending on the rank of this tensor
    async get_data(): Promise<obj<basic_value>> {
      //
      //Define the desired output
      let matrix: obj<basic_value>;
      //
      //Compile output, depending on the rank of the tensor
      switch (this.type.rank) {
        //
        //For scalars...
        case 0:
          return { "0": { "0": this.type.scalar } };
        //
        //For roe vectors....
        case 1:
          //
          //Compile the matrix object of values, starting with an empty first row
          matrix = { "0": {} };
          //
          //Fill the the first row of the matrix with indexed values
          this.type.vector.forEach(
            (value, i) => (matrix["0"][String(i)] = value)
          );
          //
          return matrix;
        //
        //For matrices....
        case 2:
          //
          //Start with an empty matrix
          matrix = {};
          //
          //Get the double array of values
          const valuess: Array<Array<basic_value>> = this.type.matrix;
          //
          //Loop through the input to construct the desired matrix
          valuess.forEach((values, i) => {
            //
            //Create an empty row, at the i'th index
            matrix[String(i)] = {};
            //
            //Save the value at the i,j'th indices
            values.forEach(
              (value, j) => (matrix[String(i)][String(j)] = value)
            );
          });
          //
          //Start with an  empty pair of axis
          const values: coord<Array<string>> = [[], []];
          //
          //Fill up the row axis
          valuess.forEach((_, i) => values[0]!.push(String(i)));
          //
          //Use the balance assumption and the first row to fill up the column axis
          valuess[0].forEach((_, j) => values[1]!.push(String(j)));
          //
          return matrix;
      }
    }
  }
  //
  //The idea of an indexed array is borrowed from PHP. This is a special case
  //of the column indices of this source being the same as the array values
  export class indexed_array extends driver {
    //
    constructor(
      public values: Array<basic_value>,
      parent: homozone,
      public subjects?: Array<label>
    ) {
      super(parent);
    }

    //Convert an array of basic values to an object matrix
    async get_data(): Promise<obj<basic_value>> {
      //
      //There is only one row in an array; its axis value is the string 'null'
      const matrix: obj<basic_value> = { "0": {} };
      //
      //Loop thru the vector values and add them to the result structure.
      this.values.forEach((value) => (matrix["0"][String(value)] = value));
      //
      return matrix;
    }

    //The row axis of a indexed array has a mark of 0. The column axes comprises
    //of the row values -- all belonging to the same subject
    async get_axis_source(dim: 0 | 1): Promise<axis_source> {
      //
      //An indexed array does not have a row axis
      if (dim === 0) return { type: "values", values: ["0"] };
      //
      //An indxed array is similar to an ordinary arry, except that he indices
      //of the colum axis are the array values themselves, rathe than the
      //position derived numeric indices
      return { type: "values", values: this.values };
    }
  }
  //
  ////The source models data that matches the obj<basic_value> format a plus a
  //pair of axis that assumes that the columns are not balanced, i.e., you
  //have to visit all the column keys in the matrix
  export class driver_obj extends driver {
    constructor(public data: obj<basic_value>, parent: homozone) {
      super(parent);
    }
    //
    //The driver matrix of a this data source is ready
    async get_data(): Promise<obj<basic_value>> {
      return this.data;
    }

    //The axies of the row axis are the keys of the matrix; tose of the
    //column axis are extracetd by visiting all the keys in teh matrix
    async get_axis_source(dim: 0 | 1): Promise<axis_source> {
      //
      if (dim === 0) {
        //
        //The values of teh row axis are the keys of the driver
        const values: Array<basic_value> = Object.keys(this.data);
        //
        //Compile an axis of values without subjects
        return { type: "values", values };
      }
      //
      //Get the column seeds; they are formed from the keys of all the rows.
      //
      //Start with an empty set of column strings, to ensure that the result
      //is unique
      const colset = new Set<string>();
      //
      //Loop thru the rows keys of the driver
      for (const r in this.data) {
        //
        //Loop thru the column keys of each row
        for (const c in this.data[r]) {
          //
          //Add the name to the set of columns (without repetition)
          colset.add(c);
        }
      }
      //
      //Convert the set of basic values to an array
      const values: Array<basic_value> = [...colset];
      //
      //Return the row axis source as a list of values with no subject
      return { type: "values", values };
    }
  }

  //
  //A driver data source derived from the axis of a homozone. This source is
  //important for drawing margin zones, derived from a homozone
  export class driver_axis extends driver {
    //
    //Redefine the parent as homozone
    //declare parent:homozone;
    //
    //NB. Base is the homozone that has the axis being considered. Parent is
    //the homozone of this driver in the view hierarchy.
    constructor(public dim: 0 | 1, public base: homozone, parent: homozone) {
      super(parent);
    }
    //
    //Set the axis (of the base homozone) that correspond to this source,
    //so that it can be used for extracting the matrix and axis of this
    //source
    async init(): Promise<void> {
      //
      //Initialize, partially, i.e., before the table is defined, the base
      //homozone, so that its (raw) axes can be used to initialize this driver.
      //For this purpose, full initialization is not needed; infact it is
      //problematic! Be careful that the underlying data driver may change,
      //so, an unconditional initialization is required, just in case
      //
      //Initialize the driver of the base homozone. This creates the base's
      //driver and initializes its axis source
      await this.base.init_driver();
      //
      //Initialize the base's raw axes, so we can use them in the next step
      await this.base.init_axes();
      //
      //Call the method that was overriden, thus setting the source of axes
      await super.init();
    }
    //
    //Initialize the requested axis source of this driver
    async get_axis_source(dim: 0 | 1): Promise<axis_source> {
      //
      //If the requested dimension does not match that of this axis then
      // return the single tick axis with mark 0 as the axis source
      // perpendicular to this one
      if (dim !== this.dim) return { type: "values", values: ["0"] };
      //
      //The source of this axis is the same as that of the base homozone.
      //The axes source of a homozone is definite (as a homozone is ensured
      // to have a driver). So, we can safely use the axes source of the base
      // to define that of this axis
      const source: axis_source | undefined =
        this.base.driver.axes_source?.[dim];
      //
      //It is an error if the axis source is not defined. Report the undefined
      //component as accurately as possible
      if (!source) {
        if (!this.base.driver.axes_source)
          throw new mutall_error(`Axis source for this driver is not defined`);
        throw new mutall_error(`Axis source for dim '${dim}' is not defined`);
      }
      return source;
    }
    //
    //Convert the values of the underlying axis to a matrix object
    async get_data(): Promise<obj<basic_value>> {
      //
      //If the base homozone was transposed, then interchange the dimensions
      //so that we can pick the correct data
      let dim: number;
      if (this.base.transposed) {
        dim = this.dim === 0 ? 1 : 0;
      } else {
        dim = this.dim;
      }
      //
      //Get the matrix of the axis.
      const matrix: obj<basic_value> | undefined = await this.base.axes_raw![
        dim
      ]!.get_matrix();
      //
      //Return an empty matrix if it is not defined
      return matrix ?? {};
    }
  }
  //
  //This source is the root of all other sql-derived souces
  export abstract class sql extends driver {
    //
    // SQL column data, derived from SQL metadata, used for constructing the
    // column axis.
    public metadatas?: Array<metadata>;
    //
    constructor(
      //
      //The sql statement
      public sql: string | undefined,
      //
      //The name of the column used for indexing the row axis
      public row_index: cname,
      parent: homozone,
      public dbname?: string
    ) {
      super(parent);
      //
      //Add the dbname to the driver optopns so that it is vsible in the
      // view hierarchy. NB. The constructor driver options override the
      // dbname
      this.options = { dbname, ...this.options };
    }
    //
    //Columns that are important for defining the driver data and axes
    //source
    abstract required_columns(): Array<cname>;

    //Override the defaut driver initialization to build metadata that is
    // needed for constructing the column axis
    async init(): Promise<void> {
      //
      //If a dbname is available, then use it to initialize a sql driver
      //database
      if (this.dbname) this.dbase = await this.open_dbase(this.dbname);
      //
      //Set the metadata
      this.metadatas = await this.init_metadatas();
      //
      //Continue with the default initialization of the data and axes
      // sources
      await super.init();
      //
      //Update the driver options, so that we can access column metadata
      //via search options
      this.options = {
        //
        //The database name
        dbname: this.dbname,
        //
        //The tick options
        ticks: this.metadatas.map((metadata) => metadata.tick_option()),
        //
        //The options passed ia the driver constructor (overwriting any
        //other existing ones)
        ...this.options,
      };
    }

    //Returns the collection of metadata associated with the current sql
    async init_metadatas(): Promise<Array<metadata>> {
      //
      //Get the database for this query, directly or indirectly
      const dbname: string = this.dbname ?? (await this.get_dbase()).name;
      //
      //Get the raw sql column metadata; it is the data needed for constructing
      //the column axis
      const result: Array<metadata_interface> = await this.exec_php(
        "database",
        [dbname, false],
        "get_column_metadata",
        [this.sql!]
      );
      //
      //Check that required  columns for constructing drivers and axes are
      //indeed found in the metadata
      for (const cname of this.required_columns()) {
        if (result.find((metas) => metas.name === cname)) continue;
        else
          throw new mutall_error(
            `Column name '${cname}' is not found in the sql '${this.sql}'`
          );
      }
      //
      // Convert an array of metadata interfaces into class instances.
      // This process asynchronously transforms column names into actual
      // database columns, so direct array mapping cannot be used.
      //
      //Start with an empty list
      const metadatas: Array<metadata> = [];
      //
      //For each metadata interface produce add a class to the list
      for (const metadata_interface of result) {
        //
        //Deduce a database column from the metadata
        const Metadata: metadata = await metadata.parse(
          metadata_interface,
          this
        );
        //
        //Save the column
        metadatas.push(Metadata);
      }
      //
      //Return the metadaa clases
      return metadatas;
    }
    //
    //Use the given column name to formulate a query for returning the
    //axis values
    async get_axis_values(cname: string): Promise<Array<basic_value>> {
      //
      //Use the given sql to formulate a sub-sql for retrieving the unique
      //values of the given column
      const sql2: string = `select distinct \`${cname}\` from (${this.sql}) as mysql`;
      //
      //Compile the axis values
      //
      //Search for the database in this context
      const dbname: string = (await this.get_dbase()).name;
      //
      //Execute the sub-query to retrieve the values for the axis
      const fuels: Array<fuel> = await this.exec_php(
        "database",
        [dbname, false],
        "get_sql_data",
        [sql2]
      );
      //
      //Now map the fuels to the values
      const values: Array<basic_value> = fuels.map((fuel) => fuel[cname]);
      //
      //Return the values
      return values;
    }

    //Returns the options to be associated with a values-based axis of an sql
    //based driver
    get_axis_options(cname: string): table_options {
      //
      //Start by finding the metadata of this sql that matches the named
      //column
      const metadata: metadata | undefined = this.metadatas?.find(
        (meta) => meta.fname === cname
      );
      //
      //It is an error if there is no matching metadata
      if (!metadata)
        throw new mutall_error(`No metadata found for column '${cname}'`);
      //
      //Compile the axis options, starting with the subject
      const axis_options: table_options = { labels: metadata.labels };
      //
      //Add the metadata options, if any, to those of the axis
      if (metadata.options) Object.assign(axis_options, metadata.options);
      //
      //Return the axis options
      return axis_options;
    }

    //
    //Convert fuel to, obj<basic_value>, the data that drives a homozone. The
    //row indices come from the given field and the column indices are already
    //part of the fuel. The row_index coumn is not part of the output
    //object....this has been repealed. You can hide teh indexing column if
    //you dont want it
    convert_fuel_2_obj(
      fuels: Array<fuel>,
      row_index: cname
    ): obj<basic_value> | mutall_error {
      //
      //Start with an empty result object
      const result: { [row: string]: { [col: string]: basic_value } } = {};
      //
      //Loop thru all the rows of the fuels to create driver rows
      for (const fuel of fuels) {
        //
        //Destructure the fuel type
        //type fuel = Array<{[cname:string]:basic_value}>;
        //
        //Create an empty driver row
        const r: { [col: string]: basic_value } = {};
        //
        //Loop thru all the key columns of the row
        for (let col in fuel) {
          //
          //Ignore the column that matches the row index.
          if (col === row_index) continue;
          //
          //Get the column's value
          const bvalue: basic_value = fuel[col];
          //
          //Extract the actual basic value, in case bvalue is a friend
          const value: basic_value = this.extract_value(col, bvalue);
          //
          //Save the cell value
          r[col] = value;
        }
        //
        //Get the name of the given field to get a row index key
        const value: basic_value | undefined = fuel[row_index];
        //
        //Its an error if  the indexed column is not found
        if (value === undefined)
          return new mutall_error(
            `No value found for row index '${row_index}'`
          );
        //
        //Convert the basic value to a string key, so we can use it for indexing
        //purposes
        const key: string = String(value);
        //
        //Use the key to save the new row, r, into the result
        result[key] = r;
      }
      //
      return result;
    }

    //Extracting a value from a basic value is important for entities. They
    //overide this method to take care of friends, i.e., values that are
    //[pk. friend] pairs. By default, this method does nothing
    extract_value(cname: string, value: basic_value): basic_value {
      return value;
    }
  }

  //Modelling data genetayed by executing an sql via the get_sql_data method
  export class sql_fuel extends sql {
    //
    constructor(
      //
      //The sql of fuel  can be left undefined until initializetiontime
      public sql: string | undefined,
      public row_index: cname,
      parent: homozone,
      dbname?: string
    ) {
      //The column used for formulating the row axis is provided
      super(sql, row_index, parent, dbname);
    }

    //Initialize the sql. This code will throw an exception at this point there
    //is no sql available. It is designed to be overriden.
    async init(): Promise<void> {
      //
      //Provide better code for initializing your sql
      if (!this.sql)
        throw new mutall_error(`Override sql_fuel.init() to  
            define the sql`);
      //
      //Now complete the initialization to set the driver data and axis
      //source
      await super.init();
    }

    //The following columns are required for defining the driver and axes source
    //of a long sql
    required_columns(): Array<cname> {
      return [this.row_index];
    }

    //Modelling data generated by executing a query (using the get_sql_data method)
    //The data matrix is obtained by converting the fuel to obj<basic_value>; the
    //column axis is derived from metadata; the row from the named row index column
    async get_data(): Promise<obj<basic_value>> {
      //
      //Search the neighbourhood for a database
      const dbname: string = this.get_dbname();
      //
      //Execute the sql to get the fuels, i.e., data to be tabulated
      const fuels: Array<fuel> = await this.exec_php(
        "database",
        [dbname, false],
        "get_sql_data",
        [this.sql!]
      );
      //
      //Convert the fuels from array to obj of type basic
      const matrix: obj<basic_value> | mutall_error = this.convert_fuel_2_obj(
        fuels,
        this.row_index
      );
      //
      if (matrix instanceof mutall_error)
        throw new mutall_error(
          `${matrix.message} in source ${this.constructor.name}`,
          this.sql
        );
      //
      return matrix;
    }

    //Get the axis source of an sql, depending on the given direction
    async get_axis_source(dim: 0 | 1): Promise<axis_source> {
      //
      //If this is the header axis, then the return the seed axis,
      //excluding the indexing column -- unless explicitly requested
      if (dim === 1) {
        //
        //Filter the metadatas for the row_index, if necessary
        const metadatas: Array<metadata> =
          //
          //If the row indexing column is explicitly requested...
          this.parent.options?.show_row_index
            ? //
              //...then include it in the seeded axis
              this.metadatas!
            : //
              //...otherwise exclude it
              this.metadatas!.filter(
                (metata) => metata.fname !== this.row_index
              );
        //
        //Return the seeded axis
        return { type: "seeds", metadatas };
      }
      //
      //Compile and return the values-based axis row axis

      //
      //The row axis values are obtained from executing a query based on
      //the row_index property
      const values: Array<basic_value> = await this.get_axis_values(
        this.row_index
      );
      //
      //Get the axis options are read from the sql metadata
      const options: view_options = this.get_axis_options(this.row_index);
      //
      //Compile the values axis
      return { type: "values", values, options };
    }

    //Use the given column name to formulate a query for returning the
    //axis values
    async get_axis_values(cname: string): Promise<Array<basic_value>> {
      //
      //Use the given sql to formulate a sub-sql for retrieving the unique
      //values of the given column
      const sql2: string = `select \`${cname}\` from (${this.sql}) as mysql`;
      //
      //Compile the axis values
      //
      //Search for the database in this context
      const dbname: string = this.get_dbname();
      //
      //Execute the sub-query to retrieve the values for the axis
      const fuels: Array<fuel> = await this.exec_php(
        "database",
        [dbname, false],
        "get_sql_data",
        [sql2]
      );
      //
      //Now map the fuels to the values
      const values: Array<basic_value> = fuels.map((fuel) => fuel[cname]);
      //
      //Return the values
      return values;
    }
  }
  //
  //This source is associated with a database entity. The column axis
  //comprises of database columns and the row axis is formulated from the
  //primary key values. NB. The editor query drives this data matrix
  export class entity extends sql_fuel {
    //
    //The database entity that matches this source
    public schema_entity?: schema_entity;
    //
    //Redefine teh dbname
    declare dbname: string;
    //
    constructor(public ename: string, dbname: string, parent: homozone) {
      //
      //The sql of the sql_fuel is not known until later
      /*
            public sql:string|undefined, 
            public row_index:cname, 
            parent:homozone,
            source:driver_source, 
            dbname?:string
           */
      //The row index is the primary key
      const row_index = ename;
      super(undefined, row_index, parent, dbname);
    }

    //Override the normal driver initialization to obtain and set an sql
    // tailored to handle foreign and primary keys
    async init(): Promise<void> {
      //
      //Open the named database; this will throw an exception if the database
      //does not exist
      const dbase: database = await this.open_dbase(this.dbname!);
      //
      //Extract the named entity
      this.schema_entity = dbase.entities[this.ename];
      //
      //Use the referenced table to obtain constructor parameters such as
      // the editor sql and related options
      const [sql, options] = await this.get_editor_parameters();
      //
      //Save the options and the sql;
      this.sql = sql;
      //
      //Expand the parent homozone options, so that the are found in the
      //view hierarchy. NB. The incoming options take precedence
      this.options = { ...options, ...this.options };
      //
      //Now do the general initialization
      await super.init();
    }

    //
    //Get the sql based on the referenced table to support editing of this
    //foreign key
    async get_editor_parameters(): Promise<
      [sql: string, options: table_options]
    > {
      //
      //Describe the given entity, focusiing on the resulting sql
      const result: [
        db: any,
        cnames: Array<string>,
        sql: string,
        max_records: string
      ] = await this.exec_php(
        "editor",
        [this.ename, this.dbname],
        "describe",
        []
      );
      //
      //The desired sql is the 3rd parameter
      const sql1: string = result[2];
      //
      //Modify the sql to make it suitable to drive the editor
      const sql = this.modify_sql(result[1], sql1);
      //
      //Collect the options to support writing the data generated by the sql to
      //a database
      const options: table_options = this.get_options(result[1]);
      //
      //Return teh modified version of the sqql
      return [sql, options];
    }

    //Modify the sql resulting from an editore description to make it fit for
    //driving a foreign key editor. In particular, the primary key column will
    //be split into 2 parts: the real primary key and a friend
    modify_sql(cnames: Array<string>, sql_in: string): string {
      //
      //Destructure the column names to obtain the primary key colun and the rest
      const [ename, ...rest] = cnames;
      //
      //The primary key expression is the first componnet of the primary field
      //in the sql. The field has a tuple such as [4,' kaps/4/2023']
      const pk: string = `${ename}->>'$[0]' as ${ename}`;
      //
      //The friend is the second component
      const friend: string = `${ename}->>'$[1]' as ${ename}_friend`;
      //
      //The rest of the fields remain teh same
      const others: string = rest.join(", ");
      //
      const sql_out = `
            with 
                editor as (
                    ${sql_in}
                )
                select 
                    ${pk}, 
                    ${friend}, 
                    ${others}
                from
                    editor        

        `;
      //
      //Return the resulting sql
      return sql_out;
    }

    //Collect the options to support writing the data generated by the sql to
    //a database
    get_options(cnames: Array<string>): table_options {
      //
      //Destructure the column names to obtain the primary key column and the
      // rest
      const [ename, ...rest] = cnames;
      //
      //Collect the tick options
      //
      //Define the tick option for hiding the friend
      const hide_friend: tick_option = [`${ename}_friend`, { hidden: true }];
      //
      //Collect the primary key tick label
      const primary_label: tick_option = [ename, {}, [undefined, ename, ename]];
      //
      //Map the rest of the columns to their matching labels
      const other_labels: Array<tick_option> = rest.map((cname) =>
        this.map_cname_2_label(cname)
      );
      //
      //Use the ticks option to collect labels to be associated with the
      //colummn names
      const options: table_options = {
        ticks: [hide_friend, primary_label, ...other_labels],
      };
      //
      return options;
    }

    //Map a column name to its matching label; foreign keys should be mapped to
    //thier corresponding referenced entities
    map_cname_2_label(cname: string): tick_option {
      //
      //Get teh named column
      const col: column = this.schema_entity!.columns[cname];
      //
      //Prepare to collect a zone label (not questionnaire)
      let label: label;
      //
      //If teh column is foreign the its ename is that of the referenced table
      //Take care of looped relations
      if (col instanceof foreign_col) {
        //
        //Destructure the referenced table
        const { ename, dbname } = col.ref;
        //
        //If the column is hierarchical, then provide an alias
        const alias: Array<any> = col.is_hierarchical() ? [0] : [];
        //
        //NB. The column is the primary key of the referenced table
        label = [undefined, ename, ename, dbname, alias];
      }
      //
      // This is an attribute. Primary keys must have been taken care of earlier
      else {
        label = [undefined, cname, this.ename, this.dbname, []];
      }
      //
      //Compile the tick option
      const tick_option: tick_option = [cname, {}, label];
      //
      return tick_option;
    }

    //Initialize the aliased columns:a collection of aliased columns,
    //indexed by column mname
    async init_metadatas(): Promise<Array<metadata>> {
      //
      //Start with an empty list off aliased columns
      const result: Array<metadata> = [];
      //
      //Build the aliased columns
      for (const cname in this.schema_entity!.columns) {
        //
        //Get the named column
        const col: column = this.schema_entity!.columns[cname];
        //
        //Get the name of a column
        const fname: string = col.name;
        //
        //Compile the pollinator, marking this point as its source
        const pollinator: pollinator = { col, alias: [], source: this };
        //
        //Compile the metadatas
        const Metadata = new metadata(this, fname, [pollinator], {});
        //
        //Add the column to the list
        result.push(Metadata);
      }
      //
      //Derive the metadata for the primary key friend.
      const pkfriend = new metadata(
        this,
        `${this.schema_entity!.name}_friend`,
        [],
        {}
      );
      //
      //Add the new primary key friend
      result.push(pkfriend);
      //
      //Return the metadata result
      return result;
    }
  }

  //This kind of data was the motivation for tabulation as it is not very
  //easy to sport the underlying patterns
  export class sql_long extends sql {
    //
    //The parameter names refer to the columns of the query which provide:-
    //-the array of values that form the row axis
    //-the array of values that form the column axis
    //-the (basic) values to be tabulated
    constructor(
      public sql: string,
      public row_index: cname,
      public col_index: cname,
      public basic_value: cname,
      parent: homozone,
      dbname?: string
    ) {
      //The row index of the query is the column named row
      super(sql, row_index, parent, dbname);
    }

    //The following columns are required for defining the driver and axes source
    //of a long sql
    required_columns(): Array<cname> {
      return [this.row_index, this.col_index, this.basic_value];
    }

    //Convert raw column metadata to processed versions columns. This would have
    //been a simple mapping were it not for the asynchronous question
    async convert_metadata_2_aliased_cols(
      raws: Array<metadata_interface>
    ): Promise<Array<metadata>> {
      //
      //Start with an empty list of processed metadata
      const result: Array<metadata> = [];
      //
      //Loop through all the metadata, conveting them to aliased columns
      for (const raw of raws) {
        //
        //Parse the raw metadata
        const Metadata = await metadata.parse(raw, this);
        //
        //Add the processed metadata to the result
        result.push(Metadata);
      }
      //
      //Return the result
      return result;
    }

    //
    //Get the data matrix from an sql that produces data in a long format, as a
    //cross tabulation of basic values by row and column names. The names refer
    //to the columns of the query which provide:-
    //-the array of values that form the row axis
    //-the array of values that form the column axis
    //-the (basic) values to be tabulated
    async get_data(): Promise<obj<basic_value>> {
      //
      //Change the input sql to one that fits the 'sql.obj' format
      const sql: string = `
            with
                #Wrap the incoming sql as a CTE
                sql_in as (
                    ${this.sql}
                ),
                #Group by rows using the column name for indexing
                myrows as(
                    select
                        \`${this.row_index}\`,
                        json_objectagg(\`${this.col_index}\`, \`${this.basic_value}\`) as measurement
                    from
                        sql_in
                    group by
                        \`${this.row_index}\`

                )
            #
            #Group by everything using the row name for indexing 
            select
                json_objectagg(\`${this.row_index}\`, measurement)
            from 
                myrows
            `;
      //
      //Get the matrix component of driver for the source and discard the axes
      const matrix: obj<basic_value> | null = await this.retrieve_data(
        sql,
        this.dbname
      );
      //
      //Standardise the result; if the get_data retirns null, return an empty
      //object
      return matrix ?? {};
    }

    //The source of data for axes of a long sql are distinct values with
    //common subjects. The axis options are determined by the row and column
    //indexing names and the metadaya for the sql
    async get_axis_source(dim: 0 | 1): Promise<axis_source> {
      //
      //Select the column name (of distinct values) to select, depending
      //on the orientation of the axis
      const cname: string = dim === 0 ? this.row_index : this.col_index;
      //
      //The values for the axis are obtained from executing a query based
      // on the named column
      const values: Array<basic_value> = await this.get_axis_values(cname);
      //
      //Get the axis options are read from the sql metadata
      const options: view_options = this.get_axis_options(cname);
      //
      //Define the axis source of type values
      const source: axis_source = { type: "values", values, options };
      //
      //Return the axis source
      return source;
    }
  }
}

export namespace root {
  //Zone is a key tabulation component.
  export abstract class zone extends tabulator {
    //
    //The position of this zone in the plan of her parent
    public position?: coord<number>;
    //
    //The size of this zone in terms of cells
    public size?: coord<number>;
    //
    //The origin of this zone
    public origin?: coord<number>;
    //
    //Collection of all zones created by this application
    public static collection: Array<root.zone> = [];
    //
    //The current cell selection for the root zone needed for supporting
    // traversing the zone
    public selection?: cell;
    //
    //The parent of a zone is either another zone or undefined. When undefined
    //we say that this is the highest member in the zone has-a hierarchy
    constructor(options?: view_options, parent?: view) {
      //
      super(parent, options);
      //
      //Initialize the current error handler
      error.handler.current = new error.handler(this);
      //
      //Save this zone in the collection
      root.zone.collection.push(this);
    }

    //A zone can be transposed. The interpretation is different for homozones and
    //heterozones
    abstract transpose(): void;

    //Collect cells for some specified record
    abstract collect_record_cells(rceord: record): Generator<cell>;
    //
    //Collect the homozones associate with this root zone
    abstract collect_homozones(dim: 0 | 1): Generator<homozone>;

    //The string version of a zone is its id
    toString(): string {
      return this.id;
    }

    //
    //A zone is transposed if an odd number of transposed options is found
    // in the view hierarchy
    get transposed(): boolean {
      //
      //Collect all the transposed options in the view hierarchy
      const occurrences: Array<1> = [...this.collect_transposed_options()];
      //
      //If thecount of the occurences is an odd number
      // then the zone is transposed; otherwise it is not,
      return occurrences.length % 2 === 1 ? true : false;
    }

    //Show this zone by initializing
    async show(): Promise<void> {
      //
      //Clear this zone from its anchor before showing it
      this.clear();
      //
      //Initialize the tabulation system, including compiling options among
      //other activities needed for the display data to work
      await this.init();
      //
      //Display data by transferring it from the homozone drivers to the
      //tabulation cells' two properties:-
      //- value (to keep track of original version) and
      //- io.value (to track the edited version)
      //You can test whether changes have occurredd by comparing the two
      await this.display_data();
      //
      //Report errors if any.
      error.handler.current.report(this);
    }

    //
    //Display data by transferring it from the homozone drivers to the
    //tabulation cells' two properties:-
    //- value (to keep track of original data version) and
    //- io.value (to track the edited version)
    //You can test whether changes have occued by comparing the two
    abstract display_data(): Promise<void>;

    //Initialize the zone system
    async init(): Promise<void> {
      //
      //Ensure global elements are set (to support collection of seeds for
      //writing cells to the database). Create the browser environment; then
      //initialize it to create the elements
      await (browser.current = new browser()).set_browser_elements();
      //
      //Clear the selection (cell) of this zone; otherwise it is remembered
      // across shows, which is not desirable
      this.selection = undefined;
      //
      //Initialize the children of a zone. NB. A homozone by definition has
      //no children. In a heterozone, the child homozone specified in a plan
      //are liked to the hetero zone as a parent; the children property of the
      //hetero zone  is also set
      await this.init_children();
      //
      //Initialize the driver, i.e, the data that is tabulated in a homozone, by
      //"compiling" the data source specifications
      await this.init_driver();
      //
      //Initialize the data in teh various drivers. NB. This process was moved
      // from driver.init() to avoid loading of data whenever we want to initialize
      // a driver multiple times
      await this.init_data();
      //
      //Initialize the axes sub-system. This creates and initializes the axes
      //and their the ticks, so that we have the necessary information to compute
      //the zone sizes
      await this.init_axes();
      //
      //Initialize the zone sizes, based on their axes
      this.init_size();
      //
      //Initialize the zone origins using the zone sizes and assuming that the
      //first zone's origin is 0,0
      this.init_origins();
      //
      //Initialize the html table thus creating it and her cells. This is the
      //physical table that we build our child zones (i.e., logical tables) on.
      this.init_table();
      //
      //Create the zone cells indexing them using relative numbers and indexing
      //keys and map them to the HTML table cels. i.e., the tds.
      await this.init_cells();
    }

    //Use the drivers to initialize the data in the relevant homozones
    abstract init_data(): Promise<void>;

    //Clear this zone from by emptying the html in the zone's anchor element
    clear() {
      //
      //Get the zone's anchor (which is not just a string)
      let anchor: HTMLElement | string | undefined = this.options?.anchor;
      //
      //Simple applicatuins may not have an anchor. If so, then clearing is
      //not posible. A second copy will be produced
      if (!anchor) return;
      //
      //If the anchor is a html element, clear its html and you are done
      if (anchor instanceof HTMLElement) return (anchor.innerHTML = "");
      //
      //The anchor is css string; use it to rerieve the element
      const elem: HTMLElement | null = this.document.querySelector(anchor);
      //
      //It is an error of tyhe css yields nothing
      if (!elem)
        throw new mutall_error(
          `Css '${anchor}' does not return an anchor element`
        );
      //
      //Clear the element
      elem.innerHTML = "";
    }
    //
    //Create the homozone's content cells and map them to the tds of the HTML
    //table element. Two structures are initialized simultaneously:
    //- cells indexed by text keys borrowed from the axis seeds
    //- cells indexed by numeric values, so that teh cells can be accessed using
    //a numeric row/column coordinate system
    abstract init_cells(): Promise<void>;

    //The id of a zone is important for reporting purpose. It is derived from
    //the parent heterozone zone and its relative position in the layout
    abstract get id(): string;

    //Initialize the sources of this zone's driver
    abstract init_driver(): Promise<void>;

    //Initialise the axes. For a homozone we initialise the raw axes. For a
    //heterozone we initialize the merged nerges.
    abstract init_axes(): Promise<void>;

    //Sets the size of a zone, based on the (merged) axes
    abstract init_size(): void;

    //Initialize the children of a zone. Nb. A homozone has no children
    abstract init_children(): Promise<void>;

    //
    //Create a HTML table using the provided css string. If css points to a valid
    //HTML table element, use it as it is.  If it is just an ordinary string,
    //then find the regerenced element and create a table under it.
    init_table(): void {
      //
      //Get the element where the table is to be anchored
      const element: HTMLElement = this.get_anchor();
      //
      //If the element is a table then return it; otherwise construct a table
      //under the css element
      const table: HTMLTableElement =
        element instanceof HTMLTableElement
          ? element
          : //
            //Create a table with a border of 1 pixel
            this.create_element("table", element);
      //
      //Create a tbody section, if it is necessary
      if (!table.tBodies[0]) this.create_element("tbody", table);
      //
      //Add the table layout specification, if available
      let layout: "fixed" | "auto" | undefined;
      if ((layout = this.search_option("table_layout")))
        table.style.tableLayout = layout;
      //
      //Initialize the HTML table rows (tr) and columns(td), if necessary
      this.init_tds(table);
      //
      //Now set the table.
      this.table = table;
    }

    //
    //Get the element where the table is to be anchored
    get_anchor(): HTMLElement {
      //
      //Use the document body if there is no user prederred anchoring element
      if (!this.options?.anchor) return this.document.body;
      //
      //If the anchor is an element, then retirn it
      if (this.options.anchor instanceof HTMLElement)
        return this.options.anchor;
      //
      //The anchor is a css string: query the document
      const element: HTMLElement | null = this.document.querySelector(
        this.options.anchor
      );
      //
      //The element must be a valid
      if (element) return element;
      //
      throw new mutall_error(
        `No element found with css '${this.options.anchor}'`
      );
    }

    //Initialize the HTML table rows (tr) and columns(td), if necessary
    init_tds(table: HTMLTableElement): void {
      //
      //Get the size of the table; do not assume that it is known
      const size: coord<number> = this.size!;
      //
      //Destructure the size
      const [rmax, cmax] = size;
      //
      //Create the table rows and columns.
      //
      //Loop through all the rows to create rows and tds
      for (let r = 0; r < rmax; r++) {
        //
        //Create a table row, tr
        const tr: HTMLTableRowElement = table.tBodies[0].insertRow();
        //
        //Insert as many tds as suggested by the size of columns
        for (let c = 0; c < cmax; c++) tr.insertCell();
      }
    }

    //Returns true if the parent of this zone is not a zone. That is the
    // definition of a root
    is_root(): boolean {
      //
      //This is a root zone if it has no parent
      if (!this.parent) return true;
      //
      //The zone has a parent
      //
      //This is a root zone if the parent is not a zone
      if (!(this.parent instanceof root.zone)) return true;
      //
      //This is not a root zone
      return false;
    }

    //Initialize the origins of all this zone and all her children
    abstract init_origins(): void;

    //Use neigborhood to compute one component of an origin in the requested
    //dimension. It is the same as that of the neighboring zone plus its size
    init_origin(dim: 0 | 1): number {
      //
      //Get the older neighbor (i.e., the one on the left or top) of this zone;
      //there may be none.
      const zone: root.zone | undefined = this.init_origin_get_neighbor(dim);
      //
      //If there is no neigbhbor, the origin component is 0
      if (!zone) return 0;
      //
      //Get the origin of the neigbouring zone. It must be found (as it is
      //older than this one)
      const origin0: number = zone.origin![dim];
      //
      //Get the size of the neigboring zone. It must be found
      const size: number = zone.size![dim];
      //
      //Comput the new origin component
      const origin2: number = origin0 + size;
      //
      //Comple and retirn the origin
      return origin2;
    }

    //Returns the immediate (older) neigbour of this zone on the left or above,
    //depending on the requested dimension
    init_origin_get_neighbor(dim: 0 | 1): root.zone | undefined {
      //
      //The following neighborhood analysis is necessary only if this is a
      //child zone, so, do not continue the analysis if it is a rrot zone
      if (this.is_root()) return undefined;
      //
      //Let i be the coordinate value in the requested dimension. This zone
      //must have a position in the parent layout
      const i: number = this.position![dim];
      //
      //If this zone is the first one, then there is no neigbour
      if (i === 0) return undefined;
      //
      //Let p be the neigbouring position, starting with the current one. NB.
      //It is not wise to simply say p=coord, because we might change the
      //coord inadvertently since JS equates the references rather than making
      //new copy of p from coord
      const p: coord<number> = [this.position![0], this.position![1]];
      //
      //Decrease the relevant coordinate of p by 1
      p[dim] = i - 1;
      //
      //Destructure the new position
      const [r, c] = p;
      //
      //If a parent is available, then it must be a heterozone; otherwise
      //something is unusual
      if (!(this.parent instanceof heterozone))
        throw new mutall_error(`A heterozone parent was expected`);
      //
      //The parent zone has the plan. Use it to get the neighhbhor
      const zone: root.zone = this.parent.plan![r][c];
      //
      return zone;
    }
  }

  //The axes of a zone
  export abstract class axis extends tabulator {
    //
    //The ticks for this axis are initially empty
    public ticks: Array<root.tick> = [];
    //
    //Redefine the parent to emphasize zone, not just a view
    declare parent: root.zone;
    //
    //Returns teh typr of axis: seeds or values
    abstract get_type(): "seeds" | "values";
    //
    constructor(
      //
      //The direction/alignment of the axis: 0=vertical/rowsise; 1 = horizontal/col
      public dim: 0 | 1,
      //
      //The parent of a axis is a zone
      parent: root.zone,
      //
      options?: view_options
    ) {
      super(parent, options);
    }

    //Get the first tick mark of this axis that is not hidden
    get_1st_mark(): string {
      //
      //Find the first tick that is not hidden
      const tick: root.tick | undefined = this.ticks.find(
        (tick) => !tick.hidden
      );
      //
      //It is an issue if the a visible tick is not found; report it
      if (!tick)
        throw new mutall_error("No visible tick is found on this axis");
      //
      //return th tick mark
      return tick.mark;
    }

    //Create and initialize a tick with the given mark
    abstract create_tick(value: basic_value): root.tick;

    //The direction orthogonal/perpendicular to this axis
    get ortho(): 0 | 1 {
      return this.dim === 0 ? 1 : 0;
    }

    //Description of an axis (to support debugging) in terms of teh following:-.
    //zone:'${zone}',constructor:'${type}',  noticks:'${size}' ticks:${tickstr}
    get description(): string {
      //
      const zone: string = this.parent.id;
      const type: string = this.constructor.name;
      //
      const size: number = this.ticks!.length;
      //
      //Workout the tick values; start with an empty value
      let tickstr: string = "";
      //
      //The ticks must be available
      if (this.ticks?.length) {
        //
        //Extract the tick mark strings
        const values: Array<string> = this.ticks.map((tick) => tick.mark);
        //
        //Truncate the list to 10 cases
        const truncates: Array<basic_value> =
          values.length > 10 ? values.slice(0, 10) : values;
        //
        //Add the continutaion operator, if necessary
        if (values.length > 10) truncates.push("...");
        //
        //Convert to string
        tickstr = values.join(",");
      }
      //
      //Compile reporting message
      const msg: string = `zone:'${zone}',constructor:'${type}',  noticks:'${size}' <br/>ticks:${tickstr}`;
      //
      return msg;
    }
  }

  //
  //A tick is a marker used for an axis. This idea is adapted from the away a
  //graph is labeled with marks on the x-y axes which is similar to the way a table
  //is labeled (with row and column markers)
  export abstract class tick extends tabulator {
    //
    //Extend the options of a tick with an io type
    declare options: Partial<
      view_option_interface & {
        io_type: io_type;
        //
        //For controlling the io view size and number of chanaretres
        max_size: number;
        max_char_length: number;
      }
    >;

    //Redeclare the parent of a an axis so that it is not optional
    declare parent: root.axis;
    //
    //The string version of a tick depends on its mark
    get mark(): string {
      return String(this.value);
    }
    //
    constructor(
      //
      //The identifier of a tick is a basic value, depending on the source
      //of the base axis
      public value: basic_value,
      //
      //Ticks apply to both homo and hetero axes
      parent: root.axis,
      options?: view_options
    ) {
      super(parent, options);
    }
  }
}

//
//This class models a homogenous set of cells that can be accessed via a
//string-based coordinate system. NB. The zone is fully named, even though the
//namespace makes it unnceccasary, to give better debugging experience
export class homozone extends root.zone {
  //
  //The source of data that drives this homozone can be determined at construction
  // time.
  public driver: drivers.driver;
  //
  //The raw rows and column axes of this homozone. They are derived from either
  //explicit axes sources or from the implicit data source. Initially, they are
  //undefined
  public axes_raw?: coord<homo.axis | undefined>;
  //
  //The actual data to be tabulated (before it is loaded to the cells)
  public data?: obj<basic_value>;
  //
  //A homozone is a set of cells indexed by a row and column id. Cell is a
  //panel that has a td element minimum. NB. The data of a homozone shares
  //the same indexing system as the cells. See populate_shell_cells methods.
  public cells_indexed?: obj<cell>;
  //
  //The cells can alternatively be accessed using a numeric indexing system.
  //This allows us to access the cells by their row and column positions, e.g.,
  //when searching for seeds along axes
  public cells_relative?: Array<Array<cell>>;
  //
  //Use the given options to construct a homozone
  constructor(
    //If no driver is specified, then a null is assumed, so that a homozone
    //will always have a data source. A sorce is used for creating a driver; it
    //is not saved to avoid the potential problem of reusing it it attempts to
    driver_source: driver_source = null,
    //
    options?: table_options,
    //
    parent?: view
  ) {
    //
    super(options, parent);
    //
    //Create the driver from the source
    this.driver = drivers.driver.create(driver_source, this);
  }

  //Collect this as the only homozone
  *collect_homozones(dim: 0 | 1): Generator<homozone> {
    //
    yield this;
  }
  //
  //Collect the neighnouring cell given that we are on a valued axis. Such
  // neighbouring is referred to as an overlay; it has teh same coordites as the
  //refremce cell
  collect_overlaid_neighbour(ref: cell): Array<cell> {
    //
    //The overlaid cell has the same coordinates as the referemce one
    const [row, col] = ref.index;
    //
    //Get the indxed cell
    const cell: cell | undefined = this.cells_indexed?.[row]?.[col];
    //
    //Returns the overlaied cell if it exists
    return cell ? [cell] : [];
  }
  //
  //Collect the cells (along a labeld axes) that share a path with the referemce
  //cell
  collect_labeled_neighbours(ref: cell, axis: root.axis): Array<cell> {
    //
    //Starting wil an empty list of cells...
    const result: Array<cell> = [];
    //
    //...move along the axis collecting cells
    for (let i = 0; i < axis.ticks.length; i++) {
      //
      //Get the fixed relative coordindate
      const j: number = ref.relative[axis.ortho];
      //
      //Get the effective to and column coordinate to search in this hmozone
      const [row, col] = this.orientate([i, axis.dim], j);
      //
      //Retrieve the cell at the orientation coordinates;
      const cell: cell | undefined = this.cells_relative?.[row]?.[col];
      //
      //There must be a cell at teh intersection
      if (!cell)
        throw new mutall_error(
          "No cell is found at this row and column coordinates"
        );
      //
      result.push(cell);
    }
    return result;
  }

  //Returns the first tick mark value on the axis that is orthogonal to that
  // of this homozone's orientation.
  get selection_cname(): string {
    //
    //Get the axis that is perpendicular to that of this homozone
    //
    //Get the orthogonal dim (orienttaion)
    const dimortho: number = this.axes[this.orientation].ortho;
    //
    //Get the orthogonal axis
    const axisortho: root.axis = this.axes[dimortho];
    //
    //Return the first tick mark of the axis that is not hidden
    return axisortho.get_1st_mark();
  }

  //Collect cells for some specified record
  *collect_record_cells(record: record): Generator<cell> {
    //
    //Get the axis that is orthogonal to the one of this record. That is the
    //one whose cells we should trace
    const orthoaxis = this.axes[record.axis.ortho];
    //
    //Loop through the ticks of the axis
    for (const tick of orthoaxis.ticks) {
      //
      //Get the cell that is at the intersection of a path through this cell
      //and the given tick
      const [row, col] = this.orientate([record.mark, record.dim], tick.mark);
      const cell: cell | undefined = this.cells_indexed?.[row]?.[col];
      //
      //For debugging purposes, throw an error if the cell is not defined
      if (!cell)
        throw new mutall_error(
          `The cell at '${this.id}[${row}][${col}]' is not defined`
        );
      //
      //Collect the cell
      yield cell;
    }
  }

  //
  //If a panel is not transposed then its natural orientation is row wise
  get orientation(): 0 | 1 {
    //
    //Get the transposed status
    const is_transposed: boolean = this.transposed;
    //
    //Return he rowsise orientation if the homozone is not transposed
    return !is_transposed ? 0 : 1;
  }
  //
  //The onclick event causes this cell to be selected as the default behaviour.
  async onclick(cell: cell, evt?: MouseEvent): Promise<void> {
    //
    //The user can override the onclick behaviour using a table option
    const override: listener | undefined = this.search_option("onclick");
    if (override) {
      override(cell, evt);
      return;
    }
    //
    //Select the cell and its associated row; the associated column selection
    // will be added in future
    cell.select();
  }
  //
  //Show the context menu on the clicked cell
  async oncontext_menu(cell: cell, evt: MouseEvent): Promise<void> {
    //
    //The user can override the context menu behaviour using an table option
    const override: ((cell: cell, evt: MouseEvent) => void) | undefined =
      this.search_option("oncontext_menu");
    if (override) {
      override(cell, evt);
      return;
    }
    //
    //Create a choices popup
    //
    //Administer to get a menu choice
    //
    //For now though...
    //
    //Log the cell iteself
    console.log("cell=", cell);
    //
    //Log the given cell's signture that allows us to debug it. Copy and paste
    //this log and use it for conditional breaking
    console.log("this.signature===", `'${cell.signature}'`);
    //
    //Log the available choices
    console.log("available_options=", this.available_options);
  }
  //
  // On double-click, the default behavior sets this cell as the only active
  // one on the page, allowing it to enter edit mode. This method also enables
  // users to customize the event listener.
  async ondblclick(cell: cell, evt: MouseEvent): Promise<void> {
    //
    //The user can also override the double click behaviour using a table option
    const override: ((cell: cell, evt: MouseEvent) => void) | undefined =
      this.search_option("ondblclick");
    if (override) {
      override(cell, evt);
      return;
    }
    //
    //Change the active cell. There is only one in the entire document
    //
    //Get the active from the this document
    const currents = this.document.querySelectorAll(".current");
    //
    //Clear the active cell highlight
    currents.forEach((s) => (<HTMLElement>s).classList.remove("current"));
    //
    //Mark the given cell as active, opening it in edit mode
    cell.td.classList.add("current");
    //
    //Select the cell and its associated row
    cell.select();
    //
    //Transfer focus to the cell's io, if the io is defined
    if (cell.io) cell.io.focus();
  }

  //The axes of this zone are the ones computed from merged (if it has a parent
  //heterozone) or and raw version if no parent. This is the version that is
  //used for driving axis-based functions of this homozone, e.g., determining
  //the size of the homozone
  get axes(): coord<root.axis> {
    //
    //Define the desired outcome
    let axes: coord<root.axis | undefined>;
    //
    //If this homozone is not a root, then return the (parent) merged axes
    //and its paremt is a heterozone...
    if (!this.is_root() && this.parent && this.parent instanceof heterozone) {
      //
      //Get the merged axes of the parent (which must be defined by now).
      //A non-root axis must have a parent
      const axes_merged: coord<Array<hetero.axis>> | undefined =
        this.parent!.axes_merged;
      //
      //Extract the pair of axes that matches this homozone. That depends
      //on her position in the parent plan. The position must be known by
      //now, otherwise its an error
      const [r, c] = this.position!;
      //
      //Extract the deeired axes from either the merged versions or use the
      //the raw ones if the merged version is not yet ready
      axes = axes_merged
        ? //
          //Extract the desired pair of axes from the merged version, if its valid
          [axes_merged[0][r], axes_merged[1][c]]
        : //
          //Or extract them from the raw axes as teh merged ones are not
          // yet available. This typically happend when need to access the
          // axes of a homozone that is part of a heterzone. See the case
          // for driver_axis
          [this.axes_raw?.[0], this.axes_raw?.[1]];
    }
    //
    //As this homozone is a root, then use her raw axes as the desired
    //ones
    else {
      //
      //The raw axes and its components must be by now
      axes = [this.axes_raw?.[0], this.axes_raw?.[1]];
    }
    //
    //Make the final axes definite if necessary
    const axes2: coord<root.axis> = [
      this.definitise(axes[0], 0),
      this.definitise(axes[1], 1),
    ];
    //
    //Return the result
    return axes2;
  }

  //To definitise an axis is to convert undefined axis to the simplest axis
  //possible
  definitise(axis: root.axis | undefined, dim: 0 | 1): root.axis {
    //
    //Return the axis if it is defined
    if (axis) return axis;
    //
    //The axis is undefined; define a simple one
    const source: axis_source = { type: "values", values: ["0"] };
    //
    //Create a new axis of type value and one tick of value 0.
    return new homo.axis(dim, source, this);
  }

  //Sets the size of a homozone as the number of ticks in the axes
  init_size(): void {
    //
    //The axes sub-system must have been initialized by now.
    this.size = [
      //
      //If the size is not defined, set it to 0
      this.axes![0]!.ticks!.length ?? 0,
      this.axes![1]!.ticks!.length ?? 0,
    ];
  }

  //
  //Initialize the driver of this homozone by compiling its data source
  //specifications (and transposing it if necessary)
  async init_driver(): Promise<void> {
    //
    //Initialize the driver, in particular the axes of the driver. NB. The
    //driver data is not part of this initialization. It is done at a later
    // stage
    await this.driver.init();
    //
    //Transfer the options of the driver to the parent homozone so that they
    // are accessible to the view hierarchy. Those of the homozone will overwrite
    //those of the driver -- if there is a conflict
    this.options = { ...this.driver.options, ...this.options };
  }

  //Initialize the children of a zone. Nb. A homozone has no children, so
  //there is nothing to initialize
  async init_children(): Promise<void> {}

  //Initialize the axes of this homozone either directly from the user provided
  //options or from the axe's source specification.
  async init_axes(): Promise<void> {
    //
    //Initialize the row and column axis independently. NB. _raw suffix is
    //added to avoid confusion with the (get) axes property
    this.axes_raw = [await this.init_axis(0), await this.init_axis(1)];
    //
    //If transposing is required, then interchange the axis
    if (this.transposed) this.transpose();
  }

  //Transposing a homozone is about interchanging the row and column axes
  transpose(): void {
    //
    this.axes_raw = [this.axes_raw?.[1], this.axes_raw?.[0]];
  }

  //Use the driver to initialize the data in this homozone, if the driver is
  // defined. It may not be (like the case of a glade)
  async init_data(): Promise<void> {
    //
    //Discontinue if the driver is not defined as there can be no data to initialize
    if (this.driver === undefined) return;
    //
    //Use the driver to get its data and save it in this homozone
    const data: obj<basic_value> = await this.driver.get_data();
    //
    //Transpose the data if required
    this.data = this.transposed ? this.transpose_obj(data) : data;
  }

  //Initialize/set the axis of this homozone either directly from the user's
  //specifications or indirectly from the homozone's driver (data)
  async init_axis(dim: 0 | 1): Promise<homo.axis | undefined> {
    //
    //Get the axis source, either directly from user specs, or indirectly
    //from the driver source
    const source: axis_source = this.get_axis_source(dim);
    //
    //Use the source to create an axis. The construction parameters are:-
    // (dim:0|1, source:axis_source, parent:zone)
    const Axis: homo.axis = new homo.axis(dim, source, this);
    //
    //Complete the construction of the created axis putting on the ticks
    await Axis.init();
    //
    return Axis;
  }

  //
  //Get the axis source, either directly from user specs, or indirectly
  //from the driver source. It must exist (unless this is a glade)
  get_axis_source(dim: 0 | 1): axis_source {
    //
    //Get the direct axis source from user specs options in the options that
    //that match this dimension
    const direct: axis_source | undefined = this.options?.axes?.[dim]?.source;
    //
    //If the direct axis source is found, return it
    if (direct) return direct;
    //
    //Get the indirect axis by looking at the data driver of this homozone.
    //It must be present
    const drvsource: axis_source | undefined = this.driver.axes_source?.[dim];
    //
    //For this version, an axes source must exist, since we have ensured that
    //every homozone must have a data driver (which must have a source). If
    // the source does not exist, then the driver was not initialilized -- and
    //its an error
    if (!drvsource) {
      //
      //Verify that the source was indeed not found
      if (!this.driver.axes_source)
        throw new mutall_error(`Axis source not found on driver`, this.driver);
      //
      //The source was found, but it is undefined for the given dimension
      throw new mutall_error(
        `Axis source for dimension ${dim} not found on driver`,
        this.driver
      );
    }
    return drvsource;
  }
  //
  //Returns the header/leftie margins of this homozone as new homozones; the
  //options allow us to customise a margin independent of the underlying
  //homozone
  get_header(options?: table_options): homozone {
    return this.get_margin(1, options);
  }
  get_leftie(options?: table_options): homozone {
    return this.get_margin(0, options);
  }

  //Returns a margin homozone, derived from axes tick marks
  get_margin(dim: 0 | 1, options?: table_options): margin {
    //
    //This is the homozone to be associatew with this margin
    const homozone: homozone = this;
    //
    //We dont bother to define the parent of the margin, as we don't know which
    //heterozone this margin will be part of.
    const parent: view | undefined = undefined;
    //
    //Compile the margin zone
    return new margin(homozone, dim, options, parent);
  }

  //
  //Override the id of a homozone, if it is provided
  get id(): string {
    //
    //Let i be the id provided during construction of this zone
    const i: string | undefined = this.options?.class_name;
    //
    //Return i if available; otherwise use the default version
    if (i) return i;
    //
    //Compute the id from that of a parent and its position;
    //
    //If a homozone has a position, use it (and teh id of its perent) to
    //formulate an id
    if (this.position && this.parent && this.parent instanceof heterozone) {
      //
      return `${this.parent.id}[${this.position[0]}, ${this.position[1]}]`;
    }
    //
    //At this point, Im anable to determine the id of the homozone. Its
    //probably the only one. Retirn its constructor name
    return this.constructor.name;
  }

  //Collect homozones encountered when the given cell traverses this zone in
  //in the given direction. Heterozne should override this for a richer
  //experience
  *traverse(
    cell: grid,
    dim: 0 | 1
  ): Generator<{ homozone: homozone; i: number }> {
    //
    //The cell must be in this homozone.
    if (cell.parent !== this)
      throw new mutall_error(`Cell expected in this homozone`, cell, this);
    //
    //This method is only valid for homozones
    yield { homozone: this, i: 0 };
  }

  //Initialize the origins of all this zone
  init_origins(): void {
    //
    //Now set the origin of this cell. The wway we do it is the same for
    //all the zones - homozone or heterozone
    this.origin = [this.init_origin(0), this.init_origin(1)];
  }

  //
  //Create this homozone's content cells and map them to the tds of the HTML
  //table element. Two structures are initialized simultaneously:
  //- cells indexed by text keys borrowed from the axis seeds
  //- cells indexed by numeric values, so that teh cells can be accessed using
  //a numeric row/column coordinate system
  async init_cells(): Promise<void> {
    //
    //Start with empty cells (for relative and indexed) scenarions.
    //NB., obj<cell> is shown here in its fully expanded form.
    const cells_indexed: { [r: string]: { [c: string]: cell } } = {};
    const cells_relative: Array<Array<cell>> = [];
    //
    //Loop through all the design rows of this homozone
    for (let r = 0; r < this.size![0]; r++) {
      //
      //Get the row index that matches position r in the axis seeds. The
      //seeds must be known by now
      const row: string = this.axes[0]!.ticks![r].mark;
      //
      //Create a newshell row
      cells_indexed[row] = {};
      cells_relative[r] = [];
      //
      //Loop through all the design columns of this homozone to build the
      //cell for row/col this position
      for (let c = 0; c < this.size![1]; c++) {
        //
        //Get the column index that matches position c in the axis seeds
        //(The seeds must be known by now)
        const col: string = this.axes[1]!.ticks![c].mark;
        //
        //Create the cell
        const cell: cell = await this.create_cell([r, c], [row, col]);
        //
        //Save the cell into the result
        cells_indexed[row][col] = cell;
        cells_relative[r][c] = cell;
        //
        //Initialize the cell such that users can override the process
        //from a homozone view point. The is actually a stem cell
        await this.init_cell(cell);
      }
    }
    //
    //Save and return the result
    this.cells_indexed = cells_indexed;
    this.cells_relative = cells_relative;
  }

  //Initialize a cell from this homozone's view point. User can override this
  //method to do customise their desired behaviour
  async init_cell(cell: cell): Promise<void> {
    //
    //Set the cell classes, click events and principal seeds
    await cell.init();
    //
    //Create an io system using either user preferences or seeding
    //of the axes
    cell.io = await cell.init_io();
    //
    //Set teh cell's io value
    this.init_io_value(cell);
    //
    //Use the io to support listening of on blur and on change events
    for (const listener of cell.io.listeners) {
      //
      //Add the onchange event listener to the cell
      listener.addEventListener("change", async (evt: Event) =>
        this.onchange(cell, evt)
      );
      //
      //Add the onchange and onblur event listeners to the cell
      listener.addEventListener("blur", async (evt: Event) =>
        this.onblur(cell, evt)
      );
    }
  }

  //A homozone matches the update mode for data display. The initial value of
  //a cell io is unimportant. The creator homozone will overide this method
  //to display default values for cells
  init_io_value(cell: cell): void {}
  //
  //The stub for programming cell changes across cells
  async onchange(cell: cell, evt?: Event): Promise<void> {}
  //
  //This event signals end of modifying a cell when the write event is called
  async onblur(cell: cell, evt?: Event): Promise<void> {
    //
    //Handling of this event does not make sense in edit mode. Such a cell
    //is marked updateable or open
    if (
      cell.td.classList.contains("updateable") ||
      cell.td.classList.contains("open")
    )
      return;
    //
    //Now save the cell's value to the database, to effect the update
    const ok: boolean = await cell.write();
    //
    //If successful, revert the cell to normal, i.e., non-edit mode and refresh
    //the zone. The user can skip the refresh if they so wish
    if (ok) {
      //Revert this cell to normal (non-edit) mode by removing the current
      //class
      cell.td.classList.remove("current");
      ////
      //Refresh the root zone if writing was successful, unless the user
      //declines the offer
      if (this.search_option("refresh_after_write")) cell.refresh();
    }
  }

  //Create a cell that matches some td in the underlying HTML table. The exact
  //position is given by the coordinates that are relative to the parent
  //homozones origin
  async create_cell(
    relative: coord<number>,
    index: coord<string>
  ): Promise<cell> {
    //
    //Destructure the relative coordinates of this cell within this homozone
    const [r, c] = relative;
    //
    //Get the underlying table that is behind this homozone
    const table: HTMLTableElement = this.get_html_table();
    //
    //Destructure the origin; the origin must be set
    const [r0, c0] = this.origin!;
    //
    //Let r1 and c1 be the absolute coordinates of the required cell, i.e.,
    //the origin plus the offsets
    const r1: number = r0 + r;
    const c1: number = c0 + c;
    //
    //Get the tr at the absolute row index
    const tr: HTMLTableRowElement | undefined = table.rows[r1];
    //
    //It is an error if the table row cannot be found
    if (tr === undefined)
      throw new mutall_error(
        `No tr found in row index ${r1} of this zone '${this.id}'`
      );
    //
    //Get the td at the absolute colum index
    const td: HTMLTableCellElement | undefined = tr.cells[c1];
    //
    //It is an error if the table cell cannot be found
    if (td === undefined)
      throw new mutall_error(
        `No td found in row index ${r1} col ${c1} of this zone '${this.id}'`
      );
    //
    //Now use this td to construct a the richer stem cells which have the
    //functinality of a grid and of a cell
    const Cell = new cell(td, this, relative, index);
    //
    //Initialize the cell, thus completing the asynchronous processes
    await Cell.init();
    //
    //Return  the cell
    return Cell;
  }

  //
  //Display data by transferring it from this homozone's driver to the
  //tabulation cells' two properties:-
  //- value (to keep track of original data version) and
  //- io.value (to track the edited version)
  //You can test whether changes have occued by comparing the two
  async display_data(): Promise<void> {
    //
    //Discontinue if there is no data to show
    if (!this.data) return;
    //
    //If there is data to show, then the cells where to show the data must be
    //defined. Its an error if this is not the case
    if (!this.cells_indexed)
      throw new mutall_error(
        `Indexed cells not defined. There's a problem of initializing cells`
      );
    //
    //Loop through the rows of the driver to get data columns
    for (const r in this.data) {
      //
      //Get the row (of cells) that matches this one; take care that there
      //may be a mismatch between the cells_indxed and the data -- a sign of
      //some fundamental problem somewhere. Report the problem (and return
      //undefined) if there is one
      const row: { [col: string]: cell } | undefined = this.get_row(r);
      //
      // Do not continue the loop if there is an issues. It will already
      //have been reported
      if (row === undefined) continue;
      //
      //Get the r'th row of data
      const data_row: { [col: string]: basic_value } = this.data[r];
      //
      //Loop thru all the columns of the data row, displaying each one of hem
      for (const c in data_row) {
        //
        //Get the indexed cell; consider the fact that it may be missing
        //so you dont get a runtime error
        const cell: cell | undefined = this.cells_indexed[r]?.[c];
        //
        //The cell indexed cell must exist; its an error it it does not
        if (cell === undefined)
          throw new mutall_error(
            `Indexed cell ['${r}']['${c}'] canot be found; the column '${c}' is the problem`
          );
        //
        //Get the basic value at the c'th column in the r'th row
        const value: basic_value = data_row[c];
        //
        //Set the cells io value.
        this.display_value(cell, value);
      }
    }
  }

  //Get the r'th row of the indxed cells object. There may be a mismatch
  // between the cells_indxed and the data -- a sign of some fundamental zone
  // structre problem somewhere. Report the problem (and return undefined) if
  // there is one
  get_row(r: string): { [col: string]: cell } | undefined {
    //
    //Get the r'th row of indxed cells that should match the r'th row of the
    //data to be tabulated.
    const row: { [col: string]: cell } | undefined = this.cells_indexed?.[r];
    //
    //Return it if valid
    if (row) return row;
    //
    //There is a cells_indexed/data mismatch problem. Report it
    //
    //Compile the error message
    const msg = `Row '${r}' of the indexed cells (to match the same in the available data) cannot be found`;
    //
    //Compile the display data error
    const err: error.tabulator_error = {
      //
      //The error ttype is known as the display_data error
      type: "display_data",
      //
      //Th error ocurred in this homozone
      homozone: this,
      //
      //Compile the exact error message, referencing the r'th row
      err: new Error(msg),
    };
    //
    //Report the display_data error
    error.handler.current.save(err);
    //
    //Return the indefined row
    return undefined;
  }

  //
  //Set the cell's value. This method can be overriden to implement a user defined
  //version
  public display_value(cell: cell, value: basic_value): void {
    //
    //Get the cells io.
    const io: io | undefined = cell.io;
    //
    //Its an error if the cell's io is not defined by now
    if (!io)
      throw new mutall_error(
        `This cell's io should be defined by this time`,
        cell,
        value
      );
    //
    //Set the io's value
    io.value = value;
    //
    //Now fire the oncell_init event to allow useres to modify values that
    //were read from teh datan source
    this.search_option("oncell_init")?.(cell);
  }

  //To mark this homozone, for debugging purposes, is to paint its background red
  mark(yes: boolean): void {
    //
    //Clear all the last marked homozone
    this.document
      .querySelectorAll(".homozone")
      .forEach((td) => td.classList.remove("homozone"));
    //
    //Mark cells in the along the row and column directions
    //
    //Visiti all the cells and mark them with the givenMove along the one edge
    for (let r = 0; r < this.size![0]; r++)
      for (let c = 0; c < this.size![1]; c++) {
        //
        //Get the cell to mark
        const cell: grid = this.cells_relative![r][c];
        //
        //Mark the cell, if yes; otherwise remove it
        if (yes) cell.td.classList.add("homozone");
        else cell.td.classList.remove("homozone");
      }
  }
}

//Namespace for the commponents needed to make a homozone
export namespace homo {
  //The axis of a homozone is different from that of a heterozone in that the
  //ticks are derived from the user specifications
  export class axis extends root.axis {
    //
    //The  type of an axis
    public type?: "values" | "seeds";
    //
    //Redefine the parent to emphasize homozone
    declare parent: homozone;
    //
    //Redefine the ticks of a homoaxis to that they are all homoticks
    declare ticks: Array<homo.tick>;
    //
    constructor(
      //
      //The direction/alignment of the axis: 0=vertical/rowsise; 1 = horizontal/col
      dim: 0 | 1,
      //
      //The user specs, which are later compiled into ticks during initializaion
      public source: axis_source,
      //
      //The parent of a homo axis is a homozone, not just an zone
      parent: homozone
    ) {
      super(dim, parent);
    }

    //Returns the type of a homozxis, if it is known; otherwise it is an error
    get_type(): "seeds" | "values" {
      //
      if (this.type) return this.type;
      //
      throw new mutall_error("Type of homo-axies not known");
    }

    //Create and initialize a homotick with the given mark. NB. Initialization
    //is to ensure that the options take effect. For instance, the hidden option
    //is transmitted to the equivalent tick property
    create_tick(value: basic_value, options?: view_options): homo.tick {
      //
      //Create a tick
      const tick = new homo.tick(value, this, options);
      //
      //Initialize the tick
      tick.init();
      //
      //Return the tick
      return tick;
    }

    //An homoaxis is hidden if it is specified as hidden through the options
    //specified at the homozone level -- in addition to the usual hidden option
    get hidden(): boolean {
      //
      //Override the general procedure for determining hidding status by
      //considering this axis (rather than general view)
      //
      //Get the axies-specific hiding option
      const options: [row?: axis_options, col?: axis_options] | undefined =
        this.search_option("axes");
      //
      //Get the axies options
      const axis_options: axis_options | undefined = options?.[this.dim];
      //
      //Ignore the override if there are no axis options
      if (!axis_options) return super.hidden;
      //
      //Get teh user preferred hoding status
      const hidden: boolean | undefined = axis_options?.hidden;
      //
      //If there is no presence, then you cannot override
      if (!hidden) return super.hidden;
      //
      //Return the user preference
      return hidden;
    }

    //To initialize a homo axis is to create its ticks; then to compile its options
    async init(): Promise<void> {
      //
      //Compile the axis source to standardise the axis type, ticks and options
      const { ticks, type, options } = await homo.axis.standardise_axis_source(
        this.dim,
        this.source,
        this
      );
      //
      //Set the standard properties of homo axis: ticks, type and options
      this.ticks = ticks;
      this.type = type;
      this.options = options;
      //
      //Import the options from the driver's axis source, if the type of
      //axis values is 'values' (rather than seeds)
      //
      //Get the axis source
      const axs: axis_source | undefined =
        this.parent.driver?.axes_source?.[this.dim];
      //
      //Set the axis options if...
      if (
        //..the axis is defined
        axs &&
        //...and it is not an array of simple values
        !Array.isArray(axs) &&
        //
        //...and it is of type values
        axs.type === "values" &&
        //
        //..and has options
        axs?.options
      )
        //...then copy the options to this axis
        this.options = axs.options;
      //
      //Initialize the ticks, so that if any of the options referencees a
      //database name or subject, they are compiled into database and aliased
      //columns and made accessible from the view hierarchy
      for (const tick of this.ticks) await tick.init();
    }
    //
    //Returns the driver matrix  of this axis
    async get_matrix(): Promise<obj<basic_value>> {
      //
      //Get the values of this axis
      const values: Array<basic_value> = this.ticks!.map((tick) => tick.mark);
      //
      //Compose the driver source specification
      const drvsource: driver_source = { type: "indexed_array", values };
      //
      //Create the source driver
      const source = drivers.driver.create(drvsource, this.parent);
      //
      //Initialize the source so that the matrix get defined
      await source.init();
      //
      //Get the driver matrix
      const matrix: obj<basic_value> = await source.get_data()!;
      //
      //Return the result, transposing for the case of rows
      return this.dim === 1 ? matrix : source.transpose_obj(matrix);
    }

    //Standardise the various axis sources (arrays, values, labels and axis)
    // to the a common interface comprising of axis_type, ticks and options
    // 2 major axis types: values and seeds
    static async standardise_axis_source(
      dim: 0 | 1,
      source: axis_source,
      parent: homo.axis
    ): Promise<{
      type: axis_type;
      ticks: Array<homo.tick>;
      options?: table_options;
    }> {
      //
      //If the source is provided as a simple array, then return an array
      //of ticks without options
      if (Array.isArray(source)) {
        //
        //This a values type axis
        const type: axis_type = "values";
        //
        //Map the source values to tick values
        const ticks: Array<homo.tick> = source.map((value) =>
          parent.create_tick(value)
        );
        //
        //Compile the desired result without options
        return { ticks, type };
      }
      //
      //When the source is explicitly supplied, deal with it
      switch (source.type) {
        //
        //When the ticks values are basic values of the same subjects then
        //create ticks to match
        case "values":
          //
          //Destructure the axis source
          const { values, options } = source;
          //
          //Create a value axis interface, by mapping the values to ticks
          return {
            ticks: values.map((value) => parent.create_tick(value, options)),
            type: "values",
            options,
          };
        //
        //When the values are metadata of database columns then create ticks
        //with different labels
        case "seeds":
          //
          //Destructure the source metadata
          const metadatas: Array<metadata> = source.metadatas;
          //
          //Convert the metadata to ticks
          const ticks = metadatas.map((metadata) => {
            //
            //Add the metadata subjects to the options, to create tick
            //options
            const new_options: table_options = {
              labels: metadata.labels,
              ...metadata.options,
            };
            //
            //Create a tick whose value is the same as the mark (as
            //opposed to ticks whose values are null).
            const value: basic_value = metadata.fname;
            //
            //Construct the tick on the parent axis
            const Tick = parent.create_tick(value, new_options);
            //
            return Tick;
          });
          //
          //Return the ticks
          return { ticks, type: "seeds" };
        //
        //When the values depend on the underlying homozone
        case "axis":
          //
          //The Destructure the source
          const { homozone } = source;
          //
          //The dimension of the requested homozone must match that of the
          //request
          if (source.dim !== dim)
            throw new mutall_error(
              `The requested dimension ${dim} must match that of he axis ${source.dim}`
            );
          //
          //Initialise the homozone's driver source and axes
          await homozone.init_driver();
          await homozone.init_axes();
          //
          //Get the relevant axis
          const Axis: homo.axis | undefined = homozone.axes_raw![dim];
          //
          //The axis cannot be created if the axis source is not known
          if (!Axis)
            throw new mutall_error(
              `Without an axis source, we cannot create the object`
            );
          //
          //Get the source of the axis
          const source2: axis_source = Axis.source;
          //
          //Use the source to create the desired axis
          const result: {
            ticks: Array<homo.tick>;
            type: axis_type;
            options?: view_options;
          } = await this.standardise_axis_source(dim, source2, parent);
          //
          //Return the result
          return result;
      }
    }
    //
    //Mark this homoaxis on request. This is needed for debigging and training
    //purposes
    mark(yes: boolean): void {
      //
      //Clear all the last marked axis
      this.document
        .querySelectorAll(".axis")
        .forEach((td) => td.classList.remove("axis"));
      //
      //Get the parent homozone
      const homozone: homozone = this.parent;
      //
      //Get the direction of the axis
      const dim = this.dim;
      //
      //Define the cell's row and column coordinates
      let r: number;
      let c: number;
      //
      //Mark all the parent cells along the
      for (let i = 0; i < homozone.size![dim]; i++) {
        //
        //Set r and c, depedning on direction of flow
        if (dim === 0) {
          r = i;
          c = 0;
        } else {
          c = i;
          r = 0;
        }
        //
        //Get the axis cell
        const cell: grid = homozone.cells_relative![r][c];
        //
        //Add or remove the axis class
        if (yes) cell.td.classList.add(`axis`);
        else cell.td.classList.remove(`axis`);
      }
    }
  }

  //Support for management of axes' ticks
  export class tick extends root.tick {
    //
    //Redefine parent to a homo-axis
    declare parent: homo.axis;
    //
    constructor(
      value: basic_value,
      parent: homo.axis,
      options?: table_options
    ) {
      super(value, parent, options);
    }
    //
    //Override option simplification to take cae of ticks, cells and axes options
    simplify_option(option: option): Array<option> {
      //
      //The simplification depnds on the type of option key
      switch (option.key) {
        //
        case "ticks":
          return this.simplify_ticks(option);
        default:
          return [option];
      }
    }
    //
    //Simplify complex tick options to basic ones, if applicable.
    simplify_ticks(option_in: option): option[] {
      //
      //Destructure the option to reveal its values
      const { value, source } = option_in;
      //
      //Cast the value the ticks option.
      const tick_options: table_options["ticks"] | undefined = <
        table_options["ticks"]
      >value;
      //
      //If the value is not defined, then there must be an issue
      if (!tick_options)
        throw new mutall_error(
          `Unexpected data type; where an array of tick options was expected`
        );
      //
      //Get the tickmark to use
      const mark: string = this.mark;
      //
      //Get the tick_option that matches this tick
      const tick_option: tick_option | undefined = tick_options?.find(
        (toption) => toption[0] === mark
      );
      //
      //If a tick option is not available, Return an empty list if there is no match
      if (!tick_option) return [];
      //
      //Get the tick's options that should now be split into simpler more basic
      // components
      const table_options: table_options = tick_option[1];
      //
      //Package the table options into a view_option source pair
      const view_options: Array<[source: view, view_options]> = [
        [source, table_options],
      ];
      //
      //Split the table_options into the simpler options. This tick is the
      //reference
      const simple_options: Array<option> = source.split_options(view_options);
      //
      return simple_options;
    }
    //
    //A homo-tick is hidden if there is:-
    //- a hiding option targeting this tick or
    //- a more general hiddent option -- the one being overriden by thos method
    get hidden(): boolean {
      //
      //Override the general procedure for determining hidding status by
      //considering this tick (rather than general view)
      //
      //Get the ticks-specific hiding option
      const options: Array<tick_option> | undefined =
        this.search_option("ticks");
      //
      //If there are no ticks options, then we cannot override this method
      if (!options) return super.hidden;
      //
      //Find a tick whose mark matches this one
      const tick_option: tick_option | undefined = options.find(
        (option) => option[0] == this.mark
      );
      //
      //Ignore the override if there is no tick that matches this one
      if (!tick_option) return super.hidden;
      //
      //Get any hiden option from tthe tick otions
      const hidden: boolean | undefined = tick_option[1].hidden;
      //
      //If there is is noe, the you cannot skip the override
      if (!hidden) return super.hidden;
      //
      //Return the user defined preference
      return hidden;
    }

    //
    //To initialize a tabulator is to compile its simple and tick label options
    // into pollinators
    async init(): Promise<void> {}
  }
}

//The namespace for hetero-related elements: zones,axes, ticks
export namespace hetero {
  //
  //The axis of a heterozone is derived by merging those of its children at the
  //the i'th position
  export class axis extends root.axis {
    //
    //Redefine the parent of a hetero-axis to be a heterozone
    declare parent: heterozone;
    //
    declare ticks: Array<hetero.tick>;
    //
    //List of homozone axes that make up this heterozone version
    public homoaxes: Array<homo.axis>;
    //
    //Position is that of the child homozone in the heterozone's plan in the
    //direction parallel to dim
    constructor(dim: 0 | 1, parent: heterozone, public position: number) {
      super(dim, parent);
      //
      //Collect the homozone axes that constitute members of this axis
      this.homoaxes = this.collect_homoaxes();
      //
      //Use the collection homo axes to construct the ticks
      this.ticks = this.create_ticks();
    }

    //Returns the type of ths axis. All the homoaxis must be of th same type
    get_type(): axis_type {
      //
      //Collect all the types of homoaxes that make uo this one
      const alltypes: Array<axis_type | undefined> = this.homoaxes.map(
        (axis) => axis.type
      );
      //
      //Collect only the defined cases
      const types = alltypes.filter((type) => type !== undefined);
      //
      //The list must not be empty
      if (types.length === 0)
        throw new mutall_error("No axis type is found for this homozone");
      //
      //It is an error if there is more than 1
      if (types.length > 1)
        throw new mutall_error("More that one different type of axis is found");
      //
      //Return the only type; it must be an axis_type
      return <axis_type>types[0];
    }

    //To initialize a tabulator is to compile its simple and tick label options
    // into pollinators
    async init(): Promise<void> {}

    //In addition to the view hidding, if any of the axis homoaxis is
    //hidden, then this one is also hidden
    get hidden(): boolean {
      //
      //Check the usual hidden status
      if (super.hidden) return true;
      //
      //Handle the special case
      return this.homoaxes.some((homoaxis) => homoaxis.hidden);
    }

    //Create a heterotick with the given mark and no members; then initialize it
    create_tick(
      mark: basic_value,
      original_options?: view_options
    ): hetero.tick {
      //
      //Use the tick options specified at the homozone level to expand the
      //original/incoming  options
      const field_options: view_options | undefined =
        this.get_field_options(mark);
      //
      //Expand the original tick options with the field ones
      const expanded_options: view_options = {
        ...(original_options ?? {}),
        ...(field_options ?? {}),
      };
      //
      //Create the tick
      const tick = new hetero.tick(mark, [], this, expanded_options);
      //
      //Initialize the tick so that the options can take effect
      tick.init();
      //
      //Return the tick
      return tick;
    }

    //Use the tick options specified at the homozone level to expand the
    //original/incoming  options
    get_field_options(mark: basic_value): view_options | undefined {
      //
      //Get the ticks specified at teh homozone level
      const ticks: Array<tick_option> | undefined = this.search_option("ticks");
      //
      //Discontinue if there are none
      if (!ticks) return undefined;
      //
      //Find the tickmark that matches this one
      const result: tick_option | undefined = ticks.find(
        (m) => String(m) === String(mark)
      );
      //
      //Discontine if the tocks info is not available
      if (!result) return;
      //
      //Destructure the result, ignoring the mark
      const options = result[1];
      //
      //return teh veiw options
      return options;
    }

    //Create ticks for this heterozone axis by merging the homaxes members
    create_ticks(): Array<hetero.tick> {
      //
      //Start with an empty result of heterozone ticks
      const result: Array<hetero.tick> = [];
      //
      //Go through all the homozone axes associated with this hetero axis
      for (const homoaxis of this.homoaxes) {
        //
        //Merge the homo axis ticks with the result; the ticks of a homaxis
        //must be set by now
        for (const homotick of homoaxis.ticks!) {
          //
          //Search the result for a heterotick that matches the homotick.
          //For now the matching wil be a simple equality of the tick marks
          let found: hetero.tick | undefined = result.find(
            (heterotick) => heterotick.mark === homotick.mark
          );
          //
          //If a heterotick is found then...
          if (!found) {
            //
            //Create a new one with the same mark as the homotick. There
            //are no options and the homotick becomes the first member
            //of the heterotick
            found = this.create_tick(homotick.mark);
            //
            //Add the homotick as the member list
            found.members.push(homotick);
            //
            //Add the new heterotick to the result
            result.push(found);
          }
          //
          //Merge the found heterotick tick with the homotick
          found.members!.push(homotick);
        }
      }
      return result;
    }

    //Collect the homozone axes that are members of this heterozone axis at the
    //i'th index in the direction of perpendicular to this axis
    collect_homoaxes(): Array<homo.axis> {
      //
      //Get the direction that is perpendilar to that of this axis
      const pdim = this.dim === 0 ? 1 : 0;
      //
      //Get the index of teh size
      const jmax: number = this.parent.plan_size[pdim];
      //
      //i is fixed at
      const i: number = this.position;
      //
      //Starting with an empty list of homzone axes
      const result: Array<homo.axis> = [];
      //
      //Following this heterozone's plan, visit all the child zones in the given
      // direction at the i'th index where i is either a row or column number
      //depending on given direction). If the direction is vertical, i,j is
      //the location of the zone whose axis is to be merged with the result and
      //vive versa
      for (let j = 0; j < jmax; j++) {
        //
        //Define the row and column indices
        let row: number;
        let col: number;
        //
        //Determine the row and col indexes. In the 0 dimension, i is a row
        //and j is the column
        if (this.dim === 0) {
          row = i;
          col = j;
        }
        //
        //Else vice versa
        else {
          row = j;
          col = i;
        }
        //
        //Get the axis of the indexed homozone
        //
        //Get the zone at the intersectuon of i and j
        const zone: root.zone | undefined = this.parent.plan![row][col];
        //
        //This version does not know how to merge zones other than homozones
        if (!(zone instanceof homozone))
          throw new mutall_error(
            `Unable to merge this zone with the others`,
            zone,
            result
          );
        //
        //Get the axis to merge
        const axis: homo.axis | undefined = zone.axes_raw?.[this.dim];
        //
        //Skip the zone if the desired axis is not defined
        if (!axis) continue;
        //
        //Collet the result
        result.push(axis);
      }
      //
      return result;
    }
  }

  //The tick of a heterozone is a congromelate of homo.ticks
  export class tick extends root.tick {
    //
    //Redefine parent to a hetero-axis
    declare parent: hetero.axis;
    //
    //Mmebers are homoticks that make up this  tick
    constructor(
      value: basic_value,
      public members: Array<homo.tick> = [],
      parent: hetero.axis,
      options?: view_options
    ) {
      super(value, parent, options);
    }
    //
    //If any (homotick) member of a a hetero axis is hidden, then the joint
    //tick is also hidden
    get hidden(): boolean {
      //
      //If the hidden option is set, then look no further
      if (super.hidden) return true;
      //
      //In addition.....
      return this.members.some((tick) => tick.hidden);
    }

    //To initialize a tabulator is to compile its simple and tick label options
    // into pollinators
    async init(): Promise<void> {}
  }
}

//A heterozone models a container for other zones, e.g., homozones and other
//heterozones. The zone is fully named, even though the
//namespace makes it unnceccasary, to give better debugging experience
export class heterozone extends root.zone {
  //
  //A flat list of all the zones in the layout plan of a heretozone. A homozone
  //has no children;
  public children?: Array<root.zone>;
  //
  //The axes of this heterozone, that are shared by her children, both in the vertical
  //and horizontal dimensions
  public axes_merged?: coord<Array<hetero.axis>>;
  //
  constructor(
    //
    //The plan of a heterozone is defined as a balanced double array of other
    //zones -- the children. The definition of a plan can be defferd until
    //when teh heterozone is initialized. This is important when we need
    //to extend a hereozone so that the plan is defined after the  extension
    //is created. Example, see the extension sample.
    public plan?: plan,
    //
    options?: table_options,
    //
    //In general, the parent of a heterozone is a view
    parent?: view
  ) {
    //
    super(options, parent);
    //
    //Save this heterozone in a collection, so we can reference it later,
    //e.g., during collection of seeded values, or other
    //user defined processing
    heterozone.collection.push(this);
  }

  //Use teh merged axes to collect the zones implied by this dim direction
  *collect_homozones(dim: 0 | 1): Generator<homozone> {
    //
    for (const zone of this.axes_merged![dim]) {
      //
      //Only homozones are considered
      if (!(zone instanceof homozone)) continue;
      //
      yield zone;
    }
  }

  //Collect cells for some specified record
  *collect_record_cells(record: record): Generator<cell> {
    //
    //Get the size of the plan in the direction perpendicular/orthogonal
    //  to the dimension of the record
    const size: number = this.plan_size[record.axis.ortho];
    //
    //Loop throw all the zones along this path
    for (let i = 0; i < size; i++) {
      //
      //Get the plan coordinates of of some zone
      const [row, col] = this.orientate([record.j, record.dim], i);
      //
      //Get the zone in this plan position
      const zone: root.zone | undefined = this.plan?.[row]?.[col];
      //
      //If the zone is not defines, then there must be an issue
      if (!zone)
        throw new mutall_error(
          `No zone found at plan position[${row}][${col}]`
        );
      //
      //Use te rceord to collect cells from the homozone
      yield* zone.collect_record_cells(record);
    }
  }

  //
  //Verify that the plan is indeed balanced. Its an error if it is not. The plan
  //is not balanced if any of its rows does not have the same nunber as the first
  //one
  verify_balanced_plan() {
    //
    //The plan is already initialized
    const plan: plan = this.plan!;
    //
    //Count the number of zones in the first row
    const count: number = plan[0].length;
    //
    //If every row has a the same number as the first column then  plan is
    //balanced
    for (let r = 0; r < plan.length; r++) {
      //
      //
      if (plan[r].length !== count)
        throw new mutall_error(
          `Unbalanced plan. Row ${r} has ${plan[r].length} zones 
                    which is different from ${count} in row 0`
        );
    }
  }

  //Initialize the origins of all this zone's children; then that of the self
  init_origins(): void {
    //
    //Initialize the origins of the children
    for (const child of this.children!) child.init_origins();
    //
    //Now set the origin of this cell. The wway we do it is the same for
    //all the zones - homozone or heterozone
    this.origin = [this.init_origin(0), this.init_origin(1)];
  }

  //Initialize the children of the homozone. Override this method to provide
  //your own layout (if you cannot define the plan during construcion)
  async init_children(): Promise<void> {
    //
    //It is an error if the plan is not set by now. The user may need to overide
    //this method to provide a plan
    if (!this.plan)
      throw new mutall_error(`Heterozone ${this.id} has no layout plan`);
    //
    //Verify that the plan is indeed balanced. It's an error if it is not
    this.verify_balanced_plan();
    //
    //Transpose the plan, if necessary
    if (this.transposed) this.transpose();
    //
    //Use this zone's layout to set the position (and parents) of the children
    //homozone in to this heterozone's plan
    this.init_children_positions();
    //
    //Flatten the double array of the plan (layout) to a single array of
    //homozones
    const children: Array<root.zone> = this.init_children_flatten();
    //
    //Save the flattened children
    this.children = children;
  }

  //Transposing a heterozone affects its plan by interchaing the row
  // and column coordinates of the plan zones
  transpose(): void {
    //
    //Save the current plan of the heterozone as old
    const old_plan: plan | undefined = this.plan;
    //
    //The old plan must be defined by the time we get here
    if (!old_plan) throw new mutall_error("Heterozone plan not defined");
    //
    //Get the old plan size
    const [rows, cols] = this.plan_size;
    //
    //Construct a new plan, starting with an empty list
    const new_plan: plan = [];
    //
    //Interchange rows and columns as you do a double loop
    for (let c = 0; c < cols; c++) {
      //
      //Create a new row
      new_plan.push([]);
      //
      for (let r = 0; r < rows; r++) {
        //
        //Get the zone child at the r/c coordinate
        const child: root.zone = old_plan[r][c];
        //
        //Save the child at the c/r position. NB. The coordinates have
        //been interchanged
        new_plan[c].push(child);
      }
    }
    //
    //Update the plan
    this.plan = new_plan;
  }

  //Initialize the data sources of all the children of of this heterozone
  async init_driver(): Promise<void> {
    for (const zone of this.children!) await zone.init_driver();
  }

  //Use the drivers to initialize the data in child  homozones of this heterozone
  async init_data(): Promise<void> {
    for (const zone of this.children!) await zone.init_data();
  }

  //
  //Construct the hetero axes by first initializing the children's axes, then
  //collecting the appropriate ones to create the hetero axis
  async init_axes(): Promise<void> {
    //
    //Initialize the axes of all the children of this heterozone
    for (const zone of this.children!) await zone.init_axes();
    //
    //Create the hetero axes by merging the homo axes; they dont need
    //initialization as they are not asynchronous
    this.axes_merged = this.create_axes();
  }

  //Create as many heteroaxes that are parallel to the homoaxes following
  //the heterozone plan
  //sizes
  create_axes(): coord<Array<hetero.axis>> {
    //
    //Define the collection of axes in the row and column dimension
    const rows: Array<hetero.axis> = [];
    const cols: Array<hetero.axis> = [];
    //
    //Create the hetero axes that are parallel to the row axes
    for (let r = 0; r < this.plan_size[0]; r++)
      rows[r] = new hetero.axis(0, this, r);
    //
    //Create heterozone axes that are parallel to the column axes
    for (let c = 0; c < this.plan_size[1]; c++)
      cols[c] = new hetero.axis(1, this, c);
    //
    //Set the merged axes
    return [rows, cols];
  }

  //The children of a heterozone is a flat list of its children
  init_children_flatten(): Array<root.zone> {
    //
    //Start with an empty list of children
    const children: Array<root.zone> = [];
    //
    //Loop throuh all the plan rows
    //
    //Loop through all the columns of a row
    //
    //Add the column (zone) to th children list
    for (const row of this.plan!) for (const col of row) children.push(col);
    //
    //Return all the children
    return children;
  }

  //The id of a homozone is teh same as css
  get id(): string {
    //
    //If the class name is provided, return it
    if (this.options?.class_name) return this.options.class_name;
    //
    //If no id provided, return the css -- pending a better option -- where
    //this zone is hooked
    let css: string | HTMLElement | undefined;
    if ((css = this.search_option("anchor")) && typeof css === "string")
      return css;
    //
    //With no other option, return ...
    return "Noname";
  }

  //The size of a heterozone, in terms of homozones
  get plan_size(): coord<number> {
    //
    //Get the number of homozones in the 0 (row) dimension
    const rows = this.plan!.length;
    //
    //Get the number of homozones in the 1 (col) dimension. Since a heterozone
    //is balanced, return the number of columns in the first row
    const cols = this.plan![0].length;
    //
    //Get the size of this heterozone, in terms of its homozone layout
    const size: coord<number> = [rows, cols];
    //
    return size;
  }

  //
  //Display data by transferring it from the children homozone drivers to
  //the tabulation cells' two properties:-
  //- value (to keep track of original data version) and
  //- io.value (to track the edited version)
  //You can test whether changes have occued by comparing the two
  async display_data(): Promise<void> {
    for (const zone of this.children!) await zone.display_data();
  }

  //Collect homozones (and the associated directions) encountered when the
  //given cell traverses this zone in some definite direction. Avoid double
  //traverse for the homozone containing the cell; it has no definite direction
  *traverse(ref: grid, dim: 0 | 1): Generator<homozone> {
    //
    //Use the cell to get the reference coordinate, i.e., where vertical and
    //horizontal paths intersect in this heterozone's plan. This defined by
    //the position of the parent homozone in this hetrozone's plan. It must
    //exist (since this heterozone is the grandparent of the given cell)
    const position: coord<number> = ref.parent.position!;
    //
    //Get direction perpendicular to dim
    const ortho: 0 | 1 = dim === 0 ? 1 : 0;
    //
    //If we move parallel to dim, then the coordinate perpendicular to that
    //direction is fixed
    const fixed: number = position[ortho];
    //
    //Search along the axis, starting from left/top to right/bottom
    //depending on direction
    for (let i = 0; i < this.plan_size[dim]; i++) {
      //
      //Decide, between the fixed and variable i, which one is the row
      //and which one is the column for retrieving a homozone.
      //
      //If the flow direction is rowsise (===0) then i is a row component,
      //Fixed must be the column
      let r: number;
      let c: number;
      if (dim === 0) {
        r = i;
        c = fixed;
      } else {
        r = fixed;
        c = i;
      }
      //
      //Use the heterozone's plan to get the indexed zone
      const Homozone: root.zone = this.plan![r][c];
      //
      //Only homozones can produce meaningful cells. Skip anything else
      if (!(Homozone instanceof homozone)) continue;
      //
      //Collect the homozone and direction of movement
      yield Homozone;
    }
  }
  //
  //Use this zone's layout plan to set the position (and parents) of the child
  //homozones
  init_children_positions() {
    //
    //Destructure the layout plan of the children; it must been initialized
    const layout: plan = this.plan!;
    //
    //Loop through the layout rows, using the numeric indexing method, to get
    //the r'th row
    for (let r = 0; r < layout.length; r++) {
      //
      //Loop through the columns of a the r'th row to get the c'th column
      for (let c = 0; c < layout[r].length; c++) {
        //
        //Get the zone referenced nt the r/c plan coordinate
        const child: root.zone = this.plan![r][c];
        //
        //Use teh r/c to set the childs position in the plan
        child.position = [r, c];
        //
        //This heterozone becomes the parent of the homozone
        child.parent = this;
      }
    }
  }

  //Initialize the size of this heterozone by first initializing the size of
  //her children followed by the computation for this size
  init_size(): void {
    //
    //Initialize the size of this heterozon'e children
    for (const zone of this.children!) zone.init_size();
    //
    //Compile and return the size of each dimension
    this.size = [this.init_size_in_dim(0), this.init_size_in_dim(1)];
  }

  //The size of a heterozone depends on the sizes of her children. It is the
  //sum  of the sizes for first row or column of the children, depending on the
  //dimension
  init_size_in_dim(dim: 0 | 1): number {
    //
    //Get the layout of this heterozone
    const layout: plan = this.plan!;
    //
    //Collect all the zones in the requested dimension
    const zones: Array<root.zone> =
      dim === 1
        ? //
          //For width/horizontal, i.e., column dimension, consider the zones
          //in the first row only
          layout[0]
        : //
          //For height/vertical, i.e., row dimension, consider all the zones
          //in the first column for all the rows
          layout.map((_, x) => layout[x][0]);
    //
    //Collect all the sizes that match the requested dimension. NB. The child
    //sizes must be set by know
    const sizes: Array<number> = zones.map((zone) => zone.size![dim]);
    //
    //Sum up all the sizes, starting from 0
    const result: number = sizes.reduce((sum, x) => sum + x, 0);
    //
    //Return the result
    return result;
  }

  //
  //Create the homozone's content cells and map them to the tds of the HTML
  //table element. Two structures are initialized simultaneously:
  //- cells indexed by text keys borrowed from the axis seeds
  //- cells indexed by numeric values, so that teh cells can be accessed using
  //a numeric row/column coordinate system
  async init_cells(): Promise<void> {
    for (const homozone of this.children!) await homozone.init_cells();
  }
}

//This class supports writing of data to a  database. The extender specify
//how to fit itself to the underlying data model
abstract class writer extends tabulator {
  //
  //
  //Write the this cell (or record it is on) to the database. This proceeds by
  //identifying a principal (isa) //seed to match it and other subordinate
  //seeds to support it. The subordinate (hasa) seeds may be based on a primary
  //key, or keys that form an indentification index of the underlying entity
  //The function returns true if successful; otherwise false
  async write(): Promise<boolean> {
    //
    //Open the nearest database (that is needed for writing data for this cell)
    //from the view hieararchy  and her ancestors (upto the 2nd generation)
    const dbase: database = await this.open_database();
    //
    //Fit this cell (or row) to the data model of the nearest database, thus
    //collecting the all the computation seeds needed for writing the io
    //value of this cell to the database. Let the saving check whether we
    //have collected sufficient seeds for writing or not.
    //NB. Every cell that is considered for writing is tagged with an error
    //until writing is successful
    const all_seeds: Array<seed> = this.fit_model();
    //
    //Remove seeds that are not viable, i.e., have meanigless (null) ovules
    const viable_seeds: Array<seed> = all_seeds.filter((seed) =>
      seed.is_viable()
    );
    //
    //Turn computation seeds to questionnaire versions, i.e., from
    //{value, col, alias} to [value, ename, cname, alias, dbase]
    const labels: Array<qlabel> = viable_seeds.map((seed) => seed.label);
    //
    //Log the labels for debugging purposes
    console.log("labels", labels);
    //
    //Load the seeds
    const result: string = await this.exec_php(
      "questionnaire",
      [dbase.name],
      "load_common",
      [labels]
    );
    //
    //Return true if the writing succeeded
    if (result === "ok") {
      //
      //Remove the red styling of the cells to indicate success
      this.document
        .querySelectorAll("td.error")
        .forEach((td) => td.classList.remove("error"));
      //
      //Indicate success
      return true;
    }
    //
    //The writing failed. Report the error
    myalert(result, labels);
    //
    return false;
  }

  //Open the nearest database (that is needed for writing data for this cell)
  //from the view hiearrchy and her ancestors (upto the 2nd generation)
  async open_database(): Promise<database> {
    //
    //Get the nearest dayabase in teh view hierarchy
    const dbase: database = await this.get_dbase();
    //
    //Ensure that databases required by this one are also open
    //
    //Collect dabase names following the foreign key columns of all the entities
    //in the opened database
    const names: Array<string> = [...this.collect_dbnames(dbase)];
    //
    //Open the 2nd generation databases; typically mutall_users
    for (const name of names) await this.open_dbase(name);
    //
    return dbase;
  }
  //
  //Fits this writer to the data model
  abstract fit_model(): Array<seed>;
  //
  //Generation of sees via self and cross prollination
  abstract pollinate(): Array<seed>;
  //
  //Collet all database names that need to be opened to suppoty the given database
  *collect_dbnames(dbase: database): Generator<string> {
    //
    for (const ename in dbase.entities)
      for (const cname in dbase.entities[ename].columns) {
        //
        //Get teh namned column
        const col: column = dbase.entities[ename].columns[cname];
        //
        //Only foreign keys are considered
        if (!(col instanceof foreign_col)) continue;
        //
        //They must not be hierarchical
        if (col.is_hierarchical()) continue;
        //
        //get the referenced dbname
        const dbname: string = col.ref.dbname;
        //
        //Retirn the name
        yield dbname;
      }
  }
}

//Modelling a table's td/th grid. By the way, Is there any structural difference
//between the th and td apart from styling?
export abstract class grid extends writer {
  //
  //A cell has an io to support data entry; the default io type is readonly
  public io?: io;
  //
  //The initial value of a cell is defined to be null. Compare this value with
  //that of an io to decide if a change has occurred or not (and consequently
  //whether we need to initiate a write or not)
  public value: basic_value = null;
  //
  //Requirements for the seed interface. Why did the system not complain when
  //the alias is not implemented? Is it because it is optional?????Not sure
  #alias?: alias;
  //
  //Pool of seeds to be used for selecting thoses that are necessary for
  //wring this cell to a database
  #pool: Array<seed> = [];
  //
  declare parent: homozone;
  //
  //The HTML element that provides the visual cue within a cell.
  constructor(
    public td: HTMLTableCellElement,
    parent: homozone,
    //
    //The following 2 coordinates allow us to access data that are associated
    //with axes values, e.g., seeding information for data loading
    //
    //The relative coordinates of this cell within the parent homozone
    public relative: coord<number>,
    //
    //The row and column indices of this cell in the cells object of the
    //parent homozone
    public index: coord<string>,
    //
    //The ancestors of a cell are the 2 row/column homoaxis. If no axis
    //are define, then retirn teh parent homozone
    options?: view_options
  ) {
    super(parent, options);
  }

  //The signature of a grid is a an identification string (not necesarily
  //friendly or unique) used for targeting a cell as closely as possible
  //during debugging. It is generated if you right click on a cell when the
  // signature is console logged. The key components of a signature are:-
  get signature(): string {
    //
    // ...the css of the element where the this cell's table is anchored
    const anchor: HTMLElement | string | undefined =
      this.search_option("anchor");
    const css: string = typeof anchor === "string" ? anchor : "";
    //
    // ...the class name associated with the zone of the table where this
    // cell occurs
    const str: string | undefined = this.search_option("class_name");
    const class_name: string = str ?? "";
    //
    //...the position (pz) of the homozone (that contains this cell) if it is
    // part of a heterozone
    const pz: coord<number> | undefined = this.parent.position;
    const position: string = pz ? `[${pz[0]}, ${pz[1]}]` : "";
    //
    // ...the position (pi) of this cell in the parent homozone
    const pi: coord<string> = this.index;
    const index: string = `[${pi[0]}, ${pi[1]}]`;
    //
    //Signature is a combination of all these components with a slash separator
    const signature: string = [css, class_name, position, index].join("/");
    //
    //Compile the desired debugging string that can be used for condition
    //breaking when this matches to this cell
    return signature;
  }

  //Th id of a cell, for debugging purposes
  get id(): string {
    //
    return `homozone[${this.parent.id}]/[${this.index}]`;
  }

  //Use the raw axes of the parent homozone to get the ancestors of
  //a cell, thus ensuring that the tabulation hierarchy is not broken even
  //if a raw axis is undefined. This is important for accessing ancestral options
  //from a cell. The ideal hierarchy of a cell should be:-
  //cell->tick?->homoaxis?->homozone->heterozone?->browser?
  //NB. The homaxis, and therefore the tick, may be undefined, implying that the
  //cell cannot access options defined at the homozone level. When that is the
  //case, the cell's parent should point to the homozone
  //The ancestors of a cell are the horizontal and vertial ticks of of the
  //homoaxes. If the axies are not defined, then the homozone is the ancestors
  //are defined, then the??
  get guardians(): Array<view> {
    //
    //Get the homoaxis of this cell
    const axes: coord<homo.axis | undefined> | undefined = this.parent.axes_raw;
    //
    //If the axes are not defined, then return the homozone as the tabulator
    if (!axes) return [this.parent];
    //
    //Get the index of the cell
    const [r, c] = this.index;
    //
    //The axes are defined; destructure them
    const [row, col] = axes;
    //
    //Get the row and column ticks
    const tickr: homo.tick | undefined = row
      ? row.ticks!.find((tick) => tick.mark === r)
      : undefined;
    const tickc: homo.tick | undefined = col
      ? col.ticks!.find((tick) => tick.mark === c)
      : undefined;
    //
    //If both ticks are defined, then return them as tabulators of this cell
    if (tickr && tickc) return [tickr, tickc];
    //
    //If either of the ticks is defined return it as the ancestor
    if (tickr) return [tickr];
    if (tickc) return [tickc];
    //
    //If none of the ticks is defined, then the parent homozone is the
    //ancestor
    return [this.parent];
  }
  //
  //Use the relative position of a cell to retrieve its associated ticks
  get tick(): coord<root.tick> {
    //
    //The (relative) position of this cell provides the link to an axis tick
    const position: coord<number> = this.relative;
    //
    //Destructure the cell's position to get the numeric indices of the ticks
    const [row, col] = position;
    //
    //Get the underlying axis in the row dimension
    const row_axis: root.axis = this.parent.axes[0]!;
    //
    //Get the tick at the row'th position
    const row_tick: root.tick = row_axis.ticks![row];
    //
    //Get the underlying axis in the col dimension
    const col_axis: root.axis = this.parent.axes[1]!;
    //
    //Get the tick at the row'th position
    const col_tick: root.tick = col_axis.ticks![col];
    //
    //Return the ticks
    return [row_tick, col_tick];
  }
  //
  //Select this cell and its associated row. This highlights only one cell
  //in a table, as well as saving this cell at the highest member in the
  //zone has-a hierarchy.
  select() {
    //
    //Save this as the current selected cell of the root zone that contains
    //this cell
    this.get_root_zone().selection = <cell>(<unknown>this);
    //
    //Get the td, i.e., table cell element, of this cell
    const td: HTMLTableCellElement = this.td;
    //
    //A. Change the current selected cell of the underlying table
    {
      //
      //Get the underlying table of this cell. NB. The parent of a cell is a
      //homozone
      const table: HTMLTableElement = this.parent.get_html_table();
      //
      //Get all the selections from the table
      const selections = table.querySelectorAll(".selected");
      //
      //Clear the current selections
      selections.forEach((s) => (<HTMLElement>s).classList.remove("selected"));
      //
      //Add a cell selection class attribute
      td.classList.add("selected");
      //
      //Select the parent row as well
      const tr: Element | null = td.parentElement;
      //
      //Mark the tr as selected
      if (tr instanceof HTMLTableRowElement) tr.classList.add("selected");
    }
  }

  //Complete the asynchronous process after a cell is constructed
  async init(): Promise<void> {
    //
    //Show the cell in edit mode, if requested
    if (this.search_option("mode") === "edit")
      this.td.classList.add("updateable");
    //
    //Cast this grid to a cell, so that the richer version of a grid is available
    //for event handling
    const cell = <cell>(<unknown>this);
    //
    //Add the generalised on double click event listener to mark the cell as
    //current, thus opening it in edit mode. NB. The parent homozone
    //implements the on cell click event, so that, a derived homozone can
    //override it
    this.td.ondblclick = (evt: MouseEvent) => this.parent.ondblclick(cell, evt);
    //
    //On click, select a cell. Use the onclick method to ensure only 1 listener
    this.td.onclick = async (evt: MouseEvent) => {
      //
      //Prevent the onclik event from propagating, causin unpredictable
      // behaviour
      evt.stopPropagation();
      //
      //Handling of this event does not make sense in edit mode
      if (cell.td.classList.contains("updateable")) return;
      //
      await this.parent.onclick(cell, evt);
    };
    //
    //Add the context menu event listener to be programmed at the homozone
    //level
    this.td.oncontextmenu = (evt: MouseEvent) =>
      this.parent.oncontext_menu(cell, evt);
    //
    //Hide the cell, if necessary
    if (this.hidden) this.td.hidden = true;
    //
    //Style borders to show parent demarcation
    this.demarcate();
    //
    //Classify the cell, if need be
    let name: string | undefined;
    if ((name = this.search_option("class_name"))) this.td.classList.add(name);
    //
    //Add the quick and dirty color (without having to chamge your css)
    if ((name = this.search_option("color")))
      this.td.style.backgroundColor = name;
  }

  //
  //Style borders to show parent homozone demarcation
  demarcate() {
    //
    //Border styling depends on the cells relative position...
    const position: coord<number> = this.relative;
    //
    //...and the position of the bottom right corner of the homozone
    const size: coord<number> = this.parent.size!;
    //
    //Get the td's class list
    const class_list: DOMTokenList = this.td.classList;
    //
    //If this cell is on the left edge,  then the cell's left border will be styled
    if (position[1] === 0) class_list.add("left");
    //
    //If this cell is on the right edge, then then its right border wil be styled
    if (position[1] === size[1] - 1) class_list.add("right");
    //
    //If this cell is on the top edge, then style the top border
    if (position[0] === 0) class_list.add("top");
    //
    //If this cell is on the bottom edge, then style the bottom border
    if (position[0] === size[0] - 1) class_list.add("bottom");
  }

  //Determines if this cell is hidden or not. A cell is hidden if :-
  //- any of its ticks is hidden
  //- or any of its axis is hidden
  //- or the hidden option is set
  get hidden(): boolean {
    //
    //Look both in the row and column direction for the hidding setting
    for (const dim of [0, 1] as coord<0 | 1>) {
      //
      //Get the axis of the cell in the current direction
      const axis: root.axis = this.parent.axes[dim];
      //
      //The cell is hidden if the axis is hidden
      if (axis.hidden) return true;
      //
      //Check the ticks
      //
      //Get the relative position, i, of this cell in the current dimension
      const i: number = this.relative[dim];
      //
      //If the tick at position i is hidden then the cell is hidden
      if (axis.ticks![i].hidden) return true;
    }
    //
    //A cell is hiden if the options suggest so
    return super.hidden;
  }
  //
  //Create and initialize the io of this cell by looking at the tabulation
  //hierarchy for the nearest:-
  //- user preference, specified as a view option
  //- the unbounded database column that that labels this cell,
  //in that order. If none of these methods yields an io, then assume it is
  //read-only
  async init_io(): Promise<io> {
    //
    //Search the io_type based on the nearest user preference up the
    //tabulation hierarchy
    let io_type: io_type | "default" | undefined =
      this.search_option("io_type");
    //
    //If a non-default io_type is found, then use it to create the io (with
    //no options).
    if (io_type && io_type !== "default")
      return await io.create_io(this.td, io_type, this, {});
    //
    //No user io_type preference found. Deduce the io from the data model
    const col: column | undefined = this.deduce_column();
    //
    //If a database column can be deduced then use it to deduce the cell's io
    if (col) return io.deduce_io(this.td, col, this, {});
    //
    //If the io cannot be deduced so far, then assume it is a read-only, with
    //no options.
    return await io.create_io(this.td, "read_only", this, {});
  }

  //A grid has no capability of deducing a database column; a cell has
  deduce_column(): column | undefined {
    return;
  }

  //Removes duplicates from the list of  seeds
  uniquefy_seeds(seeds: Array<seed>): Array<seed> {
    //
    //Start with an empty result of seeds
    const result: Array<seed> = [];
    //
    //For each member seed, add it to the result if there is no match
    for (const seed of seeds) {
      //
      //Find the seed in the result
      const found: seed | undefined = result.find(
        (l) =>
          l.col === seed.col &&
          l.alias === seed.alias &&
          l.ovule === seed.ovule &&
          l.genesis === seed.genesis
      );
      //
      //Add the seed to the result if not found
      if (!found) result.push(seed);
    }
    //
    return result;
  }

  //Description of a cell, for debugging purposes
  get description(): string {
    //
    const relative: string = `[${this.relative[0]}, ${this.relative[1]}]]`;
    const index: string = `[${this.index[0]}, ${this.index[1]}]]`;
    //
    return `homozone:'${
      this.parent.id
    }, 'relative:'${relative}', index:'${index}, value:'${this.io!.value}'`;
  }

  //Get the active root zones. These are the zones whose parents are not
  //tabulator elements and which have a current cell;
  get_roots(): Array<root.zone> {
    //
    //Get all the zones in the system
    const zones: Array<root.zone> = root.zone.collection;
    //
    //Select the root zones
    const roots: Array<root.zone> = zones.filter(
      (Zone) =>
        //
        //Only root zones are considered. A root zone has a parent that
        //is not part of the tabulation hiererchy
        Zone.is_root() &&
        //
        //A root zone is active if has a valid cell. This is the mechanism
        //than links 2 disjointed tables, so skip this one if it does not
        //have a selection
        Zone.selection
    );

    //
    //I dont understand why there are duplicates. Investigate. For this version..
    //...remove duplicates from the roots
    function dup(acc: Array<root.zone>, zone: root.zone): Array<root.zone> {
      //
      //If the zone is not in the accumulator, add it
      if (!acc.includes(zone)) acc.push(zone);
      //
      //Return the accumulator
      return acc;
    }
    const croots: Array<root.zone> = roots.reduce(dup, []);
    //
    //Return the roots
    return croots;
  }
  //
  //Override option simplification to take cae of tick and cell options
  simplify_option(option: option): Array<option> {
    //
    //The simplification depnds on the type of option key
    switch (option.key) {
      //
      //For cells...
      case "cells":
        return this.simplify_cells(option);
      case "ticks":
        return this.simplify_ticks(option);
      default:
        return [option];
    }
  }
  //
  //Simplify complex cell options to basic ones, if applicable.
  simplify_cells(option_in: option): Array<option> {
    //
    //Destructure teh option to reveal its values
    const { value, source } = option_in;
    //
    //Cast the value the cells option.
    const value2: table_options["cells"] | undefined = <table_options["cells"]>(
      value
    );
    //
    //If the value is not defined, then there must be an issue
    if (!value2)
      throw new mutall_error(
        `Unexpected data type; where an array of cells was expected`
      );
    //
    //Get the row and column indices of this grid, taking care of the current
    //orientation
    const [row, col] = this.orientate(
      [this.index[0], this.parent.orientation],
      this.index[1]
    );
    //
    //Find the option that matchess this cell
    const option: [row: string, col: string, view_options] | undefined =
      value2.find(([r, c]) => r === row && col === c);
    //
    //Return an empty list if no option matches this grid cell
    if (!option) return [];
    //
    //Get the cell options
    const view_options: view_options = option[2];
    //
    //Packege the view options into a source/view_options pair
    const cell_options: Array<[source: view, view_options]> = [
      [source, view_options],
    ];
    //
    //Split the cell options into small components
    const split_options: option[] = source.split_options(cell_options);
    //
    //Return the split options
    return split_options;
  }
  //
  //Simplify complex tick options to basic ones, if applicable.
  simplify_ticks(option_in: option): option[] {
    //
    //Destructure the option to reveal its values
    const { value, source } = option_in;
    //
    //Cast the value the ticks option.
    const tick_options: table_options["ticks"] | undefined = <
      table_options["ticks"]
    >value;
    //
    //If the value is not defined, then there must be an issue
    if (!tick_options)
      throw new mutall_error(
        `Unexpected data type; where an array of tick options was expected`
      );
    //
    //Start with an empty list of result
    const result: Array<option> = [];
    //
    //Collect the options that fall on a tick mark that sheres the same index
    // as this cell
    for (const dim of [0, 1] as coord<0 | 1>) {
      //
      //Get the tickmark to use
      const mark: string = this.index[dim];
      //
      //Get the tick_option that matches this tick
      const tick_option: tick_option | undefined = tick_options?.find(
        (toption) => toption[0] === mark
      );
      //
      //Abort the rest of the process if we cannot find a match
      if (!tick_option) continue;
      //
      //Get the tick's options that should now be split into simpler more basic
      // components
      const table_options: table_options = tick_option[1];
      //
      //Package the table options into a view_option source pair
      const view_options: Array<[source: view, view_options]> = [
        [source, table_options],
      ];
      //
      //Split the table_options into the simpler options. This tick is the
      //reference
      const simple_options: Array<option> = source.split_options(view_options);
      //
      //Add the simple options to the result
      result.push(...simple_options);
    }
    //
    return result;
  }
}
//
//
//User specification of an axis. There are 4 methods to specify an axis:-
export type axis_source =
  //
  //The the simplest method to specify an axis is a list of values. This
  //translates to a set of ticks with no subject, i.e.,
  //{type:'values', values:Array<basic_value>}
  | Array<basic_value>
  //
  //In this method the ticks of the axis are values of the same subject
  | { type: "values"; values: Array<basic_value>; options?: view_options }
  //
  //In this method the ticks of the are associated with column metadata
  //from which aliased column and options can be deduced
  | { type: "seeds"; metadatas: Array<metadata> }
  //
  //In this method the axis of a homozone is the source of the tick values
  | { type: "axis"; dim: 0 | 1; homozone: homozone };
//
//At some point the 4 sources of axes are standardised to the 2 major axis types
export type axis_type = "seeds" | "values";
//
//A pollinator models an agent that supports pollination. It represents an aliased
//column, a.k.a., pollen, with an optional value, a.k.a., ovule. If the ovule is
//defined, then we say that the pollinator is constrained to that value. If it
//is not, then at some point it will be bound to an ovule. The
//pollinator resolves to a questionnaire label whence the ovule evaluates to
//basic value.
//Note that column and alias jointly define pollen (of a pollinator)
//The source is important for binding purposes.
export type pollinator = {
  col: column;
  alias: alias;
  ovule?: ovule;
  source: view;
};
//
//Ovule is the compliment of pollen, in terms of fertilization
export type ovule = basic_value | cell | input_element;
//
//The different types of input elements capable of raising the onblur
//event.
export type input_element =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

//Traditional event listeners associated with a cell have this signature
export type listener = (cell: cell, evt?: Event) => Promise<void>;

//Modelling the context menu choices
export type choice = {
  //
  //The user caption
  caption: string;
  //
  //The function to exceiure
  exec: (cell: grid) => Promise<void>;
};

//The browser class was designed to support generation of seeds from the html
//elements in the browser namespace.
type element = { element: input_element; pollinators: Array<pollinator> };

//The result of compiling raw metadata. NB. Metadata is not a view! Its a simple
//utility to work with the raw metadata and pollinators
export class metadata {
  //
  constructor(
    public parent: view,
    public fname: string,
    public pollinators: Array<pollinator>,
    public options: view_options
  ) {}

  //Convert this metadata into a tick option
  tick_option(): tick_option {
    //
    //The field name is matche sthe tick mark
    const mark: string = this.fname;
    //
    //The table options are those of this metadata
    const table_options: table_options = this.options;
    //
    //The labels come from this metadata
    const labels: Array<label> = this.labels;
    //
    //Complile the tick option tuple
    const tick_option: tick_option = [mark, table_options, ...labels];
    //
    //Rteurn teh tick option
    return tick_option;
  }

  //
  //Convert an ovule to a basic value. Ovules are used in pollination to
  //produce seeds
  static convert_ovule_2_value(ovule: ovule): basic_value {
    //
    //Destructure an ovule type
    //type ovule = cell|basic_value|listener
    //
    //If the ovule is a cell, then return its io value, if defined; otherwise
    //a null
    if (ovule instanceof grid) return ovule.io?.value ?? null;
    //
    //If the ovule is an HTML input element, such as input, textarea or select
    //then return its value
    if (ovule instanceof HTMLElement) return ovule.value;
    //
    //The ovule must be a basic value, so no conversion is needed. Return it
    //as it is
    return ovule;
  }
  //
  //Derive labels from metadata
  get labels(): Array<label> {
    //
    const labels: Array<label> = this.pollinators.map((pollinator) => {
      //
      //Destructure the pollinator
      const { col, alias, ovule } = pollinator;
      //
      //Define the fields of a label
      const ename = col.entity.name;
      const cname = col.name;
      const dbname = col.entity.dbase.name;
      //
      //Convert the ovule to a basic value -- the expression field of a
      // label. It may be undefined
      const exp: basic_value | undefined = ovule
        ? metadata.convert_ovule_2_value(ovule)
        : undefined;
      //
      //Compile the label
      const label: label = [exp, ename, cname, dbname, alias];
      //
      return label;
    });
    //
    return labels;
  }
  //
  //Analyse the named field in the raw metadata to get a column from the given
  //database that matches it. The full syntax of metadata column name is:-
  //-dbname.ename.cname:alias
  //NB. Avoid # as a naming symbol; mySql uses it for comments
  //The return value is the metadata class instances

  // Analyze the named field in the metadata interface to find a matching column
  // from the given database. The full syntax for a metadata column name is:
  // - dbname.ename.cname:alias
  // Note: Avoid using '#' as a naming symbol, as MySQL treats it as a comment.
  // Returns metadata class instances.
  static async parse(raw: metadata_interface, parent: view): Promise<metadata> {
    //
    //Destructure the metadatainterface
    const {
      //
      //Name of the database column
      name,
      //
      //Size of the column
      len,
      //
      //Data type for the column, (str)ing or (int)eger
      native_type,
      //
      //Name of the source table, if present
      table,
    } = raw;
    //
    //Extract the fully or partially specified field name
    const fname: string = name;
    //
    //Get the table name. It is needed for resolving cases of cname#alias, i.e.,
    //the table is not explicity provided. If the table name is found we expand
    //the field name to tname.cname#alias. If tname is null, then that case
    //should throw an exception
    const tname: string | null = table;
    //
    //Extract options attached as symbols to the column name
    const { options, remainder } = this.extract_options(fname);
    //
    //Use the dot to separate name component parts
    const parts: Array<string> = remainder.split(".");
    //
    //Get the metadata column, if one can be deduced. Split is defined as:-
    //{cname:string, alias?:alias}
    const [col, split] = await this.get_metadata_col(
      parent,
      tname,
      fname,
      parts
    );
    //
    //Compile all the options, so far (including the incoming ones)
    const all_options: Partial<view_option_interface> = {
      ...options,
      maxlength: len,
      data_type: native_type,
    };
    //
    //If the column is still undefined, then return result without any bindings
    //column
    if (!col) return new metadata(parent, fname, [], all_options);
    //
    //Define a pollinator; pick the alias from the split and use the error
    // object to mark its source
    const pollinator: pollinator = {
      col,
      alias: split.alias ?? [],
      source: parent,
    };
    //
    //Compile the column and alias; then return the results
    return new metadata(parent, fname, [pollinator], all_options);
  }
  //
  //Extract options preceeding the column name, e.g., !, - +, etc
  static extract_options(fname: string): {
    options: table_options;
    remainder: string;
  } {
    //
    //Get the leading character
    const char: string = fname[0];
    //
    //Starting with an empty option....
    const options: table_options = {};
    //
    //By default, an option will be extracted
    let extracted: boolean = true;
    //
    //Add the option that is defined by leading character
    switch (char) {
      //
      //Add the hidden option
      case "-":
        options["hidden"] = true;
        break;
      //
      //Add the read-only option
      case "!":
        options["io_type"] = "read_only";
        break;
      //
      //Indicate that noting was extracted
      default:
        extracted = false;
    }
    //
    //Get the remainder after extracting the leading option
    const remainder = extracted ? fname.substring(1) : fname;
    //
    //Return teh result
    return { options, remainder };
  }
  //
  //Get column from the metadata
  static async get_metadata_col(
    parent: view,
    tname: string | null,
    fname: string,
    parts: Array<string>
  ): Promise<
    [col: column | undefined, split: { cname: string; alias?: alias }]
  > {
    //
    //Define the desired result column result
    let col: column | undefined;
    //
    //Define a function for splitting a column into a name and an alias
    const split_cname = (name: string): { cname: string; alias?: alias } => {
      //
      //Use the colon (:) to split the column name into name and alias
      // components. Avoid the special # used by mySql for commenting
      const [cname, alias_str] = name.split(":");
      //
      //If the alias is not defined, return the column name only
      if (!alias_str) return { cname };
      //
      //For now, lets assume a very simple alias, e.g., client.name#1.
      //Return both the column name and teh alias
      return { cname, alias: [alias_str] };
    };
    //
    //Get the default database
    const dbase_default: database = await parent.get_dbase();
    //
    //Track the results of splitting a field name, e.g., name#1, into a
    //column name and and a simple alias
    let split: { cname: string; alias?: alias };
    //
    //Define the names of the 3 parts
    let dbname: string | undefined;
    let ename: string | undefined | null; //to take care of a null tname from column_metadata
    let cname: string | undefined;
    //
    //The number of parts in a field name determines the resulting column.
    switch (parts.length) {
      //
      //If only the component is provided, it must be a cname. Try to
      //deduce the column from available. It is not an error if this does
      //not yield a valid column
      case 1:
        //
        //The only available part is a column name
        cname = parts[0];
        //
        //Split the column name into a cname and alias
        split = split_cname(cname);
        //
        //If the table name is defined, then use it to try compile
        //the desired column
        if (tname) col = dbase_default?.try_entity(tname)?.try_col(split.cname);
        break;
      //
      //If the entity and column names are provided, then its an error if
      //they don't point to a valid column (of the incoming database)
      case 2:
        //
        //Set the available entity and column names
        ename = parts[0];
        cname = parts[1];
        //
        //Split the column name into a name and an alias
        split = split_cname(cname);
        //
        //Note how we use the get_* type of function, not try_*, so that
        //the system crashes if the names are not found in the given database
        col = dbase_default?.get_entity(ename).get_col(split.cname);
        break;
      //
      //When all the parts of a label are defined, then they must all be
      //valid
      case 3:
        //Set the name components
        dbname = parts[0];
        ename = parts[1];
        cname = parts[2];
        //
        //Open the named databse. It must exist
        const dbase = await parent.open_dbase(dbname);
        //
        //Split the column name into a cname and alias
        split = split_cname(cname);
        //
        //Get the named column from the named database. They must be
        //valid
        col = dbase.get_entity(ename).get_col(split.cname);
        break;
      default:
        //
        //Its an error if the assumption about the structure of a field
        //name being e.g., dbname.ename.cname#1, is not valid
        throw new mutall_error(
          `Invalid field name '${fname}'. It has '${parts.length}' parts`
        );
    }
    //
    return [col, split];
  }
}
//
//Plollen modellede as the male gamete
type pollen = { col: column; alias: alias };
//
//Structure needed for compating seeds, so we can select the best
type compact = { pollen: pollen; seeds: Array<seed> };

//To suport collection of seeds from the browser environment
class browser extends tabulator {
  //
  //Redefine current to be more precise
  declare static current: browser;
  //
  //Aliased columns (and their associated html elements) harvested from the
  //browser environment
  public elements?: Array<element>;
  //
  //The id is an element id that specifies the browser area that should be
  //searches for elements. If none, the search is doen for the entrie browser
  constructor(public id?: string, parent?: view, options?: view_options) {
    //
    //A browser is outside of the tabulation hierarchy, so it has no ancestors
    super(parent, options);
  }
  //
  //To initialize a tabulator is to compile its simple and tick label options
  // into pollinators
  async init(): Promise<void> {}
  //
  //Get browser elements from html elements that are appropriately marked. For
  //now, assume that all such elements have the data-subject attribute, e.g.,
  //such as:-
  // <span data-subject = "$dbname.$ename.$cname#[1]">some value </span>
  async set_browser_elements(): Promise<void> {
    //
    //Select the element to limit the search area
    const search: HTMLElement = this.id
      ? this.get_element(this.id)
      : this.document.documentElement;
    //
    //Collect all data entry with the 'data-subject' attribute
    //
    //Formulate theh css
    const css =
      "input[data-subject], select[data-subject], textarea[data-subject]";
    //
    //Now do the selection
    const elems_raw: NodeListOf<Element> = search.querySelectorAll(css);
    //
    //Convert the nodelist to an array
    const elems_array: Array<Element> = Array.from(elems_raw);
    //
    //Convert the array of elements to an array of seeds. There may be
    //a need for asynchronous operation, so a direct mapping will not do
    //
    //Start with an empty result of elements
    const result: Array<element> = [];
    //
    //Visit each one of the elements in the array and see if it can be
    //converted  to a seed
    for (const element of elems_array) {
      //
      //Get the subject string; it must exist
      const subject: string = element.getAttribute("data-subject")!;
      //
      //Construct a metadata object (required by the parser). The table,
      //len and type keys are just place holders
      const raw: metadata_interface = {
        name: subject,
        table: null,
        len: 0,
        native_type: "string",
      };
      //
      //Parse the subject from 'dbname.ename.cname#alias'-type string to
      //to get a database column and alias, a.k.a., compiled metadata
      const Metadata: metadata = await metadata.parse(raw, this);
      //
      //Destructure the compiled metadata; only the array of aliased column
      //is important
      const pollinators: Array<pollinator> = Metadata.pollinators;
      //
      //Collect the result
      result.push({
        pollinators: pollinators,
        element: <input_element>element,
      });
    }
    //
    this.elements = result;
  }

  //Data Subject Marked Elements Method
  // Collect seeds from the browser environment.
  // All such seeds are equidistance from the cell being written to
  //a database. This may need to be reviewed in future to take care of dom
  //hierarchy. The reference cell is not playing any role
  *pollination_by_browser(ref: cell): Generator<seed> {
    //
    //Loop through all the elements of the browser and bind thier aliased
    //columns
    for (const elem of this.elements!) {
      //
      //Destructure the element entry
      const { pollinators: pollinators, element } = elem;
      //
      //Loop through the pollinators and use them to generate seeds
      for (const pollinator of pollinators) {
        //
        //Destructire the pollinator
        const { col, alias, ovule: value } = pollinator;
        //
        //If the value is bound, use the pollinator to create the seed
        if (value) yield new seed(value, col, alias, this, ref);
        //
        //If the value is not bounded, the use the element to formulate
        //the seed
        else yield new seed(element, col, alias, this, ref);
      }
    }
  }
}
//Sources of seeds needed for writing a cell to the database
export type seed_source =
  //
  //Seeds from self pollination are important for determining the io of a cell
  | "self"
  //
  //Seeds from cross pollination are generated by e.g., traversing labeled
  // axes in the current root zone
  | "cross"
  //
  //Seeds collected from roots with with a cell selection, i.e., across panels
  //othe than the one containing the cell
  | "root"
  //
  //Seeds collected from browser elements marked with data-subject attribute
  | "element";

//
//A cell is a grid that can write/plant seeds to a database.
export class cell extends grid {
  //
  //Managing the seeds needed for writing this cell to a database
  public seeds: Partial<{ [key in seed_source]: Array<seed> }> = {};
  //
  //The principal (isa) seeds of the current reference cell. They are used for
  //determining the io of a cell
  public principals?: Array<seed>;
  //
  //Private properties for debugging purposes
  //
  //Track dirty, clean and fitted seeds for debugging purposes seeds
  private cleaned_seeds?: Array<seed>;
  //
  //Seeds that fit the current reference cell
  private fitted_seeds?: Array<seed>;
  //
  //Final result of fitting data (seeds) to the model
  private final_fit?: Array<seed>;
  //
  //Pollinators are aliased columns resulting from evaluating/compiling the
  //labels option of a tabulator.
  public pollinators?: Array<pollinator>;
  //
  //The HTML element that provides the visual cue within a cell.
  constructor(
    td: HTMLTableCellElement,
    parent: homozone,
    //
    //The following 2 coordinates allow us to access data that are associated
    //with axes values, e.g., seeding information for data loading
    //
    //The relative coordinates of this cell within the parent homozone
    relative: coord<number>,
    //
    //The row and column indices of this cell in the cells object of the
    //parent homozone
    index: coord<string>,
    //
    //The ancestors of a cell are the 2 row/column homoaxis. If no axis
    //are define, then retirn teh parent homozone
    options?: view_options
  ) {
    super(td, parent, relative, index, options);
  }
  //
  //Collect seeds from both self and cross pollination of this cell. Pollination
  //is defined with respect to the root homozone that contains this cell.
  // Pollination is part of fitting the cell to a data model.
  pollinate(): Array<seed> {
    //
    //Collect and save (for debugging purposes) seeds from self pollination.
    //Self pollination attempts to bind this cell to some pollinator needed
    // for determining the io of a cell
    this.seeds.self = this.pollinate_self();
    //
    //Collect and save (for debgging purposes) seeds resulting from cross
    // of this cell. Cross pollination constrains the source of seeds to
    // the current root zone
    this.seeds.cross = this.pollinate_cross();
    //
    //Return seeds from both self and cross pollination
    return [...this.seeds.self, ...this.seeds.cross];
  }
  //
  // Collect the seeds resulting from the interaction of this cell
  // and the pollen from the closest tabulators. This process is analogous to
  // self-pollination in biology and is important for deriving a cell's io.
  pollinate_self(): Array<seed> {
    //
    //Self pollination is not possible if the pollinators of this cell are
    // not set
    if (!this.pollinators)
      throw new mutall_error("The pollinators of this cell are not set");
    //
    //Collect seeds linking the pollinators of this tabulator with this
    // cell as a reference to some ovule.
    const seeds: Array<seed> = [];
    for (const pollinator of this.pollinators)
      seeds.push(this.bind_pollinator(pollinator));
    //
    return seeds;
  }
  //
  //Bind the given pollinator to this reference cell, the  to produce a seed
  bind_pollinator(pollinator: pollinator): seed {
    //
    //Destructure the pollinator
    const { col, alias, ovule, source } = pollinator;
    //
    //If the pollinator's value/ovule is already bound, then use it to create
    //a seed
    if (ovule) return new seed(ovule, col, alias, source, this);
    //
    //The ovule is not bounded
    //
    //Ovule binding happens in a special way for a valued
    //axis
    const bound_ovule: ovule =
      //
      //If the souce instance is a homo axis...
      source instanceof homo.axis &&
      //
      //...of type value...
      source.type === "values"
        ? //
          //..then the ovule is the axis tick mark that intersects the reference
          // cell
          this.index[source.dim]
        : //
          //..otherwise it is the reference cell itself
          this;
    //
    //Use the bound ovule to create a seed
    return new seed(bound_ovule, col, alias, source, this);
  }

  //Cross pollination is about generating (self pollinated) seeds from the
  // cells neigbouring this one.
  pollinate_cross(): Array<seed> {
    //
    //Generate seeds by self pollination for each cell neigbouring this one,
    //starting with an empty list
    const seeds: Array<seed> = [];
    for (const cell of this.collect_neighbouring_cells()) {
      //
      //Only cells different from this one are conconsidered
      if (cell === this) continue;
      //
      //Now let the cell self-pollinate and save to a collection
      const more_seeds: Array<seed> = cell.pollinate_self();
      //
      //Collect the seeds
      seeds.push(...more_seeds);
    }
    return seeds;
  }

  //Cells neighboring this one may be found along the row and column axes with
  //this cell as the reference
  collect_neighbouring_cells(): Array<cell> {
    //
    //Start with an empty list of cells
    const result: Array<cell> = [];
    //
    //Get the root zone as the search space for this operation
    const root: root.zone = this.get_root_zone();
    //
    //Search for neighbours in the  row and column directions with the
    // referece cell being on the search path
    for (const dim of [0, 1] as coord<0 | 1>) {
      //
      //Let zone be a homozone that lies in the search path. So we will
      // traverse it in direction dim
      for (const zone of root.collect_homozones(dim)) {
        //
        //Get the root axis of this homozone that is orthogonal to the
        // dim direction
        const orthoaxis: root.axis = zone.axes[zone.axes[dim].ortho];
        //
        //Get the type of axis: labeld or valued
        switch (orthoaxis.get_type()) {
          //
          case "values":
            result.push(...zone.collect_overlaid_neighbour(this));
            break;
          case "seeds":
            result.push(...zone.collect_labeled_neighbours(this, orthoaxis));
            break;
        }
      }
    }
    //Return the cells;
    return result;
  }

  //Extend the initialization of a grid to that of a cell (which is capable of
  //of writing to a database)
  async init(): Promise<void> {
    //
    //Do the default initialization which focuesses on the td element, adding,
    // for instance, click events, cell stylings, etc
    await super.init();
    //
    //Compile the labels in the simple options into pollinators
    this.pollinators = await this.compile_labels_2_pollinators();
    //
    //Set the principal seeds of this cell. This will apply to the cell
    //(and not the grid)
    this.principals = this.init_principals();
  }

  //Compile the labels referenced in the options (if any) to generate
  //pollinators
  async compile_labels_2_pollinators(): Promise<Array<pollinator>> {
    //
    //Use this cell's available options to select all its labels
    const labels: Array<[label, source: view]> = this.select_labels();
    //
    //To compile pollinators, start with an empty list of the desired result
    const pollinators: Array<pollinator> = [];
    //
    //Compile each label to a pollinator column and collect it into a list
    for (const label of labels) {
      //
      //Label compiling is asynchronous, so mapping is not an option
      const pollinator: pollinator = await this.compile_label(label);
      //
      pollinators.push(pollinator);
    }
    //Return the pollinators
    return pollinators;
  }

  //Compile a label (and its source) to a pollinator
  async compile_label(mylabel: [label, source: view]): Promise<pollinator> {
    //
    //Destructire my label into a label and component
    const [label, source] = mylabel;
    //
    //Destructure the label
    const [value, ename, cname, dbname, alias] = label;
    //
    //Formulate a column using the given entity, column and
    //database names
    const col: column = await this.get_column(ename, cname, dbname);
    //
    //Formulated a pollinator, setting the alias to empty if undefined
    const pollinator: pollinator = {
      col,
      alias: alias ?? [],
      ovule: value,
      source,
    };
    //
    //Return the pollinator
    return pollinator;
  }

  //Collect the labels (and their sources) of this cell from the available options
  select_labels(): Array<[label, source: view]> {
    //
    //Get all the available options for this cell
    const options: Array<option> = this.available_options;
    //
    //Select the options that are labels
    const label_options: Array<option> = options.filter(
      (opt) => opt.key === "labels"
    );
    //
    //Convert the label options to labels, startting with an empty list
    const result: Array<[label, source: view]> = [];
    for (const option of label_options) {
      //
      //Destructure the label option to reveal its components
      const { key, value, source } = option;
      //
      //Discard the key. The value is of type...
      const labels: Array<label> = (value as table_options["labels"])!;
      //
      //For each label, construct the label/source turple
      for (const label of labels) result.push([label, source]);
    }
    //
    //Return the labels
    return result;
  }

  //
  //Set the principal seeds of this cell by collectining seeds from self
  //pollination, cleaning them and isolating those that best fit this cell
  init_principals(): Array<seed> {
    //
    //Collect the dirty seeds resulting from self pollination.
    const seeds: Array<seed> = [...this.pollinate_self()];
    //
    //Clean the seeds, saving the result for debugging purposes
    this.cleaned_seeds = this.clean_seeds(seeds);
    //
    //Fit the principal isa seeds; they determine the entities of this
    //cell, e.g., [basic_value, 'project','detail']
    //Multiple values are possible; they mean that the value can be associated
    //with more than one entity
    const principals: Array<seed> = [...this.collect_isa_seeds()];
    //
    //Save the principals for further use, e.g., writing the cell to a database
    return principals;
  }

  //Fit this cell to the nearest data model, returning the fitted seeds. NB.
  //At least 2 cells are expected -- one for the principal, the other for the
  //primary key. If the primary key cannot be found, then use the indentification
  // index to collect supporting seeds
  fit_model(): Array<seed> {
    //
    // Mark the cell being fitted to the data model. The marker will be
    // cleared once the cell is successfully written to the database.
    this.td.classList.add("error");
    //
    //Collect seeds (both self and cross pollinated) from the root zone that
    // contains this cell
    this.pollinate();
    //
    //Collect seeds from root  zones other than the one that contains this
    //cell
    this.seeds.root = [...this.pollination_by_roots()];
    //
    //Import seeds from the current browser's data-subject-marked elements
    this.seeds.element = [...browser.current.pollination_by_browser(this)];
    //
    //Add seeds from all the sources
    const all_seeds: Array<seed> = [
      ...this.seeds.self!,
      ...this.seeds.cross!,
      ...this.seeds.root,
      ...this.seeds.element,
    ];
    //
    //Clean all the seeds (and save them for debugging purposes)
    this.cleaned_seeds = this.clean_seeds(all_seeds);
    //
    //Fit the clean seeds to the reference cell
    this.fitted_seeds = [...this.collect_fitting_seeds()];
    //
    //Remove  duplicates resulting from expanding the data model
    //For instance, in the case of the school exam system, the relational
    //path sitting->year and progress->year will by definition produce 2
    // identical sets of seed based on the year entity. Only one copy is needed
    this.final_fit = this.fitted_seeds.reduce<seed[]>(
      (prev, curr) => this.remove_duplicates(prev, curr),
      []
    );
    //
    return this.final_fit;
  }

  //Rooted Zone Method
  // This is pollination by root zones other than the one that contains the
  //reference cell. Such zones should be active implying that their currently
  //selected cells are related to this reference one
  *pollination_by_roots(): Generator<seed> {
    //
    //Get the active root zones
    const roots: Array<root.zone> = this.get_roots();
    //
    //Get the root of this cell
    const thisroot: root.zone = this.get_root_zone();
    //
    //For each zone created in this application, excluding the zone that has
    // this cell, generate seeds
    for (const root of roots) {
      //
      //Exclude the cases where the root is the one that contains this cell
      if (root === thisroot) continue;
      //
      //Get the new reference cell as the zone's selection. NB. By definition
      //a root zone has a current cell
      const ref: cell = root.selection!;
      //
      //Generate seeds from the new the record that ctianis the new
      // reference cell
      //
      //Create the record
      const Record = record.create(ref);
      //
      //Collect the seeds from the record's pollination
      for (const seed of Record.pollinate()) yield seed;
    }
  }

  //Collect raw seeds that fit this cell to a database model.
  //Start by fittng the principal, a.k.a., isa,  seed, followed by the
  //subordinates, a.k.a., hasa seeds
  *collect_fitting_seeds(): Generator<seed> {
    //
    //The principals must be set by now (hence the !)
    //
    //Multiple principal seeds are feasible, e.g., a cell value can represent
    //more than 1 subject
    //For each principal seed, yield its seed and those of the subbordinates
    for (const principal of this.principals!) {
      //
      //Collect the principal seed; the value is that of the cell
      yield principal;
      //
      //Collect the subordinate seeds to support the writing of this cell
      //to a database
      yield* this.collect_hasa_seeds(principal);
    }
  }

  //
  //Collect the principal/isa seeds of this cell. The seed describes the
  //current cell as a named column from a spefic database and alias. The isa
  //seed sets the entity to be associated with the cell, and consequently
  //determins the subbordinate hasa seeds.
  *collect_isa_seeds(): Generator<seed> {
    //
    //Search the pool of homozone seeds for those whose value is this cell
    for (const seed of this.cleaned_seeds!) {
      //
      //Only seeds that have this cell as the value are considered
      if (seed.ovule !== this) continue;
      //
      yield seed;
    }
  }

  //Collect the subordinate/hasa seeds of this cell given the principal/isa
  //version.
  //The primary key is the only hasa seed we need to write the current cell
  //to a database, if it is available; otherwise we need the hasa seeds to
  //be derived from structural columns of the isa entity. These are the columns
  //used for identification or are mandatory
  *collect_hasa_seeds(isa: seed): Generator<seed> {
    //
    //Get the entity suggested by the principal column
    const entity: schema_entity = isa.col.entity;
    //
    //Get the primary key column of the entity; its named after the entity
    const col: primary = entity.columns[entity.name];
    //
    //Get a seed (of this cell) that matches the primary key column
    const pkseed: seed | undefined = this.get_pk_seed(col, isa.alias);
    //
    //Yield the seed if it is defined;
    if (pkseed) {
      //
      //Yield the primary key seed, whatever its value is.
      yield pkseed;
      //
      //The rest of the code determines whether we need to continue the
      //seedling or not
      //
      //If the seed has a definite ACTUAL value, a.k.a., exp, discontinue
      //the seeding exercise...
      if (pkseed.exp !== null) return;
    }
    //
    //...otherwise consider the structural seeds, i.e., those based on
    //identification and mandatory columns
    //
    //As there is no primary key available, use the structural columns of
    //the entity to collect the alternative identifiers
    for (const col of entity.get_structural_cols()) {
      //
      //Ignore the principal column, to avoid double seeding
      if (col === isa.col) continue;
      //
      //Collect seeds based on the structural columns of the current entity
      yield* this.collect_structural_seeds(col, isa.alias);
    }
  }

  //seeding a cell with a primary key, unlike other columns, is special in
  //that:-
  //-a. no multiple values, so it is not a generator
  //-b. whatever value is found it is returned; the flow controller can then
  //use it to determine whetjer to continue the flow or not
  get_pk_seed(col: primary, alias: alias): seed | undefined {
    //
    //Collect the primary key seeds (like any other column)
    const seeds: Array<seed> = [...this.collect_column_seeds(col, alias)];
    //
    //It is an error if the seeding of this cell is ambiguous
    if (seeds.length > 1)
      throw new mutall_error(
        `Ambiguity error; there's more than one pk column that can seed this cell`,
        grid,
        seeds
      );
    //
    //If there is one seed, yield it
    if (seeds.length === 1) {
      //
      //Get the only seed
      const seed: seed = seeds[0];
      //
      //Collect the desired pk questionnaire seed
      return seed;
    }
    return undefined;
  }

  //Collect the structural seeds of this cell. Foreign and attribute keys are
  //are treated differently
  *collect_structural_seeds(
    col: attribute | foreign_col,
    alias: alias
  ): Generator<seed> {
    //
    if (col instanceof foreign_col)
      yield* this.collect_foreign_seeds(col, alias);
    else yield* this.collect_column_seeds(col, alias);
  }

  //Collect hasa seeds derived from foreign keys guided by the strucural keys
  //of the referenced entity. Pay special attention to hierarchical relations
  //by slicing the isa alias as necessary
  *collect_foreign_seeds(col: foreign_col, alias: alias): Generator<seed> {
    //
    //Destructure the foreign key reference
    const { dbname, ename } = col.ref;
    //
    //Get the named database; it must be available as we have made prior
    //arrangements to open all the relevant databases to avoid the need for
    //asynchronous operation in a generator
    const dbase: database = databases[dbname];
    //
    //Get the named entity
    const entity = dbase.entities[ename];
    //
    //Adjust the alias to take care of hierarchical relations
    const adjust: alias = col.is_hierarchical()
      ? this.adjust_alias(entity.name, alias)
      : alias;
    //
    //Get the primary key column;
    const pk: primary = entity.columns[entity.name];
    //
    //Collect the primary key seed that match
    const pkseeds: Array<seed> = [...this.collect_column_seeds(pk, adjust)];
    //
    //Define a primay key seed
    let pkseed: seed | undefined;
    //
    //Depending on the number of primary key seeds...
    switch (pkseeds.length) {
      case 0:
        //
        //Use structural columns to seed
        //
        break;
      case 1:
        pkseed = pkseeds[0];
        //
        yield pkseed;
        //
        //If the seed has a definite value, discontinue the seeding exercise
        if (pkseed.exp !== null) return;
        //
        //Use structural columns to seed
        break;
      default:
        //
        //Report ambiguity
        const err: error.tabulator_error = {
          type: "ambiguity",
          err: new Error("ambiguity error"),
          seeds: pkseeds,
          col: col,
          alias: alias,
        };
        //
        //Pick teh first seed and yield it
        pkseed = pkseeds[0];
        //
        yield pkseed;
        //
        //If the seed has a definite value, discontinue the seeding exercise
        if (pkseed.exp !== null) return;
        //
        //Use structural columns to seed
        break;
    }
    //
    //Use structrual columns to seed
    //
    //There being no primary key for foreign seeding this cell, try seeding
    //using the structural columns of the entity
    for (const col of entity.get_structural_cols())
      yield* this.collect_structural_seeds(col, adjust);
  }

  //Collect as many seeds, from the cleaned version, as those that fit
  //the the given column and alias.
  *collect_column_seeds(
    col: primary | attribute,
    alias: alias
  ): Generator<seed> {
    //
    //For each clean seed, fit it to the given column and alias. Skip the
    //seed if cannot fit
    for (const seed of this.cleaned_seeds!) {
      //
      //For a fit to occur, the columns must be the same. Skip the
      //seed if this is not the case.
      if (seed.col !== col) continue;
      //
      //Define the alias match
      let match: boolean;
      //
      //For primary keys, the aliases must be identical
      if (col instanceof primary)
        match = mutall.arrays_are_equal(seed.alias, alias);
      //
      //For other keys the isa and has aliases must be similar, but hasa is
      //longer than and drived from the isa version
      else match = this.similar_aliases(seed.alias, alias);
      //
      //Skip the seed if the aliases do not match
      if (!match) continue;
      //
      //Yield the better seed
      yield seed;
    }
  }

  //Tests if the isa is similar to the has alias. Consider aliases where
  //a child[1,2] hasa mother[1]
  //The alias of the child isa, and that of the mother hasa. That of the hasa
  //is shorter than than of the isa
  similar_aliases(hasa: alias, isa: alias): boolean {
    //
    //Two aliases are similar if they are equal
    if (mutall.arrays_are_equal(isa, hasa)) return true;
    //
    //The hasa relation is shorter than the isaa; otherwise they are not similar
    if (!(hasa.length > isa.length)) return false;
    //
    //Make a copy of the array to avoid moifying he original. Then remove
    //last element
    const hasa_copy = [...hasa];
    //
    //If the copy was empty, the there is no alias similarity
    if (!hasa_copy.pop()) return false;
    //
    //Slice the has from the end
    return this.similar_aliases(hasa_copy, isa);
  }

  //Adjust the alias for hierarchical situations, by poping tha last element
  //from the list
  adjust_alias(ename: string, alias: alias): alias {
    //
    //If the alias is empty, then we have a problem
    if (alias.length === 0)
      throw new mutall_error(
        `Unable to determine the alias of a parent entity '${ename}'`
      );
    //
    //Slice the principal alias from position 1, so that [1,2,3] becomes [1,2]
    const alias2 = alias.slice(alias.length - 1);
    //
    return alias2;
  }
  //
  //Clean the dirty/raw seeds. This is necessary because the multiple inheritance
  //characteristic of the tabulation hierarchy will definitely produce
  //duplicate seeds because of shared ancestry.
  clean_seeds(dirty_seeds: Array<seed>): Array<seed> {
    //
    //Clean the seeds by removing obvious duplicates resulting from the
    //multiple parent possibility in the tabulation hierarchy
    const clean: Array<seed> = this.clean_duplicates(dirty_seeds);
    //
    //Compact the cleaned seeds by using the shared pollen, i.e., column and alias
    const compacts: Array<compact> = this.clean_compact(clean);
    //
    //Select the best seeds for each pollen, i.e., those closest to the
    //reference cell
    const nearests: Array<compact> = this.clean_nearests(compacts);
    //
    //Compact further by favoring non-basic ovules (i.e., cell and listener)
    //over basic value where the seed's expression is a basic value expression.
    //What is the justification for this??
    //const bests:Array<compact> = nearests.map(compact=>this.clean_prefer_non_basic_ovules(compact));
    //
    //Construct the desired output, by retrieving the only remaining one element
    const output: Array<seed> = nearests.map(
      ({ pollen: sperm, seeds }) => seeds[0]
    );
    //
    return output;
  }
  //
  //Clean the seeds by removing obvious duplicates resulting from the
  //multiple parent possibility in the tabulation hierarchy
  clean_duplicates(dirty_seeds: Array<seed>): Array<seed> {
    //
    //Start with an empty result
    const clean: Array<seed> = [];
    //
    //Discard duplicates
    for (const seed of dirty_seeds) {
      //
      //Find this seed in the clean version
      const found: seed | undefined = clean.find((x) => x.is_equal_to(seed));
      //
      //If not found then add it to the clean version; otherwise discard it
      if (!found) clean.push(seed);
    }
    //
    return clean;
  }
  //
  //Compact the cleans seeds, to get ready for selecting the better seeds
  clean_compact(clean: Array<seed>): Array<compact> {
    //
    //Start with an empty compact
    const compacts: Array<compact> = [];
    for (const seed of clean) {
      //
      //Test if the seed exists in the result
      const found: compact | undefined = compacts.find(({ pollen, seeds }) =>
        this.clean_equal_sperm(seed.pollen, pollen)
      );
      //
      //Test whether the seed was found or not
      if (found) {
        //
        //The seed was found in the compact: add it to its collection of seeds
        //
        //Destructure compact to access the collection
        const { pollen: sperm, seeds } = found;
        seeds.push(seed);
      } else {
        //
        //The seed was not found, create a new collection starting with the
        //seed
        //
        //Create a new compact
        const compact: compact = { pollen: seed.pollen, seeds: [seed] };
        //
        //Add the compact to the result
        compacts.push(compact);
      }
    }
    //
    return compacts;
  }
  //
  //Compare 2 pollens, a.k.a., aliased columns, for equality
  clean_equal_sperm(a: pollen, b: pollen): boolean {
    //
    //Two sperms are not equal if the columns are different
    if (a.col !== b.col) return false;
    //
    //Two spersmare not equal if thier aliases are different
    if (!mutall.arrays_are_equal(a.alias, b.alias)) return false;
    //
    //The tow sperms are equal
    return true;
  }

  //Select the seeds with the minimum distance to the reference cell for
  //each sperm and return the bindings
  clean_nearests(inputs: Array<compact>): Array<compact> {
    //
    //Start with an empty list of zygotes
    const result: Array<compact> = [];
    //
    for (const { pollen, seeds } of inputs) {
      //
      //Get the nearest seeds to the reference cell
      const bests: Array<seed> = this.get_nearest_seeds(seeds);
      //
      //Save the result
      result.push({ pollen, seeds: bests });
    }
    //
    return result;
  }

  //Find all seeds with the same shortest distance from the reference cell
  get_nearest_seeds(seeds: Array<seed>): Array<seed> {
    //
    //If there are no seeds, return an empty list
    if (seeds.length === 0) return [];
    //
    // First, find the seed with the shortest distance to the reference cell
    const shortest: seed = seeds.reduce((min, seed) =>
      seed.distance < min.distance ? seed : min
    );
    //
    //Select all seeds that have that  shortest distance to the reference cell
    return seeds.filter((seed) => seed.distance === shortest.distance);
  }

  //Compact further by favoring non-basic values over basic values where
  //the seed evaluates (exp) to the sam basic value
  clean_prefer_non_basic_ovules(input: compact): compact {
    //Destructure the compact input
    const { pollen, seeds } = input;
    //
    //Start with an empty result
    const results: Array<seed> = [];
    //
    //For each input compact...
    for (const ref_seed of seeds) {
      //
      //Find if the reference seed has an expression value that matches
      //another seed in the result. Note the coerced comparison
      const found: number = results.findIndex(
        (seed) => ref_seed.exp == seed.exp
      );
      //
      //If the ref seed is not in the result add it and discontinue the loop
      if (found === -1) {
        results.push(ref_seed);
        continue;
      }
      //
      //The refence seed matches some other in the result.  Determine
      //whether to replace it or not
      //
      //Get the result seed
      const result_seed: seed = results[found];
      //
      //Do not replace the result seed if it is non-basic and the ref is not
      if (
        !mutall.is_basic_value(result_seed.ovule) &&
        mutall.is_basic_value(ref_seed.ovule)
      )
        continue;
      //
      //Replace the result seed with the reference, if the the ref is not
      //a basic and the result is
      if (
        mutall.is_basic_value(result_seed.ovule) &&
        !mutall.is_basic_value(ref_seed.ovule)
      ) {
        //
        //Replace result seed in the the ref
        results[found] = ref_seed;
        //
        continue;
      }
      //
      //The ref and basic are similar; they are either basic values or
      //non-basic values. This is unusual, and need to be reported
      //
      //Leave the status quo, but report this error
      const err: error.tabulator_error = {
        type: "2 non-basics",
        ref: this,
        err: new Error("Unexpected ambiguity"),
        seeds: [result_seed, ref_seed],
      };
      //Save the error
      error.handler.current.save(err);
    }
    //
    //Return the compacted case
    return { pollen, seeds: results };
  }

  //Returns the first principal non-primary column of this cell to be used in
  //deducing the io of this cell
  deduce_column(): column | undefined {
    //
    //The column is undefined if there are no principal seeds
    if (!this.principals) return undefined;
    //
    //If there are no principals, then the fitting failed. The column cannot
    //be deduced....
    if (this.principals.length === 0) return undefined;
    //
    //...otherwise return the first seed that does not have a primary column
    const seed: seed | undefined = this.principals.find(
      (myseed) => !(myseed.col instanceof primary)
    );
    //
    //If the seed is found, return its colum; otherwise return undefined
    return seed ? seed.col : undefined;
  }
}

//export interface cell extends InstanceType<ReturnType<typeof writer>> {}
//
//The record class models a row or colum of a homozone depending on its orientation
//It supports the opening of cells for data entry as well as writing them to
//the database
export class record extends writer {
  //
  //The stylesheet for freezing the page
  static stylesheet?: HTMLStyleElement;
  //
  constructor(
    //
    //The reference cell used to create the record
    public ref: cell,
    //
    //The direction, i.e., orienattion, of this record on the homozone
    public dim: 0 | 1,
    //
    //Requirements for a view
    parent?: view | undefined,
    options?: table_options | undefined
  ) {
    super(parent, options);
  }

  //Returns all the cells of this rceord by traversing the zones in the
  //directippn of  the record
  get cells(): Array<cell> {
    //
    //Starting from the current reference cell, get the root zone
    const zone: root.zone = this.ref.get_root_zone();
    //
    //Collect the cells of this rceord
    const result: Array<cell> = [...zone.collect_record_cells(this)];
    //
    //Retur the result
    return result;
  }

  //
  //The tick mark that defined the record
  get mark(): string {
    return this.ref.index[this.dim];
  }

  //The position of the homozone (that contains the reference cell) in the
  //a heterozone plan, if the homozone is indeed part of a heterozone
  get j(): number {
    //
    const position: number | undefined = this.ref.parent.position?.[this.dim];
    //
    //It is illegal to request for this position when it is undefined
    if (!position) throw new mutall_error(`The j position is undefined`);
    //
    return position;
  }

  //Create a record from a cell
  static create(ref: cell): record {
    //
    //The homozone that contains the new reference cell
    const homozone: homozone = ref.parent;
    //
    //The orientation of the homozone
    const dim: 0 | 1 = homozone.orientation;
    //
    //Let this cell be the parent of the record
    const parent: view = ref;
    //
    //There are no options associatew with the record
    const options: table_options | undefined = {};
    //
    //Create the record
    const Record = new record(ref, dim, parent, options);
    //
    return Record;
  }

  //To initialize does noting, but tabulator requires its implementation
  async init(): Promise<void> {}

  //Fit the record that contains this cell to the current data model, returning
  //the fitted seeds.
  fit_model(): Array<seed> {
    //
    //Starting with an empty list...
    const result: Array<seed> = [];
    //
    //Now collect the seeds by associated with the record of this cell
    for (const cell of this.cells) result.push(...(<cell>cell).fit_model());
    //
    //Remove  duplicates resulting from joining fully described cells
    const result_final = result.reduce<seed[]>(
      (prev, curr) => this.remove_duplicates(prev, curr),
      []
    );
    //
    //Return the final seed collection
    return result_final;
  }

  //Collect seds resulting from sel and cross pollination of the cells of this
  //record
  pollinate(): Array<seed> {
    //
    //Starting with an empty list...
    const result: Array<seed> = [];
    //
    //...collect the seeds associated with this record
    for (const cell of this.cells) result.push(...cell.pollinate());
    //
    //Return the final seed collection
    return result;
  }

  //Returns the axis of this record
  get axis(): root.axis {
    return this.ref.parent.axes[this.dim];
  }

  //
  //Opening a record for editing
  open(): void {
    //
    //Open every cell along the heterozone axis
    for (const cell of this.cells) {
      cell.td.classList.add("open");
    }
    //Put the whole page in frozen mode, except the record being edited
    this.freeze();
  }

  //Closing a record after edit
  close(): void {
    //
    //Remove the open class from every cell in the rceord
    for (const cell of this.cells) {
      cell.td.classList.remove("open");
    }
    //
    //Unfreeze the rest of the page to allow user interactions by
    //remove the stylesheet stylesheet for freezing
    if (record.stylesheet) record.stylesheet.remove();
  }

  //Freeze the page so that users can only interact with this record
  freeze(): void {
    //
    //Do not refreeze if alreadt frozen; it means the cleanup has some issue
    if (record.stylesheet) return;
    //
    //Create a stylesheet for the current document
    record.stylesheet = this.create_element("style", this.document.head);
    //
    //Add the following css rules
    record.stylesheet.textContent = `
            /*
            All tds not classified as 'open' will be inactive*/
            td:not(.open){
                pointer-events: none;
                background-color: #f0f0f0; /* Light gray background */
                color: #888888; /* Gray text */
                border: 1px solid #cccccc; /* Lighter gray border */
            }
            /*
            All tds classified as 'open' will be active*/
            td.open{
                pointer-events: auto;
            }`;
  }
}

//A homozone derived from the axis of a base homozone
export class margin extends homozone {
  //
  constructor(
    public homozone: homozone,
    public dim: 0 | 1,
    options?: table_options,
    parent?: view
  ) {
    //
    //The source of data that drives the margin is the axis of the given base
    //homozone
    const driver_source: driver_source = { type: "axis", dim, base: homozone };
    //
    //Define the default options
    const defaults: table_options = {
      //
      //The io tupe is read-only
      io_type: "read_only",
    };
    //
    //Initialize a homo zone. Note how the user options override the
    //the defaults
    super(driver_source, { ...defaults, ...options }, parent);
  }
  //
  //Classify all cells in this homozone as margin, regardless of what other
  //user defined class may wish
  async init_cell(cell: cell): Promise<void> {
    //
    //Classify the cell directly as margin. This is useful for freezing
    //the margins
    cell.td.classList.add("margin");
    //
    //Continue the normal initialization
    await super.init_cell(cell);
  }

  /*
    This did not give the intended result.
    //Transposing a marging should also consider the base homozone. If it is 
    // transposed, then the margins dimensions should be updated
    transpose():void{
        //
        //Do teh homozone transpose, thus interchanf=ging the axes
        super.transpose();
        //
        //In complement or toggle the dimension
        if (this.homozone.transposed) this.dim = this.dim===0 ? 1: 0;
    } 
    */
}

//The panels namespace
export namespace panel {
  //A general purpose container of ios
  export abstract class container extends view {
    //
    constructor(parent?: view, options?: view_options) {
      super(parent, options);
    }
    //
    //A container can show
    abstract show(): Promise<void>;

    //Show the selection of a container if it is not the parent of the given cell
    //There is no cell to show in the very first show
    abstract show_selection(clicked?: cell): void;
  }

  //Group is a container of panels, similar to a folder.
  export class group extends container {
    //
    constructor(
      //
      public members: Array<container>,
      //
      parent?: view,
      options?: table_options
    ) {
      super(parent, options);
    }

    //
    //To show a group is to show her members
    async show(): Promise<void> {
      //
      //The members must be set by now; show them
      for (const member of this.members) await member.show();
    }

    //Update the selection of the group members, except the one where
    // the click has occurred
    show_selection(cell: cell): void {
      //
      //Remove the cell's panel from the members of this group
      const remainders: Array<container> = this.members.filter((member) => {
        //
        //Get the parent of the cell
        const parent: homozone = cell.parent;
        //
        //Only the cases where the member is not a parent of the cell are
        // desired
        return <view>member !== parent;
      });
      //
      //Now show the selection of the remaining members
      for (const member of remainders) member.show_selection(cell);
    }
  }

  //The homozone for supporting the creation of new records
  export class creator extends margin {
    //
    constructor(
      homozone: homozone,
      dim: 0 | 1,
      options?: table_options,
      parent?: view
    ) {
      //
      //The default settings of a creator
      const defaults: table_options = {
        //
        //The io type of a creator depends on the context
        io_type: "default",
        //
        class_name: "creator",
        //
        //A creator always show in edit mode
        mode: "edit",
      };
      //
      super(homozone, dim, { ...defaults, ...options }, parent);
    }

    // Prevent the default behavior of the onblur event listener, which typically
    // writes to a database. In this case, override it to perform no action.
    async onblur(cell: cell, evt?: Event): Promise<void> {}

    //A creator has no data to display
    async display_data(): Promise<void> {}

    //Set the initial cell values
    async init_io_value(cell: cell): Promise<void> {
      //
      //The io  must be set by now
      cell.io!.value = this.get_default_value(cell);
    }

    //
    //Get the defailt value of a cell from either the user options, frm the
    //underlying database, etc.
    get_default_value(cell: cell): basic_value {
      //
      //If the user has a preference, then use it
      const value: basic_value | undefined =
        cell.search_option("default_value");
      if (value) return value;
      //
      //Read the value from the database -- depending on the first non-primary
      //seed for this cell
      return this.get_default_value_from_db(cell);
    }
    //
    //Set the io of the given cell to its default value
    get_default_value_from_db(cell: cell): basic_value {
      //
      //Get the principal seeds of the cell
      const seeds: Array<seed> | undefined = cell.principals;
      //
      //Only cells where a principals exist are considerd
      if (seeds && seeds.length > 0) {
      } else return null;
      //
      //Get the first 1 principal seed.
      const seed: seed = seeds[0];
      //
      //Extract the database column of the seed
      const value: basic_value = seed.col.default;
      //
      //If the default value is empty, then ignore it
      if (value === "" || value === null) return null;
      //
      //If the value has an opening and closing bracket, then its a function
      //evaluate it; otherwise use it to set the default value
      const mydefault: basic_value = value.endsWith("()")
        ? this.evaluate_mysql_expr(value)
        : value;
      //
      //Set the cell's io value. It must exist
      return mydefault;
    }

    //Evaluate a mysql expression to get a basic value
    evaluate_mysql_expr(str: string): basic_value {
      //
      //If the default value is a null string, return a null value
      if (str === "null") return null;
      //
      //If the default valus is a timestamp, then return today's date
      if (str === "CURRENT_TIMESTAMP()") return this.get_todays_date();
      //
      //Alert the user of this new default expression
      throw new mutall_error(`Unable to evaluate ${str}`);
    }
  }

  //The homozone to support reviewing of records
  export class reviewer extends margin {
    //
    constructor(
      //
      //The base homozone from which this margin is based
      homozone: homozone,
      //
      //The orientation of the margin
      dim: 0 | 1,
      //
      //Will the radio button come out checked or not? The default is unchecked
      public checked: boolean = false,
      //
      //What will the onchange event do: open a record or save it?
      public action: "open" | "write",
      //
      options?: table_options,
      parent?: view
    ) {
      //
      super(homozone, dim, options, parent);
      //
      this.options = {
        //
        //A creator always show in edit mode
        mode: "edit",
        //
        //The user may wish to override the above options
        ...options,
      };
    }
    //
    //Overrde the cell initialization to add radio buttons named after the cell's
    //index
    async init_cell(cell: cell): Promise<void> {
      //
      //Use the cell's index to deduce  its radio name.
      //
      //The orientation of the cell depends on whether the parent is
      //transposed or not. Its the row index we need if the parent homozone
      // //is not transposed
      const dim: 0 | 1 = !cell.parent.transposed ? 0 : 1;
      //
      //Read the cell's index value
      const index: string = cell.index[dim];
      //
      //Ensure that the index is a valid name by prefixing it with an i
      const name: string = `i${index}`;
      //
      //Add the checkbox io type before initialization, not checked. NB. The
      // user can override this option via cell options
      cell.options = {
        io_type: { type: "radio", name, checked: this.checked },
      };
      //
      //Continue with normal initialization
      await super.init_cell(cell);
    }

    // Prevent the default behavior of the onblur event listener, which typically
    // writes to a database. In this case, override it to perform no action.
    async onblur(cell: cell, evt?: Event): Promise<void> {}

    //Override the onclick even so that when we do on the 'open' review panel
    // panel it has the same effect as clicking on the panel homozone
    async onclick(cell: cell, evt: MouseEvent): Promise<void> {
      //
      //Only teh open action is considered
      if (this.action !== "open") return;
      //
      //Get the primary key tick mark
      const pk: string = cell.index[this.orientation];
      //
      //Get the homozone associated with this reviewer
      const zone: homozone = this.homozone;
      //
      //The consumer's selection field has the other tick mark
      const selection = zone.selection_cname;
      //
      //Use the consumer orientation to get the row and column coordinates
      const [row, col] = this.orientate([pk, this.orientation], selection);
      //
      //Get the consumer cell on which to simulate the click event
      const cell2: cell = zone.cells_indexed![row][col];
      //
      //Now simulate the onclick event on the consumer
      zone.onclick(cell2);
    }

    // The onchange event behavior is determined by the values of the action
    // property: "open" or "write".
    // - If the action is "open", it creates a new record and opens it.
    // - If the action is "write", it writes the record to the database and,
    // upon success, refreshes the heterozone.
    async onchange(cell: cell, evt: MouseEvent): Promise<void> {
      //
      //If the user wishes to handle this event themselves, then respect it.
      let onchange: listener | undefined;
      if ((onchange = this.search_option("onchange"))) await onchange(cell);
      //
      //If the user does not want he default behaviour, then respect it
      //
      //The homozone of the record is the same as that of ths reviewer
      // The dimension of the record is the same as that of the reviewer
      // The parent of a record is this reviewer
      //There are no explicit options associated with this record
      const myrecord = new record(cell, this.orientation, this, {});
      //
      // Use a switch statement to handle the specific action type
      switch (this.action) {
        //
        // If the action is "open", create a new record and open it
        case "open":
          return myrecord.open();
        //
        // If the action is "write", attempt to write the record to the database
        case "write":
          //
          // Write the record to the databnase
          const ok: boolean = await myrecord.write();
          //
          //Uncheck the io if the writing failed
          if (!ok && cell.io instanceof radio) cell.io.input.checked = false;
          //
          //If sucessful, refresh the homozone, unless the user has
          // denied it
          const found: boolean | undefined = this.search_option(
            "refresh_after_write"
          );
          const refresh: boolean = found === undefined ? true : found;
          //
          //Refresh if necessary
          if (refresh) await this.refresh();
          //
          //close the record so that it is not left hanging
          myrecord.close();
          break;
      }
    }
  }

  //The homozone to support cleaning/deleting of records
  export class deleter extends homozone {
    //
    constructor(
      driver_source?: driver_source | undefined,
      options?: table_options,
      parent?: view
    ) {
      super(driver_source, options, parent);
    }
  }

  //
  //A panel is a homozone which has a heterozone to organize her siblings. It is
  // also a leaf container. In contrast a group is another container (which can
  // hold panels and other containers). This allows us to build a panel/container
  // hierarchial model used for managing the Balansys page
  export abstract class panel extends homozone implements container {
    //
    //The heterozone that organises the zones adjacent to this panel
    public organizer: heterozone;
    //
    //Every panel must have a plan of how her siblings are laid out.
    public abstract plan: plan;
    //
    //Show the selection of a panel if:-
    // - it is not the parent of the given cell
    // - there is a valid selection.
    public abstract show_selection(cell?: cell): void;
    //
    //Enforce options and parent to be definite
    declare options: table_options;
    declare view: view;
    //
    constructor(
      ds: driver_source,
      public anchor: HTMLElement | string,
      options: table_options,
      parent: view
    ) {
      super(ds, options, parent);

      //
      //Set the organizing heterozone. NB.The anchor is aded to the user defined
      //options. The plan is not known until show time. The panel's
      //options are pased to the organizer heterozone so that they are accessible
      //from the view hierarchy
      this.organizer = new heterozone(
        undefined,
        { anchor, ...options },
        parent
      );
    }

    //Simulate the onclick event after a reviewer has changed. The given cell
    //is from the reviewer; we need to construct one that matches the consumer,
    //then simulate the consumer's click event
    async onclick_from_reviewer(cell: cell): Promise<void> {}

    //Tests if this panel is transposed or not. It is transposed an option
    //suugests so
    get is_transposed(): boolean {
      //
      //
      //By default, a panel is not transposed. If it is, then searching for the
      //option should return true.
      //Get the nearest transposition option
      return this.search_option("transposed") ?? false;
    }

    //
    //The panel show method overrides the normal version by showing that of the
    // organizing heterozone
    async show(): Promise<void> {
      //
      //Before showing a panel, adjust her driver sql to include a condition
      //that respects the transcription display settings. This depends on the
      //panel in question
      await this.modify_driver();
      //
      //Set this organizer's plan to match that of this panel;
      this.organizer.plan = this.plan;
      //
      //Show the organizing heterozone instead
      await this.organizer.show();
      //
      //Highlight the current selection and scroll it into view
      this.show_selection();
    }
    //
    //Before showing a panel, adjust her driver sql to include a condition
    //that respects the transcription display settings
    abstract modify_driver(): Promise<void>;
  }

  //The editor panel to support the 'crud' functionality for foreign key fields
  export class editor extends panel {
    //
    //The creator subpanel has this panel as the homozone; its a margin oriented
    // columnwise
    creator = new creator(this, 1);
    //
    //The io of an editor is the same as the parent
    get io(): foreign_io {
      return this.parent;
    }

    //The plan of an editor is a standard panel with ability to create new
    //images
    public plan: plan = [
      //
      //The headers
      [new homozone(), this.get_header(), new homozone()],
      //
      //The left reviewer is unchecked and will open the record if checked; the
      // right review is already checked and will be used for wriring the record
      [
        new reviewer(this, 0, false, "open"),
        this,
        new reviewer(this, 0, true, "write"),
      ],
      //
      //The record create functionality. The only reviewer on the right is unchecked
      // will write the record if checked
      [
        new homozone(),
        this.creator,
        new reviewer(this.creator, 0, false, "write"),
      ],
    ];
    //
    //Emphasize that teh parent of an editor is the foreign key io
    declare parent: foreign_io;
    //
    constructor(
      anchor: HTMLElement,
      parent: foreign_io,
      //
      //User supplied options at the editor level
      options: table_options
    ) {
      //
      //The entity and database names come from the referenced entity
      const { ename, dbname } = parent.col.ref;
      //
      //Use the sql to formulate a driver
      const ds: driver_source = {
        type: "ename",
        ename,
        dbname,
      };
      //
      //Initialize the homozone
      super(ds, anchor, options, parent);
    }
    //
    //This panel does not modify driver during show
    async modify_driver(): Promise<void> {}

    //
    //Returns the selected primary key (and her friend) from an editor
    get_selection(): [pk: number, friend: string] | undefined {
      //
      //Get the root zone; thats where the selected cell resides
      const zone: root.zone = this.get_root_zone();
      //
      //Get the selected cell
      const cell: cell | undefined = zone.selection;
      //
      //If there is no selection, the retirn undefined
      if (!cell) return;
      //
      //Get the indexing marker that is in the zone's orientation
      const pk: string = cell.index[this.orientation];
      //
      //Retrieve the friendly component
      //
      //Formulate the name of the friend
      const fname: string = `${this.parent.col.ref.ename}_friend`;
      //
      //Use the fname to define the row(or col) of the friend cell
      const [row, col] = this.orientate([pk, this.orientation], fname);
      //
      //Get the cell that has the friend
      const friend: cell = this.cells_indexed![row][col];
      //
      //Return the desired tuple
      return [parseInt(pk), String(friend.io!.value)];
    }

    //
    //Show the selected record, guided by the io's value
    show_selection(): void {
      //
      //If the marker is null, then do nt show a selection
      if (!this.io.value) return;
      //
      //Get the column index of the desired cell; it is the same one used for
      //displaying a selection
      const [row, col] = this.orientate(
        [String(this.io.value), this.orientation],
        this.selection_cname
      );
      //
      //Get the indexed grid from the indexed cells of this homozone
      const cell: cell = this.cells_indexed![row][col];
      //
      //Now select the grid as a cell
      cell.select();
      //
      //Scroll the td containg the io to the view
      cell.td.scrollIntoView({ block: "center" });
    }
  }
}
