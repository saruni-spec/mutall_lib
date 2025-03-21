import { quiz } from './quiz.js';
//
//Dialog is an abstract class that has 3 public methods:-
//- administer - that starts the data collection and returns the collected inputs 
//  from user
//- populate that fills a dialog box with inputs
//- get_raw_user_inputs that reads the user modified inputs from the dialogbox
export class dialog extends quiz {
    anchor;
    modal;
    fragment_url;
    //
    constructor(
    //
    //To support the view hierarchy. 
    parent, 
    //
    //Where to apend the dialog box in the current document. Is this really
    //important? Can you not anchor anywhere?
    anchor, 
    //
    //How to show the dialog, modal or modalless
    modal = true, 
    //
    //The optional html fragment needed for constructing a dialogbox
    // This is the path to the data collection form
    fragment_url) {
        //
        //Instantiate myalert which is the parent class of a dialog
        super(fragment_url, parent);
        this.anchor = anchor;
        this.modal = modal;
        this.fragment_url = fragment_url;
        //
        //Create the proxy
        this.proxy = this.create_element('dialog', this.anchor ? this.anchor : this.document.body);
        //
        //To support debuging dialogs, show the constructor name at the top
        this.create_element('p', this.proxy, { textContent: this.constructor.name });
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
        //Coordinate the data collection process and get the expeced result
        const result = await super.administer();
        //
        //Close the dialog box
        this.proxy.close();
        //
        //Remove the dialog from the document
        this.proxy.remove();
        //
        //return the results
        return result;
    }
    //
    //Process of attaching the form fragment to the dialog box and populating the
    //form in case of data modification.After all these processes show the dailog
    //box to the user for data entry.
    async open() {
        //
        //Finish the dialog set up process from the parent class
        const { submit, cancel } = await super.open();
        //
        //Show the dialogbox, modalessly,or otherwise
        if (this.modal)
            this.proxy.showModal();
        else
            this.proxy.show();
        //
        //Do the form preparations (adding targeted error reporting and marking
        //the required fields with asterisk. This rask is still pending)
        await this.onopen();
        //
        //Return the controll buttons
        return { submit, cancel };
    }
    //
    //Perform the final preparations on the data collection form ,i.e., adding
    //error reporting sections and also marking the required fields with asteriks
    async onopen() {
        //
        //Get all the data collection envelops
        //
        //Add a span with the class error which is for targeted error reporting
        //
        //Check if the field has a requird attribute and append an asterik to indicate
        //that the field is required
    }
}
