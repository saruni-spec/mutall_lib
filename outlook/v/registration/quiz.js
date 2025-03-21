import { view } from '../../../outlook/v/code/view.js';
//
import { mutall_error } from '../../../schema/v/code/schema.js';
//
import { fluctuate } from './fluctuate.js';
//Quiz is an abstract class that helps to collect data of any type <i> thru
//some dirty version to the final version of type <i>
//The user must implement the following methods:-
//- populate: fills a dialog box with inputs on load
//- read: extracts the user modified inputs for
//- execute: uses the inputs to execute a save-like operation, e.g., writing
//to a database, effecting registration, etc.
//The main public methods are:-
//- administer: collects inputs from user
export class quiz extends view {
    url;
    //
    //A dialog has a fluctuate object that supports collapsing and expanding
    //of inputs to simplify data entry for complex forms
    fluctuate;
    //
    constructor(
    //
    //The html code needed for constructing a quiz, if any. If not
    //provided the user can programmaticaly provide the code by
    //overriding the populate method. The mashamba project is a case in point
    url, parent) {
        //
        super(url, parent);
        this.url = url;
        //
        //The proxy for this page is the document's body
        this.proxy = this.document.body;
        //
        //Initialiaze support for expanding and collapsing input details
        this.fluctuate = new fluctuate();
    }
    //
    //This method coordinates all data collection and processing activities. It shows the
    //dialog waits for the user to initiate a process after data entry and depending
    //on the process selected by the user the data enterd is retrieved from the form
    //validation checks are done to ensure the quality of the data collected then
    //fainally the process that the user selectd is undertaken returning the collected
    //data upon succes and closing the data collection dialog
    async administer() {
        //
        //Show the dialog (there may be a need to fetch a url from the server)
        const { submit, cancel } = await this.open();
        //
        //Wait for the user to click either save or cancel button
        const result = await this.get_user_response(submit, cancel);
        //
        //Return eithre the data collected or undefined
        return result;
    }
    //
    //Show the dialog (there may be a need to fetch a url from the server)
    //This proceeds by attaching the form fragment to the dialog box and populate the
    //form in case of data modification. Then show the box to enable data entry
    async open() {
        //
        //If the url is provided, use it to show the dialog box?????
        if (this.url)
            await this.show(this.url);
        //
        //Paint the dialog box to refelect the user's wish
        await this.populate();
        //
        //Add event listeners to radio buttons to support fluctuation, i.e.,
        //expansion and collapsing of radin button sections to guide data entry??
        this.onload();
        //
        //Return the submit and cancel buttons as required by this method.
        //
        //Consider constructing them if they are not available
        const buttons = this.get_navigation_buttons();
        //
        return buttons;
    }
    //Get the submit and cancel buttons for navigation a dialog
    //Consider constructing them if they are not available
    get_navigation_buttons() {
        //
        const [submit, cancel] = ['submit', 'cancel'].map(id => {
            //
            //There must be a proxy for this quiz
            if (!this.proxy)
                throw new mutall_error(`No proxy found for this view`);
            //
            //Get any element by the the id, starting the search from the proxy
            //element
            const elem = this.proxy.querySelector(`#${id}`);
            //
            //If the element is found return it...
            if (elem)
                return elem;
            //
            //...otherwise, create one -- a button attached to the proxy element
            //of this page. In a dialog, proxy is the anchor
            const elem2 = this.create_element('button', this.proxy, {
                textContent: id
            });
            //
            return elem2;
            //  
        });
        return { submit, cancel };
    }
    //
    //Add event listeners to radio buttons to support fluctuation, i.e.,
    //expansion and collapsing of radio button sections to guide data entry
    onload() {
        //
        //Get all the radio input elements from the form
        const radios = Array.from(this.document.querySelectorAll('input[type="radio"]'));
        //
        //Add the flactuate functionality to all the radio buttons. Be careful
        //not to interfere with other event listeners, by adding the listener
        //rather than setting onclick
        radios.forEach((radio) => (radio.addEventListener('click', () => fluctuate.onclick(radio))));
        //
        //Show the form in a default manner
    }
    //
    //Use the given url to show this dialog box
    async show(url) {
        //
        //Request for the content of the file specified by the path
        const response = await fetch(url);
        //
        //Abort his procedure if there was an error in server-client
        //communication
        if (!response.ok)
            throw new mutall_error(`Fetching '${url}' failled with status code '${response.status}'.<br/> 
            The status text is '${response.statusText}'`);
        //
        //The proxy of this view must be defined
        if (!this.proxy)
            throw new mutall_error(`Proxy element for this view is not defined `);
        //
        //Append the string to the html of the dialog
        this.proxy.innerHTML += await response.text();
        //
        //Get whatever form was appended to the dialog
        const form = this.proxy.querySelector('form');
        //
        //If no form was appended discontinue the process at this point
        if (!form)
            return;
        //
        //Prevent forms default behaviour
        form.onsubmit = (e) => e.preventDefault();
        //
        //Handle clearance of all error reports on the form
        form.oninput = () => this.on_input();
    }
    //
    //Clear the error messages in the input form immedietly the user starts to input
    on_input() {
        //
        //Get the elements with class 'error' then remove the error message
        const errors = this.document.querySelectorAll('.error');
        //
        //Clear any error messages on the form
        errors.forEach((error) => (error.textContent = ''));
    }
    //
    //We wait for the user to enter the data that is required in the form; then
    //initate either one of the following two processes:-
    //1. submit or
    //2. cancel
    //Based on the user selected process we perform relevant actions
    get_user_response(submit, cancel) {
        //
        //Wait for the user to enter data and initiate the desired process
        return new Promise((resolve) => {
            //
            //After entering input details the user can either
            //
            // ...submit the data
            submit.onclick = async () => await this.submit(resolve);
            //
            // ... or terminate the process by canceling
            cancel.onclick = () => resolve(undefined);
        });
    }
    //
    //On submit we collect the data that the user entered in the form then save
    // it considering:-
    //--the different sources of the data
    //--the need for pinpointed error reporting
    //--the need for resolving the promised data upon succesful saving.
    async submit(resolve) {
        //
        //Retrieve the information that was entered by the user (with all its
        //possible errors)
        const input = await this.read();
        //
        //Check the raw data for errors, reporting them if any
        const output = this.check(input);
        //
        //Continue only of there were no errors. Note the explicit use of '===',
        //just incase output was a boolean value
        if (output === undefined)
            return;
        //
        //Ue the data to execute a user defined operation, e.g., saving he data
        //to a database
        const result = await this.execute(output);
        //
        //Resolve the promised data if the exceute operation was succesful
        if (result === 'ok')
            resolve(output);
        //
        ///..otherwise report the error in a general fashion, i.e., not targeting
        //a specific user input
        else
            this.report_error('report', result.message);
    }
    //Check the raw data for errors, returning with the clean data if there
    //is none or void if there are. The errors are reported in a key-targeted
    //fashion -- thus giving the user a better error handling experience than
    //the common (simpler) practice
    check(input) {
        //
        //If input is not a diacriminant then deal with it
        if (!this.is_discriminant(input))
            return this.check_simple_input(input);
        //
        //This is a discriminat. Cjeck  everyone of its keys
        //
        //Isolate the all the dirt  keys. N.B. Object keys are always strings.
        //Coerce them to the correct type (so that the next filtering can use
        //the correct data types). Also, the data type for keyof is
        //string|null|Symbol. Its the string we want.
        const keys = Object.keys(input);
        //
        //Select the keys with erroneous values
        const err_keys = keys.filter((key) => input[key] instanceof Error);
        //
        //If errors are found, report them to the user and discontinue this
        //check with an undefined result
        if (err_keys.length > 0) {
            //
            //Report the errors
            err_keys.forEach((key) => {
                //
                //Get the k'th value; it muat be an error because filtering
                //ensured so
                const error = input[key];
                //
                //Report the error message targeting the key's place holder.
                this.report_error(key, error.message);
            });
            //
            //There are errors in the raw data, so return the result as undefined
            //(as opposed to clean data)
            return undefined;
        }
        //If the user needs additional checks, the this stub is provided for this
        //purpose
        //const x:Ifuel|undefined = this.oncheck(input)
        //
        //There are no errors in the user inputs. Return the result as the clean
        //data. The unkknown conversion is a suggestion by Intellisense
        return input;
    }
    //Checks if the given input is a discriminant or not
    is_discriminant(input) {
        //
        //An input is a discriminant if it has a key called type, and whose
        //data type is the discriminating string.
        return input.type && typeof input.type === 'string';
    }
    //Check a simple input.
    check_simple_input(input) {
        //
        //If the input is not an error, retrn it;
        if (!(input instanceof Error))
            return input;
        //
        //Otherwise report it in the general area
        this.report_error('report', String(input));
        //
        //...and return undefined
        return undefined;
    }
    //
    //Clear the shared error reporting placeholder. The holder is created if not
    //provided for
    clear_errors() {
        //
        //Get report placeholder...
        const holder = 
        //
        //...that exists
        this.document.getElementById('report') ??
            //
            //...or create a new one at the end of the body
            this.create_element('div', this.document.body, { id: 'report' });
        //
        //Clear it
        holder.innerHTML = '';
    }
}
