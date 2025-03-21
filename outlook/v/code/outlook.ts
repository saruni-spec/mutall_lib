import { dbname } from "../../../schema/v/code/library";
import {
  view,
  mutall_error,
  view_options,
  fuel,
} from "../../../schema/v/code/schema.js";
import { html_page } from "./html_page.js";

//Working with dates made easier by the Luxon library. Condider using Webpark to
//solve the javsacript failure to recognise the node_modules
//import * as luxon from "luxon";

//A panel is a targeted section of a view. It can be painted
//independently
export abstract class panel extends view {
  //
  //The panel's target element is set (from css in the constructor arguments)
  //when the panel is painted
  public target?: HTMLElement;
  //
  constructor(
    //
    //The CSS to describe the targeted element on the base page
    public css: string,
    //
    //A base view is the home of the panel
    parent: view
  ) {
    //The ur (required to initialize a view) is that of the base
    super(parent);
  }
  //
  //Start painting the panel
  async paint(): Promise<void> {
    //
    //Get the targeted element. It must be only one
    const targets = Array.from(this.document.querySelectorAll(this.css));
    //
    //There must be a target
    if (targets.length == 0)
      throw new mutall_error(`No target found with CSS ${this.css}`);
    //
    //Multiple targets is a sign of an error
    if (targets.length > 1)
      throw new mutall_error(`Multiple targets found with CSS ${this.css}`);
    //
    //The target must be a html element
    if (!(targets[0] instanceof HTMLElement))
      throw new mutall_error(`
        The element targeted by CSS ${this.css} must be an html element`);
    //
    //Set the html element and continue painting the panel
    this.target = targets[0];
    //
    //Continue to paint the pannel. This method is implemented differently
    //depending the obe extending class
    await this.continue_paint();
  }
  //
  //Continue painting the this pannel -- depending on its nature.
  public abstract continue_paint(): Promise<void>;
  //
  //The window of a panel is the same as that of its base view,
  //so a panel does not need to be opened
  get win() {
    return this.parent?.win ?? window;
  }
}

//A page is a view with display panels. It is the base class of babies and popups
export class page extends html_page {
  //
  //A page has named panels that the user must ensure that they
  //are set before they are shown.
  protected panels: Map<string, panel>;

  constructor(public url?: string, parent?: view) {
    //
    //Pass url to the parent view as an option
    const options: view_options = { url };
    //
    super(parent, options);
    //
    //Initialize the panels dictionary
    this.panels = new Map();
  }

  //
  //The user must call this method on a new application object; its main
  //purpose is to complete those operations of a constructor that require
  //to function synchronously
  async initialize(): Promise<void> {
    //
    //Set the window for this page
    this.win = await this.open();
    //
    //Add the pop state listener to ensure that if a history back button
    //is clicked on, we can restore this page
    this.win.onpopstate = (evt) => this.onpopstate(evt);
  }
  //Handle the on pop state listener by saving the current state and
  //restoring the view matching the event's history state
  protected onpopstate(evt: PopStateEvent) {
    //
    //Ignore any state that has no components to restore. Typically
    //this is the initial state placed automatically on the history
    //stack when this application loaded initially. For this version, the
    //null state is never expected because we did replace it in this
    //application's initializetion
    if (evt.state === null) throw new mutall_error("Null state unexpected");
    //
    //Get the saved view's key
    const key = <number>evt.state;
    //
    //Use the key to get the view being restored. We assume that it must be
    //a baby of the same type as this one
    const new_view = <page>view.lookup.get(key);
    //
    //It is an error if the key has no matching view.
    if (new_view === undefined)
      throw new mutall_error(`This key ${key} has no view`);
    //
    //Restore the components of the new view
    new_view.restore_view(key);
  }

  //
  //The default way a quiz view shows its content is
  //by looping through all its panels and painting
  //them. A quiz view without panels can override this method
  //to paint their contents.
  public async show_panels(): Promise<void> {
    //
    //The for loop is used so that the panels can throw
    //exception and stop when this happens
    for (const panel of this.panels.values()) {
      await panel.paint();
    }
  }

  //Restore the children nodes of this view by re-attaching them to the
  //document element of this page's window.
  public restore_view(key: number): void {
    //
    //Get the view of the given key
    const View = view.lookup.get(key);
    //
    //It's an error if the view has not been cached
    if (View === undefined)
      throw new mutall_error(`This key ${key} has no matching view`);
    //
    //Get the root document element.
    const root = View.document.documentElement;
    //
    //Clean the root before restoring it -- just in case the view
    //is attached to an old window;
    Array.from(root.childNodes).forEach((node) => root.removeChild(node));
    //
    //Attach every child node of this view to the root document
    this.child_nodes.forEach((node) => root.appendChild(node));
  }

  //Opening a page makes visible in the users view. All pages return the
  //current window. Only popups create new ones.
  async open(): Promise<Window> {
    return window;
  }

  //Remove a quiz page from a users view and wait for the base to rebuild.
  //In popups we simply close the window; in babies we do a history back,
  //and wait for the mother to be reinstated. In general, this does
  //nothing
  async close(): Promise<void> {}

  //Save the children of the root document element of this view to the history
  //stack using the 'how' method
  public save_view(how: "pushState" | "replaceState"): void {
    //
    //Get the root document element
    const root = this.document.documentElement;
    //
    //Save the child nodes to a local property
    this.child_nodes = Array.from(root.childNodes);
    //
    //Save (by either pushing or replacing) this view's state to the
    //windows session history indirectly -- indirectly because we don't
    //acutally save this view to the session history but its unique
    //identification key -- which then is used for looking up the view's
    //details from the static map, view.lookup
    this.win.history[how](
      //
      //The state object pushed (or replaced) is simply the key that
      //identifies this view in the static look for views, view.lookup
      this.key,
      //
      //The title of this state. The documentation does not tell us what
      //it is really used for. Set it to empty
      "",
      //
      //This browser bar info is not very helpful, so discard it
      ""
    );
  }

  //Show the given message in a report panel, Depending on the nature of the
  //resport, the appropriate styling is applied
  async report(error: boolean, msg: string) {
    //
    //Get the report node element
    const report = this.get_element("report");
    //
    //Add the error message
    report.textContent = msg;
    //
    //Style the report, depending on the error status
    if (error) {
      report.classList.add("error");
      report.classList.remove("ok");
    } else {
      report.classList.add("ok");
      report.classList.remove("error");
    }
  }
}

//
//A quiz extends a page in that it is used for obtaining data from a user. The
//class parameter tells us about the type of data to be collected. Baby and popup
//pages are extensions of a quiz.
export abstract class quiz<o> extends page {
  //
  //These are the results collected by this quiz.
  public result?: o;
  //
  //NB. The URL of a page is optional; if not defined, then a page is
  //constructed from scratch....
  constructor(public url?: string, parent?: view) {
    super(url, parent);
  }

  //To administer a (quiz) page is to  managing all the operations from
  //the  moment a page becomes visisble to when a result is returned and the
  //page closed. If successful a response (of the user defined type) is
  //returned, otherwise it is undefined.
  async administer(): Promise<o | undefined> {
    //
    //Complete construction of this class by running the asynchronous
    //methods
    await this.initialize();
    //
    //Make the logical page visible and wait for the user to
    //succesfully capture some data or abort the process.
    //If aborted the result is undefined.
    return await this.show();
  }

  //
  //This is the process which makes the page visible, waits for
  //user to respond and returns the expected response, if not aborted. NB. The
  //return data type is parametric
  private async show(): Promise<o | undefined> {
    //
    //Paint the full page. The next step for painting panels may need to
    //access elements created from this step. In a baby, this may involve
    //carnibalising a template; in a pop this does nothing
    await this.paint();
    //
    //Paint the various panels of this page in the default
    //way of looping over the panels. A page without the panels can
    //overide this method with its own.
    await this.show_panels();
    //
    //Wait for the user to ok or cancel this quiz, if the buttons are
    //provided
    const response = await new Promise<o | undefined>((resolve) => {
      //
      //Collect the result on clicking the Ok/go button.
      const okay = <HTMLButtonElement>this.get_element("go");
      okay.onclick = async () => {
        //
        //Check the user inputs for errors. If there is
        //any, do not continue the process...
        if (!(await this.check())) return;
        //
        //..otherwise get the resolve results
        const result = await this.get_result();
        //
        //Resolve the only when the result is error free
        resolve(result);
      };
      //
      //Discard the result on Cancel (by returning an undefined value).
      const cancel = <HTMLButtonElement>this.document.getElementById("cancel");
      cancel.onclick = () => resolve(undefined);
    });
    //
    //Remove the popup window from the view (and wait for the mother to be
    //rebuilt)
    await this.close();
    //
    //Return the promised result.
    return response;
  }

  //
  //Paint the full page. The next step for painting panels may need to
  //access elements crrated from this step. In a baby, this may involve
  //carnibalising a template; in a pop this does nothing
  async paint(): Promise<void> {}

  //The following abstract methods support the show process
  //
  //Check the inputs and return true if they are all valid
  abstract check(): Promise<boolean>;

  //Returns a result of the requested type
  abstract get_result(): Promise<o>;
}
//
//The baby class models pages that share the same window as their mother.
//In contrast a popup does not(share the same window with the mother)
export abstract class baby<o> extends quiz<o> {
  //
  constructor(public mother?: page, url?: url) {
    super(url);
  }

  //Paint the baby with with its html content (after saving the  mother's view)
  async paint(): Promise<void> {
    //
    //Get the baby template
    const Template = new template(this.url!);
    //
    //Open the template
    await Template.open();
    //
    //Replace the entire current document with that of the template
    this.document.documentElement.innerHTML =
      Template.win.document.documentElement.innerHTML;
    //
    //Close the baby template
    Template.win.close();
    //
    //Save this page's view, so that it can be resored when called upon
    //NB. The mother's view is already saved
    this.save_view("pushState");
  }

  //
  //The opening of returns the same window as the mother
  public async open(): Promise<Window> {
    return this.mother!.win;
  }

  //Close a baby page by invoking the back button; in contrast a popup does
  //it by executing the window close method.
  async close(): Promise<void> {
    //
    return new Promise((resolve) => {
      //
      //Prepare for the on=pop state, and resole when the mother has been
      //restored
      this.win.onpopstate = (evt) => {
        //
        //Attend to ompop state event, thus restoring the mother
        this.onpopstate(evt);
        //
        //Now stop waiting
        resolve();
      };
      //
      //Issue a history back command to evoke the on pop state
      this.win.history.back();
    });
  }
  //
  //Fills the indentified selector element with options fetched from the given
  //table name in the given database
  async fill_selector(ename: string, dbname: string, selectorid: string) {
    //
    //1. Get the selector options from the database
    //
    //
    //1.1 Get the options of the first and second column names
    const options: Array<fuel> = await this.exec_php(
      "selector",
      [ename, dbname],
      "execute",
      []
    );
    //
    //2. Fill the selector with the options
    //
    //2.1. Get the selector element
    const selector = document.getElementById(selectorid);
    //
    //2.2. Check if the selector is valid
    if (!(selector instanceof HTMLSelectElement))
      throw new Error(`The element identified by ${selectorid} is not valid`);
    //
    //2.3 Go through the options and populate the selector with the option elements
    for (let option of options) {
      //
      //2.3.1. Get the primary key from the option
      //
      //Formulate the name of the primary key.
      const key = `${ename}_selector`;
      //
      const pk = option[key];
      //
      //2.3.2. Get the friendly component from the option
      const friend = option.friend__;
      //
      //
      this.create_element("option", selector, {
        value: `${pk}`,
        textContent: `${friend}`,
      });
    }
  }
}

//A template is a popup window used for canibalising to feed another window.
//The way you open it is smilar to  popup. Its flagship method is the copy
//operation from one document to another
export class template extends view {
  //
  //A template must have a url
  constructor(public url: string, parent?: view) {
    super(parent);
  }

  //Opening a window, by default, returns the current window and sets the
  //title
  public async open(): Promise<void> {
    //
    //Open the page to let the server interprete the html
    //page for us. The window is temporary
    const win = window.open(this.url)!;
    //
    //Divert attention from the window, in an attempt to crontrol the flashing
    //win.blur doe does not work; consider using DOM to pen the html

    //
    //Wait for the page to load
    await new Promise((resolve) => (win.onload = () => resolve(true)));
    //
    //Set the win property for this page
    this.win = win;
  }
  //
  //Transfer the html content from this view to the specified
  //destination and return a html element from the destination view.
  copy(src: string, dest: [view, string]): HTMLElement {
    //
    //Destructure the destination specification
    const [View, dest_id] = dest;
    //
    //1 Get the destination element.
    const dest_element: HTMLElement = View.get_element(dest_id);
    //
    //2 Get the source element.
    const src_element: HTMLElement = this.get_element(src);
    //
    //3. Transfer the html from the source to the destination. Consider
    //using importNode or adoptNode methods instead.
    dest_element.innerHTML = src_element.innerHTML;
    //
    //Return the destination painter for chaining
    return dest_element;
  }

  //Close the template after copying
  close(): void {
    this.win.close();
  }
}

//This class represents the view|popup page that the user sees for collecting
//inputs
export abstract class popup<o> extends quiz<o> {
  //
  constructor(
    //
    //Url to a HTML file that has the content for pasting into the popup
    url: string,
    //
    //The popoup window size and location specifications.
    public specs?: string
  ) {
    super(url);
  }

  //
  //Open a pop window returns a brand new window with specified dimensions.
  public async open(): Promise<Window> {
    //
    //Use the window size and location specification if available.
    const specs = this.specs === undefined ? this.get_specs() : this.specs;
    //
    //Open the page to let the server interprete the html
    //page for us.
    const win = window.open(this.url, "", specs)!;
    //
    //Wait for the window to load
    await new Promise<Window>((resolve) => (win.onload = () => resolve(win)));
    //
    //Update this pop's win property
    return win;
  }

  //
  //Get the specifications that can center the page as a modal popup
  //Overide this method if you want different layout
  public get_specs(): string {
    //
    //Specify the pop up window dimensions.
    //width
    const w = 500;
    //height
    const h = 500;
    //
    //Specify the pop up window position
    const left = screen.width / 2 - w / 2;
    const top = screen.height / 2 - h / 2;
    //
    //Compile the window specifictaions
    return `width=${w}, height=${h}, top=${top}, left=${left}`;
  }

  //Close this popup window
  async close(): Promise<void> {
    this.win.close();
  }
}
//)
// A string that represents urls for retrieving html files and templates.
export type url = string;
//
//Text that can be painted in on a page
export type html = string;
//
//The response you get using aa popup or an ordinary page
//export interface response { }
//
//
//Namespace for handling the roles a user plays in an application
export namespace assets {
  //
  //Title is a descriptive piece of text
  type title = string;
  //
  //Role id and entity ames at the application level are simply strings
  export type role_id = string;
  export type ename = string;

  //Verbs for crud operations
  export const all_verbs = ["create", "review", "update", "delete"] as const;
  //
  //All possible operations that a user can to to an entity
  //type verb = 'create'|'review'|'update'|'delete';
  export type verb = (typeof all_verbs)[number];
  //
  //Add/or remove an operation from all the 4 possible ones
  type xor = "-" | "+";
  //
  //A listener is either a...
  export type listener =
    //
    //...call to the inbuilt crud function...
    | ["crud", ename, Array<verb>, xor, dbname?]
    //
    //...or a user defined function implemented directly in this code...
    | ["event", (...n: any) => void]
    //
    //...or a user defined function specified as a string to be attached
    //to an element using the set attribute
    | ["string", string];
  //
  //A solution in a product is implemented as a listener to some
  //executable code.
  export interface solution {
    id: string;
    title: string;
    listener: listener;
  }
  //
  //This is a collection of solutions indexed by an id. Not how solutions
  //and produts build into a tree structure
  export type solutions = { [solution_id: string]: solution };
  //
  //A product is a set of named solutions. The solutions are indexed to allow
  //merging from different sources: shared inbuilts, inbuilt application
  //specifics and database asset sub-system
  export interface product {
    //
    //Short name for the product.
    id: string;
    //
    //Longer descriptive name of the product.
    title: title;
    //
    //Mark products that are subscribed by a user.
    //They are accessed throught the product-asset-player route.
    is_subscribed?: boolean;
    //
    //Indicated if this is a globally accessible product or not. A product
    //is global if it is not associated with any application via the
    //execution path.
    is_global: "yes" | "no";
    //
    //Products customized for a specific role.
    //They are accessed through the product-custom-role route of
    //the products model.
    customed?: Set<string> | null;
    //
    //Cost($) of subscribing to this product.
    //Null means it's free.
    cost?: number | null;
    //
    //Solutions associated with this product.
    solutions: solutions;
  }
  //
  //The products are indexed by a product id of type string
  export type lookup = { [product_id: string]: product };
  //
  //A product where the solution is not indexed. This simplifies the
  //specficication of new products from a users perspective
  export interface uproduct {
    id: string;
    title: string;
    //
    //Solutions has been expanded to allow for recurssion
    solutions: Array<assets.solution>;
  }
}
//This is a general structure for handling  key value pair situations. We use
//this structure for making selections. The user sees the option's name; the value
//term is typically what we are interested in. Its type is user defined. Hence
//the parametrization
export type option<i> = { name: string; value: i };
//
//This is a generalised popup for making selections from multiple choices
//The choices are provided as a list of key/value pairs and the output is
//a either a single choice or a list of them.
export class choices<
  //
  //Let 'i' be the user defined type of element of the array making up the
  //input choices
  i,
  //
  //Let 'a' be the type of desired output constrained, i.e., single or multiple
  a extends "single" | "multiple",
  //
  //Let 'r' be the data being returned by this popup. Its either a single i or
  //its array depending on the 'a' parameter
  r extends a extends "single" ? i : a extends "multiple" ? Array<i> : never
> extends popup<r> {
  //
  constructor(
    //
    //The html file to use for the popup
    filename: string,
    //
    //The option/term pairs that are to be painted as checkboxes
    //when we show the panel.
    public choices: Array<option<i>>,
    //
    //Indicate whether multiple or single choices are expected
    public type: a,
    //
    //This is a short code that is used as a name for the choice (checkbox
    //or radio) buttons
    public id: string = "temp",
    //
    //The popoup window size and location specification.
    specs?: string,
    //
    //The css that retrieves the element on this page where
    //the content of this page is to be painted. If this css
    //is not set the content will be painted at the body by default
    public css: string = "body"
  ) {
    super(filename, specs);
  }
  //
  //Check that the user has selected  at least one of the choices
  async check(): Promise<boolean> {
    //
    //Get the user selections as array indices (of type text)
    const indices: Array<string> = this.get_input_choices(this.id);
    //
    //It's a user error if there is no choice made
    if (indices.length === 0) {
      alert(`Please select at least one ${this.id}`);
      return false;
    } //
    //
    //Set the global property result, depending on this type specified in
    //the constructor
    switch (this.type) {
      //
      //For single choices, return i
      case "single":
        //
        //Its a system error if more than one choice is made
        if (indices.length !== 1)
          throw new mutall_error("A single selection cannot be more than one");
        //
        //Set the result. (The constraining was suggested by Typescript)
        this.result = <r | undefined>this.choices[+indices[0]].value;
        break;
      //
      //For multiple choices, return an array of i
      case "multiple":
        //
        this.result = <r | undefined>(
          indices.map((index) => this.choices[+index].value)
        );
        break;
      default:
        throw new mutall_error(`Unknown type ${this.type}`);
    }
    //
    //The selection was successful
    return true;
  }

  //Returns the values of the currently selected inputs
  //from a list of named ones
  public get_input_choices(name: string): Array<string> {
    //
    //Collect the named radio/checked inputs
    const radios = Array.from(
      this.document.querySelectorAll(`input[name="${name}"]:checked`)
    );
    //
    //Map teh selected inputs to thiier values and return the collection
    return radios.map((r) => (<HTMLInputElement>r).value);
  }
  //
  //Retrive the choices that the user has filled from the form
  async get_result(): Promise<r> {
    //
    //Throw an exception if the result is not set
    if (this.result === undefined)
      throw new mutall_error("You forgot to set the result");
    //
    return this.result;
  }
  //
  //Overide the show panels method by painting the css referenced element or
  //body of this window with the inputs that were used to create this page
  async show_panels() {
    //
    //Get the element where this page should paint its content,
    //this is at the css referenced element if given or the body.
    const panel = this.document.querySelector(this.css);
    if (panel === null)
      throw new mutall_error("No hook element found for the choices");
    //
    //The panel must be a html element. This test has failed!!!! Is a HTMLDivElement
    //not a HTML Element? Ignore the test, and force panel to be a HTML element
    //if (!(panel instanceof HTMLElement)) throw new schema.mutall_error(`The css '${this.css}' for hooking a choices panel must refer to a HTML element`);
    //
    // Use radio buttons for single choices and checkbox for multiple
    // choices
    const choice_type = this.type === "single" ? "radio" : "checkbox";
    //
    //Create a field set to contain the options, anchored in the panel
    const fs = this.create_element("fieldset", <HTMLElement>panel);
    //
    //Add the legend
    this.create_element("legend", fs, { textContent: this.id });
    //
    //Attach the choices as the children of the field set
    this.choices.forEach((option, index) => {
      //
      // Compile the HTML option element
      const label = this.create_element("label", fs, {
        textContent: `${option.name}`,
      });
      //Attach the checkbox/radio button to the label
      this.create_element("input", label, {
        type: choice_type,
        value: String(index),
        name: this.id,
      });
    });
  }
}
//
//This is a view displayed as a baby but not used for collecting data
//It is used in the same way that we use an alert and utilises the general
//html.
export class report extends baby<void> {
  //
  //
  constructor(
    //
    //This popup parent page.
    mother: page,
    //
    //The html text to report.
    public html: string,
    //
    //The html file to use
    filename: string
  ) {
    //
    //The general html is a simple page designed to support advertising as
    //the user interacts with this application.
    super(mother, filename);
  }
  //
  //Reporting does not require checks and has no results to return because
  // it is not used for data entry.
  async check(): Promise<boolean> {
    return true;
  }
  async get_result(): Promise<void> {}
  //
  //Display the report
  async show_panels() {
    //
    //Get the access to the content panel and attach the html
    const content = this.get_element("content");
    //
    //Show the html in the content panel.
    content.innerHTML = this.html;
    //
    //Hide the go button from the general html since it is not useful in the
    //the reporting
    this.get_element("go").hidden = true;
  }
}
