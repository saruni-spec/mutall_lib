//
//Get the defination of the various options the io requires
import { input, metadata } from './io.js';
//
//This is to test how an input io without any options will be rendered
//This is the simplest form of an io just like crating an input element
async function bare_minimum(): Promise<void> {
    //
    //Bare minimum options to see how the io will handle it
    const options: metadata = {};
    //
    //Create the io with the options above
    const io = new input(options);
    //
    //Render the just created io
    await io.render();
}
//
//The rendering of the io when the metadata is filled up.
//I will use more than on input io simulating how they would naturally occur in a form
async function complete(): Promise<void> {
    //
    //Render an input io  of type text with only the annotation
    await new input({ annotation: 'name', io_type: 'text', len: 20 }).render();
    //
    //A input io of type number
    await new input({ annotation: 'age', io_type: 'number', id: 'age' }).render();
    //
    //Testing to see if the database. This will be an optional field with a max length of 100 characters
    await new input({
        annotation: 'qualification',
        id: 'qualification',
        subject: ['intern', 'qualification', [], 'tracker_mogaka'],
    }).render();
    //
    //Testing of how the required fields are handled if the user did not supply the data
    await new input({
        annotation: 'initials',
        id: 'initials',
        subject: ['intern', 'initials', [], 'tracker_mogaka'],
    }).render();
}
//
//Do the following once the whole window setup is complete
window.onload = async () => {
    //
    //Simplest input io possible

    await bare_minimum();
    //
    //More sophisticated io with options
    //Since i will be testing various options there will be more than one io
    await complete();
};
