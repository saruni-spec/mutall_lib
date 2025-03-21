//
//Access the user class to use it as a data type
import { user, Iuser, business } from '../../../outlook/v/code/app.js';
//
//To access the registration ad authentication services
import { outlook } from '../../../outlook/v/code/login.js';
//
//Import server library
import * as server from '../../../schema/v/code/server.js';
//
//To help in error reporting
import { mutall_error } from '../../../schema/v/code/schema.js';
//
//Use the dialog class to help in data collection
import { dialog } from './dialog.js';
//
//Import the definatition of data with errors
import { dirty } from './quiz.js';
//
//Help to implement DOM manipulation methods
import { view } from '../../../outlook/v/code/view.js';
//
//To support saving of data
import { layout } from '../../../schema/v/code/questionnaire.js';
//
//The data being collected for user authentication
type credentials = {
    type: 'credentials';
    //
    //The primary data that idendifies a user
    username: string;
    password: string;
    //
    //The authentication processes a user can undertake
    operation: string;
};
//
//Handles all registration activities
//
//The registration facilites provided by this class include:-
//Sign in
//Sign up
//Sign out
//Password reset(Forgot password)
//Changing password
//Updating User details
export class registration extends view {
    //
    //The key to the user in the local_storage. The key value is a json string of
    //Iuser. You can convert to a user by creating a new one
    static current_user_key: string = '___user';
    //
    //The user to be registered
    public user?:user;
    //
    //Allows for instantiation of the class
    constructor(
        //
        //Identifier of the business app that this registration system was launched from
        public business_id?: string
    ) {
        //
        super();
    }
    //
    //Coordinate the various registration processes based on the operation
    //that the user selected. We first create a dialog that will collect the data from
    //the user then check the field operation to determine which process was
    //selected by the user and carry out the relevant operation
    public async administer(): Promise<user | undefined> {
        //
        //Create a dialog to collect user credentials (typically username and 
        //password) 
        const enroll = new user_authentication(this.document.body);
        //
        //Use the users database to authenticate the user and return credentials
        const result:credentials|undefined = await enroll.administer();
        //
        //Continue the registration if the authentication was successful
        if (!result) return undefined;
        //
        //Set the user property, as we will refer to it severally; the user must
        //be available
        this.user = enroll.user!;
        //
        //Get the user's business that should be associaeted with this
        //application
        const biz:business = this.business_id 
            //
            //If the id is available, then use it to get the business...
            ? await this.get_biz(this.business_id)
            //
            //...otherwise select one from the already registered businesses for
            //which this user is a member
            : await this.select_biz();
        //
        //Update the user's business
        this.user.business = biz;
        //
        //Save the user to the local storage of the browser
        window.localStorage.setItem(registration.current_user_key, JSON.stringify(this.user));
        //
        //Return the user
        return this.user;
    }

    //Fetch the identified business from the database, or register a new one
    async get_biz(id:string):Promise<business>{
        //
        //Fetch the business
        const result:{biz:business, is_registered:boolean}|undefined = await this.fetch_biz(id);
        //
        //If the business is not registered, then register it and the user as well
        if (!result) return await this.register_biz_and_user(id);
        //
        //If both the business and the user are registered then retrn the business
        if (result.is_registered) return result.biz;
        //
        //Register the user for this business (after consenting)
        return await this.register_user(result.biz, )
    }

    //Register both the biz and user
    async register_biz_and_user(business_id:string):Promise<business>{
        //
        //Create a dialog collecting business details
        const dlg = new dlg_register_biz_and_user(business_id, this.user!.pk);
        //
        //Collect the biz data
        const biz:business = dlg.aminister();
        //
        return biz;
    }

    //Register the user for this business (after consenting)
    async register_user(business_id:string):Promise<business>{
        //
        //Create a dialog collecting business details
        const dlg = new dlg_register_user(business_id, this.user!.pk);
        //
        //Collect the biz data
        const biz:business = dlg.aminister();
        //
        return biz;
    }
   
    //Select a biz from the already registered businesses for which this user 
    //is a member
    async select_biz():Promise<business>{
        //
        //Create a dialog for collecting businesses for which the user want
        //to be registered
        const reg = new dlg_register_bizs();
        //
        //Collect and register for businesses
        const result:'ok'|undefined = await reg.administer();
        //
        //Continue only if the selection was not aborted
        if (!result) throw new mutall_error('Registration aborted because you aborted registation of bsuinesses'); 
        //
        //Create a dialog for selecting one of the registerd business as the 
        //current on for this session
        const select = new dlg_select_biz();
        //
        //Do the selection.
        const biz:business|undefined = await select.administer(); 
        //
        //Return the result if valid
        if (!biz) throw new mutall_error('Registration aborted because you aborted business selection ');
        //
        return biz;
    }

    //
    //Fetch (from teh database) all the businesses for which the user is 
    //registered
    async fetch_biz(business_id:string): Promise<{biz:business, is_registered:boolean}|undefined> {
        //
        //Formulate a query that returns all the businesses that the given user 
        //is involved with
        const sql: string = `
            with
                #
                membership as (
                    select
                        business.business,
                    from
                        business
                        inner join member on member.business = business.business
                        inner join user on member.user = user.user
                    where
                        user.user = ${this.user!.pk}
                        and business.id = '${business_id}'
                )
            select
                id,
                name,
                if(membership.business is null, false, true) as is_registered
            from
                business
                left join membership on membership.business = business.business     
            where
                and business.id = '${business_id}'
        `;
        //
        //Execute the query to get the desired list of businesses
        const results: Array<{id:string, name:string, is_registered:boolean}> = await server.exec(
            'database',
            ['mutall_users', false],
            'get_sql_data',
            [sql]
        );
        //
        //Return undefined if no business is found
        if (results.length===0) return undefined;
        //
        //Destructire the result
        const {id, name, is_registered} = results[0];
        //
        //Compile and return the business
        return {biz:{name, id}, is_registered};
    }





    //
    //After successfull authentication process we need to know which business the user
    //is to access in the current logto complete the level one registration 
    private async register_business(): Promise<business> {
        //
        //Retrieve (from database) all the bsuinesses for which this user is 
        //registered
        let businesses: Array<business> = await this.retrieve_businesses();
        //
        //If no busuiness is found in the database, get them directly from user
        if (businesses.length===0) businesses = await this.get_businesses();
        //
        //Incase the registration system was not launched by any business and 
        //rather as a stand alone application and the given user is a member of 
        //given businesses, We need to ask the user which application do they 
        //want to use currently so we provide all the businesses the user is 
        //involved with for them to choose out of
        if (!this.business_id && businesses) 
            return await this.select_business(businesses);
        //
        //For sure we know that this registration system was launched by a 
        //particular business appllication. We need to acertain that for a fact 
        //the user that logged in is a member of the given business. Since we 
        //have an array of all businesses the user is involved with we try to 
        //look for the business that launched the registration in the collection
        let biz: business | undefined = businesses.find(
            (business) => business.id === this.business_id
        );
        //
        //Incase we find that the user is not a member of the given business we 
        //give the user the chance to register as a member for that particular 
        //business or many others
        if (!biz)
            biz = (await this.get_businesses()).find(
                (business) => business.id === this.business_id
            );
        //
        //If the user did not select the business alert him/her and discontinue 
        //the process
        if (!biz)
            throw new mutall_error(
                'You cannot loggin to a business which you are not a member of!!'
            );
        //
        return biz;
    }
    //
    //Prompt the user to tell what business should be associated with the current loggin session
    //We will use a dialog to colect the data form the user after which we will then update the given user
    //and eventually give back the uptodate version of the user
    private async select_business(businesses: Array<business>): Promise<business> {
        //
        //Create an instance of business selection dialog
        const dlg = new business_selection(this.user!, businesses);
        //
        //Show the dialog to initiate the data collection process
        const results: business | undefined = await dlg.administer();
        //
        //Alert the user that they cannot continue without selecting a given business
        if (!results) throw new mutall_error('You did not select a business!!');
        //
        return results;
    }
    
    //
    //Use a dialog box to collect business that should be associated with a user
    private async get_businesses(): Promise<Array<business>> {
        //
        //Create an instance of the business registration dialog
        const dlg = new business_registration(this.user!);
        //
        //Show the dialog to initiate the data collection process
        const results: Array<business> | undefined = await dlg.administer();
        //
        //Check to see if the user finished the business registration process
        //returning the results of the process incase of success
        if (results) return results;
        //
        //Crash the program if the user did not register businesses
        throw new mutall_error('You must registar the businesses you are a member of');
    }
    //
    //Retrieve the current logged in user and remove the user from the window storage
    public logout(): void {
        //
        //Exit the function if there's no user logged in
        if (!this.get_current_user()) return;
        //
        //Clear the current user from teh local storage
        window.localStorage.removeItem(registration.current_user_key);
    }
    //
    //Get the user that is existing in the window storage, that is, the user
    //that is currently logged in otherwise return undefined if there's no user
    //that is logged in
    public get_current_user(): user | undefined {
        //
        //Check that the local storage has someone logged in.
        const Iuser_str: string | null = window.localStorage.getItem(registration.current_user_key);
        //
        //If no one is logged in, return undefined
        if (!Iuser_str) return undefined;
        //
        //There's someone logged in, convert the user string to an Iuser
        const Iuser: Iuser = JSON.parse(Iuser_str);
        //
        //Create a new user
        return new user(Iuser.name, Iuser.pk);
    }
}
//
//This is the dialog that will help in collection of the user data for driving the
//registration process
class user_authentication extends dialog<credentials> {
    //
    //Reference to the user that has logged in
    public user?: user;
    //
    constructor(anchor: HTMLElement) {
        //
        //Initialize the dialog with the given fragment and anchor
        super(anchor, true, '/outlook/v/registration/registration.html');
    }
    //
    //Implement the populate method
    //This method does nothing at the moment
    public async populate(): Promise<void> {}
    //
    //Handle final document preparations before presenting the dialog to the user
    //Override this method if you dont intend to have the fluctuate functionality in your form
    protected onload(): void {
        //
        //Get the show password checkbox
        const checkbox: HTMLElement = this.get_element('show_password');
        //
        //Access the input element responsible for collecting the password
        const password_element = this.proxy.querySelector(
            'input[type=password]'
        ) as HTMLInputElement;
        //
        //Attach the functionality to show or hide the user password when selected or unselected respectively.
        checkbox.onchange = () => this.show_password(checkbox, password_element);
    }
    //
    //Extract data from the registration form as it is with possibility for errors
    //The dialog system will take care of the error checks and targeted reporting
    public async read(): Promise<dirty<credentials>> {
        //
        //Compile the raw credentials by geting the inputs directly form the form
        //
        //Whatever we read from the enrollment dialog changes depending on the operation.
        //In that when the user selects sign in and sign up we require the user name,
        //email and password and if the user selects forgot password we are required to
        //collect the username and email. The case of change password is special since
        //we need another dialog form to collect the current password and
        //
        //
        return {
            type: 'credentials',
            username: this.get_value('username'),
            password: this.get_value('password'),
            operation: this.get_value('operation'),
        };
    }
    //
    public async execute(input: credentials): Promise<'Ok' | Error> {
        //
        //Create an instance of the outlook class that would handle the authentication
        //and registration processes
        const Outlook: outlook = new outlook(input.username, input.password);
        //
        //Using the data collected select appropriate operation to conduct
        switch (input.operation) {
            //
            //Handle the registation of new users
            case 'up':
                return await this.sign_up(Outlook);
            //
            //Here we handle authentication of exsistent users before allowing them
            //to access offerd services
            case 'in':
                return await this.sign_in(Outlook);
            //
            //It is very difficult to reach at this point without selecting an opperation
            //The dialog system will have alredy informed the user during data collection
            //that he cannot proceed without selection of an operation since it is required
            default:
                return new mutall_error('Please select an operation');
        }
    }
    //
    //Using the outlook instance given acces the authentication service
    //The result of a succesfull authentication process is a user otherwise an error
    //The user details are stored in the local storage and also returned if the
    //???????????? We are not using the credentials at this point
    public async sign_in(auth: outlook): Promise<'Ok' | Error> {
        //
        //Authenticate the user
        const user: user | Error = await auth.authenticate_user();
        //
        //Incase there was a problem with the process return the error that was gotten
        if (user instanceof Error) return user;
        //
        //At this point we know that the user was succesfully authenticated
        //We then store the user
        this.user = user;
        //
        //Finally return ok to indicate that the authentication process was succesfull
        return 'Ok';
    }
    //
    //????????The current registar_user method in the outlook does not take care
    //of the fact that we need the user to provide an email which will be helpful
    //incase of forget password
    //
    //
    //Using the authentication instance perfom the enrollment of the new user
    //After succesfull enrollment we expect the user property of this enrollment
    //class to be updated and the enrolled user records to be stored in the local
    //storage of the browser. In case the registration process was not successfull
    //the function returns the error.
    public async sign_up(auth: outlook): Promise<'Ok' | Error> {
        //
        //Register the user
        const user: user | Error = await auth.register_user();
        //
        //Incase there was a problem with the process return the error that was gotten
        if (user instanceof Error) return user;
        //
        //At this point we know that the user was succesfully registered
        //We then store the user
        this.user = user;
        //
        //Finally return ok to indicate that the authentication process was succesfull
        return 'Ok';
    }
    //
    //Show and hide the password
    private show_password(chkbox: HTMLElement, password_element: HTMLInputElement): void {
        //
        //make the password readable and unreadable depending on the checkbox state
        if ((<HTMLInputElement>chkbox).checked) password_element.type = 'text';
        else password_element.type = 'password';
    }
}
//
//Drive the business registartion process using the below class
//This is a dialog that gets the businesses a user is involved with and
//save the user as a member to the businesses
class business_registration extends dialog<Array<business>> {
    //
    //Usefull for creation of instances of this class
    //To successfully do business registration we need to know which user is doing
    //the business registration. This infomation is helpfull in saving to the db
    constructor(public user: user) {
        //
        //initialize an instance of the parent
        super();
    }
    //
    //Get the input form the form for saving
    async read(): Promise<Array<business>> {
        //
        //Define the collection to hold the selected businesses
        const businesses: Array<business> = [];
        //
        //Get all the checked checkboxes form the document
        const selected: Array<HTMLInputElement> = Array.from(
            this.document.querySelectorAll("input[type = 'checkbox']:checked")
        );
        //
        //Read the values of the checked checkboxes storing them in the colleciton of businesses
        selected.forEach((checkbox) => businesses.push({ id: checkbox.id, name: checkbox.value }));
        //
        //Return the collection of businesses
        return businesses;
    }
    //
    //Create member for the selected number of businesses
    //Given the businesses of a given user we need to record the selected businesses
    //to the database here we use
    public async execute(input: Array<business>): Promise<'Ok' | Error> {
        //
        //Collect the layouts
        const layouts: Array<layout> = [...this.collect_layouts(input)];
        //
        //Use the questionnaire to save the businesses to the dbase
        const results: 'Ok' | string = await server.exec(
            'questionnaire', //Name of the PHP class to use
            ['mutall_users'], //Constructor arguments
            'load_common', //The method to run
            [layouts] //Method arguments
        );
        //
        //Return the results of the saveing operation
        return results === 'Ok' ? 'Ok' : new Error(results);
    }
    //
    //Collect the layouts required to save the membership details of a given user
    private *collect_layouts(businesses: Array<business>): Generator<layout> {
        //
        //for all the recorded businesses generate a layout for storing the infomation to the dbase
        for (let i = 0; i < businesses.length; i++) {
            //
            //Generate a string identifier from the index
            const alias: string = i.toString();
            //
            //Finally genrerate the layouts for each business
            yield [this.user.pk, 'user', 'user', [alias]],
                yield [businesses[i].id, 'business', 'id', [alias]],
                yield [null, 'member', 'member', [alias]];
        }
    }
    //
    //This is the final chance to influence the form appearance
    //Here the goal is to paint my form with dynamic content from the db
    public async populate(): Promise<void> {
        //
        //Formulate a querry to get all businesses in the database
        const sql: string = 'SELECT business, id, name FROM business';
        //
        //Get the businesses from the database
        const results: Array<{
            business: number;
            id: string;
            name: string;
        }> = await server.exec('database', ['mutall_users', false], 'get_sql_data', [sql]);
        //
        //Iterate over the businesses creating a checkbox for each
        results.forEach((result) => {
            //
            //Create a label to hold the particular business option
            const env: HTMLElement = this.create_element('label', this.proxy, { id: result.id });
            //
            //Create the acctual checkbox?????????
            this.create_element('input', env, {
                type: 'checkbox',
                id: result.id,
                value: result.name,
            });
            //
            //Label the given business option
            env.innerHTML += result.name;
        });
        //
        //Display the labels in a block format
        this.proxy
            .querySelectorAll('label')
            .forEach((element) => (element.style.display = 'block'));
        //
        //Create a error reporting section
        const err = this.create_element('span', this.proxy, { id: 'report', className: 'error' });
        //
        //Error reporting section
        this.create_element('span', err, { className: 'error' });
        //
        //Finall create the buttons for driving the data collection process
        //
        //submit
        this.create_element('button', this.proxy, { id: 'submit', textContent: 'submit' });
        //
        //cancel
        this.create_element('button', this.proxy, { id: 'cancel', textContent: 'cancel' });
    }
}
//
//Provides a mechanism for the user to select the business to be associated with the
//current log in session
class business_selection extends dialog<business> {
    //
    //Responsible for initialization of objects in this class
    constructor(public user: user, public businesses: Array<business>) {
        //
        //Call the constructor of the parent class
        super();
    }
    //
    //The populate is responsible for population of the form with data when editing
    //We currently have no data to pupulate to the form
    async populate(): Promise<void> {}
    //
    //Subroutine responsible for final form preparation befor it could be used
    //for data entry
    protected onload(): void {
        //
        //Create a label to hold the various business options
        const env: HTMLElement = this.create_element('label', this.proxy, { id: 'businss' });
        //
        //Go through all the businesses and do as follows for each business
        this.businesses.forEach((business: business, index: number) => {
            //
            //Display the user businesses as options
            this.create_element('input', env, {
                type: 'radio',
                name: 'business',
                value: index.toString(),
            });
            //
            //create a visible label for the businesses
            this.create_element('span', env, { textContent: business.name });
        });
        //
        //Create a error reporting section
        this.create_element('span', this.proxy, { id: 'report', className: 'error' });
        //
        //Create the control buttons
        //
        //Submit
        this.create_element('button', this.proxy, {
            id: 'submit',
            textContent: 'Submit',
        });
        //
        //Cancel
        this.create_element('button', this.proxy, {
            id: 'cancel',
            textContent: 'Cancel',
        });
    }
    //
    //This is to get the user selection from the dialog box after submission
    async read(): Promise<business | Error | null> {
        //
        //Get all selected radio buttons in the document
        const selection: Array<HTMLInputElement> = Array.from(
            this.proxy.querySelectorAll("input[type = 'radio']:checked")
        );
        //
        //Ensure that only one business was selected
        if (selection.length > 1)
            throw new mutall_error('Problem found in the design of the radio buttons');
        //
        return this.businesses[parseInt(selection[0].value)];
    }
    //
    //This is what to do after data collection is complete
    //This is the process that led to the data collection in the first place
    async execute(input: business): Promise<'Ok' | Error> {
        //
        //Update the user
        this.user.business = input;
        //
        //Save the user to the local storage of the browser
        window.localStorage.setItem(registration.current_user_key, JSON.stringify(this.user));
        //
        return 'Ok';
    }
}

