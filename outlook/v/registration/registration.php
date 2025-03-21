<?php
//
//Import the schema library to help in querying the database
include '../../../schema/v/code/schema.php';
//
//Import the questionnaire to facilitate writing to the database
include '../../../schema/v/code/questionnaire.php';
//
//To facilitate sending of emails to the user
include '../../../schema/v/messenger_originals/mailer.php';
//
//This class is supposed to handle all server operations of the registration system
class registration{
    //
    //Infomation about the user
    //
    public $name;
    //
    public $email;
    //
    public $password;
    //
    function __construct(string $name, string $email, string $password = null){
        //
        //The username
        $this->name = $name;
        //
        //The email
        $this -> email = $email;
        //
        //The password
        
    }
    //
    //Get the username and email for verification of user deatils
    //Fetch the records from the database using the database class
    //Incase the user was verified successfully proceed to generation of a temporary 
    //password then hash the generated password.
    //Modify the record from the database using the questionnaire class
    //finally send the temporary password to the user via the email.
    //This method returns an ok incase the whole operation of changing the password 
    //was succesfull otherwise it returns an error
    function forgot_password(): string /*"ok" | error:string*/ {
        //
        //Get user details from the database
        //...we expect a user or an exception
        $data = $this ->get_user(); 
        //
        //Check if the user was succesfully identified before continuation of the process
        if($data instanceof string) return $data;
        //
        //Genetate a random password and hash it
        //
        //Generate random bytes then encode them to base 64 to make a string from the bytes
        $password = base64_encode(random_bytes(10));
        //
        //Hash the password
        $hash = password_hash($password,PASSWORD_DEFAULT);
        //
        //Modify the database record of the given user to reflect the new password
        $result = $this->modify_user($data[0]["user"], $hash);
        //
        //On successful modificaton alert the user of the random pasword by sending him/her a mail
        if($result === "Ok") return $this-> alert_user(
            $data[0]["email"],
            "NEW PASSWORD AS REQUESTED!!",    
            "Use the pasword below to access your account before changing it ". $password
        );
        //
        //Return the error of the db modification process
        return $result;
    }
    //
    //Get the user details perfoming relveant validation checks, i.e., 
    //Only one user had the username in the db, And the infomation given by the user
    //matches whatever us in the db
    //If all validation checks are passed return the complete user structure othewise
    //return an error
    private function get_user(): string/*Error*/ |array/* User infomation*/ {
        //
        //Formulate the sql query for geting the user data
        //Concat the username provided by the user
        $sql = "SELECT user, name, email FROM user WHERE name = '".$this ->name."'";
        //
        //Create a new instance of the database class
        $database = new \mutall\database('mutall_users');
        //
        //Use the db obejct to fetch the data
        $result/* Array<{user, name, email}> */ = $database->get_sql_data($sql);
        //
        //If there is no record in the database the user was never registared
        if (count($result) === 0)
            return "You need to be registard with us!";
        //
        //If there is more than one record in the database there is a problem in design
        if (count($result) > 1)
            return "There is an issue with the database indexes";
        //
        //Verify that indeed the email provided is simmilar to what is in the
        //database. If they match continue to change the password otherwise 
        //discontinue the process returning feedback to the user.
        //
        //If only one user exist proceed to compare the email provided with the email 
        //that was gotten from the database
        if ($result[0]["email"] !== $this ->email) 
            return "The email provided is not the one in the database";
        //
        return $result;
    }
    //
    //Using the user primary key and the pasword generated modify the database infomation
    //to reflect the new password and upon success return an ok otherwise return an error
    private function modify_user(string $user, string $hash): string/*"ok"|Error*/{
        //
        //Create an instance of the questionnaire class
        $quest = new \mutall\questionnaire("mutall_users");
        //
        //Collect the layouts
        $layouts = [
            [$user,"user", "user"],
            [$hash, "user", "password"]
        ];
        //
        //Load the data using the questionnaire
        $result/* :'Ok'|string */ = $quest->load_common($layouts, "log.xml");
        //
        return $result ;
    }
    //
    //This method is responsible for communication to the user via means of email
    //In this case i will be using it to alert the user on the changes to the infomation
    //in the database. Upon succesfull operation the method is to return an ok 
    //otherwise it should return an error.
    //The subject and the body of the email must be provided and the rest of the details
    //are gotten form the user object
    private function alert_user(string $recepient,string $subject, string $body): string /*"ok"|Error*/{
        //
        //Create an instance of the mailer class
        $mailer = new mailer();
        //
        //Send the message using the mailer
        $result = $mailer->send_email(
            //
            //The recepient get it from the user property
            $recepient,
            //
            //The subject of the email
            $subject,
            //
            //The body of the email
            $body
        );
        //
        return $result;
    }
    //
    //Get the old(temporary) password and the new password form the user.
    //Verify that all the fielda are filled and the new password and the 
    //confirm new password matches. Then ensure the old password corresponds 
    //to what is there in the database and only then can we proceed with actual 
    //changing of the password (Hashing the new password and modifying the user record in the db)
    function change_password(){
        //
        //
    }
    //
    //Update user info/profile - this option is only avilable for users who are logged in 
    //Get the infomation of the current user from the database.Create a preporulated
    //form to collect user data. wait for the user to enter the data and either choose
    //to continue with the editing or to cancel. If the user cancels we discontinue the process
    //otherwise verify the user password before modifying the db records of the user 
    function update_user(){
        //
        //
    }
}
//
//Testing 
$result = new registration("mogaka", "jamesoyondi23@gmail.com");
//
//
echo $result -> forgot_password();

