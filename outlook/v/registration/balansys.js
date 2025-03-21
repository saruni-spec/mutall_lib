//
//Access the registration services from the registration class
import { registration } from "./registration.js";
//
//Help to implement DOM manipulation methods
import { view } from "../../../outlook/v/code/view.js";
//
//Export the class in order to use it as a module elsewhere
export class balansys extends view {
    //
    register;
    //
    //To facilitate instantiation of the class
    constructor() {
        //
        //Instanciate the parent class
        super();
        //
        //Create an instance of the registration class in order to access
        //the services it offers
        this.register = new registration();
    }
    //
    //Take care of the page display( ,i.e., show the log in/ register message 
    //depending on the registration status of the user )
    show_panels() {
        //
        //Get hold of the invitation paragraph element
        //Here is where we will display the link to the registration depending 
        //on presence of a currently logged in user
        const invitation = this.get_element('invitation');
        //
        //Get the currently logged in user
        const current_user = this.register.get_current_user();
        //
        //if a user exist Welcome him
        if (current_user) {
            //
            //Welcome the user
            this.welcome(current_user);
            //
            return;
        }
        //
        //We know that no user is logged in so we display the registration invitation
        invitation.innerHTML = '<span onclick="Balansys.sign()" id="register">Register</span> to Access Services on this Platform';
    }
    //
    //Method that handles signing in the system
    async sign() {
        //
        //Get the user that has logged in/registered
        const User = await this.register.administer();
        //
        //If the registration was aborted, do not continue with sign procedure
        if (User === undefined)
            return;
        //
        //Welcome the user upon successful signing in
        this.welcome(User);
    }
    //
    //Method responsible for welcoming the user
    //Show the welcome and hide the register paragraphs if the user is logged in
    //vice versa if nobody is logged in
    welcome(User) {
        //
        //Employ the logic of welcoming the user to the site
        //Hide the invitation text content and show the welcome
        //message
        this.get_element('invitation').hidden = true;
        this.get_element('welcome').hidden = false;
        this.get_element('user_name').innerHTML = User.name;
    }
    //
    //Logout the user that is currently logged in
    logout() {
        //
        //Call the logout method
        this.register.logout();
        //
        //Hide the user welcoming message
        this.get_element('invitation').hidden = false;
        //
        //Display the user register/ login method
        this.get_element('welcome').hidden = true;
    }
}
