//The result of trying to merge 2 data types can be:-    
export type merge<T> = 
    //
    //One defined value (if the othe is undefined)
    {type:'merged', value:T}
    //
    //2 defined but different values
    |{type:'difference', values:[T, T]}
    //
    //..undefined if the 2 values are undefined
    |undefined;  
    
//
//The actual value being sent to the server or received from a server. NB. 
//Error is not a basic value; we would never write to a database
export type basic_value = boolean|number|string|null;

export class mutall{

    //
    constructor(){}

    //A type guard for basic values
    static is_basic_value(x:unknown):x is basic_value{
        //
        if (typeof x==='string') return true;
        //
        if (typeof x==='number') return true;
        //
        if (typeof x==='boolean') return true;
        //
        if (x===null) true;
        //
        return false;
    }
    
    //Merge 2 pieces of any inputs of the same type to get a similar output.
    //If merging is not possible then return the 2 different inputs
    static merge<T>(a:T|undefined, b:T|undefined):merge<T>{
        //
        //If both a and b are undefined return undefined
        //if (!a && !b) return undefined;
        //
        //If the 2 inputs are equal the result is one of them
        if (!a && b) return {type:'merged', value:b};
        //
        //If b is not defined, and a is defined, retirn a
        if (!b && a) return {type:'merged', value:a};
        //
        //If a is not defined and is defined, return b
        if (!a && b) return {type:'merged', value:b};
        //
        //Return the 2 defined but different inputs
        if (a && b && a!==b)  return {type:'difference', values:[a,b]}
        //
        //If both a and be are undefined, retir undefined (ratjer than equal)
        return undefined
    }

    //This behaves like the merge, except that if merging is not possible 
    //then an exception is thrown
    static merge_with_failure<T>(a:T|undefined, b:T|undefined):
        {type:'merged', value:T}
        |undefined
    {
        //Do the preliminary merge
        const result = this.merge(a,b);
        //
        //If the result is undefined, return undefined
        if (!result) return result;
        //
        //Merging is not possible because the 2 values are different.
        //Throw  an exception
        if (result.type==='difference') {
            //
            //Destructure the result
            const [a,b] = result.values;
            //
            //Report
            throw new mutall_error(`Unable to merge 2 inputs`, a, b);
        }
        //
        //On success, return the result
        return result;    
    }

    /**
     * Compares two arrays for equality.
     * @param arr1 - The first array to compare.
     * @param arr2 - The second array to compare.
     * @returns True if the arrays are equal, otherwise false.
     */
    static arrays_are_equal<T>(arr1: T[], arr2: T[]): boolean {
        //
        // Check if the arrays have the same length
        if (arr1.length !== arr2.length) {
            return false;
        }   
        //
        // Compare each element in the arrays
        for (let i = 0; i < arr1.length; i++) {
            if (arr1[i] !== arr2[i]) {
                return false;
            }
        }
        //
        // If all elements match, return true
        return true;
    }


    

}


//A utility designed to override the get of a Map so that it throws a
// mutal error, rathr than return an undefined
export class mymap<k, v> extends Map<k, v>{
    //
    //Do the usual construction. Note how our constructor is more string then the
    //one we are overriding 
    constructor(public descriptor:string, iterable: Iterable<readonly [k, v]>, ){
        super(iterable);
    }
    //
    //Override the get method
    get(key: k): v{
        //
        //Do the normal get -- the one being overriden
        const result:v|undefined = super.get(key);
        //
        //If the key was found return it...
        if (result) return result;
        //
        //...otherwise throw an excption
        throw new mutall_error(`'${this.descriptor}' '${key}' is not found`);
    }
}

//
//This class extends the normal Javascript error object by alerting the user
// before logging the same error, stack trace details and other user defined 
//variables values to the console.
export class mutall_error extends Error{
    //
    //Every error has an error message. The extra information is optional. If
    //present, it is displayed in the console log, and the user is alerted to this
    //fact. Typically, the extra is a a complex object, where we can use the 
    //console log to inspect it.
    constructor(msg:string, ...extra:Array<any>){
        //
        //Use the message to initialize the parent error object
        super(msg);
        //
        //If the extra is available, then console log it asfirst
        if (extra.length>0) console.log(extra);
        //
        //Compile the console log invitation
        const invitation = extra.length>0 ? "": 'See the user  messages in the console.log for further details'
        //
        //Alert the user with the error message, expanded with console 
        //invitation.
        myalert(`${msg}<br/><br/>${invitation}`);
        
    }
    
    //Use a dialogbox (hooked to the body of the current docment)to report the
    //given error message and the invitation to inspect teh console.log for
    //further details
    private report(msg:string):void{
        //
        //Get the document's body where to hook the reporting assembly
        const body:HTMLElement = document.body;
        //
        //Create the div assembly to comprise of the 'Open' dialog button
        //and the dialog box itself. To the assemby:-
        const assembly:HTMLDivElement = document.createElement('div');
        body.insertBefore(assembly, body.firstChild);
        //
        //Add the dialog box to the assembly.
        const dlg:HTMLDialogElement = document.createElement('dialog');
        assembly.appendChild(dlg); 
        //
        //Add the button (for opening the dialogbox to review the error message
        //when desired) to the top of the body.
        const open:HTMLButtonElement = document.createElement('button');
        assembly.appendChild(open); open.textContent = 'Open';
        open.onclick = ()=>dlg.showModal();
        //
        //To the dialog box:-
        //
        //Add the 'Close' button for hidding the dialog for reviewing 
        //later when desired
        const close:HTMLButtonElement = document.createElement('button');
        dlg.appendChild(close); close.textContent='Close';
        close.onclick = ()=>dlg.close();
        //
        //Add the 'Remove' button for detaching the dialog assemby from the 
        //document's body
        const remove:HTMLButtonElement = document.createElement('button');
        dlg.appendChild(remove); remove.textContent='Remove';
        remove.onclick=()=>body.removeChild(assembly);
        //
        //Add a div place holder for the message string and transfer the message
        //content.
        const holder:HTMLDivElement = document.createElement('div');
        dlg.appendChild(holder); holder.innerHTML = msg;
        //
        //Show the dialog modally
        dlg.showModal();
    }
}

//
//A custom alert (to replace the normal js version) using dialog technology. 
//You may attach extra data to be shown in the console log
export function myalert(message:string, ...extra:any):void{
    //
    //Create a dialog element that is used to serve the message
    const dlg: HTMLDialogElement = document.createElement("dialog");
    //
    //Append the dialog to the current document body...step 2. This will be
    //undone in step 5 below 
    document.body.appendChild(dlg);
    //
    //Append the message to the dialog with the assumption that it is html
    //formated
    dlg.innerHTML = message;
    //
    //Create a cancel button which is responsible for closing the dialog
    //
    //Create button
    const cancel:HTMLButtonElement = document.createElement("button");
    cancel.textContent="Cancel";
    //
    //Assign onclick listener, that removes the dialog completely -- the 
    //opposite of step 2 above....step 5
    cancel.onclick = ()=> document.body.removeChild(dlg);
    //
    //Append the cancel button to the dialog
    dlg.appendChild(cancel);
    //
    //Alert the user to any variables logged
    if (extra.length>0){
        //
        //Log the extra data
        console.log('extra error data', ...extra);
        //
        //Modify dialog box with the alert
        const p:HTMLElement = document.createElement('p');
        p.textContent = 'See console.log for further details';
        dlg.appendChild(p);
    }
    //
    //Finally show the created dialog box in a modal version
    dlg.showModal();
}


