//
//Access the registration services from the registration class
import {register_user} from "./registration.js";
//
//Access the user class to use it as a data type for holding the 
//user credentials
import {user} from "../../../outlook/v/code/app.js"
//
//Export the class in order to use it as a module elsewhere
export default class test{
    //
    public register:register_user;
    //
    //To facilitate instantiation of the class
    constructor(){

        //Create an instance of the registration class in order to access
        //the services it offers
        this.register = new register_user();
    }

    
    //
    //Method that handles signing in the system
    async sign():Promise<void>{
        //
        //
        //Get the user that has logged in/registered
        const User:user|undefined =  await this.register.administer();
        //
        //If the registration was aborted, do not continue with sign procedure
        if (User===undefined) return;
        //
        //Welcome the user
        this.welcome(User);
        
    }
    //
    //Method responsible for welcoming the user
    //Show the welcome and hide the register paragraphs if the user is logged in
    //vice versa if nobody is logged in
    welcome(User:user):void{
        //
        //Employ the logic of welcoming the user to the site
        //Hide the invitation text content and show the welcome
        //message
        document.getElementById('invitation')!.hidden = true;
        document.getElementById('welcome')!.hidden=false;
        document.getElementById('username')!.innerHTML = User.name
    }
    //
    //Logout the user that is currently logged in
    logout():void{
        //
        //Call the logout method
        this.register.clear_local_storage();
    }
}