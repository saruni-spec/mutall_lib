//The smallest table that you can display comprise of a scalar. This test is 
//useful for checking the system setup, css etc 
//Concepts
// - zone
// - homozone
// - (zone) options
// - driver_source/scalar
import { homozone } from "../zone/zone.js";
//
//On loading the sample page....
window.onload = async () => {
    //
    //Define the source of the data that drives the tabulation as a simple scalar
    const driver_source = 2;
    //
    //Create a zone of a homogenus basic values, a.k.a., homozone
    const zone = new homozone(driver_source);
    //
    //Now show the zone
    await zone.show();
};
