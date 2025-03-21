import { mutall_error, myalert, } from "../../../schema/v/code/mutall.js";
import { view } from "../../../schema/v/code/schema.js";
//
//Report mutall error and others
export { mutall_error, myalert };
//View is the root of all classes in the outlook library, so, it holds methods
//and properties that all outlook users can access.
//(Its descendants can dispatch and listen to events. Where do we use this fact?)
export class html_page extends view {
    parent;
    options;
    //
    //This is used for indexing a view object to support implementation of the
    //static 'current' property, as well as associating this view with a state
    //object in the management of sessions. It is set when this view is
    //constructed. See onpopstate
    key;
    //
    //Lookup storage for all views created by this application.
    static lookup = new Map();
    //
    //The current active view where the events (on a html page) are wired. E.g.
    //<button onclick=view.current.open_dbase()>Ok</button>
    static current;
    //
    //A view is associated with a win property. Typically it is the current
    //window, when the view is created. This variable is protected so that
    //it accessible only via getters and setters. This is important because
    //other derivatives of this class access the window property in different
    //ways. For instance, a baby page gets its window from its mother
    win__ = window;
    //
    //These are getter and setter to access the protected win variable. See
    //documention for propertu win__ above to appreciate the reason for using
    //of getters and setters in derived classes
    get win() {
        return this.win__;
    }
    set win(win) {
        this.win__ = win;
    }
    //
    //The document of a view is that of its the window
    get document() {
        return this.win.document;
    }
    //
    //The children nodes of the root document element of this page
    //to support restoring of this page in response to the on pop state event.
    //The ordinary programmer is not expected to interact with this property,
    //so it is protected
    child_nodes = [];
    //
    //The end of time date is the highest valid date that the relational
    //databases can accommodate
    static end_of_time = "9999-12-31";
    //
    constructor(
    //
    //To implement the view has-a hierarchy
    parent, 
    //
    //The options for controlling a view
    options) {
        //
        //Initialize the parent evet target
        super(parent, options);
        this.parent = parent;
        this.options = options;
        //
        //Register this view identified by the last entry in the lookup table for views.
        //
        //The view's key is the count of the number of keys in the lookup.
        this.key = view.lookup.size;
        view.lookup.set(this.key, this);
    }
    //
    //Tells us if this view is hidden or not, depending on whether the
    //hidden option is available or not
    get hidden() {
        //
        //Get the hidden option
        const hidden = this.options?.hidden;
        //
        if (hidden)
            return true;
        else
            return false;
    }
    //Create a new element from  the given tagname and attributes
    //we assume that the element has no children in this version.
    create_element(
    //
    //The element's tag name
    tagname, 
    //
    //The parent of the element to be created.
    anchor, 
    //
    //The attributes of the element
    attributes) {
        //
        //Create the element holder based on the td's owner document
        const element = this.document.createElement(tagname);
        //
        //Attach this element to the anchor, if the anchor is defined
        if (anchor !== undefined)
            anchor.appendChild(element);
        //
        //Loop through all the keys to add the atributes, if they are defoned
        if (attributes !== undefined)
            for (let key in attributes) {
                const value = attributes[key];
                //
                // JSX does not allow class as a valid name
                if (key === "className") {
                    //
                    //Take care of multiple class values
                    const classes = value.split(" ");
                    classes.forEach((c) => element.classList.add(c));
                }
                else if (key === "textContent") {
                    element.textContent = value;
                }
                else if (key.startsWith("on") &&
                    typeof attributes[key] === "function") {
                    element.addEventListener(key.substring(2), value);
                }
                else {
                    // <input disable />      { disable: true }
                    if (typeof value === "boolean" && value) {
                        element.setAttribute(key, "");
                    }
                    else {
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
    get_element(id) {
        //
        //Get the identified element from the current browser context.
        const element = this.document.getElementById(id);
        //
        //Check the element for a null value
        if (element === null)
            throw new mutall_error(`The element identified by #${id} not found`);
        //
        //Return (found) the element
        return element;
    }
    //To capitalize the first letter of a word
    capitalize_first_letter(word) {
        //
        // Check if the input is not empty
        if (word.length === 0)
            return "";
        //
        // Capitalize the first letter and concatenate with the rest of the word
        return word.charAt(0).toUpperCase() + word.slice(1);
    }
    //Returns the proxy element of this view.  proxy is definitely available for
    //all ios, but it may not be available to others. Proxy is a general element
    //so that we can take care of both html and svg elements
    get proxy() {
        //
        //Its a loud error if you try to get a proxy that is not set
        if (!this.proxy__)
            throw new mutall_error(`Proxy of view not set`, this);
        return this.proxy__;
    }
    //Set the proxy element
    set proxy(e) {
        this.proxy__ = e;
    }
    //Returns an attribute's value, if it is available; otherwise an error
    get_attribute_value(element, name) {
        //
        //Get the named attribute from the given element
        const value = element.getAttribute(name);
        //
        //The attribute must be set; otherwise its an error
        if (value === null) {
            //
            //Report teh error
            throw new mutall_error(`This element (see the console.log) has no attribute named ${name}.`, element);
        }
        //
        return value;
    }
    //
    //Returns the value from an identified input, textarea element or selector
    //(a.k.a. listeners).
    get_input_value(id, required = "yes", action = "return") {
        //
        //Get the identified element.
        const elem = this.get_element(id);
        //
        //It must be an input  element or textarea or a select, a.k.a. listener.
        if (!(elem instanceof HTMLInputElement ||
            elem instanceof HTMLTextAreaElement ||
            elem instanceof HTMLSelectElement))
            throw new mutall_error(`'${id}' is not an input or textarea element`);
        //
        //The desired value is.
        const value = elem.value.trim() === "" ? null : elem.value;
        //
        //Compile a required error
        const err = new Error(`${id} is required`);
        //
        //The next course of action is determined by whether the value is null
        //or not
        //
        if (!value && required === "yes" && action === "throw")
            throw err;
        //
        if (!value && required === "yes" && action === "return")
            return err;
        return value;
    }
    //Returns the values of the currently selected inputs
    //from a list of named ones
    get_input_choices(name) {
        //
        //Collect the named radio/checked inputs
        const radios = Array.from(this.document.querySelectorAll(`input[name="${name}"]:checked`));
        //
        //Map teh selected inputs to thiier values and return the collection
        return radios.map((r) => r.value);
    }
    //
    //Returns the value of the checked radio button that has the given name.
    //Return null if there is no checked radio button. If any of the named
    //buttons has a required attribute, then an error is retirned if none is
    //checked
    get_checked_value(name) {
        //
        //Get the radio button that matches the given name and is checked.
        const radio = this.document.querySelector(`input[name='${name}']:checked`);
        //
        //Do not continue with further checks if there is no checked radio button
        if (radio === null) {
            //
            //Get all the named radio buttons that have a required attribute
            const buttons = this.document.querySelectorAll(`input[name='${name}'][required]`);
            //
            //Required is true if there is at least one required button
            return buttons.length > 0 ? new Error(`${name} is required`) : null;
        }
        //
        //Ensure that the radio element is a HTMLInputElement.
        if (!(radio instanceof HTMLInputElement))
            throw new mutall_error(`The input named '${name}' is not a HTMLInputElement`);
        //
        //The radio button's value must be set. It is a sign a poorly designed form
        //if not
        if (radio.value === "")
            throw new mutall_error(`No value found for input named '${name}'`);
        //
        //Return the checked value.
        return radio.value;
    }
    //
    //Get the selected value from the identified selector.
    //There must be a selected value.
    get_selected_value(id) {
        //
        //Get the Select Element identified by the id.
        const select = this.get_element(id);
        //
        //Ensure that the select is a HTMLSelectElement.
        if (!(select instanceof HTMLSelectElement))
            throw new mutall_error(`The element identified by '${id}' is not a HTMLSelectElement.`);
        //
        //Ensure that the select element value is set.
        if (select.value === "")
            throw new mutall_error(`The value of the select element identified by '${id}' is not set.`);
        //
        //Return the selected value
        return select.value;
    }
    //Given a variable, x, (whose optional name may also be given) return it
    //if it is set; otherwise report the situation. This utility helps us to
    //work with optional properties without having to set up private versions
    //to match.
    //NB. 'x 'is some data -- any data. 'name' is a name that describes that data
    //for reporting purposes
    myget(x, name) {
        //
        //Return x if defined. N.B.. Do not use the shortcut 'if (x)...' because
        //that includes null -- which is defined
        if (x !== undefined)
            return x;
        //
        //...otherwise report it
        throw new mutall_error(`Variable ${name ?? ""} not set. Check initialization`);
    }
    //Search and return the the only element selected by the gigen css
    //css selector; it is an error if more than 1 or none is found.
    query_selector(css) {
        //
        //Get the identified element from the current browser context.
        const elements = Array.from(this.document.querySelectorAll(css));
        //
        //If there is more than one element, warn the user
        if (elements.length > 1)
            throw new mutall_error(`There are ${elements.length} elements selected by ${css}`);
        //
        //Check the elements is empty
        if (elements.length === 0)
            throw new mutall_error(`The element with selector ${css} not found`);
        //
        //Return (the only found) the )HML) element
        return elements[0];
    }
    //Show or hide the identified a window panel. This method is typeically
    //used for showing/hiding a named grou of elements that must be shown
    //or hidden as required
    show_panel(id, show) {
        //
        //Get the identified element
        const elem = this.get_element(id);
        //
        //Hide the element if the show is not true
        elem.hidden = !show;
    }
    //Use the Luxon library to return the date and time for now() formated in
    //the way  MYsql expects it.
    now() {
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
    //library. Js won't understand import * as y from "x" when the node_modules
    //are in the same folder as the code. It only understands
    //paths of the form: "./x.js" "../x.js", "/a/b/c/x.js". Perhaps its time to
    //learn how to use webpack. For now, use the native Js method of converting the
    //date to a ISOstring, then replacing the T with a space and Z with nothing
    standardise_date(date) {
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
            //Replace the T with a space
            .replace("T", " ")
            //
            //Remove the trailing Z for Zulu zone
            .replace("Z", "");
        //
        //Return the result as, e.g. "2023-01-27 00:12:00.0000" Will Mysql
        //accept the .0000 bit? Not sure.
        return str;
    }
    //Exploit typical layouts of input element on form to extract values. This
    //assumes that we can extract enough information from the form to determine,
    //e.g.,
    //- the type of input, i,e., simple text or use of radio buttons
    //- if any input is required or not
    //This information is supplied using dataset technology in HTML using tags
    //such as data-required, data-io type, etc.
    //The given id is that of an envelop tag; the dataset attributes will be
    //specified on this element.
    //The output will be determined by data-required and data-io type attributes
    //Here is an example of an input that satisfies this arrangement
    /*
      <label data-field="username" data-required data-iotype="text">
          Username:<input type="text">
      </label>
      
      <label data-required>
          Username:<input type="text" name="username">
      </label>
      */
    get_value(id) {
        //
        //Get the identified enveloping element, e.g. the label element in the
        //the above example
        const env = this.get_envelop_element(id);
        //
        //Get the io type. Currently only 2 are supported; text and radio. If
        //no io type is available, then we assume it is a simple input.
        const io_type = this.get_io_type_from_envelop(env);
        //
        //Use the envelop and io type to get the raw value, string or null. For
        //check boxes, if there is nothing checked, the raw value is null. For
        //simple input, the null is a zero-length string
        let raw = this.get_raw_value(env, io_type);
        //
        //Determine whether the value is required or not;
        const is_required = Boolean(env.dataset.required);
        //
        //If an input is required and it is empty, return the an error...
        if (is_required && raw === null)
            return new Error(`Input '${id}' is required`);
        //
        //...otherwise return the raw value
        return raw;
    }
    //Using the same envelop strategy as the get_value(), get the identified
    //files
    get_files(id) {
        //
        //Get the identified enveloping element, e.g., the label element in the
        //the above example
        const env = this.get_envelop_element(id);
        //
        //Use the envelop and io type to get the raw value, string or null. For
        //check boxes, if there is nothing checked, the raw value is null. For
        //simple input, the null is a zero-length string
        const file = this.get_files_using_envelop(env);
        //
        //Determine whether the value is required or not;
        const is_required = Boolean(env.dataset.required);
        //
        //If an input is required and it is empty, return the an error...
        if (is_required && file === null)
            return new Error(`Input '${id}' is required`);
        //
        //...otherwise return the file value
        return file;
    }
    //Returns the file under the given envelop
    get_files_using_envelop(env) {
        //
        //Use the envelop to search for an input element of type file
        const inputs = env.querySelectorAll('input[type="file"]');
        //
        //Its an error if none is found
        if (inputs.length === 0)
            throw new mutall_error(`No file input element is found under current envelop element`, env);
        //
        //It islao an errror if the search result is ambiguous
        if (inputs.length > 1)
            throw new mutall_error(`There is more than 1 file input element under curremt envelop`, env);
        //
        //Get the only input element
        const input = inputs[0];
        //
        //Return the file if it is defined and there is at least one selection;
        //otherwise null
        return input.files ?? null;
    }
    //Return the element that envelops the one with the given id
    get_envelop_element(id) {
        //
        //Let element be the envelop
        let element;
        //
        //Try the data-field route first
        if ((element = this.document.querySelector(`*[data-field="${id}"]`)))
            return element;
        //
        //Try the normal id route
        if ((element = this.document.getElementById(id)))
            return element;
        //
        //Try name route
        const elements = Array.from(this.document.getElementsByName(id));
        if (elements.length > 0) {
            //
            const data_field = elements[0].closest("*[data-field], *[id]");
            //
            if (data_field)
                return data_field;
        }
        //
        //Element not found
        throw new mutall_error(`No envelop element matches '${id}' using the Name, Id or Data-field strategy`);
    }
    //Get the io-type from a given envelop element; its found in the data-iotype
    //attribute. Assume it is 'text' if the attribute is not found
    get_io_type_from_envelop(env) {
        //
        //Get the io-type (string) from the envelop element if it is defined;
        //otherwise assume it is simple text
        const text = env.dataset.iotype ?? "text";
        //
        //Translate the text to a matching io
        switch (text) {
            //
            //Simple text input (without size)
            case "text":
                return { type: "text" };
            //
            //Text area input
            case "textarea":
                return "textarea";
            //
            //Radio input
            case "radios":
                return "radios";
            //
            //Dropdown selector
            case "select":
                return "select";
            //
            //Any orher case is a mismatch and should be reported to the programmer
            default:
                throw new mutall_error(`'${text}' is not a valid io_type`);
        }
    }
    //
    //Use the envelop and io type to get the raw alue as text or null. For
    //radios/check boxes and selector if there is nothing checked, the raw value
    // is null. For simple input, the null is a zero-length, or name 'null' string.
    get_raw_value(env, io_type) {
        //
        //Translate the iotype to a matching value
        switch (io_type) {
            //
            //Getting input form a radio
            case "radios":
                return this.get_radio_value(env);
            //
            //Getting input from a select input / dropdown selector
            case "select":
                return this.get_text_value(env);
            //
            //Getting input from a text area
            case "textarea":
                return this.get_text_value(env);
            //
            //Handle complex io types, e.g., {type:'text', size:10}
            default:
                //
                //Test if the io type is of the complext type, e.g.,
                //{type:'text', size:10}
                if (typeof io_type === "object" && "type" in io_type) {
                    //
                    //Destructure to get the type
                    const { type } = io_type;
                    //
                    //Depending on the type....
                    switch (type) {
                        case "text":
                            return this.get_text_value(env);
                        default:
                            throw new mutall_error(`'${type}' is not a valid io-type`);
                    }
                }
                //Any other io type must be is a mismatch and should be reported
                // as an error
                throw new mutall_error(`Unable to get the value of io_type '${io_type}'`);
        }
    }
    //
    //Retrieve value from selector elements such as radio and checkboxes
    /*
      <fieldset id="operation" data-iotype="radio" data-required="true">
          <legend >What do you want to do?</legend>
          <label>
              <input type="radio" value ="up" name="option"> Sign Up to be Member
          </label>
  
          <label>
              <input type="radio" value="in" name="option"> Sign In as Member
          </label>
          <span class="error"></span>
      </fieldset>
      
      In this case, fieldset is the envlop element
      */
    get_radio_value(env) {
        //
        //The envelop must have a data-field attribute, from which we can get
        //the name associated with the radio element under it
        const name = env.dataset.field;
        if (!name)
            throw new mutall_error(`The envlop enclosing radio buttons must have a data field named the same as the buttons`, env);
        //
        //Use the name to formulate a css for isolating radio fields for this
        //envelop
        const css = `input[type="radio"][name="${name}"]`;
        //
        //Collect all the radio buttons under this envelop
        const radios = env.querySelectorAll(css);
        //
        //There must be at least 2
        if (radios.length < 2)
            throw new mutall_error(`At least 2 radio buttons are expected. ${radios.length} was found. See the console log`, radios);
        //
        //Collect all radio buttons that are checked
        const checkeds = env.querySelectorAll(`${css}:checked`);
        //
        //Return a null if none of them is checked
        if (checkeds.length === 0)
            return null;
        //
        //If more than one is cehcked, this is a poor form design
        if (checkeds.length >= 2)
            throw new mutall_error(`Check you form. ${checkeds.length} buttons are checked. Only 1 was expected`);
        //
        //Get the (trimmed) value of the checked button
        const value = checkeds.item(0).value.trim();
        //
        //Return null if the input has an empty value, or is explicitly entered
        //as null
        return ["", "null"].includes(value.toLowerCase()) ? null : value;
    }
    //
    //Retrieve value from a child input (of an enveloping element) that has a
    //value key
    get_text_value(env) {
        //
        //Select all the elements that are immediate children of the envelop
        const all_elements = Array.from(env.children);
        //
        //Select only those cases that have a value key
        const elements = all_elements.filter((e) => "value" in e);
        //
        //Its a design fault if no element can be found
        if (elements.length === 0)
            throw new mutall_error("No element with a value key found", env);
        //
        //It is also a form design fault if more than 1 element is found
        if (elements.length > 1)
            throw new mutall_error(`Only 1 value element is expected. ${elements.length} were found`);
        //
        //Get the only element's value and trim it
        const value = elements[0].value.trim();
        //
        //Return null if the input has an empty value, or is explicitly entered
        //as null
        return ["", "null", "undefined"].includes(value.toLowerCase())
            ? null
            : value;
    }
    //Returns todays date in the yyyy-mm-dd format suitable for feeding to mySQL
    //database, as well as to the value of a date input (without the time component)
    get_todays_date() {
        //
        // Create a new Date object for today's date
        const today = new Date();
        //
        // Get the year, month, and day parts from the Date object
        const year = today.getFullYear();
        const month = today.getMonth() + 1; // Months are zero-based, so add 1
        const day = today.getDate();
        // Format the month and day with leading zeros if necessary. String padding
        //does not seem to be supported in my version
        const formatted_month = month < 10 ? "0" + month : month;
        const formatted_day = day < 10 ? "0" + day : day;
        //
        // Format the date as yyyy-mm-dd
        const formatted_date = `${year}-${formatted_month}-${formatted_day}`;
        //
        return formatted_date;
    }
    //
    //Report the errors at the appropriate place in teh current form
    report_error(id, msg) {
        //
        //Use the given id to get the general data field area where to report.
        //It must be available
        const element = this.get_element(id);
        //
        //Get the  specific element where to report
        const report = element.querySelector(".error");
        //
        //If there is no place to report, then this is a badly designed form; alert the user
        if (report === null)
            throw new mutall_error(`No element for reporting errors for field '${id}'`);
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
    async get_file_contents(path) {
        //
        //The path is a file
        const is_file = true;
        //
        //Get the sql statement
        const sql = await this.exec_php(
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
        []);
        //
        return sql;
    }
}
