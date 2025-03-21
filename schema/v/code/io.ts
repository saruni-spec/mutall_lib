import {
  basic_value,
  column,
  mutall_error,
  foreign as schema_foreign,
  view,
  view_option_interface,
} from "./schema.js";
//
import { label as qlabel } from "../../../schema/v/code/questionnaire.js";
//
import { panel } from "../../../outlook/v/zone/zone.js";
//
//The simple input/output types commonly implememnted using the
//input tag. See the html web reference for details.
export type input_type =
  | "date"
  //
  //The text is an input element with more precise specifications
  //For instance, {type:'text', size:4} is a text element of length 4
  //Size refers to typeing area in pixels; maxlength length is
  //relevant to database field size
  | { type: "text"; size?: number; maxlength?: number }
  //
  | "number"
  | "email"
  | "checkbox"
  //
  //The new fuller method of defining io types has been applied to the radio
  | { type: "radio"; name: string; checked: boolean };

//
export type file_type =
  //To support management of graphic inputs to a database where the files that
  //reference the image are located either remotely or locally.
  | "image"
  //
  //General file support, other than images
  | "file";

//
//This is the input/output type specification of Mutalldata database columns
//used to determine the kind of the input used for column data entry.
export type io_type =
  //
  //A general input element
  | input_type
  //
  //Other more more sophisticated input/output types of values
  //
  //Where a span tag is used for showing data both in input and output modes
  | "read_only"
  //
  //Single or multiple choice responses, implemented as a set of
  //radio or checkboxes respectively
  | "radios"
  | "checkboxes"
  //
  //The primary key value of a record. It has 2 components: the value -- which
  //is a read-only numeric value and a checkbox to support multi-record selection
  | {
      type: "primary";
      show_values?: boolean;
      button?: { type: "checkbox" | "radio"; name: string };
    }
  //
  //The foreign key value of a record has 2 components: the numeric key value
  //needed for writing data to a database and a friendly componet used for
  //display
  | "foreign"
  //
  //This input, unlike the simple case, uses the textarea element. The value
  //of a textarea is accessec via the textContent property
  | "textarea"
  //
  //Like the foreig case, an url io models an proxy tag. It has 2 parts as:
  //a source -- corresponding to the src attribute of an proxy tag and the
  //textContent of the tag
  | "url"
  //
  //A select input is a drop down input whose values are the enumerated
  //entries of a database column
  | "select"
  //
  //General file support, other than images
  | file_type;
//
//Extending the view options with tose of an io
export interface io_option_interface extends view_option_interface {
  //
  //The io's value cannot be null. NB. The io converts an ampty string to a null
  required: boolean;
  //
  //A user-friendly referece name to an io, as opposed to the shorter
  // programming-friendly id
  label: string;
  //
  //The database schema column to support crud services. The labels option
  //of a view should make this option unnecessary. We retain it for backward
  // compatibility reason. Consider deprecating it
  col: column;
}
//
//derive io options from the interface
export type io_options = Partial<io_option_interface>;
//
//The input element types that can listen to the on blur (and onfocus)
//events of an io
export type listener =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;
//
//Why this class? The original motivation resulted from the Theme class becoming
//too large; the io class was conceived in an attempt to offload certain 'related'
//methods from Theme class.
//Later its purpose was extended to cater for
//- complex inputs, i.e., one where more
//than one input element is required to implement a more user-friendly less
//error- prone mecahnism for collecting user inputs, e.g., a single choice input
//using radio buttons, a summary/detail arrangement where futher input details
//become available when necessay (see the fluctuate concept)
//-linking forms  to a database via the datanase::column interface
export abstract class io extends view {
  //
  //This span tag is for displaying this io's content in normal, i.e., non-edit
  //mode
  public output: HTMLSpanElement;
  //
  //Dictionary of looking up ios using the proxying HTML element.
  static collection: Map<HTMLElement, io> = new Map();
  //
  //To support value restoration, save the original one here.
  public original_value?: basic_value;
  //
  //The HTLL elements of this io that can listen to the onblur events
  public abstract get listeners(): Array<listener>;
  //
  //The html element that wraps all the other html elements that makeup this io
  get proxy() {
    return this.__proxy;
  }
  //
  //Redefune options too io_options, thus making column available
  declare options: io_options;
  declare parent: view;
  //
  constructor(
    //
    //The parent element of this io, e.g., the td of a tabular layout.
    public __proxy: HTMLElement,
    //
    public io_type: io_type,
    //
    parent: view,
    //
    //Options for controlling the io behaviour
    options: io_options
  ) {
    //Initialize the parent view
    super(parent, options);
    //
    //Set the ouput span element
    this.output = this.create_element("span", this.proxy, {
      className: "normal",
    });
    //
    //Once an io is created, update the global dictionary for associating
    //io's with their  corresponding tds
    io.collection.set(this.proxy, this);
  }

  //Redefine the searching of options to include those of io
  search_option<i extends keyof io_option_interface>(
    key: i
  ): io_option_interface[i] | undefined {
    //
    return <io_option_interface[i]>(
      super.search_option(<keyof view_option_interface>key)
    );
  }

  //Deduce the io from the given database column
  static deduce_io(
    //
    //The parent element and view where this io is to be proxyed.
    proxy: HTMLElement,
    //
    //The database column to be used for deriving the io
    col: column,
    //
    //The parent view allows an io to take part in the view hierarchy
    parent: view,
    //
    myoptions: io_options
  ): io {
    //
    //Add the column to the available options
    const options: io_options = { ...myoptions, col };
    //
    //A read only column will produce a matching
    if (col.read_only) return new readonly(proxy, parent, options);
    //
    //Attend to the foreign and primary key columns
    //
    //The earlier version of primary io was designed for outputing entities
    //in a friendly way; for the tabulation work, we need the io to be a
    //read-only. I dont know how to recconcile the 2 views, but for now, let
    //it readonly. I have reverted back to the earlier approach:
    if (col instanceof primary)
      return new primary(proxy, undefined, undefined, parent, options);
    //
    //Foreign key columns have a matching io
    if (col instanceof schema_foreign)
      return new foreign_io(proxy, col, parent, options);
    //
    //Attend to the attributes
    //
    //A column is a checkbox if...
    if (
      //
      //... its name is prefixed by 'is_'....
      col.name.startsWith("is_") ||
      //
      //...or its datatype is a tinyint..
      col.data_type === "tinyint" ||
      //
      //...or the field length is 1 character long
      col.length === 1
    )
      return new input(proxy, "checkbox", parent, options);
    //
    //If the length is more than 100 characters, then assume it is a textarea
    if (col.length >= 100)
      return new textarea(proxy, undefined, parent, options);
    //
    //If the column name is 'description', then its a text area
    if (col.name === "description")
      return new textarea(proxy, undefined, parent, options);
    //
    //Timestamps should rendere as read-only inputs, so that users are not
    //tempted to change them
    if (col.type === "timestamp") return new readonly(proxy, parent, options);
    //
    //Time datatypes will be returned as dates.
    if (["date", "time", "datetime"].find((dtype) => dtype === col.data_type))
      return new input(proxy, "date", parent, options);
    //
    //The datatypes bearing the following names should be presented as images
    //
    //Images and files are assumed  to be already saved on the
    //remote serve.
    if (
      ["logo", "picture", "profile", "image", "photo"].find(
        (cname) => cname === col.name
      )
    )
      return new file(proxy, "image", parent, options);
    //
    //If a column is suggested in a way that it suggestes a file, then create
    //a file object
    if (col.name === "filename" || col.name === "file")
      return new file(proxy, "file", parent, options);
    //
    //URL
    //A column is a url if...
    if (
      //
      //... its name matches one of the following ...
      ["website", "url", "webpage"].find((cname) => cname === col.name)
    )
      return new url(proxy, parent, options);
    //
    //SELECT
    //The io type is select if the select propety is set at the column level
    //(in the column's comment).
    //Select requires column to access the multiple choices.
    if (col.data_type == "enum") return new select(proxy, parent, options);
    //
    //String datatypes will be returned as normal input text. The size of the
    //text is important
    if (["varchar", "text"].find((dtype) => dtype === col.data_type))
      return new input(proxy, { type: "text" }, parent, options);
    //
    if (
      [
        "float",
        "double",
        "int",
        "decimal",
        "serial",
        "bit",
        "mediumInt",
        "real",
      ].find((dtype) => dtype === col.data_type)
    )
      return new input(proxy, "number", parent, options);
    //
    //The default io type is read only
    return new readonly(proxy, parent, options);
  }
  //
  //Transfer focus to the key input element of this  By default, this does
  //nothing. It is useful for real, i.e., non-abstract, user inputs
  focus(): void {}
  //
  //Returns the document to which the proxy is attached;
  get document() {
    return this.proxy.ownerDocument;
  }
  //
  //Restore the original value
  public restore(): void {
    //
    //Restore the original value. It must be set. It is an error if it not
    if (this.original_value === undefined)
      throw new mutall_error(`The original value of this io is not set`);
    //
    //Re-set the value to the original one.
    this.value = this.original_value;
  }
  //
  //This method is called to mark this io's proxy (td) and its associated
  //primary key td as edited. This is important for selecting the tds that
  //should be considered for saving.
  //It also ensures that the io's input values are transferred to the output
  //tag to be visible to the user in the io's fashion
  mark_as_edited(): void {
    //
    //Mark the proxy of this io as edited
    this.proxy.classList.add("edited");
    //
    //Get primary key td (of the row that contains
    //this td) and mark it as edited. It is the first td in the table row
    //than contains this io's proxy
    const pri = this.proxy.parentElement!.children[0]!;
    pri.classList.add("edited");
    //
    //Update the outputs of the io associated with the td
    //
    //Use the dictionary to get io that matches this proxy
    const Io = io.collection.get(this.proxy);
    //
    //Its an error if there is no io associated with this proxy
    if (Io === undefined) {
      throw new mutall_error(`No io found at ${String(Io)}`);
    }
    //
    //Do the transfer to update inputs
    this.update_outputs();
  }

  //
  //A helper function for creating and showing labeled inputs element.
  public show_label(
    //
    //The header text of the label
    text: string | HTMLSpanElement,
    //
    //Child elements of the label
    ...elements: HTMLElement[]
  ): HTMLLabelElement {
    //
    //Create the label and attach it to the proxy.
    const Label = this.document.createElement("label");
    this.proxy.appendChild(Label);
    //
    //Create a text node if necessary and attach it to the label.
    const header =
      text instanceof HTMLElement ? text : this.document.createTextNode(text);
    Label.appendChild(header);
    //
    //Attach the labeled elements
    elements.forEach((element) => Label.appendChild(element));
    //
    return Label;
  }
  //
  //Setting and getting io values rely on the input's value
  get value(): basic_value {
    //
    //Get the raw value
    const raw: basic_value = this.input_value;
    //
    //If the raw value is an empty string, then return a null
    if (raw === "") return null;
    else return raw;
  }
  set value(v: basic_value) {
    //
    //To supprt value restoration, save the original one here
    this.original_value = v;
    //
    //Depending on the io, set its input value
    this.input_value = v;
    //
    //Ensure that the output is updated from the inputs
    this.update_outputs();
  }
  //
  //Get and set the input values of an io object.
  abstract get input_value(): basic_value;
  abstract set input_value(v: basic_value);
  //
  //
  //Transfer data from the input tags of an proxy element to
  //the output tags, thus updating the normal mode
  abstract update_outputs(): void;
  //
  //Show this io's elements in the desired order. For now this
  //methods does nothing, implying that the order in which elements
  //are created is the same as that of displaying them. You override
  //this method if you want to change the order. See the file_io example
  show(): void {}
  //
  //Create an io instance using the optional io type. If the io type is not
  //given, deduce it from the database column's data type.
  static async create_io(
    //
    //The parent of the input/output elements of this
    proxy: HTMLElement,
    //
    //The type of  If available, we use it to define the io; if not we
    //deduce it from the column
    type: io_type | undefined,
    //
    parent: view,
    //
    //The column associated with this io, if available.
    options: io_options
  ): Promise<io> {
    //
    //We must be able to define the io type (or an actual io) from either
    //the type or the column.
    const result: io_type | io = io.get_io_type(proxy, options, parent, type);
    //
    //If the result is an io, return it
    if (result instanceof io) return result;
    //
    //Use the resulting io type to formulate the  io instance
    switch (result) {
      //
      //For simple io types that use the standard HTML input element...
      case "date":
      case "number":
      case "email":
        return new input(proxy, result, parent, options);
      //
      //For the more sophisticated io types....
      //
      //A single checkbox used for representing a boolean io
      case "checkbox":
        return new checkbox(proxy, parent, options);
      //
      //Single or multiple choices implemented as a set of radio or
      //checkbox inputs
      case "checkboxes":
        return new choices(proxy, "multiple", parent, options);
      case "radios":
        return new choices(proxy, "single", parent, options);
      //
      //Inputs collected using a textaera element
      case "textarea":
        return new textarea(proxy, undefined, parent, options);
      //
      //Read only fields
      case "read_only":
        return new readonly(proxy, parent, options);
      //
      //Working with images
      case "image":
        return new image(proxy, parent, options);
      //
      //Take care of the more complex specs, the future of io
      default:
        if (
          //Text io are specified as an object...
          typeof result === "object" &&
          //
          //...that has a type field....
          result.type !== undefined
        ) {
          switch (result.type) {
            case "text":
              //
              //Destructure the result to data type and size
              const { type, size } = result;
              //
              return new input(proxy, { type, size }, parent, options);
            case "primary": {
              return new primary(
                proxy,
                result?.show_values,
                result?.button,
                parent,
                options
              );
            }
            //
            case "radio": {
              return new radio(
                result.name,
                result.checked,
                proxy,
                parent,
                options
              );
            }
          }
        }
        //
        //This io specification is not handled
        else {
          throw new mutall_error(`This io_type '${result}' is not handled`);
        }
    }
  }

  //Returns an io or its type. If both the type and column are define, the
  //type takes precedence. It is an error if  neither type nor colum is defined
  static get_io_type(
    proxy: HTMLElement,
    options: io_options,
    parent: view,
    type?: io_type
  ): io_type | io {
    //
    //If the type is defined, return it
    if (type) return type;
    //
    //If the database column is known, deduce the io type from it
    if (options?.col) return io.deduce_io(proxy, options.col, parent, options);
    //
    //Neither the col nor the type is defined: it must be an error
    throw new mutall_error(
      `Neither the io_type nor the dabase column is defined `
    );
  }

  //Use the io collection to lookup the io associated with the given
  //html element (yypically a td). There must be one.
  static get_io(td: HTMLElement): io {
    //
    //Lookup the given td
    const Io = io.collection.get(td);
    //
    //The io must be defined
    if (Io === undefined)
      throw new mutall_error(`No io found for this proxying element`);
    //
    //Return the io
    return Io;
  }

  //
  //Returns the label layout for this io value. See the questionnaire
  //interface for label and table layouts. By default, the alias is empty
  get_label_layout(alias: Array<basic_value> = []): qlabel {
    //
    //The value of the io, as teh expression for the desired label
    const exp = this.value;
    //
    //Get the column associated with this io
    const col: column | undefined = this.options?.col;
    //
    //The column must be defined
    if (col === undefined)
      throw new mutall_error(
        "No column (col) property option is found for this io"
      );
    //
    //The database column name associate with this  It must exist
    const cname = col.name;
    //
    //The name of the database entity in which the col is found
    const ename = col.entity.name;
    //
    //The datase name where the entity is found
    const dbname = col.entity.dbase.name;
    //
    //Return the complete label
    return [exp, ename, cname, alias, dbname];
  }

  //Check if an io's value is valid or not. If not, report it as close as
  //possible to its origin; otherwise add it to a report tag if any. If there
  //is no report tag, alert the user. Finally return its value.
  check_input(): basic_value | Error {
    //
    //Get the io's value
    const value: basic_value = this.value;
    //
    //Get the io's requirement. By default, all io's are required, unless
    //explicity stated using the data-optional attribute
    const is_required: boolean =
      //
      //If the data-optional attribute is available...
      "data-optional" in this.proxy.dataset
        ? //
          //..then require is false; otherwise it is true
          false
        : true;
    //
    //Get the io's status:Error or basic value
    const status: basic_value | Error =
      //
      //If the value is required and it is a null...
      is_required && value === null
        ? //
          //...then the status is error;
          new Error("This value is required and it is empty")
        : //
          //...otherwise the value is the status
          value;
    //
    //If the status is erroneous, then add it to the error report
    if (status instanceof Error) this.error.textContent += status.message;
    //
    //Return the status
    return status;
  }

  //The nameid of an io, if provided, is used for indexing its value, so that we
  //can easily access it for futher processing with an form. If not provided,
  //and the io is  column-base, it is formed by combining the entity and
  //column names; we don't we return undefined.
  //NB. Id is a property for identifybing a view
  get name(): string | undefined {
    //
    //Let id be the desired column name
    let id: string | undefined;
    //
    //Get and return the io's id, if it is present
    if ((id = this.proxy.id) !== null) return id;
    //
    //get the column associated with this io
    const col: column | undefined = this.options?.col;
    //
    //If the io is not column based, then the id id undefined
    if (col === undefined) return undefined;
    //
    //Formulate the id by joining ename to cname;
    return `${col.entity.name}_${col.name}`;
  }

  //Returns the error notification tag for this  There must be one
  get error(): HTMLElement {
    //
    //Get any error tag hat is a descendant of this element's io
    const tag: HTMLElement | null = this.proxy.querySelector(".error");
    //
    //If not  found, throw an excepetion
    if (tag === null)
      throw new mutall_error(
        `Cannot fine the error reporting tag for this io`,
        this
      );
    //
    return tag;
  }
}
//
//This io class models a single choice selector from an enumerated list that is
//obtained from column type definition.
export class select extends io {
  //
  //The selector element.
  public input: HTMLSelectElement;
  //
  //The input element used for listening to the onblur and onfocus
  //event for this io
  get listeners() {
    return [this.input];
  }
  //
  constructor(
    proxy: HTMLElement,
    //
    //The source of our selector choices
    parent: view,
    options: io_options
  ) {
    super(proxy, "select", parent, options);
    //
    //Set the input select element
    this.input = this.create_element("select", this.proxy, {
      className: "edit",
      //
      //When the input changes, then mark the current proxy (td) as edited
      onchange: () => this.mark_as_edited(),
    });
    //
    //Get the selection choices (in which case a column must be somewhat
    //specified)
    const col: column | undefined = options?.col;
    if (!col) throw new mutall_error(`No choices found for this selector`);
    //
    //Get the choices from the column attribute.
    const choices: Array<string> = this.get_choices(col.type);
    //
    //Add the choices to the selector
    choices.forEach((choice) =>
      this.create_element("option", this.input, {
        value: choice,
        textContent: choice,
        id: choice,
      })
    );
  }

  //Transfer focus to this io
  focus(): void {
    this.input.focus();
  }
  //
  //Extract the choices found in a column type.
  //The choices have a format similar to:- "enum('a', 'b', 'c', 'd')" and we are
  //interested in the array ["a","b","c","d"]
  get_choices(choices: string): Array<string> {
    //
    //Remove the enum prefix the leading bracket.
    const str1 = choices.substring(5);
    //
    //Remove the last bracket.
    const str2 = str1.substring(0, str1.length - 1);
    //
    //Remove the single quetes
    const str3 = str2.replace(/'/g, "");
    //
    //Use the comma to split the remaining string into an array.
    const strs = str3.split(",");
    //
    //Trim the result
    return strs.map((str) => str.trim());
  }
  //
  //The value of a select io is the value of the selected option
  get input_value() {
    return this.input.value;
  }
  set input_value(i: basic_value) {
    //
    //Get the option about to be set.
    this.input.value = String(i);
  }
  //
  //The displayed output of a select is the text content
  //of the selected option
  update_outputs() {
    //
    //Transfer the input value to the output.
    this.output.textContent = this.input.value;
  }
}

//
//This io class models an proxy tag.
export class url extends io {
  //
  //The output is an anchor tag overides the span output.
  public output: HTMLAnchorElement;
  //
  //The input for the address(href)
  public href: HTMLInputElement;
  //
  //The friendly component of an proxy tag
  public text: HTMLInputElement;
  //
  //The text element is the proxy for this io
  get listeners() {
    return [this.text];
  }
  //
  constructor(proxy: HTMLElement, parent: view, options: io_options) {
    super(proxy, "url", parent, options);
    //
    this.output = this.create_element(`a`, this.proxy, { className: "normal" });
    //
    //Create a the url label
    const url_label: HTMLLabelElement = this.create_element(
      `label`,
      this.proxy,
      { className: "edit", textContent: "Url Address: " }
    );
    //
    //Attach the url input tag to the label
    this.href = this.create_element(`input`, url_label, {
      type: "url",
      //
      //When the input chamges, then mark the current proxy(td) as edited
      onchange: () => this.mark_as_edited(),
    });
    //
    //Create a text label
    const text_label: HTMLLabelElement = this.create_element(
      `label`,
      this.proxy,
      {
        className: "edit",
        textContent: "Url Text: ",
      }
    );
    //
    //Add this text tag to the the label
    this.text = this.create_element(`input`, text_label, {
      type: "text",
      //
      //Add a listener to mark this text element as edited.
      onchange: () => this.mark_as_edited(),
    });
  }

  //Transfer focus to this io; use the href to receive the focus
  focus(): void {
    this.href.focus();
  }

  //
  //Setting the value as a url involves a parsing the value if it
  //is not a null and initializing the url and text inputs.
  set input_value(i: basic_value) {
    //
    //Convert the value  to a js object which has the following
    //format '["address", "text"]'(taking care of a null value)
    const [address, text] =
      i === null
        ? [null, null]
        : //
          //The value of a url must be of type string otherwise
          //there is a mixup datatype
          JSON.parse((<string>i).trim());
    //
    //Set the inputs
    this.href.value = address;
    this.text.value = text;
  }
  //
  //Updating the url involves transfering values from the
  //input tags to the proxy tags.
  update_outputs() {
    this.output.href = this.href.value;
    this.output.textContent = this.text.value;
  }
  //
  //The value of a url is a string of url/text tupple
  get input_value() {
    //
    //Return a null if the address is empty...
    const rtn =
      this.href.value === ""
        ? null
        : //
          //... otherwise return  url/text values as a stringified
          //tupple.
          JSON.stringify([this.href.value, this.text.value]);
    return rtn;
  }
}

//
//The duo checkbox io is used for capturing 2 values: true or false
export class checkbox extends io {
  //
  //The output checkbox that is shown as disabled
  public output: HTMLInputElement;
  //
  //The input checkbox
  public input: HTMLInputElement;
  //
  //The input element is the proxy for this io
  get listeners() {
    return [this.input];
  }
  //
  constructor(proxy: HTMLElement, parent: view, options: io_options) {
    super(proxy, "checkbox", parent, options);
    //
    //The nomal mode for this io is the same as the edit.
    //The difference is that the output element is disabled
    this.output = this.create_element(`input`, this.proxy, {
      type: "checkbox",
      disabled: true,
      className: "normal",
    });
    //
    //This checkbox is used for capturing inputs
    this.input = this.create_element(`input`, this.proxy, {
      //
      type: "checkbox",
      //
      //This checkbox is used for recording non-null values
      className: "edit value",
      //
      //Mark the parent td as edited if the input checkbox is clicked on
      onclick: () => this.mark_as_edited(),
    });
  }
  //
  //The check boxes have no particular show requirements
  show(): void {}

  //Transfer focus to this io
  focus(): void {
    this.input.focus();
  }

  //
  //The value (fit for writing to a database) of a check box is the
  //checked status of the input.
  get input_value() {
    return this.input.checked ? 1 : 0;
  }
  //
  //If the ipnut is true, then the radio is checked; otherwise it is not
  set input_value(i) {
    this.input.checked = i ? true : false;
  }
  //
  //Update outputs from inputs.
  update_outputs() {
    //
    this.output.checked = this.input.checked;
  }
}

//
//Read only class represents an io that is designed not
//to be edited by the user directly, e.g., KIMOTHO'S
//real estate, time_stamps, etc.
export class readonly extends io {
  //
  //A read-only by defineition has no element that can lose focus
  get listeners() {
    return [];
  }
  //
  constructor(proxy: HTMLElement, parent: view, options: io_options) {
    super(proxy, "read_only", parent, options);
    //
    //Read only cells will be specially formated
    this.output = this.create_element(`span`, this.proxy, {
      className: "read_only",
    });
  }
  //
  //The read-only value come from the output tag
  get input_value() {
    return this.output.textContent;
  }

  //A user cannot set a rea-only value, but, a programmer can...
  set input_value(i) {
    //
    //...by changing the text content of the output element
    this.output.textContent = i;
  }
  //
  //The read only values do not change.
  update_outputs(): void {}
}

//The class of ios based on the simple input elemnt.
export class input extends io {
  //
  //The element that characterises an input
  public input: HTMLInputElement;
  //
  //The input element is the proxy
  get listeners() {
    return [this.input];
  }
  //
  constructor(
    //
    //The proxy/parent of this element, e.g., td for tabular layout
    proxy: HTMLElement,
    //
    //The type of the input, e.g., text, number, date, etc.
    public input_type: input_type,
    //
    //The database column and other options associated with this io, if available
    parent: view,
    options: io_options
  ) {
    //
    //The 'element input type' of an 'input io' is the same as that
    //of the input tag
    super(proxy, input_type, parent, options);
    //
    //Compile the input tag
    this.input = this.create_element("input", this.proxy, {
      type: this.to_string(input_type),
      //
      //In edit mode, this will be visible
      className: "edit",
      onchange: () => this.mark_as_edited(),
    });
    //
    //Set the input size and maxlen if they are defined
    //
    //Let x be a number to work with
    let x: number | undefined;
    //
    //Set size of typing space in characters if its defined
    if ((x = this.get_size())) this.input.size = x;
    //
    //Set the maximum length of characters that you can type in an input (if
    //it is defined)
    if ((x = this.get_maxlength())) this.input.maxLength = x;
  }

  //Get the visible number of charaters of an input. Return the user's preference
  //if available; otherwise return the maxlengtth
  get_size(): number | undefined {
    //
    //If the size is provided somewhere in the view hierarchy, then respect it
    const len: number | undefined = this.search_option("size");
    if (len) return len;
    //
    //Return the maximumn number of characters provided
    return this.get_maxlength();
  }

  //Returns the maximumn number of characters that you can type. This is
  //designed to match the requirements of a database column
  get_maxlength(): number | undefined {
    //
    //If the maximumn number of characters is provided somewhere in the view
    //hierarchy, then respect it
    const len: number | undefined = this.search_option("maxlength");
    if (len) return len;
    //
    //Search for a column in the options, returning its length if found
    if (this.options?.col) return this.options.col.length;
    //
    //Use the size as the maxlen, if provided
    return this.search_option("size");
  }

  //Transfer focus to this io
  focus(): void {
    this.input.focus();
  }

  //Convert the input type to string
  to_string(type: input_type): string {
    //
    //If teh type is a simple text, the return it as it is
    if (typeof type === "string") return type;
    //
    //The type is an object. Check if it is text
    if (type.type === "text") return "text";
    //
    //Any other input type object represents a type that must have been
    //forgoten
    throw new mutall_error(`Input type ${String(type)} is not known`);
  }

  //
  //Setting and/or getting input values. Dates are treated specially as thier
  //string versions differ between the HTMLInputElement/date and mysql date
  //type .
  get input_value(): basic_value {
    //
    //Get the string value from the input element
    const v: string = this.input.value;
    //
    //Convert empty strings to nulls
    return v === "" ? null : v;
  }
  //
  //Set the input value. Translate nulls to empty strings.
  set input_value(v: basic_value) {
    //
    //Convert the input value to string, if it is  null.
    const str = v === null ? "" : String(v);
    //
    //If the input is a date/time then package it in the format expectd
    //by Mysql database
    //??
    //
    //Assign the string to the input value.
    this.input.value = str;
  }
  //
  //Updating of input based io is by default, simply copying the data from
  //the input element to to the output (span) tag
  update_outputs() {
    this.output.textContent = this.input.value;
  }
}

//
//The radio button
export class radio extends io {
  //
  //The output checkbox that is shown as disabled
  public output: HTMLInputElement;
  //
  //The input checkbox
  public input: HTMLInputElement;
  //
  //The input element is the proxy for this io
  get listeners() {
    return [this.input];
  }
  //
  constructor(
    name: string,
    checked: boolean,
    proxy: HTMLElement,
    parent: view,
    options: io_options
  ) {
    //
    //Initialize the io with a radio type
    super(proxy, { type: "radio", name, checked }, parent, options);
    //
    //The nomal mode for this io is the same as the edit.
    //The difference is that the output element is disabled
    this.output = this.create_element(`input`, this.proxy, {
      type: "radio",
      className: "normal",
    });
    //
    //This radio is used for capturing inputs
    this.input = this.create_element(`input`, this.proxy, {
      //
      type: "radio",
      //
      className: "edit value",
      //
      //The radio button's name
      name,
    });
    //
    //Add the checked status
    this.input.checked = checked;
  }

  //
  //The check boxes have no particular show requirements
  show(): void {}

  //Transfer focus to this io
  focus(): void {
    this.input.focus();
  }

  //
  //Get the value from a radio button. It cannot be changed by checking or
  // unchecking the radio button
  get input_value() {
    return this.input.value;
  }
  //
  //Set teh value of a radio button. It cannot be changed by checking or
  // unchecking the button
  set input_value(i) {
    this.input.value = i;
  }
  //
  //Update outputs from inputs.
  update_outputs() {
    //
    this.output.checked = this.input.checked;
  }
}

//
//This io is for capturing local/remote file paths, including images
export class file extends input {
  //
  //The selector for the file source remote/local
  public source_selector: HTMLSelectElement;
  //
  //This is an input of type file to allow selection of files on the
  //local client
  public file_selector: HTMLInputElement;
  //
  //The home button for the click listerner that allows us to browse the server
  //remotely
  public explore: HTMLInputElement;
  //
  //This is a header for labeling the input element and the explorer button
  public input_header?: HTMLSpanElement;
  //
  //Home button for the click listener to upload this file from the local to the
  //remote server.
  public upload: HTMLInputElement;
  //
  //The tag for holding/previewing the image source if the type is an image.
  public image?: HTMLImageElement;
  //
  //Default image sizes (in pixels) as they are being displayed on a crud page
  static default_height = 75;
  static default_width = 75;
  //
  constructor(
    proxy: HTMLElement,
    public type: file_type,
    parent: view,
    options: io_options
  ) {
    //
    //Ensure the input is of type=text
    super(proxy, { type: "text" }, parent, options);
    //
    //Select the remote or local storage to browse for a file/image
    this.source_selector = this.create_element(`select`, this.proxy, {
      className: "edit",
      //Show either the remote server or the local client as the
      //source of the image.
      onchange: (evt) => this.toggle_source(evt),
    });
    //
    //Add the select options
    this.create_element("option", this.source_selector, {
      value: "local",
      textContent: "Browse local",
    });
    this.create_element("option", this.source_selector, {
      value: "remote",
      textContent: "Browse remote",
    });
    //
    //This is a local file or image selector.
    this.file_selector = this.create_element(`input`, this.proxy, {
      //
      //For debugging purposes, hardwire this to a file rather than
      //the type variable, because the image input type does not
      //behave as expected.
      type: "file",
      className: "edit local",
      value: "Click to select a file to upload",
    });
    //
    //The home for the click listerner that allows us to browse the server
    //remotely
    this.explore = this.create_element(`input`, this.proxy, {
      className: "edit local",
      type: "button",
      value: "Browse server folder",
    });

    //
    //Upload this file after checking that the user has all the inputs.
    //i.e., the file name and its remote path.
    this.upload = this.create_element(`input`, this.proxy, {
      className: "edit local",
      type: "button",
      value: "Upload",
    });
    //
    //The tag for holding the image source if the type is an image.
    if (type === "image") {
      this.image = this.create_element(`img`, this.proxy, {
        height: file.default_height,
        width: file.default_width,
      });
    }
  }
  //
  //Overide the show method to allow us to re-arrange the input/output
  //elements of a file;
  show(): void {
    //
    //I think we should start by clearing the default order of the proxy's
    //children by removing them. Should we not?
    //
    //Show the output elements, i.e., the filename and image
    this.proxy.appendChild(this.output);
    if (this.image !== undefined) this.proxy.appendChild(this.image!);
    //
    //Show the source selector
    this.show_label("Select source: ", this.source_selector);
    //
    //Show the file selector
    //<Label>select image/file<input type="file"></label>
    this.show_label("Select file: ", this.file_selector);
    //
    //Show the file/folder input and the server browser button
    // '
    //Create the header for that label
    this.input_header = this.document.createElement("span");
    this.show_label(this.input_header, this.input, this.explore);
    //
    //Reattach the upload button to force it to the last position
    this.proxy.appendChild(this.upload);
  }

  //
  //This is an event listener that paints the current page
  //to allow the user to select an image/file
  //from either the remote server or the local client
  public toggle_source(evt: Event): void {
    //
    //Target element must match the source selector.
    if (evt.target !== this.source_selector)
      throw new Error(
        "The source selector must be the same as the event target"
      );
    //
    //Get the selected (and unselected) options.
    const selected = <"remote" | "local">this.source_selector.value;
    const unselected = selected === "local" ? "remote" : "local";
    //
    //Get the link element; it must exist.
    const link = <HTMLLinkElement | null>(
      this.document.querySelector("#theme_css")
    );
    if (link === null) throw new Error("Element #theme_css not found");
    //
    //Get the CSS stylesheet referenced by the link element; it must exist.
    const sheet = link.sheet;
    if (sheet === null) throw new Error("CSS stylesheet not found");
    //
    //Show the selected options, i.e., set hide to false.
    this.update_stylesheet(sheet, selected, false);
    //
    //Hide the unselected options, i.e., set hide to true.
    this.update_stylesheet(sheet, unselected, true);
    //
    //Update the input header label to either a file or folder depending
    //on the selected source.
    this.input_header!.textContent = `Select ${
      selected === "remote" ? "file" : "folder"
    }`;
  }
  //
  //Update the stylesheet so that the given selection is either
  //hidden or displayed; if hidden the display property of the
  //matching CSS rule is set to none, otherwise it's removed.
  update_stylesheet(sheet: CSSStyleSheet, selection: String, hide: Boolean) {
    //
    //Use the selection to find the relevant rule.
    //
    //Convert the rule list (in the stylesheet) to an array.
    const rules = <Array<CSSStyleRule>>Array.from(sheet.cssRules);
    //
    //Find the index of the rule that matches the selection.
    const index = rules.findIndex(
      (rule1) => rule1.selectorText === `.${selection}`
    );
    if (index === -1) throw new Error(`Rule .${selection} not found`);
    //
    //Use the index to get the rule.
    const rule: CSSStyleRule = rules[index];
    //
    //Add or remove the display property.
    if (hide) rule.style.setProperty("display", "none");
    else rule.style.removeProperty("display");
  }

  //
  //Overide the setting of the input value so as to extend the
  //changing of the image source.
  set input_value(i: basic_value) {
    super.input_value = i;
    if (this.type === "image") {
      //
      //Set the image to the defalt when it is null
      this.image!.src = i === null ? "/pictures/default.jpeg" : String(i);
    }
  }
}

//A much more simplified version of the image io (modelled along the same lines
//as a read-only)
export class image extends io {
  //
  //The image for this version has no element that can lose focus
  get listeners() {
    return [];
  }
  //
  //Redefine the output element more precisely
  declare output: HTMLImageElement;
  //
  constructor(proxy: HTMLElement, parent: view, options: io_options) {
    super(proxy, "image", parent, options);
    //
    //Create an image element to render the image
    this.output = this.create_element(`img`, this.proxy, {});
  }
  //
  //The image value come from the output tag
  get input_value() {
    return this.output.src;
  }

  //Set the image...
  set input_value(i) {
    //
    //...by changing the source
    this.output.src = i;
  }
  //
  //The image values do not change.
  update_outputs(): void {}
}

//The text area class is an io extension of a simple input to allow
//us to capture large amounts of text in an expandable box.
export class textarea extends input {
  //
  //The native textarea element.
  public textarea: HTMLTextAreaElement;
  //
  constructor(
    proxy: HTMLElement,
    size: number | undefined,
    parent: view,
    options: io_options
  ) {
    //
    //The element being extended is an input of type text, which disregards \
    //teh actual size of a text area
    super(proxy, { type: "text" }, parent, options);
    //
    //Set the native textarea element.
    this.textarea = this.create_element(`textarea`, this.proxy, {
      //
      //The text area is available only in edit mode
      className: "edit",
      //
      //Even when the text area is visible, it should show only when
      //needed, i.e., when it is activated via a click on the input element
      hidden: true,
      //
      //When we leave a text area, its value is transferred to
      //the input element
      onblur: () => this.activate_input(),
    });
    //
    //Add the click event listener to the text input element, to initiate
    //the switch to the text area editor
    this.input.onclick = () => this.activate_textarea();
  }
  //
  //This is an onblur event listener of the textarea,
  //that updates the editted value to that of the input.
  //It triggers the input`s onchange event so that the input can behave normally.
  public activate_input() {
    //
    //Transfer the textarea content to the input value. Textext area content
    //can be null. input.value is always a string; hence....
    this.input.value = this.textarea.value;
    //
    //unhide the input element
    this.input.hidden = false;
    //
    //Hide the text area
    this.textarea.hidden = true;
    //
    //Mark the proxy (td) as edited
    this.mark_as_edited();
  }
  //
  //This is an onclick event listener (of the input element) that activates
  //the textarea for the user to start editing.
  public activate_textarea() {
    //
    //Transfer the input value to the textarea text content
    this.textarea.value = this.input.value;
    //
    //Hide the input element
    this.input.hidden = true;
    //
    //Unhide the text area
    this.textarea.hidden = false;
    //
    //Transfer focus to the text area
    this.textarea.focus();
  }
  //
}

//The primary key io is simply a ordinary checkbox input. Its value is only 1 and
//it cannot be changed by checking or unchecking. It is particular useful for
//representing null primary key values. See the registration use case when a
//user is registerd to be a member of some business
export class primary extends io {
  //
  //The element that characterises a primary key
  public input?: HTMLInputElement;

  //
  get listeners() {
    //
    //Return the input as th only listener; otherwise empty
    return this.input ? [this.input] : [];
  }
  //
  constructor(
    //
    //Where to hook the  Consider separting element from the parent view
    //so that a view can take part in the view hierarchy
    proxy: HTMLElement,
    //
    //Do you what the primary keys to be visible? The default is true
    public show_values: boolean = true,
    //
    //What button will be shown, checbox or radio?
    public button: { type: "checkbox" | "radio"; name: string } | undefined,
    parent: view,
    options: io_options
  ) {
    //
    super(proxy, "read_only", parent, options);
    //
    //Define the type of button to use for the primary key. If a button is
    //defined...
    if (button) {
      //
      this.input = this.create_element(`input`, this.proxy, {
        type: button.type,
        name: button.name,
        //
        className: "value",
      });
    }
  }

  //
  //The read-only value come from the output tag
  get input_value() {
    //
    //If the input is defined, then return its value otherwise return that
    //of the output span tag
    return this.input ? this.input.value : this.output.textContent;
  }

  //A user cannot set a rea-only value, but, a programmer can...
  set input_value(i: basic_value) {
    //
    //
    //Convert the input value to string.
    const str = i === null ? "" : String(i);
    //
    //If the input is defined, let it hold the data...
    if (this.input) this.input.value = str;
    //
    //...otherwise hold the data in theh span tag of the output element
    else this.output.textContent = str;
  }

  //
  //The value of a primary key is visualised in special ways, as dictated by
  //the show_values and button properties.
  update_outputs() {
    //Show the primary if the user desires.
    if (this.show_values) {
      //
      //If teh input is defined, show its value; otherwise show the text
      //content of the output span tag
      const str: string | null = this.input
        ? this.input.value
        : this.output.textContent;
      //
      this.output.textContent = str;
    }
  }

  //Transfer focus to this io, if it has an input
  focus(): void {
    if (this.input) this.input.focus();
  }
}

//A multiple or single choice set of checkbox or radio buttons respectively. For
//the multiple choice case, the values a stored in a json field where
//the array of inputs is stringified. In output mode, the string is decoded to
//an array and the result used for checking the boxes.
class choices extends io {
  //
  public choices: Array<HTMLInputElement>;
  //
  //All the radio or check boxes of choiceschoices elof this class can
  //listen to the onblur or focus events
  get listeners() {
    return this.choices;
  }
  //
  constructor(
    proxy: HTMLElement,
    public type: "single" | "multiple" = "multiple",
    parent: view,
    options: io_options
  ) {
    //Determine the type of choices
    const i: io_type = type === "single" ? "radios" : "checkbox";
    //
    super(proxy, i, parent, options);
    //Query select all the input choices of this io, converting them into
    //an array
    this.choices = <Array<HTMLInputElement>>(
      Array.from(this.proxy.querySelectorAll("input"))
    );
  }

  //Use the given json string, encoded as an array, and use it to set the
  //the check or radio buttons, depdin on the arays alements
  set input_value(value: basic_value) {
    //
    //If the basic value is null, then we do nothing
    if (value === null) return;
    //
    //Convert the value to a string
    const str = String(value);
    //
    //For the multiple choices...
    if (this.type === "multiple") {
      //
      //Decode the json string to an array of values
      const values = JSON.parse(str);
      //
      //report an error if the values cannot be converted to an array
      if (!Array.isArray(values))
        throw new mutall_error(
          `Input value '${str}', cannot be decoded to an array`
        );
      //
      //Loop through al the choices, checking each one if its value
      //is included in the json values
      this.choices.forEach((input) => {
        if (values.includes(input.value)) input.checked = true;
      });
    }
    //
    //For the single choices....
    else {
      //Find the (the first) input choice whose value matches the input value.
      const input: HTMLInputElement | undefined = this.choices.find(
        (input) => input.value === str
      );
      //
      //There must be one and only one; otherwise its an error (in the
      //input form design
      if (input === undefined)
        throw new mutall_error(`No radio has a value that matches ${str}`);
      //
      //Check the input
      input.checked = true;
    }
  }

  //
  //Returns the (json) encode string string as a basic value, by collecting
  //all the choices -- depending in the type -- into the string
  get input_value(): basic_value {
    //
    //Query select all the input choices of this io that are checked,
    //converting them into an array
    const choices = <Array<HTMLInputElement>>(
      Array.from(this.proxy.querySelectorAll("input:checked"))
    );
    //
    //For the multiple choices...
    if (this.type === "multiple") {
      //
      //Map the input choices to string values
      const values = choices.map((input) => input.value);
      //
      //return the json encoded values
      return JSON.stringify(values);
    }
    //
    //For the single choices....
    else {
      //
      //If no value is checked, then return a null. Whether this is
      //appropriate depends on the cicumstances. The user will needs to
      //check his inputs and take appropriate action if this is not
      //acceptable
      if (choices.length === 0) return null;
      //
      //If there is more tahn one choice, then the form is badly desiged
      //Perhaps the radio buttons are not named the same -- or checkboxes
      //have been used where radio buttons should have.
      if (choices.length > 1)
        throw new mutall_error(
          "This single choice input is producing multiple values. Check your design",
          this.proxy
        );
      //
      //Return its value
      return choices[0].value;
    }
  }

  //This is how we transfer multple or single choice valuesa from the input
  //elements to the output span tag
  update_outputs(): void {
    //
    //Get the value of this io
    const value: basic_value = this.value;
    //
    //If the value is null, then set the text content of the output element
    //ro an empty string
    if (value === null) {
      this.output.textContent = "";
      return;
    }
    //
    //Convert the value to a string
    const str = String(value);
    //
    //For single choices...
    if (this.type === "single") {
      //Set the content of the output tag to the value string
      this.output.textContent = str;
    }
    //For multiple choices cases
    else {
      //Decode the json string to an array
      const values: Array<string> = JSON.parse(str);
      //
      //Set the text content of the output elenent to a list of comma
      //separated values
      this.output.textContent = values.join(", ");
    }
  }
}

//The foreign key io class supports the input/output function for foreign key
//attributes. It is designed to improve the user's experience of capturing
//foreign key data beyond what phpMyadmin does: foreign keys are not just numbers!
export class foreign_io extends io {
  //
  //The span tag that displays the friendly component of a foreign key
  public friendly: HTMLSpanElement;
  //
  //The button used for evoking foreign key edit, i.e., reviewing and updating
  public button: HTMLInputElement;
  //
  //The dialog box that holds the editor panel
  public dialog: HTMLDialogElement;
  //
  //The editor homozone is anchored in the dialog element and supports editing
  //of recors referenced by this foreign key io
  public editor?: panel.editor;
  //
  //The button element is the only listener in a foreign io
  get listeners() {
    return [this.button];
  }
  //
  //The constructor includes the element to proxy this io. Redclare the column
  //as public so that its a much richer type than the  io being extended
  constructor(
    //
    //The parent of the html elements that make up this io
    proxy: HTMLElement,
    //
    //The foreign key column
    public col: schema_foreign,
    //
    parent: view,
    //
    //One of the key components in the options is the foreign key column
    //(Harmonise this with view_options)
    options: io_options
  ) {
    super(proxy, "foreign", parent, options);
    //
    //
    //Show the friendly name in a span tag. Note, the friendly class name
    //needed to allow us to identity this button, among others. Normal
    //implies that this tag will be displayed not in the edit mode but in
    //the normal one
    this.friendly = this.create_element(`span`, this.proxy, {
      className: "normal friendly",
    });
    //
    //Add to this foreign io, a button for initiating editing.
    this.button = this.create_element(`input`, this.proxy, {
      type: "button",
      //
      //This button should be visible only in edit mode and its locally
      //identified by the name 'button'if need be
      className: "edit button",
      //
      //Add the listener for initiating the editing operation using
      // a dialog box that holds an editor panel
      onclick: async (evt) => await this.show_dialog(),
    });
    //
    //Create the dialogbox for showing the editor panel
    this.dialog = this.create_element("dialog", this.proxy);
  }

  //Show the dialog box of the foreign key; it contains the editor panel
  async show_dialog(): Promise<void> {
    //
    //Create the editor panel using the following facts:-
    //-The anchor element for the editor is the dialog box
    //-The parent of the editor is this io
    this.editor = new panel.editor(this.dialog, this, {});
    //
    //Add a cancel button to the dialogbox after the panel
    this.create_element("button", this.dialog, {
      textContent: "Cancel",
      onclick: () => this.dialog.close(),
    });
    //
    //Add a submit button to the dialog box which initiates reading
    //the curent selection and transferring it to the this io's value
    this.create_element("button", this.dialog, {
      textContent: "Submit",
      onclick: () => this.submit(),
    });
    //
    //Show the editor
    await this.editor.show();
    //
    //Now do the normal dialog modal sytle
    this.dialog.showModal();
  }

  //Submit the selected value to the io
  submit(): void {
    //
    //Read the value from the editor's selection
    const selection: [pk: number, friend: string] | null | undefined =
      this.editor!.get_selection();
    //
    //If there is no selection, report it as an error
    if (selection === undefined)
      throw new mutall_error(`Please select a record`);
    //
    //Transfer the selection to the io
    this.value = JSON.stringify(selection);
    //
    //Close the dialog
    this.dialog.close();
  }

  //Transfer focus to this io
  focus(): void {
    this.button.focus();
  }

  //Setting the value of a foreign key attribute.
  set input_value(i) {
    //
    //If the input is null or undefined, re-set the value and firendly
    // componets
    if (!i) {
      this.button.value = "";
      this.button.setAttribute("pk", "");
      return;
    }
    //
    //Parse the input into the 2-component tuple, comprising of a primary key
    //number and its friendly part, e.g., [5, "karen/2024/workplan"], where
    // the 2nd component is a friendly and the first is the name to primary
    // key, 5, in some table
    const [pk, friend] = this.parse_value(i);
    //
    //The button's value is the friendly component
    this.button.value = friend;
    //
    //Save the primary key value in the buttons's pk attribute
    this.button.setAttribute("pk", String(pk));
  }

  //Parse the input into the 2-componet type, a.k.a., parimary and friendly parts
  parse_value(i: basic_value): [pk: number, friend: string] {
    //
    //If the input is a string, then assume its in json format
    if (typeof i === "string") {
      //
      //Destructure the foreign key value to access the 2 components.
      const [pk, friend] = JSON.parse(i);
      //
      //Verify that the primary and friendly keys are defined
      if (pk === undefined || friend === undefined)
        throw new mutall_error(
          `The foreign key json string '${i}' is not formatted as a [pk. friend pair]`
        );
      //
      //Return the primary key and its friend
      return [pk, friend];
    }
    //
    //If the input is an number, then compile its friendly form
    if (typeof i === "number") {
      //
      //In a future version, the frienly component will be derived from
      //the indentifiaction keys of the foreign field, but, for now, the
      //friend is the same as the original value
      const friend: string = String(i);
      //
      return [i, friend];
    }
    //
    //The data type for i cannot be befriended
    throw new mutall_error(
      `The data type for '${i}' is not suitable to be a foreign key`
    );
  }

  //Get the value of a foreign key attribute from its pk attribute
  //(See above how the value is set above)
  get input_value() {
    //
    //The value of a foreign key is the value of the primary key attribute
    return this.button.getAttribute("pk");
  }
  //
  //Transfer the primary key and its friend from the input button to the
  //friendly span tag
  update_outputs() {
    //
    //Get the friendly component
    const friend = this.button.value;
    //
    //The full friendly name is valid only when there is a primary key.
    this.friendly!.textContent = friend;
  }
}
