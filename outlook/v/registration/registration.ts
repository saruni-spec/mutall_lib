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
import { mutall_error, basic_value } from '../../../schema/v/code/schema.js';
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
import {label } from '../../../schema/v/code/questionnaire.js';
//
//To support tabulation
import {homozone, heterozone, plan, options, driver_source, cell} from '../../../outlook/v/zone/zone.js';
//
import {io_type } from '../../../schema/v/code/io.js';

//
//The data being collected for user authentication
export type credentials = {
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
//This is the dialog that will help in collection of the user data for driving the
//registration process
class authenticate_user extends dialog<credentials> {
    //
    //Reference to the user that has logged in
    public user?: user;
    //
    constructor(parent?:view) {
        //
        //Initialize the dialog with the given fragment and anchor
        super(parent, undefined, true, '../../../outlook/v/registration/registration.html');
    }
    //
    //Implement the populate method
    //This method does nothing at the moment
    public async populate(): Promise<void> {
    }
    //
    //Handle final document preparations before presenting the dialog to the user
    //Override this method if you dont intend to have the fluctuate functionality in your form
    protected onload(): void {
        //
        //Get the show password checkbox
        const checkbox: HTMLElement = this.get_element('show_password');
        //
        //Access the input element responsible for collecting the password
        const password_element = this.proxy!.querySelector(
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
    public async execute(input: credentials): Promise<'ok' | Error> {
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
                return new Error('Please select an operation');
        }
        
    }
    //
    //Using the outlook instance given acces the authentication service
    //The result of a succesfull authentication process is a user otherwise an error
    //The user details are stored in the local storage and also returned if the
    //???????????? We are not using the credentials at this point
    public async sign_in(auth: outlook): Promise<'ok' | Error> {
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
        return 'ok';
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
    public async sign_up(auth: outlook): Promise<'ok' | Error> {
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
        return 'ok';
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
//Handles all registration activities
//
//The registration facilites provided by this class include:-
//Sign in
//Sign up
//Sign out
//Password reset(Forgot password)
//Changing password
//Updating User details
export class register_user extends authenticate_user {
    //
    //The key to the user in the local_storage. The key value is a json string of
    //Iuser. You can convert to a user by creating a new one
    static current_user_key: string = '___user';
    //
    //
    //Put the mutall_uuser database in the view hierarchy, as it is the
    //default database used for registration 
    public dbname:string = 'mutall_users';
    //
    //Allows for instantiation of the class
    constructor(
        //
        //Identifier of the business app that this registration system was 
        //launched from, if any
        public business_id?: string,
        //
        //To let this class be part of the view hiearrchy
        parent?:view,
    ) {
        //
        super(parent);
    }

    async execute(input:credentials):Promise<'ok'|Error>{
        //
        //Authenticate the user. This sets the user property
        const result:'ok'|Error = await super.execute(input);
        //
        //Extending the authentication process to register a current business
        //
        //Discontinue registration if authetication failed
        if (result instanceof Error) return result;
        //
        //The user is now available. Complete this level 1 registration, thus
        //setting the current user business.
        //
        //Get the user's business that should be associated with this
        //application
        const biz:business|Error = this.business_id 
            //
            //If the id is available, then use it to get the business...
            ? await this.get_biz(this.business_id)
            //
            //...otherwise select one from the already registered businesses for
            //which this user is a member
            : await this.select_biz();
        //
        //Discontinue if the biz registartion failed
        if (biz instanceof Error) return biz;
        //
        //Update the user's business
        this.user!.business = biz;
        //
        //Save the user to the local storage of the browser
        window.localStorage.setItem(register_user.current_user_key, JSON.stringify(this.user));
        //
        return 'ok';
    }

    
    //Fetch the identified business from the database, or register a new one
    async get_biz(id:string):Promise<business|Error>{
        //
        //Fetch the business
        const result:{biz:business, is_registered:boolean}|undefined = 
            await this.fetch_biz(id);
        //
        //If the business is not registered, then register it as well as the user
        if (!result) {
            //
            //Confirm, if you really would want to be registered under the new 
            //business
            const yes:boolean = window.confirm(`'${this.user!.name.toUpperCase()}', you will be registered as a member of '${id}'?`);
            //
            //Discontinue registration if aborted 
            if (!yes) return new Error(`Registration aborted`);
            //
            //Create the registration dialog
            const dlg = new register_biz_and_user(id, this.user!, this); 
            //
            //Return teh business
            const biz:business|undefined = await dlg.administer();
            //
            return biz??new Error('Registration aborted');
        }    
        //
        //If both the business and the user are registered then return the business
        if (result.is_registered) return result.biz;
        //
        //Register the user for this business (after consenting)
        return await this.register_user_only(result.biz);
        
    }

    //Register the user for this business (after consenting).
    async register_user_only(biz:business):Promise<business|Error>{
        //
        //Get the consent. If consent denied, abort the process
        const yes:boolean = window.confirm(`'${this.user!.name.toUpperCase()}', you will be registered as a member of '${biz.id}'?`);
        //
        //Discontinue registration if denied consent 
        if (!yes) return new Error(`Registration aborted`);
        //
        //Compile the questionnaire labels
        const labels:Array<label> = [
            [null, 'member', 'member'],
            [this.user!.pk, 'user', 'user'],
            [biz.id, 'business', 'id']
        ]
        //
        //write a member record for the current user and busuiness
        const result:'ok'|string = await this.exec_php(
            'questionnaire',
            ['mutall_users'],
            'load_common',
            [labels]
        )
        //
        //Return the bsuiness or the data writing error
        return result==='ok' ? biz: new Error(result);
    }

    //Select a biz from the already registered businesses for which this user 
    //is a member
    async select_biz():Promise<business|Error>{
        //
        //Count all businesses registered under current user
        //
        //Formulate the sql
        const sql = `select
                business.*
            from
                business
                inner join member on member.business= business.business
                inner join user on member.user = user.user
            where
                user.user = '${this.user!.pk}'    
        `
        //
        //Execute the sql
        const result:Array<business> = await this.exec_php(
            'database',
            ['mutall_users', false],
            'get_sql_data',
            [sql]
        );
        //
        //If there is one and only one, return it
        if (result.length ===1) return result[0]; 
        //
        //If there is none, use the existing businesses to register this member
        if (result.length===0) {
            //
            //Register membership for businesses
            const bizs = new register_bizs(this.user!, this);
            //
            const ok:true|undefined = await bizs.administer();
            //
            if (!ok) return new Error(`Registration aborted`);
            //
            //Continue to select a biz
            return await this.select_biz()
        }
        //
        //There are multiple busineses, allow the user to select one of them
        //
        //Create a dialog for selecting one of the registerd business as the 
        //current on for this session
        const select = new select_biz(this.user!, this);
        //
        //Do the selection.
        const biz:business|undefined = await select.administer(); 
        //
        //Return the result if valid
        if (!biz) return new Error('Registration aborted because you aborted business selection ');
        //
        return biz;
    }

    //
    //Fetch (from the database) all the businesses for which the user is 
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
                        business.business
                    from
                        business
                        inner join member on member.business = business.business
                        inner join user on member.user = user.user
                    where
                        user.user = ${this.user!.pk}
                        and business.id = '${business_id}'
                )
            select
                business.*,
                if(membership.business is null, false, true) as is_registered
            from
                business
                left join membership on membership.business = business.business     
            where
                business.id = '${business_id}'
        `;
        //
        //Execute the query to get the desired list of businesses
        const results: Array<{business:number, id:string, name:string, is_registered:boolean}> = await server.exec(
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
        const {business, id, name, is_registered} = results[0];
        //
        //Compile and return the business
        return {biz:{business, id, name}, is_registered};
    }

    //
    //Remove user from the local storage
    public static clear_local_storage(): void {
        //
        //Clear the current user from teh local storage
        window.localStorage.removeItem(register_user.current_user_key);
    }
    //
    //Get the user that is existing in the window storage, that is, the user
    //that is currently logged in otherwise return undefined if there's no user
    //that is logged in
    public static get_current_user(): user | undefined {
        //
        //Check that the local storage has someone logged in.
        const Iuser_str: string | null = window.localStorage.getItem(register_user.current_user_key);
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


//After the user consents to registred under the given biz, an corresinding
//entry is mage in the emreship table 
class register_member extends dialog<void>{
    //
    constructor(public biz:business, public user:user, parent:view){
        //
        //Use the shared template, default anchor and modal shoe
        super(parent, undefined, true, "../../../outlook/v/registration/dialog.html");
    }
    //
    //Complete populating the dialog box with user and business datails
    async populate():Promise<void> {}
    //
    //Read does nothing
    async read():Promise<void>{}
    //
    //Update tuser membership
    async execute(input:void):Promise<'ok'|Error>{
        //
        //Define teh user label layout
        const layouts:Array<label> = [
            //
            //Defien the user label
            [this.user!.pk, 'user', 'user'],
            //
            //Define the buiz label
            [this.biz.id, 'business', 'id'],
            //
            //Force a membership save
            [null, 'membership', 'membership']
        ]
        //
        //Save teh result
        const result:'ok'|string = await this.exec_php(
            'questionnaire',
            ['mutall_users'],
            'load_common',
            //
            //Use the 2 layouts
            [layouts]
        );
        //
        return result==='ok'? 'ok' : new Error(result);
    }
}
        

//Register all businesses for which this user is a member
class register_bizs extends dialog<true>{
    //
    //
    constructor(public user:user, parent:view){
        //
        super(parent);       
    }
     
    //
    //Execute does nothing as the choices are written in the database as soon
    //as they occur
    async execute(input:true):Promise<'ok'|Error>{ return 'ok'}
    //
    //There will be nothing to read from the dialog, for the same reason as
    //execute
    async read():Promise<true>{return true;}      
    //
    //Populated the dialog with a membership htereozone
    async populate():Promise<void>{
        //
        //Define al homozone of of all the business found in the mutall users
        //database
        const member:homozone = this.get_member();
        //
        //Design a plan for the heterozone to be shown
        const plan:plan = [
            [member.get_header()],
            [member]
        ];
        //
        //Use the plan to create the heterozone identified as member and whose
        //parent is the current dialog, 
        const zone = new heterozone(plan, this);
        //
        //Set options
        this.options = {id:'member', anchor:this.proxy};
        //
        //Show the heterozone
        await zone.show();
    }

     //Retirns teh mmeber homozone
     get_member():homozone{
        //
        //Formulate an sql that returns a pre-filled null record
        //of a user and business
        const sql:string = `
            with
                #List all the businesses of the current user
                membership as (
                    select 
                        member.member,
                        member.business
                    from
                        member
                        inner join user on member.user = user.user
                    where
                        user.user = ${this.user!.pk}
                )            
                #
                #List all the business in the database left joined to those of user
                select 
                    membership.member as \`member.member\`,
                    business.business as \`business.business\`,
                    business.id as \`business.id\`,
                    business.name as \`business.name\`  
                from 
                    business
                    #
                    #Bring in a member via a loose join 
                    left join membership on membership.business = business.business   
            `; 
        //
        //The driver source is a simple sql
        const driver_source:driver_source = {
            type:'sql',
            sql,
            row_index:'business.business',
            dbname:'mutall_users'
        }
        //
        return new homozone({driver_source});
    }
}


//Select one of the user's registered businesses as the current one 
class select_biz extends dialog<business>{
    //
    //The last selected cell
    public cell?:cell;
    //
    //Th member homozone
    public member?:homozone;
    //
    constructor(public user:user, parent:view){
        //
        //Use the available dialog template, default anhoring and modal show
        super(parent);       
    }
     
    //
    //Execute does nothing with teh selected business 
    async execute(input:business):Promise<'ok'|Error>{ return 'ok'}
    //
 
    //Return the business that is selected
    async read():Promise<business>{
        //
        //Get the last selected cell
        if (!this.cell) throw new mutall_error('Please select a business');
        //
        const row:string = this.cell.index[0];
        //
        //Get the business primary key; its teh value of the cell that was last
        //selected
        const business:basic_value = this.cell.io!.value;
        //
        //Get the business id
        const id:basic_value = this.member!.cells_indexed![row]['id'].io!.value;
        //
        //Get the business name
        const name:basic_value = this.member!.cells_indexed![row]['name'].io!.value;
        //
        //Construct the desired bsiness
        const biz:business = {
            business:<number>business, 
            id:<string>id, 
            name:<string>name
        }
        //
        return biz;
    }      
    //
    //Populated the dialog with a membership htereozone
    async populate():Promise<void>{
        //
        //Define a homozone of all the businesses registered for the current user
        this.member = new homozone(this.get_member_options());
        //
        //Design a plan for the homozone
        const plan:plan = [
            [new homozone(),    this.member.get_header()],
            [this.member.get_leftie(this.get_selector_options()), this.member]
        ];
        //
        //Create the heterozone based on membership, anchored in this dialog
        const zone = new heterozone(plan, this);
        //
        //Set zone options
        this.options =  {id:'select_biz', anchor:this.proxy};
        //
        //Show the heterozone
        await zone.show();
    }

    //Get the member options; its a simple sql
    get_member_options():options{
        //
        //Formulate an sql for selecting all businesses registered under this
        //user
        const sql:string = `
            select
                business.business,
                business.id,
                business.name
            from
                business
                inner join member on member.business = business.business
                inner join user on member.user = user.user
            where
                user.user = ${this.user!.pk}
        `
        //
        //Use the sql to define the tabulation driver source of data
        const driver_source:driver_source = {
            type:'sql',
            sql,
            row_index:'business',
            dbname:'mutall_users'
        }       
        //
        return {driver_source, id:'member'}
    }

    //Get the options of a selector. By default, this will defien a homozone
    //that is as wide as tthe header and as tall as the leftie margin of
    //the member homozone 
    get_selector_options():options{
        //
        //Register the last clicked cell of this dialog. This would be useful
        //in accessing the last choice
        const onclick:(cell:cell, evt?:MouseEvent)=>void = (cell)=>{
            //
            this.cell = cell;
        }
        //Define the io as a primary key
        const primary_key:io_type = {
            type:'primary',
            show_values:true,
            button:{type:'radio', name:'biz'}
        }
        //
        //Use a radio buttons for the choices. NO!. checkboxes and radios were
        //not designed for this purpose       
        return {io_type:primary_key, onclick, id:'selector'}; 
    }
}

//Register both the business and the user
class register_biz_and_user extends dialog<business>{
    //
    //Define the member homozone for registering a user and the business
    public member?:homozone
    //
    constructor(public business_id:string, public user:user, parent:view){
        super(parent);
    }

    //Populate form for registering both the business and the user user
    async populate():Promise<void>{
        //
        //Define al homozone of of all the businesses found in the mutall users
        //database
        this.member = this.get_member();
        //
        //Design a plan for the heterozone to be shown
        const plan:plan = [
            [this.member.get_header()],
            [this.member]
        ];
        //
        //Use the plan to create the heterozone identified as member and whose
        //parent is the current dialog, 
        const zone = new heterozone(plan, this);
        //
        zone.options = {id:'member', anchor:this.proxy};
        //
        //Show the heterozone
        await zone.show();
    }

    //Returns the user-member-business homozone, a.k.a., member
    get_member():homozone{
        //
        //Formulate an sql that returns a pre-filled null record
        //of a user and business
        const sql:string = `
            #
            #This bit produces an empty record; of importance are the field names
            #to influence the union
            select 
                member.member as \`member.member\`,
                business.business as \`business.business\`,
                business.id as \`business.id\`,
                business.name as \`business.name\`  
            from 
                business
                #
                #Bring in a member via a loose join 
                join member 
            where business.id ='${this.business_id}'
            
            union

            #This line of code helps to ore-set the business id's value
            select null, null, '${this.business_id}', null
            `; 
        //
        //The driver source is a simple sql
        const driver_source:driver_source = {
            type:'sql',
            sql,
            row_index:'business.business',
            dbname:'mutall_users'
        }
        //
        return new homozone({driver_source});
    }

    //Read a business from the input form
    async read():Promise<business>{
        //
        const result:Array<business> = await this.exec_php(
            'database',
            ['mutall_users', false],
            'get_sql_data',
            [`select * from business where id='${this.business_id}'`]
        );
        //
        //There has to be 1 result, of type business
        const biz:business = result[0];
        //
        //Return the business
        return biz;
    }

    //Overide the execute with doing nothing
    async execute():Promise<'ok'|Error>{return 'ok'}
    
}    
